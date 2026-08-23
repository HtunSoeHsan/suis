from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from app.database import get_db
from app.models.enrollment import Enrollment
from app.schemas.enrollment import EnrollmentCreate, EnrollmentOut, EnrollmentListOut

router = APIRouter(prefix="/api/enrollments", tags=["Enrollments"])


from app.models.student import Student
from app.models.course import Course
from sqlalchemy import or_

@router.get("", response_model=EnrollmentListOut)
async def list_enrollments(
    search: str | None = Query(None, description="Search by student name, ID, roll number, course code, or course name"),
    student_id: str | None = Query(None, description="Filter by student ID"),
    course_code: str | None = Query(None, description="Filter by course code"),
    semester_id: int | None = Query(None, description="Filter by semester ID"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
):
    query = select(Enrollment)
    filters = []

    target_search = search or student_id
    if target_search and isinstance(target_search, str):
        query = query.join(Student, Enrollment.student_id == Student.student_id).join(Course, Enrollment.course_code == Course.course_code).where(
            or_(
                Enrollment.student_id.ilike(f"%{target_search}%"),
                Student.full_name.ilike(f"%{target_search}%"),
                Student.roll_number.ilike(f"%{target_search}%"),
                Enrollment.course_code.ilike(f"%{target_search}%"),
                Course.course_name.ilike(f"%{target_search}%"),
            )
        )

    if course_code and isinstance(course_code, str):
        filters.append(Enrollment.course_code == course_code)
    if semester_id is not None and isinstance(semester_id, int):
        filters.append(Enrollment.semester_id == semester_id)

    if filters:
        query = query.where(and_(*filters))

    total_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = total_result.scalar_one()

    result = await db.execute(query.order_by(Enrollment.enrolled_at.desc()).offset(skip).limit(limit))
    items = result.scalars().all()

    return EnrollmentListOut(total=total, items=list(items))


from app.models.student import Student

@router.post("", response_model=EnrollmentOut, status_code=status.HTTP_201_CREATED)
async def create_enrollment(body: EnrollmentCreate, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(
        select(Enrollment).where(
            and_(
                Enrollment.student_id == body.student_id,
                Enrollment.course_code == body.course_code,
                Enrollment.semester_id == body.semester_id,
            )
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=409,
            detail=f"Student '{body.student_id}' is already enrolled in course '{body.course_code}' for this semester.",
        )

    # Optional Auto-Promotion of Student Academic Year & Major Update
    if body.promote_academic_year is not None or body.update_major is not None:
        st_res = await db.execute(select(Student).where(Student.student_id == body.student_id))
        student = st_res.scalar_one_or_none()
        if student:
            if body.promote_academic_year is not None:
                student.academic_year = body.promote_academic_year
            if body.update_major is not None:
                student.major = body.update_major

    enroll_data = body.model_dump(exclude={"promote_academic_year", "update_major"})
    enrollment = Enrollment(**enroll_data)
    db.add(enrollment)
    await db.flush()
    await db.refresh(enrollment)
    return enrollment


from app.schemas.enrollment import BatchEnrollmentCreate, BatchEnrollmentOut

@router.post("/batch", response_model=BatchEnrollmentOut, status_code=status.HTTP_201_CREATED)
async def create_batch_enrollment(body: BatchEnrollmentCreate, db: AsyncSession = Depends(get_db)):
    existing_res = await db.execute(
        select(Enrollment.student_id, Enrollment.course_code).where(
            and_(
                Enrollment.semester_id == body.semester_id,
                Enrollment.student_id.in_(body.student_ids),
                Enrollment.course_code.in_(body.course_codes)
            )
        )
    )
    existing_set = set(existing_res.all())

    new_enrollments = []
    for sid in body.student_ids:
        for ccode in body.course_codes:
            if (sid, ccode) not in existing_set:
                new_enrollments.append(
                    Enrollment(student_id=sid, course_code=ccode, semester_id=body.semester_id)
                )

    if new_enrollments:
        db.add_all(new_enrollments)

    if body.promote_academic_year is not None or body.update_major is not None:
        st_res = await db.execute(
            select(Student).where(Student.student_id.in_(body.student_ids))
        )
        students = st_res.scalars().all()
        for st in students:
            if body.promote_academic_year is not None:
                st.academic_year = body.promote_academic_year
            if body.update_major is not None:
                st.major = body.update_major

    await db.flush()

    return BatchEnrollmentOut(
        total_enrolled=len(new_enrollments),
        enrolled_student_count=len(body.student_ids),
        enrolled_course_count=len(body.course_codes),
        promoted_academic_year=body.promote_academic_year
    )


@router.delete("/{enrollment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_enrollment(enrollment_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Enrollment).where(Enrollment.enrollment_id == enrollment_id))
    enr = result.scalar_one_or_none()
    if not enr:
        raise HTTPException(status_code=404, detail="Enrollment record not found.")
    await db.delete(enr)
    await db.flush()
