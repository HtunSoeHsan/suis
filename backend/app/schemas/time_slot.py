from datetime import time
from pydantic import BaseModel, Field, field_validator
from typing import Optional
from app.models.enums import SlotType


def normalize_slot_type(v: Optional[str]) -> Optional[str]:
    if not v:
        return v
    s = v.strip().upper()
    if s in ("CLASS", "LECTURE"):
        return SlotType.LECTURE.value
    if s == "LAB":
        return SlotType.LAB.value
    if s in ("LUNCH", "LUNCH_BREAK", "BREAK"):
        return SlotType.LUNCH_BREAK.value
    return s


class TimeSlotBase(BaseModel):
    period_number: int = Field(..., ge=1, le=20, examples=[1])
    start_time: time = Field(..., examples=["09:00:00"])
    end_time: time = Field(..., examples=["10:30:00"])
    slot_type: SlotType = Field(SlotType.LECTURE, examples=["LECTURE"])

    @field_validator("slot_type", mode="before")
    @classmethod
    def validate_slot_type(cls, v: str) -> str:
        norm = normalize_slot_type(v)
        return norm or SlotType.LECTURE.value


class TimeSlotCreate(TimeSlotBase):
    pass


class TimeSlotUpdate(BaseModel):
    period_number: Optional[int] = Field(None, ge=1, le=20)
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    slot_type: Optional[SlotType] = None

    @field_validator("slot_type", mode="before")
    @classmethod
    def validate_slot_type(cls, v: Optional[str]) -> Optional[str]:
        return normalize_slot_type(v)


class TimeSlotOut(TimeSlotBase):
    slot_id: int

    model_config = {"from_attributes": True}


class TimeSlotListOut(BaseModel):
    total: int
    items: list[TimeSlotOut]
