from typing import TYPE_CHECKING
from sqlalchemy import String, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

if TYPE_CHECKING:
    from app.models.timetable import AcademicTimetable, ExamTimetable


class Classroom(Base):
    __tablename__ = "classrooms"

    room_id: Mapped[str] = mapped_column(String(20), primary_key=True)
    room_name: Mapped[str] = mapped_column(String(100), nullable=False)
    building: Mapped[str] = mapped_column(String(100), nullable=False)
    capacity: Mapped[int] = mapped_column(Integer, default=60)
    room_type: Mapped[str] = mapped_column(String(30), default="LECTURE_HALL")

    # Relationships
    timetables: Mapped[list["AcademicTimetable"]] = relationship("AcademicTimetable", back_populates="room")
    exams: Mapped[list["ExamTimetable"]] = relationship("ExamTimetable", back_populates="room")
