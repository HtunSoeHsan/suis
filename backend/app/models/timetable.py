from datetime import date, time
from typing import TYPE_CHECKING
from sqlalchemy import String, Integer, BigInteger, Date, Time, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

if TYPE_CHECKING:
    from app.models.semester import Semester
    from app.models.course import Course
    from app.models.teacher import Teacher
    from app.models.classroom import Classroom
    from app.models.time_slot import TimeSlot



class AcademicTimetable(Base):
    __tablename__ = "academic_timetables"
    __table_args__ = (
        UniqueConstraint("room_id", "slot_id", "day_of_week", "semester_id", name="uq_room_slot_day_sem"),
        UniqueConstraint("teacher_id", "slot_id", "day_of_week", "semester_id", name="uq_teacher_slot_day_sem"),
    )

    timetable_id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    semester_id: Mapped[int] = mapped_column(Integer, ForeignKey("semesters.semester_id", ondelete="CASCADE"), nullable=False)
    course_code: Mapped[str] = mapped_column(String(20), ForeignKey("courses.course_code", ondelete="CASCADE"), nullable=False)
    teacher_id: Mapped[str] = mapped_column(String(50), ForeignKey("teachers.teacher_id", ondelete="CASCADE"), nullable=False)
    room_id: Mapped[str] = mapped_column(String(20), ForeignKey("classrooms.room_id", ondelete="RESTRICT"), nullable=False)
    slot_id: Mapped[int] = mapped_column(Integer, ForeignKey("time_slots.slot_id", ondelete="RESTRICT"), nullable=False)
    day_of_week: Mapped[str] = mapped_column(String(10), nullable=False)
    academic_year: Mapped[int] = mapped_column(Integer, nullable=False)

    # Relationships
    semester: Mapped["Semester"] = relationship("Semester", back_populates="timetables")
    course: Mapped["Course"] = relationship("Course", back_populates="timetables")
    teacher: Mapped["Teacher"] = relationship("Teacher")
    room: Mapped["Classroom"] = relationship("Classroom", back_populates="timetables")
    time_slot: Mapped["TimeSlot"] = relationship("TimeSlot", back_populates="timetables")


class ExamTimetable(Base):
    __tablename__ = "exam_timetables"
    __table_args__ = (
        UniqueConstraint("room_id", "exam_date", "start_time", name="uq_room_date_time"),
    )

    exam_id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    semester_id: Mapped[int] = mapped_column(Integer, ForeignKey("semesters.semester_id", ondelete="CASCADE"), nullable=False)
    course_code: Mapped[str] = mapped_column(String(20), ForeignKey("courses.course_code", ondelete="CASCADE"), nullable=False)
    room_id: Mapped[str] = mapped_column(String(20), ForeignKey("classrooms.room_id", ondelete="RESTRICT"), nullable=False)
    exam_date: Mapped[date] = mapped_column(Date, nullable=False)
    start_time: Mapped[time] = mapped_column(Time, nullable=False)
    end_time: Mapped[time] = mapped_column(Time, nullable=False)
    supervisor_teacher_id: Mapped[str | None] = mapped_column(String(50), ForeignKey("teachers.teacher_id", ondelete="SET NULL"))

    # Relationships
    semester: Mapped["Semester"] = relationship("Semester", back_populates="exams")
    course: Mapped["Course"] = relationship("Course", back_populates="exams")
    room: Mapped["Classroom"] = relationship("Classroom", back_populates="exams")
    supervisor: Mapped["Teacher"] = relationship("Teacher")
