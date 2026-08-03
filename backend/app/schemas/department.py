from datetime import datetime
from pydantic import BaseModel, Field
from typing import Optional


class DepartmentBase(BaseModel):
    dept_code: str = Field(..., max_length=20, examples=["CST"])
    dept_name: str = Field(..., max_length=100, examples=["Computer Science & Technology"])
    building_location: Optional[str] = Field(None, max_length=100, examples=["Building A - Science Complex"])
    head_teacher_id: Optional[str] = Field(None, max_length=50, examples=["TCH-2026-01"])


class DepartmentCreate(DepartmentBase):
    pass


class DepartmentUpdate(BaseModel):
    dept_name: Optional[str] = Field(None, max_length=100)
    building_location: Optional[str] = Field(None, max_length=100)
    head_teacher_id: Optional[str] = Field(None, max_length=50)


class DepartmentOut(DepartmentBase):
    created_at: datetime

    model_config = {"from_attributes": True}


class DepartmentListOut(BaseModel):
    total: int
    items: list[DepartmentOut]
