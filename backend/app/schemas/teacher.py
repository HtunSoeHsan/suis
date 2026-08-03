from datetime import datetime, date
from pydantic import BaseModel, Field
from typing import Optional, Literal


class TeacherBase(BaseModel):
    dept_code: str = Field(..., max_length=20, examples=["CST"])
    full_name: str = Field(..., max_length=100, examples=["Dr. Smith Johnson"])
    designation: str = Field(..., max_length=50, examples=["Professor"])
    phone: Optional[str] = Field(None, max_length=20, examples=["+95912345678"])

    # Extended Profile Fields
    email: Optional[str] = Field(None, max_length=100)
    nrc_number: Optional[str] = Field(None, max_length=50)
    gender: Optional[Literal["Male", "Female", "Other"]] = None
    qualification: Optional[str] = Field(None, max_length=100)
    specialization: Optional[str] = Field(None, max_length=100)
    joining_date: Optional[date] = None
    status: Optional[Literal["Active", "On Leave", "Retired", "Resigned"]] = "Active"
    address: Optional[str] = Field(None, max_length=255)

    user_id: Optional[str] = Field(None, max_length=50)


class TeacherCreate(TeacherBase):
    teacher_id: Optional[str] = Field(None, max_length=50, examples=["TCH-2026-CST-001"])


class TeacherUpdate(BaseModel):
    dept_code: Optional[str] = Field(None, max_length=20)
    full_name: Optional[str] = Field(None, max_length=100)
    designation: Optional[str] = Field(None, max_length=50)
    phone: Optional[str] = Field(None, max_length=20)

    email: Optional[str] = Field(None, max_length=100)
    nrc_number: Optional[str] = Field(None, max_length=50)
    gender: Optional[Literal["Male", "Female", "Other"]] = None
    qualification: Optional[str] = Field(None, max_length=100)
    specialization: Optional[str] = Field(None, max_length=100)
    joining_date: Optional[date] = None
    status: Optional[Literal["Active", "On Leave", "Retired", "Resigned"]] = None
    address: Optional[str] = Field(None, max_length=255)

    is_face_registered: Optional[bool] = None


class TeacherOut(TeacherBase):
    teacher_id: str
    is_face_registered: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class TeacherListOut(BaseModel):
    total: int
    items: list[TeacherOut]
