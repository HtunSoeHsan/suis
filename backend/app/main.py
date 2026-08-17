from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import get_settings
from app.routers import (
    students, teachers, departments, courses, semesters, enrollments,
    classrooms, time_slots, timetables, attendance, chat, vision, auth, settings as settings_router
)
from app.routers import users as users_router

settings = get_settings()

from contextlib import asynccontextmanager
from sqlalchemy import text
from app.database import engine

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Auto-verify DB schema on startup
    try:
        async with engine.connect() as conn:
            res = await conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='students' AND column_name='user_id'"))
            if not res.fetchone():
                print("⚠️ Outdated or uninitialized database schema detected! Running init_db script...")
                from scripts.init_db import initialize_database
                await initialize_database(reset=True)
                print("✅ Database successfully initialized!")
    except Exception as e:
        print(f"⚠️ DB startup schema check note: {e}")
    yield

app = FastAPI(
    title="SUIS — Smart University Intelligence System",
    description="Integrated Groq AI Text-to-SQL, InsightFace Computer Vision & University Management API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# ─── CORS ─────────────────────────────────────────────────────────────────────
cors_origins = settings.cors_origins_list
if "*" in cors_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=cors_origins,
        allow_origin_regex=r"https?://.*",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# ─── Routers ──────────────────────────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(users_router.router)
app.include_router(students.router)
app.include_router(teachers.router)
app.include_router(departments.router)
app.include_router(courses.router)
app.include_router(semesters.router)
app.include_router(enrollments.router)
app.include_router(classrooms.router)
app.include_router(time_slots.router)
app.include_router(timetables.router)
app.include_router(attendance.router)
app.include_router(chat.router)
app.include_router(vision.router)
app.include_router(settings_router.router)


@app.get("/health", tags=["Health"])
async def health():
    return {"status": "ok", "service": "SUIS Backend"}


@app.get("/", tags=["Health"])
async def root():
    return {
        "message": "Smart University Intelligence System API",
        "docs": "/docs",
        "version": "1.0.0",
    }
