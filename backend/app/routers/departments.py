from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from app.database import get_db
from app.models.department import Department
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
    existing = await db.execute(select(Department).where(Department.dept_code == body.dept_code))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail=f"Department code '{body.dept_code}' already exists.")

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
    await db.delete(dept)
    await db.flush()
