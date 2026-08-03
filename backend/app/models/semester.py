from typing import TYPE_CHECKING
from datetime import date
from sqlalchemy import String, Boolean, Integer, Date
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

if TYPE_CHECKING:
    from app.models.enrollment import Enrollment
    from app.models.timetable import AcademicTimetable, ExamTimetable


class Semester(Base):
    __tablename__ = "semesters"

    semester_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    academic_year: Mapped[str] = mapped_column(String(20), nullable=False)
    term: Mapped[str] = mapped_column(String(20), nullable=False)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=False)

    # Relationships
    enrollments: Mapped[list["Enrollment"]] = relationship("Enrollment", back_populates="semester", cascade="all, delete-orphan")
    timetables: Mapped[list["AcademicTimetable"]] = relationship("AcademicTimetable", back_populates="semester", cascade="all, delete-orphan")
    exams: Mapped[list["ExamTimetable"]] = relationship("ExamTimetable", back_populates="semester", cascade="all, delete-orphan")
