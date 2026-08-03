from datetime import date
from pydantic import BaseModel, Field
from typing import Optional


class SemesterBase(BaseModel):
    academic_year: str = Field(..., max_length=20, examples=["2025-2026"])
    term: str = Field(..., max_length=30, examples=["First Semester"])
    start_date: date = Field(..., examples=["2025-11-01"])
    end_date: date = Field(..., examples=["2026-03-31"])
    is_active: bool = Field(False, examples=[True])


class SemesterCreate(SemesterBase):
    pass


class SemesterUpdate(BaseModel):
    academic_year: Optional[str] = Field(None, max_length=20)
    term: Optional[str] = Field(None, max_length=30)
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    is_active: Optional[bool] = None


class SemesterOut(SemesterBase):
    semester_id: int

    model_config = {"from_attributes": True}


class SemesterListOut(BaseModel):
    total: int
    items: list[SemesterOut]
