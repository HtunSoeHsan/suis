from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from app.models.enums import UserRole


class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50, description="Unique username")
    email: str = Field(..., max_length=100, description="Unique email address")
    password: str = Field(..., min_length=6, max_length=128, description="Plain-text password (will be hashed)")
    role: UserRole = Field(UserRole.STUDENT, description="User role: ADMIN | TEACHER | STUDENT")
    # Optional: link this new user to an existing student or teacher record
    link_student_id: Optional[str] = Field(None, description="Student ID to link (role must be STUDENT)")
    link_teacher_id: Optional[str] = Field(None, description="Teacher ID to link (role must be TEACHER)")


class UserUpdate(BaseModel):
    username: Optional[str] = Field(None, min_length=3, max_length=50)
    email: Optional[str] = Field(None, max_length=100)
    role: Optional[UserRole] = None


class PasswordReset(BaseModel):
    new_password: str = Field(..., min_length=6, max_length=128, description="New plain-text password")


class UserDetailOut(BaseModel):
    user_id: str
    username: str
    email: str
    role: UserRole
    student_id: Optional[str] = None
    teacher_id: Optional[str] = None
    linked_name: Optional[str] = None     # full_name of linked student or teacher
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
