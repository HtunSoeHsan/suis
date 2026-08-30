from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, update, or_, Integer
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

    # Dynamic sorting with natural numeric term extraction
    is_desc = (order or "desc").lower() == "desc"
    term_num = func.cast(func.nullif(func.regexp_replace(Semester.term, r'[^0-9]', '', 'g'), ''), Integer)

    sort_field = (sort_by or "academic_year").lower()

    if sort_field == "term":
        primary_sort = term_num.desc() if is_desc else term_num.asc()
        secondary_sort = Semester.academic_year.desc()
        query = query.order_by(primary_sort, secondary_sort)
    elif sort_field == "academic_year":
        primary_sort = Semester.academic_year.desc() if is_desc else Semester.academic_year.asc()
        secondary_sort = term_num.asc()
        query = query.order_by(primary_sort, secondary_sort)
    else:
        field_map = {
            "start_date": Semester.start_date,
            "is_active": Semester.is_active,
            "semester_id": Semester.semester_id,
        }
        col = field_map.get(sort_field, Semester.academic_year)
        primary_sort = col.desc() if is_desc else col.asc()
        query = query.order_by(primary_sort, Semester.academic_year.desc(), term_num.asc())

    result = await db.execute(query.offset(skip).limit(limit))
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
