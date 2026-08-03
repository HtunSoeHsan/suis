# SUIS — Smart University Intelligence System
# README

## 🎓 Smart University Intelligence System (SUIS)

An integrated AI-powered university management platform featuring:
- **Groq AI Text-to-SQL** natural language chatbot
- **InsightFace Computer Vision** for biometric attendance
- **shadcn/ui Management Portal** for student/teacher data

---

## 🏗️ Architecture

```
frontend/   — Next.js 15 + shadcn/ui + Tailwind CSS
backend/    — FastAPI + InsightFace + Groq SDK
database    — PostgreSQL 16 + pgvector (via Docker)
```

---

## 🚀 Quick Start

### 1. Prerequisites
- Docker & Docker Compose
- Node.js 20+
- Python 3.12+

### 2. Configure Environment
```bash
# Backend
cp backend/.env.example backend/.env
# Edit backend/.env and set your GROQ_API_KEY

# Frontend
cp frontend/.env.local.example frontend/.env.local
```

### 3. Start with Docker Compose
```bash
docker-compose up -d
```

This starts:
- **PostgreSQL + pgvector** on port `5432`
- **FastAPI backend** on port `8001` → [http://localhost:8001/docs](http://localhost:8001/docs)
- **Next.js frontend** on port `3000` → [http://localhost:3000](http://localhost:3000)

---

## 💻 Local Development (without Docker)

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # set GROQ_API_KEY
uvicorn app.main:app --reload
```

### Frontend
```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

---

## 🔑 Getting a Groq API Key

1. Visit [https://console.groq.com](https://console.groq.com)
2. Sign up / Log in
3. Create an API key
4. Add it to `backend/.env` as `GROQ_API_KEY=...`

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/students` | List students (with search/filter) |
| POST | `/api/students` | Create student |
| PATCH | `/api/students/{id}` | Update student |
| DELETE | `/api/students/{id}` | Soft-delete student |
| POST | `/api/students/{id}/face` | Enroll face |
| GET | `/api/teachers` | List teachers |
| POST | `/api/teachers` | Create teacher |
| POST | `/api/teachers/{id}/face` | Enroll face |
| GET | `/api/attendance` | List attendance records |
| POST | `/api/chat` | AI chatbot (Text-to-SQL) |
| POST | `/api/vision/identify` | Identify face from camera |
| POST | `/api/vision/liveness` | Liveness check only |

Full interactive docs: [http://localhost:8001/docs](http://localhost:8001/docs)

---

## 🔒 Security Features

- **SQL Guard** — All LLM-generated SQL is parsed and validated; only `SELECT` statements are executed
- **MiniFASNet Liveness** — Prevents photo/screen spoofing during face enrollment and identification
- **Soft Delete** — Students/teachers are never hard-deleted; `is_active` flag is used
- **pgvector cosine similarity** — Face matching uses optimized IVFFlat index for fast, accurate lookup

---

## 🧠 Technology Stack

| Component | Technology |
|-----------|-----------|
| Frontend | Next.js 15, shadcn/ui, Tailwind CSS, TanStack Table |
| Backend | FastAPI, SQLAlchemy (async), Pydantic v2 |
| LLM | Groq Cloud (Llama 3.3 70B) |
| Vision | InsightFace (ArcFace + RetinaFace), OpenCV |
| Database | PostgreSQL 16 + pgvector |
| Container | Docker Compose |