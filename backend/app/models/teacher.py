from typing import TYPE_CHECKING
from datetime import datetime, date
from sqlalchemy import String, Boolean, ForeignKey, Date
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import TIMESTAMP
from pgvector.sqlalchemy import Vector
from app.database import Base

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.department import Department
    from app.models.course import Course

TIMESTAMPTZ = TIMESTAMP(timezone=True)


class Teacher(Base):
    __tablename__ = "teachers"

    teacher_id: Mapped[str] = mapped_column(String(50), primary_key=True)
    user_id: Mapped[str | None] = mapped_column(String(50), ForeignKey("users.user_id", ondelete="SET NULL"), unique=True)
    dept_code: Mapped[str] = mapped_column(String(20), ForeignKey("departments.dept_code", ondelete="RESTRICT"), nullable=False)
    full_name: Mapped[str] = mapped_column(String(100), nullable=False)
    designation: Mapped[str] = mapped_column(String(50), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(20))

    # Extended Profile Fields
    email: Mapped[str | None] = mapped_column(String(100))
    nrc_number: Mapped[str | None] = mapped_column(String(50))
    gender: Mapped[str | None] = mapped_column(String(10))
    qualification: Mapped[str | None] = mapped_column(String(100))
    specialization: Mapped[str | None] = mapped_column(String(100))
    joining_date: Mapped[date | None] = mapped_column(Date)
    status: Mapped[str] = mapped_column(String(20), default="Active")  # Active, On Leave, Retired, Resigned
    address: Mapped[str | None] = mapped_column(String(255))

    face_embedding: Mapped[list | None] = mapped_column(Vector(512))
    is_face_registered: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMPTZ, default=datetime.utcnow)

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="teacher")
    department: Mapped["Department"] = relationship("Department", foreign_keys=[dept_code], back_populates="teachers")
    courses: Mapped[list["Course"]] = relationship("Course", back_populates="teacher")
