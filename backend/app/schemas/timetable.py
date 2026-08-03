from datetime import date, time
from pydantic import BaseModel, Field
from typing import Optional


# Academic Timetable Schemas
class AcademicTimetableBase(BaseModel):
    semester_id: int = Field(..., examples=[1])
    course_code: str = Field(..., max_length=20, examples=["CS-401"])
    teacher_id: str = Field(..., max_length=50, examples=["TCH-2026-01"])
    room_id: str = Field(..., max_length=20, examples=["ROOM-101"])
    slot_id: int = Field(..., examples=[1])
    day_of_week: str = Field(..., max_length=10, examples=["Monday"])


class AcademicTimetableCreate(AcademicTimetableBase):
    pass


class AcademicTimetableOut(AcademicTimetableBase):
    timetable_id: int

    model_config = {"from_attributes": True}


class AcademicTimetableListOut(BaseModel):
    total: int
    items: list[AcademicTimetableOut]


# Exam Timetable Schemas
class ExamTimetableBase(BaseModel):
    semester_id: int = Field(..., examples=[1])
    course_code: str = Field(..., max_length=20, examples=["CS-401"])
    room_id: str = Field(..., max_length=20, examples=["ROOM-101"])
    exam_date: date = Field(..., examples=["2026-03-15"])
    start_time: time = Field(..., examples=["09:00:00"])
    end_time: time = Field(..., examples=["11:00:00"])
    supervisor_teacher_id: Optional[str] = Field(None, max_length=50, examples=["TCH-2026-01"])


class ExamTimetableCreate(ExamTimetableBase):
    pass


class ExamTimetableOut(ExamTimetableBase):
    exam_id: int

    model_config = {"from_attributes": True}


class ExamTimetableListOut(BaseModel):
    total: int
    items: list[ExamTimetableOut]
