from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from app.database import get_db
from app.models.classroom import Classroom
from app.schemas.classroom import ClassroomCreate, ClassroomUpdate, ClassroomOut, ClassroomListOut

router = APIRouter(prefix="/api/classrooms", tags=["Classrooms"])


@router.get("", response_model=ClassroomListOut)
async def list_classrooms(
    search: str | None = Query(None, description="Search by room id, name or building"),
    room_type: str | None = Query(None, description="Filter by room type: LEC_HALL, LAB, EXAM_HALL, SEMINAR"),
    building: str | None = Query(None, description="Filter by building name"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    query = select(Classroom)
    if search and isinstance(search, str):
        query = query.where(
            or_(
                Classroom.room_id.ilike(f"%{search}%"),
                Classroom.room_name.ilike(f"%{search}%"),
                Classroom.building.ilike(f"%{search}%"),
            )
        )
    if room_type and isinstance(room_type, str):
        query = query.where(Classroom.room_type.ilike(f"%{room_type}%"))
    if building and isinstance(building, str):
        query = query.where(Classroom.building.ilike(f"%{building}%"))

    total_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = total_result.scalar_one()

    result = await db.execute(query.order_by(Classroom.room_id).offset(skip).limit(limit))
    items = result.scalars().all()

    return ClassroomListOut(total=total, items=list(items))


@router.post("", response_model=ClassroomOut, status_code=status.HTTP_201_CREATED)
async def create_classroom(body: ClassroomCreate, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(Classroom).where(Classroom.room_id == body.room_id))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail=f"Room ID '{body.room_id}' already exists.")

    room = Classroom(**body.model_dump())
    db.add(room)
    await db.flush()
    await db.refresh(room)
    return room


@router.get("/{room_id}", response_model=ClassroomOut)
async def get_classroom(room_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Classroom).where(Classroom.room_id == room_id))
    room = result.scalar_one_or_none()
    if not room:
        raise HTTPException(status_code=404, detail="Classroom not found.")
    return room


@router.patch("/{room_id}", response_model=ClassroomOut)
async def update_classroom(
    room_id: str, body: ClassroomUpdate, db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Classroom).where(Classroom.room_id == room_id))
    room = result.scalar_one_or_none()
    if not room:
        raise HTTPException(status_code=404, detail="Classroom not found.")

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(room, field, value)
    await db.flush()
    await db.refresh(room)
    return room


@router.delete("/{room_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_classroom(room_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Classroom).where(Classroom.room_id == room_id))
    room = result.scalar_one_or_none()
    if not room:
        raise HTTPException(status_code=404, detail="Classroom not found.")
    await db.delete(room)
    await db.flush()
