from typing import TYPE_CHECKING
from datetime import datetime
from sqlalchemy import String, Integer, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import TIMESTAMP
from app.database import Base
from app.models.enums import EnrollmentType

if TYPE_CHECKING:
    from app.models.user import User

TIMESTAMPTZ = TIMESTAMP(timezone=True)


class FaceEnrollmentLog(Base):
    __tablename__ = "face_enrollment_logs"

    log_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    target_user_type: Mapped[str] = mapped_column(String(20), nullable=False)  # 'student' | 'teacher'
    target_id: Mapped[str] = mapped_column(String(50), nullable=False)
    registered_by_user_id: Mapped[str | None] = mapped_column(String(50), ForeignKey("users.user_id", ondelete="SET NULL"))
    enrollment_type: Mapped[EnrollmentType] = mapped_column(SQLEnum(EnrollmentType, name="enrollment_type"), nullable=False)
    action_timestamp: Mapped[datetime] = mapped_column(TIMESTAMPTZ, default=datetime.utcnow)

    # Relationships
    registered_by: Mapped["User"] = relationship("User")
