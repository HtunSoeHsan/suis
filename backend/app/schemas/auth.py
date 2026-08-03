from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from app.models.enums import UserRole


class LoginRequest(BaseModel):
    username: str = Field(..., description="Username or email address", min_length=1)
    password: str = Field(..., description="User password", min_length=1)


class UserOut(BaseModel):
    user_id: str
    username: str
    email: str
    role: UserRole
    student_id: Optional[str] = None
    teacher_id: Optional[str] = None

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut
