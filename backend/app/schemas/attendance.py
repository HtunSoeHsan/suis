from datetime import datetime
from pydantic import BaseModel, Field
from typing import Optional, Literal
from app.models.enums import AttendanceStatus


class AttendanceLogOut(BaseModel):
    log_id: int
    student_id: str
    course_code: str
    verified_at: datetime
    confidence_score: Optional[float] = None
    status: AttendanceStatus

    model_config = {"from_attributes": True}


class AttendanceLogListOut(BaseModel):
    total: int
    items: list[AttendanceLogOut]


class AttendanceLogCreate(BaseModel):
    student_id: str
    course_code: str
    status: AttendanceStatus = AttendanceStatus.PRESENT
    confidence_score: Optional[float] = 1.0


class SingleStudentAttendanceItem(BaseModel):
    student_id: str
    status: AttendanceStatus = AttendanceStatus.PRESENT
    confidence_score: Optional[float] = 1.0


class BatchAttendanceCreate(BaseModel):
    course_code: str
    verified_at: Optional[datetime] = None
    items: list[SingleStudentAttendanceItem]


class BatchAttendanceOut(BaseModel):
    total_recorded: int
    course_code: str


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=1000)
    conversation_history: list[dict] = Field(default_factory=list)


class ChatResponse(BaseModel):
    answer: str
    sql_query: Optional[str] = None
    raw_data: Optional[list[dict]] = None
    query_type: str  # 'sql_query' | 'general_info'


class FaceEnrollRequest(BaseModel):
    image_base64: str = Field(..., description="Base64 encoded JPEG/PNG frame from webcam")


class FaceIdentifyResponse(BaseModel):
    identified: bool
    target_id: Optional[str] = None
    target_type: Optional[str] = None  # 'student' | 'teacher'
    full_name: Optional[str] = None
    dept_code: Optional[str] = None
    similarity_score: Optional[float] = None
    liveness_score: Optional[float] = None
    attendance_marked: bool = False
    message: str


class FaceRetrieveInfoResponse(BaseModel):
    identified: bool
    target_id: Optional[str] = None
    target_type: Optional[str] = None  # 'student' | 'teacher'
    similarity_score: Optional[float] = None
    liveness_score: Optional[float] = None
    profile: Optional[dict] = None
    courses: Optional[list[dict]] = None
    timetables: Optional[list[dict]] = None
    attendance_summary: Optional[dict] = None
    ai_summary: Optional[str] = None
    message: str
