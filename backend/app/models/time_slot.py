from typing import TYPE_CHECKING
from datetime import time
from sqlalchemy import Integer, Time, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base
from app.models.enums import SlotType

if TYPE_CHECKING:
    from app.models.timetable import AcademicTimetable


class TimeSlot(Base):
    __tablename__ = "time_slots"

    slot_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    period_number: Mapped[int] = mapped_column(Integer, nullable=False)
    start_time: Mapped[time] = mapped_column(Time, nullable=False)
    end_time: Mapped[time] = mapped_column(Time, nullable=False)
    slot_type: Mapped[SlotType] = mapped_column(SQLEnum(SlotType, name="slot_type"), default=SlotType.LECTURE, nullable=False)

    # Relationships
    timetables: Mapped[list["AcademicTimetable"]] = relationship("AcademicTimetable", back_populates="time_slot")
