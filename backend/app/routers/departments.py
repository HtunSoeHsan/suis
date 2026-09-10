from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, and_
from app.database import get_db
from app.models.department import Department
from app.models.teacher import Teacher
from app.models.student import Student
from app.schemas.department import DepartmentCreate, DepartmentUpdate, DepartmentOut, DepartmentListOut

router = APIRouter(prefix="/api/departments", tags=["Departments"])


@router.get("", response_model=DepartmentListOut)
async def list_departments(
    search: str | None = Query(None, description="Search by dept code or name"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    query = select(Department)
    if search:
        query = query.where(
            or_(
                Department.dept_code.ilike(f"%{search}%"),
                Department.dept_name.ilike(f"%{search}%"),
            )
        )

    total_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = total_result.scalar_one()

    result = await db.execute(query.order_by(Department.dept_code).offset(skip).limit(limit))
    items = result.scalars().all()

    return DepartmentListOut(total=total, items=list(items))


@router.post("", response_model=DepartmentOut, status_code=status.HTTP_201_CREATED)
async def create_department(body: DepartmentCreate, db: AsyncSession = Depends(get_db)):
    existing_code = await db.execute(select(Department).where(Department.dept_code == body.dept_code))
    if existing_code.scalar_one_or_none():
        raise HTTPException(status_code=409, detail=f"Department code '{body.dept_code}' already exists.")

    existing_name = await db.execute(
        select(Department).where(func.lower(Department.dept_name) == body.dept_name.strip().lower())
    )
    if existing_name.scalar_one_or_none():
        raise HTTPException(status_code=409, detail=f"Department name '{body.dept_name}' already exists.")

    if body.head_teacher_id:
        existing_head = await db.execute(
            select(Department).where(Department.head_teacher_id == body.head_teacher_id)
        )
        if existing_head.scalar_one_or_none():
            raise HTTPException(
                status_code=409,
                detail=f"Teacher '{body.head_teacher_id}' is already the head teacher of another department."
            )

    dept = Department(**body.model_dump())
    db.add(dept)
    await db.flush()
    await db.refresh(dept)
    return dept


@router.get("/{dept_code}", response_model=DepartmentOut)
async def get_department(dept_code: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Department).where(Department.dept_code == dept_code))
    dept = result.scalar_one_or_none()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found.")
    return dept


@router.patch("/{dept_code}", response_model=DepartmentOut)
async def update_department(
    dept_code: str, body: DepartmentUpdate, db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Department).where(Department.dept_code == dept_code))
    dept = result.scalar_one_or_none()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found.")

    if body.dept_name is not None and body.dept_name.strip():
        existing_name = await db.execute(
            select(Department).where(
                and_(
                    func.lower(Department.dept_name) == body.dept_name.strip().lower(),
                    Department.dept_code != dept_code,
                )
            )
        )
        if existing_name.scalar_one_or_none():
            raise HTTPException(status_code=409, detail=f"Department name '{body.dept_name}' already exists.")

    if body.head_teacher_id is not None:
        if body.head_teacher_id == "":
            body.head_teacher_id = None

        if body.head_teacher_id is not None:
            existing_head = await db.execute(
                select(Department).where(
                    and_(
                        Department.head_teacher_id == body.head_teacher_id,
                        Department.dept_code != dept_code,
                    )
                )
            )
            if existing_head.scalar_one_or_none():
                raise HTTPException(
                    status_code=409,
                    detail=f"Teacher '{body.head_teacher_id}' is already the head teacher of another department."
                )

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(dept, field, value)
    await db.flush()
    await db.refresh(dept)
    return dept


@router.delete("/{dept_code}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_department(dept_code: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Department).where(Department.dept_code == dept_code))
    dept = result.scalar_one_or_none()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found.")

    teachers_res = await db.execute(select(func.count()).select_from(Teacher).where(Teacher.dept_code == dept_code))
    teachers_count = teachers_res.scalar_one()

    students_res = await db.execute(select(func.count()).select_from(Student).where(Student.dept_code == dept_code))
    students_count = students_res.scalar_one()

    if teachers_count > 0 or students_count > 0:
        details = []
        if teachers_count > 0:
            details.append(f"{teachers_count} teacher(s)")
        if students_count > 0:
            details.append(f"{students_count} student(s)")
        detail_str = " and ".join(details)
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete department '{dept_code}'. It still has {detail_str} assigned to it. Please reassign or remove them first."
        )

    await db.delete(dept)
    await db.flush()

