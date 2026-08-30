from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from app.database import get_db
from app.models.student import Student
from app.models.teacher import Teacher
from app.schemas.student import StudentCreate, StudentUpdate, StudentOut, StudentListOut

router = APIRouter(prefix="/api/students", tags=["Students"])


def _normalize_nrc(nrc: str) -> str:
    """Remove ALL whitespace (leading, trailing, and internal) from NRC."""
    return "".join(nrc.split())


async def _check_nrc_unique(db: AsyncSession, nrc: str, exclude_student_id: str | None = None) -> None:
    """Raise 409 if nrc_number already exists in students or teachers table."""
    nrc = _normalize_nrc(nrc)
    # Check within students
    q = select(Student.student_id).where(Student.nrc_number == nrc)
    if exclude_student_id:
        q = q.where(Student.student_id != exclude_student_id)
    dup_student = await db.execute(q)
    if dup_student.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"NRC '{nrc}' is already registered to another student.",
        )
    # Cross-check with teachers
    dup_teacher = await db.execute(select(Teacher.teacher_id).where(Teacher.nrc_number == nrc))
    if dup_teacher.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"NRC '{nrc}' is already registered to a teacher.",
        )


@router.get("", response_model=StudentListOut)
async def list_students(
    search: str | None = Query(None, description="Search by name, ID, roll number, NRC, or email"),
    dept_code: str | None = None,
    academic_year: int | None = None,
    section: str | None = Query(None, description="Filter by section: A, B, or C"),
    status: str | None = Query(None, description="Filter by status: Active, Graduated, Suspended, Dropped"),
    is_face_registered: bool | None = None,
    unlinked: bool = Query(False, description="If true, only return students without a linked user account"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
):
    query = select(Student)
    if search and isinstance(search, str):
        query = query.where(
            or_(
                Student.full_name.ilike(f"%{search}%"),
                Student.student_id.ilike(f"%{search}%"),
                Student.roll_number.ilike(f"%{search}%"),
                Student.nrc_number.ilike(f"%{search}%"),
                Student.email.ilike(f"%{search}%"),
            )
        )
    if dept_code and isinstance(dept_code, str):
        query = query.where(Student.dept_code == dept_code)
    if academic_year is not None and isinstance(academic_year, int):
        query = query.where(Student.academic_year == academic_year)
    if section and isinstance(section, str):
        query = query.where(Student.section == section.upper())
    if status and isinstance(status, str):
        query = query.where(Student.status == status)
    if is_face_registered is not None and isinstance(is_face_registered, bool):
        query = query.where(Student.is_face_registered == is_face_registered)
    if unlinked:
        query = query.where(Student.user_id == None)  # noqa: E711

    total_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = total_result.scalar_one()

    result = await db.execute(query.order_by(Student.academic_year, Student.section, Student.roll_number).offset(skip).limit(limit))
    items = result.scalars().all()

    return StudentListOut(total=total, items=list(items))



from app.services.id_generator import generate_student_id, generate_roll_number

@router.post("", response_model=StudentOut, status_code=status.HTTP_201_CREATED)
async def create_student(body: StudentCreate, db: AsyncSession = Depends(get_db)):
    if not body.student_id or body.student_id.strip() == "":
        body.student_id = await generate_student_id(db, dept_code=body.dept_code)
    else:
        existing = await db.execute(select(Student).where(Student.student_id == body.student_id))
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=409, detail=f"Student ID '{body.student_id}' already exists.")

    if not body.roll_number or body.roll_number.strip() == "":
        body.roll_number = await generate_roll_number(db, dept_code=body.dept_code, academic_year=body.academic_year)

    # NRC: normalize (remove all whitespace) then check uniqueness
    if body.nrc_number and body.nrc_number.strip():
        body.nrc_number = _normalize_nrc(body.nrc_number)
        await _check_nrc_unique(db, body.nrc_number)

    student = Student(**body.model_dump())
    db.add(student)
    await db.flush()
    await db.refresh(student)
    return student


@router.get("/{student_id}", response_model=StudentOut)
async def get_student(student_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Student).where(Student.student_id == student_id))
    student = result.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")
    return student


@router.patch("/{student_id}", response_model=StudentOut)
async def update_student(
    student_id: str, body: StudentUpdate, db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Student).where(Student.student_id == student_id))
    student = result.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")

    # NRC: normalize (remove all whitespace) then check uniqueness (exclude self)
    if body.nrc_number is not None and body.nrc_number.strip():
        body.nrc_number = _normalize_nrc(body.nrc_number)
        await _check_nrc_unique(db, body.nrc_number, exclude_student_id=student_id)

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(student, field, value)
    await db.flush()
    await db.refresh(student)
    return student


@router.delete("/{student_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_student(student_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Student).where(Student.student_id == student_id))
    student = result.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")
    await db.delete(student)
    await db.flush()


from app.models.enrollment import Enrollment
from app.models.semester import Semester
from app.models.course import Course

@router.get("/{student_id}/gpa")
async def get_student_gpa(student_id: str, db: AsyncSession = Depends(get_db)):
    st_res = await db.execute(select(Student).where(Student.student_id == student_id))
    student = st_res.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")

    query = (
        select(Enrollment, Course, Semester)
        .join(Course, Enrollment.course_code == Course.course_code)
        .join(Semester, Enrollment.semester_id == Semester.semester_id)
        .where(Enrollment.student_id == student_id)
        .order_by(Semester.semester_id.desc(), Course.course_code)
    )
    result = await db.execute(query)
    rows = result.all()

    semesters_data = {}
    total_earned_credits = 0.0
    total_weighted_points = 0.0
    total_attempted_credits = 0.0

    for enr, crs, sem in rows:
        sem_id = sem.semester_id
        if sem_id not in semesters_data:
            semesters_data[sem_id] = {
                "semester_id": sem_id,
                "academic_year": sem.academic_year,
                "term": sem.term,
                "is_active": sem.is_active,
                "total_credits": 0,
                "weighted_points": 0.0,
                "gpa": 0.0,
                "courses": [],
            }

        credits = crs.credit_hours or 0
        g_point = enr.grade_point

        course_item = {
            "enrollment_id": enr.enrollment_id,
            "course_code": crs.course_code,
            "course_name": crs.course_name,
            "credit_hours": credits,
            "marks": enr.marks,
            "grade": enr.grade,
            "grade_point": g_point,
        }
        semesters_data[sem_id]["courses"].append(course_item)
        semesters_data[sem_id]["total_credits"] += credits
        total_attempted_credits += credits

        if g_point is not None:
            semesters_data[sem_id]["weighted_points"] += (g_point * credits)
            total_weighted_points += (g_point * credits)
            total_earned_credits += credits

    semester_list = []
    for sem_id, sem_info in semesters_data.items():
        if sem_info["total_credits"] > 0:
            sem_info["gpa"] = round(sem_info["weighted_points"] / sem_info["total_credits"], 2)
        else:
            sem_info["gpa"] = 0.0
        semester_list.append(sem_info)

    cgpa = round(total_weighted_points / total_earned_credits, 2) if total_earned_credits > 0 else 0.0

    return {
        "student_id": student.student_id,
        "full_name": student.full_name,
        "cgpa": cgpa,
        "total_earned_credits": total_earned_credits,
        "total_attempted_credits": total_attempted_credits,
        "semesters": semester_list,
    }
