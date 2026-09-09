from pydantic import BaseModel, Field
from typing import Optional


class CourseBase(BaseModel):
    course_code: str = Field(..., max_length=20, examples=["CS-401"])
    dept_code: str = Field(..., max_length=20, examples=["CST"])
    course_name: str = Field(..., max_length=100, examples=["Advanced Artificial Intelligence"])
    credit_hours: int = Field(..., ge=1, le=10, examples=[4])
    teacher_id: Optional[str] = Field(None, max_length=50, examples=["TCH-2026-01"])
    major: Optional[str] = Field(None, max_length=50, description="Major this course belongs to, e.g. CST, CS, CT")
    academic_year: Optional[int] = Field(None, description="Target academic year group, e.g. 1, 2, 3, 4")
    semester_id: Optional[int] = Field(None, description="FK to semesters table — which academic semester this course belongs to")


class CourseCreate(CourseBase):
    pass


class CourseUpdate(BaseModel):
    course_code: Optional[str] = Field(None, max_length=20)
    dept_code: Optional[str] = Field(None, max_length=20)
    course_name: Optional[str] = Field(None, max_length=100)
    credit_hours: Optional[int] = Field(None, ge=1, le=10)
    teacher_id: Optional[str] = Field(None, max_length=50)
    major: Optional[str] = Field(None, max_length=50)
    academic_year: Optional[int] = Field(None)
    semester_id: Optional[int] = Field(None)



class CourseOut(CourseBase):
    model_config = {"from_attributes": True}


class CourseListOut(BaseModel):
    total: int
    items: list[CourseOut]
