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
    limit: int = Query(50, ge=1, le=200),
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
    existing = await db.execute(select(Course).where(Course.course_code == body.course_code))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail=f"Course code '{body.course_code}' already exists.")

    course = Course(**body.model_dump())
    db.add(course)
    await db.flush()
    await db.refresh(course)
    return course


@router.get("/{course_code}", response_model=CourseOut)
async def get_course(course_code: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Course).where(Course.course_code == course_code))
    course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found.")
    return course


@router.patch("/{course_code}", response_model=CourseOut)
async def update_course(
    course_code: str, body: CourseUpdate, db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Course).where(Course.course_code == course_code))
    course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found.")

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(course, field, value)
    await db.flush()
    await db.refresh(course)
    return course


@router.delete("/{course_code}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_course(course_code: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Course).where(Course.course_code == course_code))
    course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found.")
    await db.delete(course)
    await db.flush()
