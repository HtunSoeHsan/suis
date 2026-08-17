"""
Groq Text-to-SQL + chatbot service.

Two-pass approach:
  Pass 1: Groq converts natural language → SQL (SELECT only)
  Pass 2: Groq formats raw DB result → human-readable answer
"""
import json
import httpx
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
  student_id VARCHAR(50) PK (e.g. 'STU-2026-CST-001'), user_id VARCHAR(50) FK, major VARCHAR(20) ('CS'|'CT'|'CST'), dept_code VARCHAR(20), full_name VARCHAR(100),
  academic_year INT (1 to 5), section VARCHAR(10) ('A'|'B'|'C'), roll_number VARCHAR(20) (e.g. 'R001'), phone VARCHAR(20),
  email VARCHAR(100), nrc_number VARCHAR(50), gender VARCHAR(10), date_of_birth DATE, blood_type VARCHAR(5),
  address TEXT, guardian_name VARCHAR(100), guardian_phone VARCHAR(20), admission_year INT,
  status VARCHAR(20) ('ACTIVE'|'INACTIVE'|'GRADUATED'|'SUSPENDED'|'DROPPED'),
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
- Limit results to 100 rows unless user specifies a larger count.
- NAME SEARCHING & WILDCARDS: All name queries on `full_name` MUST use `ILIKE '%<name>%'` with leading and trailing `%` wildcards (never exact `=`). DB names often contain prefixes like 'Mg', 'Ma', 'U', 'Daw', 'Ko' (e.g., 'Mg Aung Aung').
- MYANMAR NAME TRANSLITERATION: All names in the database are stored in ENGLISH text (e.g., 'Aung Aung', 'Kyaw Kyaw', 'Mg Mg', 'Thida', 'Su Su', 'Htet Htet'). If the user query contains a name written in Myanmar script (e.g., "အောင်အောင်", "ကျော်ကျော်", "မောင်မောင်", "သီတာ", "ထက်ထက်"), you MUST translate/transliterate the name to English in the SQL `ILIKE '%<English Name>%'` clause (e.g. `ILIKE '%Aung Aung%'`). You may include multiple common English transliterations with OR if helpful (e.g. `(full_name ILIKE '%Aung Aung%' OR full_name ILIKE '%Mg Mg%')`).
- NO INVALID UNIONS (CRITICAL): Do NOT run `SELECT * FROM students UNION SELECT * FROM teachers` because `students` and `teachers` have different numbers of columns. If UNIONing across students and teachers, select explicitly named common columns, for example: `SELECT student_id AS person_id, full_name, dept_code, 'STUDENT' AS person_type FROM students WHERE full_name ILIKE '%Name%' UNION SELECT teacher_id AS person_id, full_name, dept_code, 'TEACHER' AS person_type FROM teachers WHERE full_name ILIKE '%Name%'`.
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
        self.groq_api_key = settings.GROQ_API_KEY.strip() if settings.GROQ_API_KEY else ""
        self.groq_client = AsyncGroq(api_key=self.groq_api_key) if self.groq_api_key else None
        self.groq_model = settings.GROQ_MODEL

        self.openrouter_api_key = settings.OPENROUTER_API_KEY.strip() if settings.OPENROUTER_API_KEY else ""
        self.openrouter_model = settings.OPENROUTER_MODEL

    async def _call_groq(self, system: str, user: str, model: str | None = None, temperature: float = 0.1) -> str:
        if not self.groq_client or not self.groq_api_key:
            raise ValueError("GROQ_API_KEY is not configured.")

        model_name = model or self.groq_model
        response = await self.groq_client.chat.completions.create(
            model=model_name,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            temperature=temperature,
            max_tokens=1024,
        )
        return response.choices[0].message.content.strip()

    async def _call_openrouter(self, system: str, user: str, model: str | None = None, temperature: float = 0.1) -> str:
        if not self.openrouter_api_key:
            raise ValueError("OPENROUTER_API_KEY is not configured in backend/.env.")

        model_name = model or self.openrouter_model
        headers = {
            "Authorization": f"Bearer {self.openrouter_api_key}",
            "HTTP-Referer": "https://suis.edu.mm",
            "X-Title": "SUIS Smart University System",
            "Content-Type": "application/json",
        }
        payload = {
            "model": model_name,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            "temperature": temperature,
            "max_tokens": 1024,
        }
        async with httpx.AsyncClient(timeout=30.0) as client:
            res = await client.post("https://openrouter.ai/api/v1/chat/completions", headers=headers, json=payload)
            if res.status_code != 200:
                raise ValueError(f"OpenRouter API error ({res.status_code}): {res.text}")
            data = res.json()
            return data["choices"][0]["message"]["content"].strip()

    async def _call_llm(self, system: str, user: str, provider: str | None = None, model: str | None = None, temperature: float = 0.1) -> str:
        target_provider = (provider or settings.DEFAULT_AI_PROVIDER).lower()

        # Fallback to OpenRouter if Groq key missing
        if target_provider == "groq" and not self.groq_api_key and self.openrouter_api_key:
            target_provider = "openrouter"
        # Fallback to Groq if OpenRouter key missing
        elif target_provider == "openrouter" and not self.openrouter_api_key and self.groq_api_key:
            target_provider = "groq"

        if target_provider == "openrouter":
            return await self._call_openrouter(system, user, model=model, temperature=temperature)
        else:
            return await self._call_groq(system, user, model=model, temperature=temperature)

    async def _is_data_query(self, message: str, provider: str | None = None, model: str | None = None) -> bool:
        """Quick classifier: does the user want DB data or general info?"""
        try:
            probe = await self._call_llm(
                system="You are a classifier. Reply with exactly 'DATA' if the question requires querying a university database for student, teacher, department, course, classroom, attendance, or timetable data. Reply with 'INFO' for general university policy or greeting questions.",
                user=message,
                provider=provider,
                model=model,
                temperature=0.0,
            )
            return probe.strip().upper().startswith("DATA")
        except Exception:
            return True

    def get_model_info(self) -> dict:
        return {
            "groq_available": bool(self.groq_api_key),
            "openrouter_available": bool(self.openrouter_api_key),
            "default_provider": settings.DEFAULT_AI_PROVIDER,
            "models": [
                {"provider": "groq", "id": "llama-3.3-70b-versatile", "name": "Groq — Llama 3.3 70B (Recommended)", "is_free": True},
                {"provider": "groq", "id": "llama-3.1-8b-instant", "name": "Groq — Llama 3.1 8B (Super Fast)", "is_free": True},
                {"provider": "groq", "id": "mixtral-8x7b-32768", "name": "Groq — Mixtral 8x7B", "is_free": True},
                {"provider": "openrouter", "id": "meta-llama/llama-3.3-70b-instruct", "name": "OpenRouter — Llama 3.3 70B Instruct"},
                {"provider": "openrouter", "id": "google/gemini-2.0-flash-001", "name": "OpenRouter — Gemini 2.0 Flash"},
                {"provider": "openrouter", "id": "deepseek/deepseek-r1:free", "name": "OpenRouter — DeepSeek R1 (Free)"},
                {"provider": "openrouter", "id": "openai/gpt-4o-mini", "name": "OpenRouter — GPT-4o Mini"},
                {"provider": "openrouter", "id": "qwen/qwen-2.5-coder-32b-instruct", "name": "OpenRouter — Qwen 2.5 Coder 32B"},
            ]
        }

    async def chat(self, message: str, db: AsyncSession, provider: str | None = None, model: str | None = None) -> dict:
        if not self.groq_api_key and not self.openrouter_api_key:
            return {
                "answer": "⚠️ **No AI API Key configured.** Please add `GROQ_API_KEY=...` or `OPENROUTER_API_KEY=...` to your `backend/.env` file.",
                "sql_query": None,
                "raw_data": None,
                "query_type": "config_error",
            }

        try:
            needs_data = await self._is_data_query(message, provider=provider, model=model)

            if needs_data:
                # Pass 1: generate SQL
                raw_sql = await self._call_llm(SYSTEM_PROMPT_SQL, message, provider=provider, model=model, temperature=0.0)
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
                answer = await self._call_llm(SYSTEM_PROMPT_EXPLAIN, context, provider=provider, model=model, temperature=0.3)

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

                answer = await self._call_llm(
                    SYSTEM_PROMPT_GENERAL,
                    f"University info:\n{context}\n\nUser question: {message}",
                    provider=provider,
                    model=model,
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
                "answer": f"⚠️ **AI Service Error**: {str(e)}",
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
