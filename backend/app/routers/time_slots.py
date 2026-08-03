from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.database import get_db
from app.models.time_slot import TimeSlot
from app.schemas.time_slot import TimeSlotCreate, TimeSlotUpdate, TimeSlotOut, TimeSlotListOut

router = APIRouter(prefix="/api/time-slots", tags=["Time Slots"])


@router.get("", response_model=TimeSlotListOut)
async def list_time_slots(
    slot_type: str | None = Query(None, description="Filter by slot type ('class' or 'exam')"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    query = select(TimeSlot)
    if slot_type:
        query = query.where(TimeSlot.slot_type == slot_type)

    total_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = total_result.scalar_one()

    result = await db.execute(query.order_by(TimeSlot.period_number).offset(skip).limit(limit))
    items = result.scalars().all()

    return TimeSlotListOut(total=total, items=list(items))


@router.post("", response_model=TimeSlotOut, status_code=status.HTTP_201_CREATED)
async def create_time_slot(body: TimeSlotCreate, db: AsyncSession = Depends(get_db)):
    slot = TimeSlot(**body.model_dump())
    db.add(slot)
    await db.flush()
    await db.refresh(slot)
    return slot


@router.get("/{slot_id}", response_model=TimeSlotOut)
async def get_time_slot(slot_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(TimeSlot).where(TimeSlot.slot_id == slot_id))
    slot = result.scalar_one_or_none()
    if not slot:
        raise HTTPException(status_code=404, detail="Time slot not found.")
    return slot


@router.patch("/{slot_id}", response_model=TimeSlotOut)
async def update_time_slot(
    slot_id: int, body: TimeSlotUpdate, db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(TimeSlot).where(TimeSlot.slot_id == slot_id))
    slot = result.scalar_one_or_none()
    if not slot:
        raise HTTPException(status_code=404, detail="Time slot not found.")

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(slot, field, value)
    await db.flush()
    await db.refresh(slot)
    return slot


@router.delete("/{slot_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_time_slot(slot_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(TimeSlot).where(TimeSlot.slot_id == slot_id))
    slot = result.scalar_one_or_none()
    if not slot:
        raise HTTPException(status_code=404, detail="Time slot not found.")
    await db.delete(slot)
    await db.flush()
