from datetime import time
from pydantic import BaseModel, Field
from typing import Optional


class TimeSlotBase(BaseModel):
    period_number: int = Field(..., ge=1, le=20, examples=[1])
    start_time: time = Field(..., examples=["09:00:00"])
    end_time: time = Field(..., examples=["10:30:00"])
    slot_type: str = Field("class", max_length=20, examples=["class"])


class TimeSlotCreate(TimeSlotBase):
    pass


class TimeSlotUpdate(BaseModel):
    period_number: Optional[int] = Field(None, ge=1, le=20)
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    slot_type: Optional[str] = Field(None, max_length=20)


class TimeSlotOut(TimeSlotBase):
    slot_id: int

    model_config = {"from_attributes": True}


class TimeSlotListOut(BaseModel):
    total: int
    items: list[TimeSlotOut]
