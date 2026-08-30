from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.database import get_db
from app.models.attendance import AttendanceLog
from app.schemas.attendance import AttendanceLogOut, AttendanceLogListOut, AttendanceLogCreate
from datetime import date, timedelta

router = APIRouter(prefix="/api/attendance", tags=["Attendance"])


from app.models.student import Student
from app.models.course import Course
from sqlalchemy import or_

@router.get("", response_model=AttendanceLogListOut)
async def list_attendance(
    search: str | None = Query(None, description="Search by student name, ID, or roll number"),
    student_id: str | None = Query(None, description="Filter by student ID"),
    course_code: str | None = Query(None, description="Filter by course code"),
    teacher_id: str | None = Query(None, description="Filter by assigned teacher ID"),
    status: str | None = Query(None, description="Filter by status: PRESENT, LATE, ABSENT"),
    date_from: date | None = None,
    date_to: date | None = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
):
    query = select(AttendanceLog)

    target_search = search or student_id
    if target_search and isinstance(target_search, str):
        query = query.join(Student, AttendanceLog.student_id == Student.student_id).where(
            or_(
                AttendanceLog.student_id.ilike(f"%{target_search}%"),
                Student.full_name.ilike(f"%{target_search}%"),
                Student.roll_number.ilike(f"%{target_search}%"),
            )
        )

    if course_code and isinstance(course_code, str):
        query = query.where(AttendanceLog.course_code == course_code)
    if teacher_id and isinstance(teacher_id, str):
        teacher_courses = select(Course.course_code).where(Course.teacher_id == teacher_id)
        query = query.where(AttendanceLog.course_code.in_(teacher_courses))
    if status and isinstance(status, str):
        query = query.where(AttendanceLog.status == status.upper())
    if date_from:
        query = query.where(AttendanceLog.verified_at >= date_from)
    if date_to:
        # Add 1 day so the full day is included (verified_at is a datetime, date_to is date-only)
        query = query.where(AttendanceLog.verified_at < date_to + timedelta(days=1))

    total_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = total_result.scalar_one()

    result = await db.execute(
        query.order_by(AttendanceLog.verified_at.desc()).offset(skip).limit(limit)
    )
    items = result.scalars().all()
    return AttendanceLogListOut(total=total, items=list(items))


from app.schemas.attendance import (
    AttendanceLogOut, AttendanceLogListOut, AttendanceLogCreate,
    BatchAttendanceCreate, BatchAttendanceOut
)
from datetime import datetime

@router.post("", response_model=AttendanceLogOut, status_code=status.HTTP_201_CREATED)
async def create_attendance_log(
    body: AttendanceLogCreate, db: AsyncSession = Depends(get_db)
):
    record = AttendanceLog(**body.model_dump())
    if record.confidence_score is None:
        record.confidence_score = 1.0  # Default 100% confidence for manual entry
    db.add(record)
    await db.flush()
    await db.refresh(record)
    return record


@router.post("/batch", response_model=BatchAttendanceOut, status_code=status.HTTP_201_CREATED)
async def create_batch_attendance(
    body: BatchAttendanceCreate, db: AsyncSession = Depends(get_db)
):
    now = body.verified_at or datetime.now()
    records = []
    for item in body.items:
        records.append(
            AttendanceLog(
                student_id=item.student_id,
                course_code=body.course_code,
                status=item.status,
                confidence_score=item.confidence_score or 1.0,
                verified_at=now,
            )
        )
    if records:
        db.add_all(records)
        await db.flush()

    return BatchAttendanceOut(
        total_recorded=len(records),
        course_code=body.course_code,
    )


@router.delete("/{log_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_attendance_log(log_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(AttendanceLog).where(AttendanceLog.log_id == log_id))
    log = result.scalar_one_or_none()
    if not log:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Attendance log record not found.")
    await db.delete(log)
    await db.flush()
