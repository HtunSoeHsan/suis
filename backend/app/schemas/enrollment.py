from datetime import datetime
from pydantic import BaseModel, Field


from typing import Optional

class EnrollmentBase(BaseModel):
    student_id: str = Field(..., max_length=50, examples=["STU-2026-1001"])
    course_code: str = Field(..., max_length=20, examples=["CS-401"])
    semester_id: int = Field(..., examples=[1])


class EnrollmentCreate(EnrollmentBase):
    promote_academic_year: Optional[int] = Field(None, ge=1, le=5, description="Optionally update student's academic year upon enrollment")


class EnrollmentOut(EnrollmentBase):
    enrollment_id: int
    enrolled_at: datetime

    model_config = {"from_attributes": True}


class EnrollmentListOut(BaseModel):
    total: int
    items: list[EnrollmentOut]


class BatchEnrollmentCreate(BaseModel):
    student_ids: list[str] = Field(..., min_length=1)
    course_codes: list[str] = Field(..., min_length=1)
    semester_id: int
    promote_academic_year: Optional[int] = Field(None, ge=1, le=5)


class BatchEnrollmentOut(BaseModel):
    total_enrolled: int
    enrolled_student_count: int
    enrolled_course_count: int
    promoted_academic_year: Optional[int] = None
