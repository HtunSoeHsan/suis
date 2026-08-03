from typing import TYPE_CHECKING
from datetime import datetime
from sqlalchemy import String, Float, BigInteger, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import TIMESTAMP
from app.database import Base
from app.models.enums import AttendanceStatus

if TYPE_CHECKING:
    from app.models.student import Student
    from app.models.course import Course

TIMESTAMPTZ = TIMESTAMP(timezone=True)


class AttendanceLog(Base):
    __tablename__ = "attendance_logs"

    log_id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    student_id: Mapped[str] = mapped_column(String(50), ForeignKey("students.student_id", ondelete="CASCADE"), nullable=False, index=True)
    course_code: Mapped[str] = mapped_column(String(20), ForeignKey("courses.course_code", ondelete="CASCADE"), nullable=False, index=True)
    verified_at: Mapped[datetime] = mapped_column(TIMESTAMPTZ, default=datetime.utcnow)
    confidence_score: Mapped[float | None] = mapped_column(Float)
    status: Mapped[AttendanceStatus] = mapped_column(SQLEnum(AttendanceStatus, name="attendance_status"), default=AttendanceStatus.PRESENT, nullable=False)

    # Relationships
    student: Mapped["Student"] = relationship("Student", back_populates="attendance_logs")
    course: Mapped["Course"] = relationship("Course", back_populates="attendance_logs")
