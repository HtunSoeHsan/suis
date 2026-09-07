from typing import TYPE_CHECKING
from datetime import datetime, date
from sqlalchemy import String, Boolean, Integer, Float, Date, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import TIMESTAMP
from pgvector.sqlalchemy import Vector
from app.database import Base

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.department import Department
    from app.models.enrollment import Enrollment
    from app.models.attendance import AttendanceLog

TIMESTAMPTZ = TIMESTAMP(timezone=True)


class Student(Base):
    __tablename__ = "students"

    student_id: Mapped[str] = mapped_column(String(50), primary_key=True)
    user_id: Mapped[str | None] = mapped_column(String(50), ForeignKey("users.user_id", ondelete="SET NULL"), unique=True)
    dept_code: Mapped[str] = mapped_column(String(20), ForeignKey("departments.dept_code", ondelete="RESTRICT"), nullable=False)
    full_name: Mapped[str] = mapped_column(String(100), nullable=False)
    academic_year: Mapped[int] = mapped_column(Integer, nullable=False)
    roll_number: Mapped[str] = mapped_column(String(20), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(20))
    section: Mapped[str | None] = mapped_column(String(5), nullable=True)  # Section A, B, C

    # Extended Profile Fields
    email: Mapped[str | None] = mapped_column(String(100))
    nrc_number: Mapped[str | None] = mapped_column(String(50))
    gender: Mapped[str | None] = mapped_column(String(10))
    date_of_birth: Mapped[date | None] = mapped_column(Date)
    blood_type: Mapped[str | None] = mapped_column(String(5))
    address: Mapped[str | None] = mapped_column(String(255))
    guardian_name: Mapped[str | None] = mapped_column(String(100))
    guardian_phone: Mapped[str | None] = mapped_column(String(20))
    admission_year: Mapped[int | None] = mapped_column(Integer)
    current_semester: Mapped[int | None] = mapped_column(Integer, default=1)
    status: Mapped[str] = mapped_column(String(20), default="Active")  # Active, Graduated, Suspended, Dropped
    major: Mapped[str | None] = mapped_column(String(100))

    attendance_rate: Mapped[float] = mapped_column(Float, default=100.0)
    cgpa: Mapped[float | None] = mapped_column(Float, default=0.0)
    face_embedding: Mapped[list | None] = mapped_column(Vector(512))
    is_face_registered: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMPTZ, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(TIMESTAMPTZ, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="student")
    department: Mapped["Department"] = relationship("Department", back_populates="students")
    enrollments: Mapped[list["Enrollment"]] = relationship("Enrollment", back_populates="student", cascade="all, delete-orphan")
    attendance_logs: Mapped[list["AttendanceLog"]] = relationship("AttendanceLog", back_populates="student", cascade="all, delete-orphan")
