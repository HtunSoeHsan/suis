from typing import TYPE_CHECKING
import uuid
from datetime import datetime
from sqlalchemy import String, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import TIMESTAMP
from app.database import Base
from app.models.enums import UserRole

if TYPE_CHECKING:
    from app.models.student import Student
    from app.models.teacher import Teacher

TIMESTAMPTZ = TIMESTAMP(timezone=True)


class User(Base):
    __tablename__ = "users"

    user_id: Mapped[str] = mapped_column(String(50), primary_key=True, default=lambda: f"usr-{uuid.uuid4().hex[:12]}")
    username: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    email: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(SQLEnum(UserRole, name="user_role"), default=UserRole.STUDENT, nullable=False)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMPTZ, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(TIMESTAMPTZ, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    student: Mapped["Student"] = relationship("Student", back_populates="user", uselist=False)
    teacher: Mapped["Teacher"] = relationship("Teacher", back_populates="user", uselist=False)
