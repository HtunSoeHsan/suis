from datetime import datetime, date
from pydantic import BaseModel, Field
from typing import Optional, Literal


class StudentBase(BaseModel):
    dept_code: str = Field(..., max_length=20, examples=["CST"])
    full_name: str = Field(..., max_length=100, examples=["Mg Mg"])
    academic_year: int = Field(..., ge=1, le=5, examples=[4])
    roll_number: str = Field(..., max_length=20, examples=["R001"])
    phone: Optional[str] = Field(None, max_length=20, examples=["+95912345678"])
    section: Optional[Literal["A", "B", "C"]] = Field(None, description="Class section: A, B, or C")

    # Extended Profile Fields
    email: Optional[str] = Field(None, max_length=100)
    nrc_number: Optional[str] = Field(None, max_length=50)
    gender: Optional[Literal["Male", "Female", "Other"]] = None
    date_of_birth: Optional[date] = None
    blood_type: Optional[Literal["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"]] = None
    address: Optional[str] = Field(None, max_length=255)
    guardian_name: Optional[str] = Field(None, max_length=100)
    guardian_phone: Optional[str] = Field(None, max_length=20)
    admission_year: Optional[int] = Field(None, ge=2000, le=2035)
    current_semester: Optional[int] = Field(None, ge=1, le=10, description="Current semester (1, 2, etc.)")
    status: Optional[Literal["Active", "Graduated", "Suspended", "Dropped"]] = "Active"
    major: Optional[str] = Field(None, max_length=100)
    cgpa: Optional[float] = Field(None, ge=0.0, le=4.0, examples=[3.5])

    user_id: Optional[str] = Field(None, max_length=50)


class StudentCreate(StudentBase):
    student_id: Optional[str] = Field(None, max_length=50, examples=["STU-2026-CST-0001"])
    roll_number: Optional[str] = Field(None, max_length=20, examples=["R001"])
    attendance_rate: Optional[float] = 100.0


class StudentUpdate(BaseModel):
    dept_code: Optional[str] = Field(None, max_length=20)
    full_name: Optional[str] = Field(None, max_length=100)
    academic_year: Optional[int] = Field(None, ge=1, le=5)
    current_semester: Optional[int] = Field(None, ge=1, le=10)
    roll_number: Optional[str] = Field(None, max_length=20)
    phone: Optional[str] = Field(None, max_length=20)
    section: Optional[Literal["A", "B", "C"]] = None

    email: Optional[str] = Field(None, max_length=100)
    nrc_number: Optional[str] = Field(None, max_length=50)
    gender: Optional[Literal["Male", "Female", "Other"]] = None
    date_of_birth: Optional[date] = None
    blood_type: Optional[Literal["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"]] = None
    address: Optional[str] = Field(None, max_length=255)
    guardian_name: Optional[str] = Field(None, max_length=100)
    guardian_phone: Optional[str] = Field(None, max_length=20)
    admission_year: Optional[int] = Field(None, ge=2000, le=2035)
    status: Optional[Literal["Active", "Graduated", "Suspended", "Dropped"]] = None
    major: Optional[str] = Field(None, max_length=100)
    cgpa: Optional[float] = Field(None, ge=0.0, le=4.0)

    attendance_rate: Optional[float] = None
    is_face_registered: Optional[bool] = None


class StudentOut(StudentBase):
    student_id: str
    attendance_rate: float
    is_face_registered: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class StudentListOut(BaseModel):
    total: int
    items: list[StudentOut]
