import uuid
from datetime import datetime
from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID, TIMESTAMP

TIMESTAMPTZ = TIMESTAMP(timezone=True)
from pgvector.sqlalchemy import Vector
from app.database import Base


class FaceEmbedding(Base):
    __tablename__ = "face_embeddings"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    person_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    person_type: Mapped[str] = mapped_column(String(10), nullable=False)  # 'student' | 'teacher'
    embedding: Mapped[list] = mapped_column(Vector(512), nullable=False)
    enrolled_at: Mapped[datetime] = mapped_column(TIMESTAMPTZ, default=datetime.utcnow)
