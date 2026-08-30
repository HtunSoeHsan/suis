from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, update, or_
from app.database import get_db
from app.models.semester import Semester
from app.schemas.semester import SemesterCreate, SemesterUpdate, SemesterOut, SemesterListOut

router = APIRouter(prefix="/api/semesters", tags=["Semesters"])


MAX_ACTIVE_SEMESTERS = 5


async def _check_active_semesters_limit(db: AsyncSession, exclude_semester_id: int | None = None) -> None:
    query = select(func.count(Semester.semester_id)).where(Semester.is_active == True)
    if exclude_semester_id is not None:
        query = query.where(Semester.semester_id != exclude_semester_id)
    res = await db.execute(query)
    count = res.scalar_one()
    if count >= MAX_ACTIVE_SEMESTERS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot activate semester. Maximum of {MAX_ACTIVE_SEMESTERS} active semesters allowed.",
        )


@router.get("", response_model=SemesterListOut)
async def list_semesters(
    search: str | None = Query(None, description="Search by academic year or term"),
    is_active: bool | None = None,
    sort_by: str | None = Query("academic_year", description="Sort field: academic_year, term, start_date, is_active, semester_id"),
    order: str | None = Query("desc", description="Sort direction: asc or desc"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
):
    query = select(Semester)
    if search and isinstance(search, str):
        query = query.where(
            or_(
                Semester.academic_year.ilike(f"%{search}%"),
                Semester.term.ilike(f"%{search}%"),
            )
        )
    if is_active is not None and isinstance(is_active, bool):
        query = query.where(Semester.is_active == is_active)

    total_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = total_result.scalar_one()

    # Dynamic sorting
    is_desc = (order or "desc").lower() == "desc"
    field_map = {
        "academic_year": Semester.academic_year,
        "term": Semester.term,
        "start_date": Semester.start_date,
        "is_active": Semester.is_active,
        "semester_id": Semester.semester_id,
    }
    col = field_map.get((sort_by or "academic_year").lower(), Semester.academic_year)
    
    if is_desc:
        sort_clause = col.desc()
    else:
        sort_clause = col.asc()

    result = await db.execute(
        query.order_by(sort_clause, Semester.term.asc() if is_desc else Semester.term.desc()).offset(skip).limit(limit)
    )
    items = result.scalars().all()

    return SemesterListOut(total=total, items=list(items))


@router.post("", response_model=SemesterOut, status_code=status.HTTP_201_CREATED)
async def create_semester(body: SemesterCreate, db: AsyncSession = Depends(get_db)):
    if body.is_active:
        await _check_active_semesters_limit(db)

    semester = Semester(**body.model_dump())
    db.add(semester)
    await db.flush()
    await db.refresh(semester)
    return semester


@router.get("/{semester_id}", response_model=SemesterOut)
async def get_semester(semester_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Semester).where(Semester.semester_id == semester_id))
    sem = result.scalar_one_or_none()
    if not sem:
        raise HTTPException(status_code=404, detail="Semester not found.")
    return sem


@router.patch("/{semester_id}", response_model=SemesterOut)
async def update_semester(
    semester_id: int, body: SemesterUpdate, db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Semester).where(Semester.semester_id == semester_id))
    sem = result.scalar_one_or_none()
    if not sem:
        raise HTTPException(status_code=404, detail="Semester not found.")

    payload = body.model_dump(exclude_unset=True)
    if payload.get("is_active"):
        await _check_active_semesters_limit(db, exclude_semester_id=semester_id)

    for field, value in payload.items():
        setattr(sem, field, value)
    await db.flush()
    await db.refresh(sem)
    return sem


@router.post("/{semester_id}/activate", response_model=SemesterOut)
async def activate_semester(semester_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Semester).where(Semester.semester_id == semester_id))
    sem = result.scalar_one_or_none()
    if not sem:
        raise HTTPException(status_code=404, detail="Semester not found.")

    if not sem.is_active:
        await _check_active_semesters_limit(db, exclude_semester_id=semester_id)
        sem.is_active = True
        await db.flush()
        await db.refresh(sem)
    return sem


@router.post("/{semester_id}/deactivate", response_model=SemesterOut)
async def deactivate_semester(semester_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Semester).where(Semester.semester_id == semester_id))
    sem = result.scalar_one_or_none()
    if not sem:
        raise HTTPException(status_code=404, detail="Semester not found.")

    sem.is_active = False
    await db.flush()
    await db.refresh(sem)
    return sem


@router.delete("/{semester_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_semester(semester_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Semester).where(Semester.semester_id == semester_id))
    sem = result.scalar_one_or_none()
    if not sem:
        raise HTTPException(status_code=404, detail="Semester not found.")
    await db.delete(sem)
    await db.flush()
