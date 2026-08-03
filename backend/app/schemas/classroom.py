from pydantic import BaseModel, Field
from typing import Optional


class ClassroomBase(BaseModel):
    room_id: str = Field(..., max_length=20, examples=["ROOM-101"])
    room_name: str = Field(..., max_length=100, examples=["Lab 1 - AI Research"])
    building: str = Field(..., max_length=100, examples=["Main Academic Building"])
    capacity: int = Field(..., ge=1, examples=[60])
    room_type: str = Field("Classroom", max_length=20, examples=["Lab"])


class ClassroomCreate(ClassroomBase):
    pass


class ClassroomUpdate(BaseModel):
    room_name: Optional[str] = Field(None, max_length=100)
    building: Optional[str] = Field(None, max_length=100)
    capacity: Optional[int] = Field(None, ge=1)
    room_type: Optional[str] = Field(None, max_length=20)


class ClassroomOut(ClassroomBase):
    model_config = {"from_attributes": True}


class ClassroomListOut(BaseModel):
    total: int
    items: list[ClassroomOut]
