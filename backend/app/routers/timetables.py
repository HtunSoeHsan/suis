from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from app.database import get_db
from app.models.timetable import AcademicTimetable, ExamTimetable
from app.schemas.timetable import (
    AcademicTimetableCreate, AcademicTimetableOut, AcademicTimetableListOut,
    ExamTimetableCreate, ExamTimetableOut, ExamTimetableListOut
)

router = APIRouter(prefix="/api/timetables", tags=["Timetables"])


# ─── Academic Timetables ──────────────────────────────────────────────────────
@router.get("/academic", response_model=AcademicTimetableListOut)
async def list_academic_timetables(
    semester_id: int | None = Query(None),
    course_code: str | None = Query(None),
    teacher_id: str | None = Query(None),
    room_id: str | None = Query(None),
    day_of_week: str | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    query = select(AcademicTimetable)
    filters = []
    if semester_id is not None:
        filters.append(AcademicTimetable.semester_id == semester_id)
    if course_code:
        filters.append(AcademicTimetable.course_code == course_code)
    if teacher_id:
        filters.append(AcademicTimetable.teacher_id == teacher_id)
    if room_id:
        filters.append(AcademicTimetable.room_id == room_id)
    if day_of_week:
        filters.append(AcademicTimetable.day_of_week.ilike(day_of_week))

    if filters:
        query = query.where(and_(*filters))

    total_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = total_result.scalar_one()

    result = await db.execute(query.order_by(AcademicTimetable.day_of_week, AcademicTimetable.slot_id).offset(skip).limit(limit))
    items = result.scalars().all()

    return AcademicTimetableListOut(total=total, items=list(items))


@router.post("/academic", response_model=AcademicTimetableOut, status_code=status.HTTP_201_CREATED)
async def create_academic_timetable(body: AcademicTimetableCreate, db: AsyncSession = Depends(get_db)):
    tt = AcademicTimetable(**body.model_dump())
    db.add(tt)
    await db.flush()
    await db.refresh(tt)
    return tt


@router.delete("/academic/{timetable_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_academic_timetable(timetable_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(AcademicTimetable).where(AcademicTimetable.timetable_id == timetable_id))
    tt = result.scalar_one_or_none()
    if not tt:
        raise HTTPException(status_code=404, detail="Academic timetable entry not found.")
    await db.delete(tt)
    await db.flush()


# ─── Exam Timetables ──────────────────────────────────────────────────────────
@router.get("/exam", response_model=ExamTimetableListOut)
async def list_exam_timetables(
    semester_id: int | None = Query(None),
    course_code: str | None = Query(None),
    supervisor_teacher_id: str | None = Query(None),
    room_id: str | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    query = select(ExamTimetable)
    filters = []
    if semester_id is not None:
        filters.append(ExamTimetable.semester_id == semester_id)
    if course_code:
        filters.append(ExamTimetable.course_code == course_code)
    if supervisor_teacher_id:
        filters.append(ExamTimetable.supervisor_teacher_id == supervisor_teacher_id)
    if room_id:
        filters.append(ExamTimetable.room_id == room_id)

    if filters:
        query = query.where(and_(*filters))

    total_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = total_result.scalar_one()

    result = await db.execute(query.order_by(ExamTimetable.exam_date, ExamTimetable.start_time).offset(skip).limit(limit))
    items = result.scalars().all()

    return ExamTimetableListOut(total=total, items=list(items))


@router.post("/exam", response_model=ExamTimetableOut, status_code=status.HTTP_201_CREATED)
async def create_exam_timetable(body: ExamTimetableCreate, db: AsyncSession = Depends(get_db)):
    exam = ExamTimetable(**body.model_dump())
    db.add(exam)
    await db.flush()
    await db.refresh(exam)
    return exam


@router.delete("/exam/{exam_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_exam_timetable(exam_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ExamTimetable).where(ExamTimetable.exam_id == exam_id))
    exam = result.scalar_one_or_none()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam timetable entry not found.")
    await db.delete(exam)
    await db.flush()
