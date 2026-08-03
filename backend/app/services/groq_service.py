"""
Groq Text-to-SQL + chatbot service.

Two-pass approach:
  Pass 1: Groq converts natural language → SQL (SELECT only)
  Pass 2: Groq formats raw DB result → human-readable answer
"""
import json
from groq import AsyncGroq
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.config import get_settings
from app.core.sql_guard import validate_sql

settings = get_settings()

# ─── DB Schema context injected into every chatbot prompt ────────────────────
DB_SCHEMA_CONTEXT = """
You have access to a PostgreSQL university management database for UCSP / University system. Schema:

TABLE users:
  user_id VARCHAR(50) PK, username VARCHAR(50), email VARCHAR(100), role ('ADMIN'|'TEACHER'|'STUDENT')

TABLE departments:
  dept_code VARCHAR(20) PK (e.g. 'CST', 'SE', 'CS'), dept_name VARCHAR(100), building_location VARCHAR(100), head_teacher_id VARCHAR(50) FK

TABLE teachers:
  teacher_id VARCHAR(50) PK (e.g. 'TCH-2026-CST-001'), user_id VARCHAR(50) FK, dept_code VARCHAR(20) FK, full_name VARCHAR(100),
  designation VARCHAR(50), phone VARCHAR(20), email VARCHAR(100), nrc_number VARCHAR(50), gender VARCHAR(10),
  qualification VARCHAR(100), specialization VARCHAR(100), joining_date DATE, status VARCHAR(20) ('ACTIVE'|'ON_LEAVE'|'RETIRED'|'RESIGNED'),
  address TEXT, is_face_registered BOOL

TABLE students:
  student_id VARCHAR(50) PK (e.g. 'STU-2026-CST-001'), user_id VARCHAR(50) FK, dept_code VARCHAR(20) FK, full_name VARCHAR(100),
  academic_year INT (1 to 5), section VARCHAR(10) ('A'|'B'|'C'), roll_number VARCHAR(20) (e.g. 'R001'), phone VARCHAR(20),
  email VARCHAR(100), nrc_number VARCHAR(50), gender VARCHAR(10), date_of_birth DATE, blood_type VARCHAR(5),
  address TEXT, guardian_name VARCHAR(100), guardian_phone VARCHAR(20), admission_year INT,
  status VARCHAR(20) ('ACTIVE'|'INACTIVE'|'GRADUATED'|'SUSPENDED'|'DROPPED'), major VARCHAR(100),
  attendance_rate FLOAT, is_face_registered BOOL

TABLE semesters:
  semester_id INT PK, academic_year VARCHAR(20) (e.g. '2025-2026'), term VARCHAR(20) (e.g. 'First Semester'), start_date DATE, end_date DATE, is_active BOOL

TABLE courses:
  course_code VARCHAR(20) PK (e.g. 'CST-101'), dept_code VARCHAR(20) FK, course_name VARCHAR(100), credit_hours INT, teacher_id VARCHAR(50) FK

TABLE enrollments:
  enrollment_id BIGINT PK, student_id VARCHAR(50) FK, course_code VARCHAR(20) FK, semester_id INT FK, enrolled_at TIMESTAMPTZ

TABLE classrooms:
  room_id VARCHAR(20) PK (e.g. 'ROOM-101'), room_name VARCHAR(100), building VARCHAR(100), capacity INT, room_type VARCHAR(30) ('LECTURE_HALL'|'LAB'|'EXAM_HALL'|'SEMINAR')

TABLE time_slots:
  slot_id INT PK, period_number INT, start_time TIME, end_time TIME, slot_type ('LECTURE'|'LAB'|'LUNCH_BREAK')

TABLE academic_timetables:
  timetable_id BIGINT PK, semester_id INT FK, course_code VARCHAR(20) FK, teacher_id VARCHAR(50) FK,
  room_id VARCHAR(20) FK, slot_id INT FK, day_of_week VARCHAR(10) ('Monday'..'Friday'), academic_year INT (1..5)

TABLE exam_timetables:
  exam_id BIGINT PK, semester_id INT FK, course_code VARCHAR(20) FK, room_id VARCHAR(20) FK,
  exam_date DATE, start_time TIME, end_time TIME, supervisor_teacher_id VARCHAR(50) FK

TABLE attendance_logs:
  log_id BIGINT PK, student_id VARCHAR(50) FK, course_code VARCHAR(20) FK, verified_at TIMESTAMPTZ,
  confidence_score FLOAT, status ('PRESENT'|'LATE'|'ABSENT')

TABLE face_enrollment_logs:
  log_id INT PK, target_user_type VARCHAR(20), target_id VARCHAR(50), registered_by_user_id VARCHAR(50),
  enrollment_type ('INITIAL'|'DEFERRED'), action_timestamp TIMESTAMPTZ

TABLE university_info:
  id UUID PK, category VARCHAR(50), title VARCHAR(200), content TEXT, valid_from DATE, valid_to DATE

COMMON JOINS:
- Join students with departments: students.dept_code = departments.dept_code
- Join teachers with departments: teachers.dept_code = departments.dept_code
- Join enrollments with students: enrollments.student_id = students.student_id
- Join enrollments with courses: enrollments.course_code = courses.course_code
- Join timetables with courses: academic_timetables.course_code = courses.course_code

IMPORTANT RULES:
- Return ONLY a raw SQL SELECT statement. No explanation, no markdown fences.
- Never use DROP, DELETE, UPDATE, INSERT, CREATE, ALTER, TRUNCATE or any DML/DDL.
- Use ILIKE for case-insensitive string matching.
- Limit results to 100 rows unless user specifies a larger count.
"""

SYSTEM_PROMPT_SQL = f"""You are a PostgreSQL expert for a university management system.
{DB_SCHEMA_CONTEXT}
Convert the user's question into a valid PostgreSQL SELECT query. Return ONLY the SQL statement."""

SYSTEM_PROMPT_EXPLAIN = """You are a helpful university assistant for SUIS.
Given a user query and SQL query result as JSON, explain the answer in a clear, concise, friendly response.
If the question is in Myanmar language, answer in Myanmar language.
If the result is empty, clearly state that no records were found.
Format numbers, dates, and lists cleanly. Do not mention SQL syntax or internal database technical terms."""

SYSTEM_PROMPT_GENERAL = """You are a smart, friendly university information assistant for SUIS.
Answer questions about university policies, schedules, regulations, departments, and general info.
If the user asks in Myanmar language, reply in clear, polite Myanmar language."""


class GroqChatService:
    def __init__(self):
        self.api_key = settings.GROQ_API_KEY.strip() if settings.GROQ_API_KEY else ""
        self.client = AsyncGroq(api_key=self.api_key) if self.api_key else None
        self.model = settings.GROQ_MODEL

    async def _call_groq(self, system: str, user: str, temperature: float = 0.1) -> str:
        if not self.client or not self.api_key:
            raise ValueError("GROQ_API_KEY is not configured.")

        response = await self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            temperature=temperature,
            max_tokens=1024,
        )
        return response.choices[0].message.content.strip()

    async def _is_data_query(self, message: str) -> bool:
        """Quick classifier: does the user want DB data or general info?"""
        try:
            probe = await self._call_groq(
                system="You are a classifier. Reply with exactly 'DATA' if the question requires querying a university database for student, teacher, department, course, classroom, attendance, or timetable data. Reply with 'INFO' for general university policy or greeting questions.",
                user=message,
                temperature=0.0,
            )
            return probe.strip().upper().startswith("DATA")
        except Exception:
            return True

    async def chat(self, message: str, db: AsyncSession) -> dict:
        if not self.api_key:
            return {
                "answer": "⚠️ **GROQ_API_KEY is missing.** Please add `GROQ_API_KEY=your_key_here` to your `backend/.env` file to enable the Groq AI Chatbot.",
                "sql_query": None,
                "raw_data": None,
                "query_type": "config_error",
            }

        try:
            needs_data = await self._is_data_query(message)

            if needs_data:
                # Pass 1: generate SQL
                raw_sql = await self._call_groq(SYSTEM_PROMPT_SQL, message, temperature=0.0)
                safe_sql = validate_sql(raw_sql)  # raises HTTPException if unsafe

                # Execute query
                try:
                    result = await db.execute(text(safe_sql))
                    keys = list(result.keys())
                    rows = [dict(zip(keys, row)) for row in result.fetchall()]
                    rows_serializable = [
                        {k: str(v) if not isinstance(v, (str, int, float, bool, type(None))) else v
                         for k, v in row.items()}
                        for row in rows
                    ]
                except Exception as e:
                    return {
                        "answer": f"Sorry, I could not execute the query: {str(e)}",
                        "sql_query": safe_sql,
                        "raw_data": None,
                        "query_type": "sql_query",
                    }

                # Pass 2: format result
                context = f"User Question: {message}\nSQL Query: {safe_sql}\nResult ({len(rows)} rows): {json.dumps(rows_serializable[:20], indent=2)}"
                answer = await self._call_groq(SYSTEM_PROMPT_EXPLAIN, context, temperature=0.3)

                return {
                    "answer": answer,
                    "sql_query": safe_sql,
                    "raw_data": rows_serializable[:50],
                    "query_type": "sql_query",
                }
            else:
                # General university info: fetch relevant rows from university_info
                info_result = await db.execute(
                    text("SELECT title, content FROM university_info ORDER BY valid_from DESC LIMIT 20")
                )
                info_rows = info_result.fetchall()
                context = "\n".join([f"- {r[0]}: {r[1]}" for r in info_rows])

                answer = await self._call_groq(
                    SYSTEM_PROMPT_GENERAL,
                    f"University info:\n{context}\n\nUser question: {message}",
                    temperature=0.4,
                )
                return {
                    "answer": answer,
                    "sql_query": None,
                    "raw_data": None,
                    "query_type": "general_info",
                }
        except Exception as e:
            return {
                "answer": f"⚠️ **AI Service Error**: {str(e)}. Please check your `GROQ_API_KEY` in `backend/.env`.",
                "sql_query": None,
                "raw_data": None,
                "query_type": "error",
            }


_service: GroqChatService | None = None


def get_groq_service() -> GroqChatService:
    global _service
    if _service is None:
        _service = GroqChatService()
    return _service
