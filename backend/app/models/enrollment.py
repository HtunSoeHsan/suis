from typing import TYPE_CHECKING
from datetime import datetime
from sqlalchemy import String, Integer, BigInteger, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import TIMESTAMP
from app.database import Base

if TYPE_CHECKING:
    from app.models.student import Student
    from app.models.course import Course
    from app.models.semester import Semester

TIMESTAMPTZ = TIMESTAMP(timezone=True)


class Enrollment(Base):
    __tablename__ = "enrollments"
    __table_args__ = (
        UniqueConstraint("student_id", "course_code", "semester_id", name="uq_student_course_semester"),
    )

    enrollment_id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    student_id: Mapped[str] = mapped_column(String(50), ForeignKey("students.student_id", ondelete="CASCADE"), nullable=False)
    course_code: Mapped[str] = mapped_column(String(20), ForeignKey("courses.course_code", ondelete="CASCADE"), nullable=False)
    semester_id: Mapped[int] = mapped_column(Integer, ForeignKey("semesters.semester_id", ondelete="CASCADE"), nullable=False)
    enrolled_at: Mapped[datetime] = mapped_column(TIMESTAMPTZ, default=datetime.utcnow)

    # Relationships
    student: Mapped["Student"] = relationship("Student", back_populates="enrollments")
    course: Mapped["Course"] = relationship("Course", back_populates="enrollments")
    semester: Mapped["Semester"] = relationship("Semester", back_populates="enrollments")
