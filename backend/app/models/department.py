from typing import TYPE_CHECKING
from datetime import datetime
from sqlalchemy import String, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import TIMESTAMP
from app.database import Base

if TYPE_CHECKING:
    from app.models.teacher import Teacher
    from app.models.student import Student
    from app.models.course import Course

TIMESTAMPTZ = TIMESTAMP(timezone=True)


class Department(Base):
    __tablename__ = "departments"

    dept_code: Mapped[str] = mapped_column(String(20), primary_key=True)
    dept_name: Mapped[str] = mapped_column(String(100), nullable=False)
    building_location: Mapped[str | None] = mapped_column(String(100))
    head_teacher_id: Mapped[str | None] = mapped_column(String(50), ForeignKey("teachers.teacher_id", ondelete="SET NULL"), unique=True)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMPTZ, default=datetime.utcnow)

    # Relationships
    head_teacher: Mapped["Teacher"] = relationship("Teacher", foreign_keys=[head_teacher_id], post_update=True)
    teachers: Mapped[list["Teacher"]] = relationship("Teacher", foreign_keys="Teacher.dept_code", back_populates="department")
    students: Mapped[list["Student"]] = relationship("Student", back_populates="department")
    courses: Mapped[list["Course"]] = relationship("Course", back_populates="department")
