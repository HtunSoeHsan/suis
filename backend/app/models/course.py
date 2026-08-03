from typing import TYPE_CHECKING
from sqlalchemy import String, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

if TYPE_CHECKING:
    from app.models.department import Department
    from app.models.teacher import Teacher
    from app.models.enrollment import Enrollment
    from app.models.timetable import AcademicTimetable, ExamTimetable
    from app.models.attendance import AttendanceLog


class Course(Base):
    __tablename__ = "courses"

    course_code: Mapped[str] = mapped_column(String(20), primary_key=True)
    dept_code: Mapped[str] = mapped_column(String(20), ForeignKey("departments.dept_code", ondelete="CASCADE"), nullable=False)
    course_name: Mapped[str] = mapped_column(String(100), nullable=False)
    credit_hours: Mapped[int] = mapped_column(Integer, nullable=False)
    teacher_id: Mapped[str | None] = mapped_column(String(50), ForeignKey("teachers.teacher_id", ondelete="SET NULL"))

    # Relationships
    department: Mapped["Department"] = relationship("Department", back_populates="courses")
    teacher: Mapped["Teacher"] = relationship("Teacher", back_populates="courses")
    enrollments: Mapped[list["Enrollment"]] = relationship("Enrollment", back_populates="course", cascade="all, delete-orphan")
    timetables: Mapped[list["AcademicTimetable"]] = relationship("AcademicTimetable", back_populates="course", cascade="all, delete-orphan")
    exams: Mapped[list["ExamTimetable"]] = relationship("ExamTimetable", back_populates="course", cascade="all, delete-orphan")
    attendance_logs: Mapped[list["AttendanceLog"]] = relationship("AttendanceLog", back_populates="course", cascade="all, delete-orphan")
