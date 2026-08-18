"""
Vision Router — Face Enrollment, Identification & Information Retrieval.

Endpoints:
  POST /api/students/{student_id}/face  → enroll student face
  POST /api/teachers/{teacher_id}/face  → enroll teacher face
  POST /api/vision/identify             → identify face & mark attendance
  POST /api/vision/retrieve-info        → Face-Based Information Retrieval
  POST /api/vision/liveness             → standalone liveness check
"""
import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from app.database import get_db
from app.models.student import Student
from app.models.teacher import Teacher
from app.models.attendance import AttendanceLog
from app.models.face_log import FaceEnrollmentLog
from app.models.enums import EnrollmentType, AttendanceStatus
from app.schemas.attendance import (
    FaceEnrollRequest,
    FaceIdentifyResponse,
    FaceRetrieveInfoResponse,
)
from app.services.vision_service import extract_embedding, decode_base64_image
from app.services.liveness_service import check_liveness, is_live
from app.services.groq_service import get_groq_service
from app.config import get_settings

settings = get_settings()
router = APIRouter(tags=["Computer Vision"])


@router.post("/api/students/{student_id}/face")
async def enroll_student_face(
    student_id: str,
    body: FaceEnrollRequest,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Student).where(Student.student_id == student_id))
    student = result.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")

    embedding, meta = extract_embedding(body.image_base64)
    if embedding is None:
        raise HTTPException(status_code=422, detail=meta.get("error", "Face extraction failed."))

    img_bgr = decode_base64_image(body.image_base64)
    liveness_score = check_liveness(img_bgr)
    if not is_live(liveness_score):
        raise HTTPException(
            status_code=422,
            detail=f"Liveness check failed (score={liveness_score:.2f}). Please use a real face.",
        )

    # Save vector directly on student record
    student.face_embedding = embedding.tolist()
    student.is_face_registered = True

    # Audit Log
    log = FaceEnrollmentLog(
        target_user_type="student",
        target_id=student_id,
        enrollment_type=EnrollmentType.INITIAL if not student.is_face_registered else EnrollmentType.DEFERRED,
    )
    db.add(log)
    await db.flush()

    return {
        "message": "Student face enrolled successfully.",
        "student_id": student_id,
        "liveness_score": liveness_score,
        **meta,
    }


@router.post("/api/teachers/{teacher_id}/face")
async def enroll_teacher_face(
    teacher_id: str,
    body: FaceEnrollRequest,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Teacher).where(Teacher.teacher_id == teacher_id))
    teacher = result.scalar_one_or_none()
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found.")

    embedding, meta = extract_embedding(body.image_base64)
    if embedding is None:
        raise HTTPException(status_code=422, detail=meta.get("error", "Face extraction failed."))

    img_bgr = decode_base64_image(body.image_base64)
    liveness_score = check_liveness(img_bgr)
    if not is_live(liveness_score):
        raise HTTPException(
            status_code=422,
            detail=f"Liveness check failed (score={liveness_score:.2f}). Please use a real face.",
        )

    teacher.face_embedding = embedding.tolist()
    teacher.is_face_registered = True

    log = FaceEnrollmentLog(
        target_user_type="teacher",
        target_id=teacher_id,
        enrollment_type=EnrollmentType.INITIAL if not teacher.is_face_registered else EnrollmentType.DEFERRED,
    )
    db.add(log)
    await db.flush()

    return {
        "message": "Teacher face enrolled successfully.",
        "teacher_id": teacher_id,
        "liveness_score": liveness_score,
        **meta,
    }


async def _match_face(body: FaceEnrollRequest, db: AsyncSession):
    """
    Internal helper: extract embedding, run liveness check, query DB for best match.
    Returns (FaceIdentifyResponse | None, liveness_score, best_match_row).
    Does NOT mark attendance.
    """
    embedding, meta = extract_embedding(body.image_base64)
    if embedding is None:
        return FaceIdentifyResponse(
            identified=False,
            message=meta.get("error", "No face detected in the image."),
        ), None, None

    img_bgr = decode_base64_image(body.image_base64)
    liveness_score = check_liveness(img_bgr)
    if not is_live(liveness_score):
        return FaceIdentifyResponse(
            identified=False,
            liveness_score=liveness_score,
            message=f"Liveness check failed (score={liveness_score:.2f}). Please use a real face.",
        ), liveness_score, None

    embedding_str = "[" + ",".join(map(str, embedding.tolist())) + "]"

    student_sql = text(f"""
        SELECT
            student_id AS target_id,
            'student' AS target_type,
            full_name,
            dept_code,
            1 - (face_embedding <=> '{embedding_str}'::vector) AS similarity
        FROM students
        WHERE face_embedding IS NOT NULL
        ORDER BY face_embedding <=> '{embedding_str}'::vector
        LIMIT 1
    """)

    teacher_sql = text(f"""
        SELECT
            teacher_id AS target_id,
            'teacher' AS target_type,
            full_name,
            dept_code,
            1 - (face_embedding <=> '{embedding_str}'::vector) AS similarity
        FROM teachers
        WHERE face_embedding IS NOT NULL
        ORDER BY face_embedding <=> '{embedding_str}'::vector
        LIMIT 1
    """)

    s_res = (await db.execute(student_sql)).fetchone()
    t_res = (await db.execute(teacher_sql)).fetchone()

    min_dist_threshold = 1 - settings.SIMILARITY_THRESHOLD
    matches = [m for m in [s_res, t_res] if m and m.similarity >= min_dist_threshold]

    if not matches:
        return FaceIdentifyResponse(
            identified=False,
            liveness_score=liveness_score,
            message="No matching identity found in the university database.",
        ), liveness_score, None

    best_match = max(matches, key=lambda m: m.similarity)
    return None, liveness_score, best_match


@router.post("/api/vision/identify", response_model=FaceIdentifyResponse)
async def identify_face(body: FaceEnrollRequest, db: AsyncSession = Depends(get_db)):
    """
    Identify a face and auto-mark attendance for recognised students.
    """
    early_resp, liveness_score, best_match = await _match_face(body, db)
    if early_resp is not None:
        return early_resp

    # Auto-mark attendance for students
    attendance_marked = False
    if best_match.target_type == "student":
        c_res = await db.execute(
            text("SELECT course_code FROM enrollments WHERE student_id = :sid ORDER BY enrolled_at DESC LIMIT 1"),
            {"sid": best_match.target_id},
        )
        c_row = c_res.fetchone()
        course_code = c_row.course_code if c_row else "CS-401"

        att_log = AttendanceLog(
            student_id=best_match.target_id,
            course_code=course_code,
            confidence_score=float(best_match.similarity),
            status=AttendanceStatus.PRESENT,
        )
        db.add(att_log)
        attendance_marked = True
        await db.flush()

    return FaceIdentifyResponse(
        identified=True,
        target_id=best_match.target_id,
        target_type=best_match.target_type,
        full_name=best_match.full_name,
        dept_code=best_match.dept_code,
        similarity_score=round(float(best_match.similarity), 4),
        liveness_score=round(liveness_score, 4),
        attendance_marked=attendance_marked,
        message=f"Identified: {best_match.full_name} ({best_match.target_id}) — {best_match.dept_code} Department.",
    )


@router.post("/api/vision/retrieve-info", response_model=FaceRetrieveInfoResponse)
async def face_retrieve_info(body: FaceEnrollRequest, db: AsyncSession = Depends(get_db)):
    """
    Face-Based Information Retrieval (read-only — no attendance side effects):
    Scan face → Identify person → Return full profile, courses, timetable, attendance stats, AI summary.
    """
    early_resp, liveness_score, best_match = await _match_face(body, db)
    if early_resp is not None or best_match is None:
        return FaceRetrieveInfoResponse(
            identified=False,
            message=early_resp.message if early_resp else "No match found.",
        )

    target_id = best_match.target_id
    target_type = best_match.target_type

    profile = {}
    courses = []
    timetables = []
    att_summary = {}

    if target_type == "student":
        s = (await db.execute(select(Student).where(Student.student_id == target_id))).scalar_one_or_none()
        if s:
            profile = {
                "student_id": s.student_id,
                "full_name": s.full_name,
                "dept_code": s.dept_code,
                "academic_year": s.academic_year,
                "roll_number": s.roll_number,
                "phone": s.phone,
                "attendance_rate": s.attendance_rate,
                "is_face_registered": s.is_face_registered,
            }

        # Courses
        c_res = await db.execute(text("""
            SELECT c.course_code, c.course_name, c.credit_hours, t.full_name AS teacher_name
            FROM enrollments e
            JOIN courses c ON c.course_code = e.course_code
            LEFT JOIN teachers t ON t.teacher_id = c.teacher_id
            WHERE e.student_id = :sid
        """), {"sid": target_id})
        courses = [dict(r._mapping) for r in c_res.fetchall()]

        # Timetable
        t_res = await db.execute(text("""
            SELECT tt.day_of_week, c.course_name, r.room_name, ts.start_time, ts.end_time
            FROM enrollments e
            JOIN academic_timetables tt ON tt.course_code = e.course_code
            JOIN courses c ON c.course_code = tt.course_code
            JOIN classrooms r ON r.room_id = tt.room_id
            JOIN time_slots ts ON ts.slot_id = tt.slot_id
            WHERE e.student_id = :sid
        """), {"sid": target_id})
        timetables = [
            {k: str(v) if not isinstance(v, (str, int, float, bool, type(None))) else v for k, v in dict(r._mapping).items()}
            for r in t_res.fetchall()
        ]

        # Attendance log count
        att_res = await db.execute(text("""
            SELECT status, COUNT(*) AS count
            FROM attendance_logs
            WHERE student_id = :sid
            GROUP BY status
        """), {"sid": target_id})
        att_summary = {r.status: r.count for r in att_res.fetchall()}

    else:
        # Teacher profile
        t = (await db.execute(select(Teacher).where(Teacher.teacher_id == target_id))).scalar_one_or_none()
        if t:
            profile = {
                "teacher_id": t.teacher_id,
                "full_name": t.full_name,
                "dept_code": t.dept_code,
                "designation": t.designation,
                "phone": t.phone,
                "is_face_registered": t.is_face_registered,
            }

        c_res = await db.execute(text("""
            SELECT course_code, course_name, credit_hours
            FROM courses WHERE teacher_id = :tid
        """), {"tid": target_id})
        courses = [dict(r._mapping) for r in c_res.fetchall()]

    # Generate AI Natural Language Summary via Groq
    groq = get_groq_service()
    ai_prompt = f"Summarize information for {best_match.full_name} ({target_type.upper()}, ID: {target_id}). Profile: {json.dumps(profile)}. Enrolled courses: {json.dumps(courses)}. Timetable: {json.dumps(timetables)}."
    ai_summary = None
    if groq.groq_client:
        try:
            ai_summary = await groq._call_groq(
                "You are an AI university assistant summarizing a student or teacher profile retrieved via face recognition scan.",
                ai_prompt,
            )
        except Exception:
            ai_summary = f"Profile retrieved for {best_match.full_name} ({target_id}). Attendance Rate: {profile.get('attendance_rate', 'N/A')}%."

    return FaceRetrieveInfoResponse(
        identified=True,
        target_id=target_id,
        target_type=target_type,
        similarity_score=round(float(best_match.similarity), 4),
        liveness_score=round(liveness_score, 4),
        profile=profile,
        courses=courses,
        timetables=timetables,
        attendance_summary=att_summary,
        ai_summary=ai_summary,
        message=f"Successfully retrieved information for {best_match.full_name}.",
    )


@router.post("/api/vision/liveness")
async def liveness_check(body: FaceEnrollRequest):
    img_bgr = decode_base64_image(body.image_base64)
    score = check_liveness(img_bgr)
    return {"liveness_score": score, "is_live": is_live(score)}
