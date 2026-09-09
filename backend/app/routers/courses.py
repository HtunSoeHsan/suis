from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from app.database import get_db
from app.models.course import Course
from app.schemas.course import CourseCreate, CourseUpdate, CourseOut, CourseListOut

router = APIRouter(prefix="/api/courses", tags=["Courses"])


@router.get("", response_model=CourseListOut)
async def list_courses(
    search: str | None = Query(None, description="Search by course code or name"),
    dept_code: str | None = Query(None, description="Filter by department code"),
    semester_id: int | None = Query(None, description="Filter by semester ID"),
    major: str | None = Query(None, description="Filter by major"),
    teacher_id: str | None = Query(None, description="Filter by assigned teacher ID"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=5000),
    db: AsyncSession = Depends(get_db),
):
    query = select(Course)
    if search:
        query = query.where(
            or_(
                Course.course_code.ilike(f"%{search}%"),
                Course.course_name.ilike(f"%{search}%"),
            )
        )
    if dept_code:
        query = query.where(Course.dept_code == dept_code)
    if semester_id is not None:
        query = query.where(Course.semester_id == semester_id)
    if major:
        query = query.where(Course.major == major)
    if teacher_id:
        query = query.where(Course.teacher_id == teacher_id)

    total_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = total_result.scalar_one()

    result = await db.execute(query.order_by(Course.course_code).offset(skip).limit(limit))
    items = result.scalars().all()

    return CourseListOut(total=total, items=list(items))


@router.post("", response_model=CourseOut, status_code=status.HTTP_201_CREATED)
async def create_course(body: CourseCreate, db: AsyncSession = Depends(get_db)):
    body.course_code = body.course_code.strip()
    existing = await db.execute(
        select(Course).where(
            or_(
                Course.course_code == body.course_code,
                func.trim(Course.course_code) == body.course_code,
            )
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail=f"Course code '{body.course_code}' already exists.")

    course = Course(**body.model_dump())
    db.add(course)
    await db.flush()
    await db.refresh(course)
    return course


@router.get("/{course_code}", response_model=CourseOut)
async def get_course(course_code: str, db: AsyncSession = Depends(get_db)):
    code_clean = course_code.strip()
    result = await db.execute(
        select(Course).where(
            or_(
                Course.course_code == course_code,
                Course.course_code == code_clean,
                func.trim(Course.course_code) == code_clean,
            )
        )
    )
    course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=404, detail=f"Course '{course_code}' not found.")
    return course


@router.patch("/{course_code}", response_model=CourseOut)
async def update_course(
    course_code: str, body: CourseUpdate, db: AsyncSession = Depends(get_db)
):
    code_clean = course_code.strip()
    result = await db.execute(
        select(Course).where(
            or_(
                Course.course_code == course_code,
                Course.course_code == code_clean,
                func.trim(Course.course_code) == code_clean,
            )
        )
    )
    course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=404, detail=f"Course '{course_code}' not found.")

    update_data = body.model_dump(exclude_unset=True)

    if "course_code" in update_data and update_data["course_code"] and update_data["course_code"].strip() != course.course_code:
        new_code = update_data["course_code"].strip()
        if not new_code:
            raise HTTPException(status_code=400, detail="Course code cannot be empty.")

        existing = await db.execute(
            select(Course).where(
                or_(
                    Course.course_code == new_code,
                    func.trim(Course.course_code) == new_code,
                )
            )
        )
        if existing.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Course code '{new_code}' already exists."
            )

        from app.models.enrollment import Enrollment
        from app.models.timetable import AcademicTimetable, ExamTimetable
        from app.models.attendance import AttendanceLog
        from sqlalchemy import update

        old_code = course.course_code

        await db.execute(
            update(Enrollment)
            .where(Enrollment.course_code == old_code)
            .values(course_code=new_code)
        )
        await db.execute(
            update(AcademicTimetable)
            .where(AcademicTimetable.course_code == old_code)
            .values(course_code=new_code)
        )
        await db.execute(
            update(ExamTimetable)
            .where(ExamTimetable.course_code == old_code)
            .values(course_code=new_code)
        )
        await db.execute(
            update(AttendanceLog)
            .where(AttendanceLog.course_code == old_code)
            .values(course_code=new_code)
        )

        course.course_code = new_code

    for field, value in update_data.items():
        if field != "course_code":
            setattr(course, field, value)

    await db.flush()
    await db.refresh(course)
    return course


@router.delete("/{course_code}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_course(course_code: str, db: AsyncSession = Depends(get_db)):
    code_clean = course_code.strip()
    result = await db.execute(
        select(Course).where(
            or_(
                Course.course_code == course_code,
                Course.course_code == code_clean,
                func.trim(Course.course_code) == code_clean,
            )
        )
    )
    course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=404, detail=f"Course '{course_code}' not found.")
    await db.delete(course)
    await db.flush()

