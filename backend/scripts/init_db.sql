-- Smart University Intelligence System (SUIS) — Upgraded Database Schema
-- Includes Authentication, Departments, Teachers, Students, Courses, Timetables, pgvector Embeddings, Attendance & Audit Logs

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ENUMS
-- ============================================================
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('ADMIN', 'TEACHER', 'STUDENT');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE slot_type AS ENUM ('LECTURE', 'LAB', 'LUNCH_BREAK');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE attendance_status AS ENUM ('PRESENT', 'LATE', 'ABSENT');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE enrollment_type AS ENUM ('INITIAL', 'DEFERRED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- 1. USERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    user_id VARCHAR(50) PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role DEFAULT 'STUDENT',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 2. DEPARTMENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS departments (
    dept_code VARCHAR(20) PRIMARY KEY,
    dept_name VARCHAR(100) NOT NULL,
    building_location VARCHAR(100),
    head_teacher_id VARCHAR(50) UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 3. TEACHERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS teachers (
    teacher_id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) UNIQUE REFERENCES users(user_id) ON DELETE SET NULL,
    dept_code VARCHAR(20) NOT NULL REFERENCES departments(dept_code) ON DELETE RESTRICT,
    full_name VARCHAR(100) NOT NULL,
    designation VARCHAR(50) NOT NULL,
    phone VARCHAR(20),
    -- Extended Profile
    email VARCHAR(100),
    nrc_number VARCHAR(50),
    gender VARCHAR(10),
    qualification VARCHAR(100),
    specialization VARCHAR(100),
    joining_date DATE,
    status VARCHAR(20) DEFAULT 'Active',
    address VARCHAR(255),
    -- Face
    face_embedding vector(512),
    is_face_registered BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Circular FK constraint for Department Head Teacher
ALTER TABLE departments
    DROP CONSTRAINT IF EXISTS fk_dept_head,
    ADD CONSTRAINT fk_dept_head FOREIGN KEY (head_teacher_id) REFERENCES teachers(teacher_id) ON DELETE SET NULL;

-- ============================================================
-- 4. STUDENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS students (
    student_id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) UNIQUE REFERENCES users(user_id) ON DELETE SET NULL,
    dept_code VARCHAR(20) NOT NULL REFERENCES departments(dept_code) ON DELETE RESTRICT,
    full_name VARCHAR(100) NOT NULL,
    academic_year INT NOT NULL,
    roll_number VARCHAR(20) NOT NULL,
    phone VARCHAR(20),
    section VARCHAR(5),
    -- Extended Profile
    email VARCHAR(100),
    nrc_number VARCHAR(50),
    gender VARCHAR(10),
    date_of_birth DATE,
    blood_type VARCHAR(5),
    address VARCHAR(255),
    guardian_name VARCHAR(100),
    guardian_phone VARCHAR(20),
    admission_year INT,
    status VARCHAR(20) DEFAULT 'Active',
    major VARCHAR(100),
    -- Face & Attendance
    attendance_rate DOUBLE PRECISION DEFAULT 100.0,
    face_embedding vector(512),
    is_face_registered BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- pgvector Indexes
CREATE INDEX IF NOT EXISTS idx_student_face_embedding
    ON students USING ivfflat (face_embedding vector_cosine_ops)
    WITH (lists = 50);

CREATE INDEX IF NOT EXISTS idx_teacher_face_embedding
    ON teachers USING ivfflat (face_embedding vector_cosine_ops)
    WITH (lists = 50);

-- ============================================================
-- 5. SEMESTERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS semesters (
    semester_id SERIAL PRIMARY KEY,
    academic_year VARCHAR(20) NOT NULL,
    term VARCHAR(20) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT FALSE
);

-- ============================================================
-- 6. COURSES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS courses (
    course_code VARCHAR(20) PRIMARY KEY,
    dept_code VARCHAR(20) NOT NULL REFERENCES departments(dept_code) ON DELETE CASCADE,
    course_name VARCHAR(100) NOT NULL,
    credit_hours INT NOT NULL,
    teacher_id VARCHAR(50) REFERENCES teachers(teacher_id) ON DELETE SET NULL
);

-- ============================================================
-- 7. ENROLLMENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS enrollments (
    enrollment_id BIGSERIAL PRIMARY KEY,
    student_id VARCHAR(50) NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
    course_code VARCHAR(20) NOT NULL REFERENCES courses(course_code) ON DELETE CASCADE,
    semester_id INT NOT NULL REFERENCES semesters(semester_id) ON DELETE CASCADE,
    enrolled_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_student_course_semester UNIQUE (student_id, course_code, semester_id)
);

-- ============================================================
-- 8. CLASSROOMS & TIME SLOTS
-- ============================================================
CREATE TABLE IF NOT EXISTS classrooms (
    room_id VARCHAR(20) PRIMARY KEY,
    room_name VARCHAR(100) NOT NULL,
    building VARCHAR(100) NOT NULL,
    capacity INT DEFAULT 60,
    room_type VARCHAR(30) DEFAULT 'LECTURE_HALL'
);

CREATE TABLE IF NOT EXISTS time_slots (
    slot_id SERIAL PRIMARY KEY,
    period_number INT NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    slot_type slot_type DEFAULT 'LECTURE'
);

-- ============================================================
-- 9. ACADEMIC & EXAM TIMETABLES
-- ============================================================
CREATE TABLE IF NOT EXISTS academic_timetables (
    timetable_id BIGSERIAL PRIMARY KEY,
    semester_id INT NOT NULL REFERENCES semesters(semester_id) ON DELETE CASCADE,
    course_code VARCHAR(20) NOT NULL REFERENCES courses(course_code) ON DELETE CASCADE,
    teacher_id VARCHAR(50) NOT NULL REFERENCES teachers(teacher_id) ON DELETE CASCADE,
    room_id VARCHAR(20) NOT NULL REFERENCES classrooms(room_id) ON DELETE RESTRICT,
    slot_id INT NOT NULL REFERENCES time_slots(slot_id) ON DELETE RESTRICT,
    day_of_week VARCHAR(10) NOT NULL,
    academic_year INT NOT NULL,
    CONSTRAINT uq_room_slot_day_sem UNIQUE (room_id, slot_id, day_of_week, semester_id),
    CONSTRAINT uq_teacher_slot_day_sem UNIQUE (teacher_id, slot_id, day_of_week, semester_id)
);

CREATE TABLE IF NOT EXISTS exam_timetables (
    exam_id BIGSERIAL PRIMARY KEY,
    semester_id INT NOT NULL REFERENCES semesters(semester_id) ON DELETE CASCADE,
    course_code VARCHAR(20) NOT NULL REFERENCES courses(course_code) ON DELETE CASCADE,
    room_id VARCHAR(20) NOT NULL REFERENCES classrooms(room_id) ON DELETE RESTRICT,
    exam_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    supervisor_teacher_id VARCHAR(50) REFERENCES teachers(teacher_id) ON DELETE SET NULL,
    CONSTRAINT uq_room_date_time UNIQUE (room_id, exam_date, start_time)
);

-- ============================================================
-- 10. ATTENDANCE & AUDIT LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS attendance_logs (
    log_id BIGSERIAL PRIMARY KEY,
    student_id VARCHAR(50) NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
    course_code VARCHAR(20) NOT NULL REFERENCES courses(course_code) ON DELETE CASCADE,
    verified_at TIMESTAMPTZ DEFAULT NOW(),
    confidence_score DOUBLE PRECISION,
    status attendance_status DEFAULT 'PRESENT'
);

CREATE TABLE IF NOT EXISTS face_embeddings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    person_id UUID NOT NULL,
    person_type VARCHAR(10) NOT NULL,
    embedding vector(512) NOT NULL,
    enrolled_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_face_embeddings_person ON face_embeddings (person_id);

CREATE TABLE IF NOT EXISTS face_enrollment_logs (
    log_id SERIAL PRIMARY KEY,
    target_user_type VARCHAR(20) NOT NULL,
    target_id VARCHAR(50) NOT NULL,
    registered_by_user_id VARCHAR(50) REFERENCES users(user_id) ON DELETE SET NULL,
    enrollment_type enrollment_type NOT NULL,
    action_timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 11. UNIVERSITY INFO (Chatbot General Knowledge)
-- ============================================================
CREATE TABLE IF NOT EXISTS university_info (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    valid_from DATE,
    valid_to DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TRIGGERS FOR AUTO-UPDATING updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS users_updated_at ON users;
CREATE TRIGGER users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS students_updated_at ON students;
CREATE TRIGGER students_updated_at
    BEFORE UPDATE ON students
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- SEED DATA
-- ============================================================
INSERT INTO departments (dept_code, dept_name, building_location) VALUES
('CST', 'Computer Science & Technology', 'Building A - Science Complex'),
('IT',  'Information Technology', 'Building B - Tech Wing')
ON CONFLICT (dept_code) DO NOTHING;

INSERT INTO users (user_id, username, email, password_hash, role) VALUES
('usr-admin-1', 'admin', 'admin@suis.edu', '$2b$12$iO6b97Pxhl3FeV3o.eSpNuwqYqRfaX9Co3w27h/b6dfhIXu9NQrdu', 'ADMIN'),
('usr-tch-1',   'prof_smith', 'smith@suis.edu', '$2b$12$E5SkA62kcTaezpu./SqNzOib2wzfPfnHYHkReoYFapQIlf41JYLkm', 'TEACHER'),
('usr-stu-1',   'mg_mg', 'mgmg@suis.edu', '$2b$12$jy0PWugrCMvQhFkGm7JgEexpj3XNtwq8m4mX.hQKElpq/lOIPq1Qa', 'STUDENT'),
('usr-stu-2',   'aung_aung', 'aungaung@suis.edu', '$2b$12$a3TY414xW24KxHhd5UmTROmIAohzagB3hgb/IW85qPCi6MwUIv3kG', 'STUDENT')
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO teachers (teacher_id, user_id, dept_code, full_name, designation, phone) VALUES
('TCH-2026-01', 'usr-tch-1', 'CST', 'Dr. Smith Johnson', 'Professor', '+95912345678')
ON CONFLICT (teacher_id) DO NOTHING;

UPDATE departments SET head_teacher_id = 'TCH-2026-01' WHERE dept_code = 'CST';

INSERT INTO students (student_id, user_id, dept_code, full_name, academic_year, roll_number, phone, attendance_rate) VALUES
('STU-2026-1001', 'usr-stu-1', 'CST', 'Mg Mg', 4, '4CS-101', '+95998765432', 88.5),
('STU-2026-1002', 'usr-stu-2', 'CST', 'Aung Aung', 4, '4CS-102', '+95998765433', 72.0)
ON CONFLICT (student_id) DO NOTHING;

INSERT INTO semesters (semester_id, academic_year, term, start_date, end_date, is_active) VALUES
(1, '2025-2026', 'First Semester', '2025-11-01', '2026-03-31', TRUE)
ON CONFLICT (semester_id) DO NOTHING;

-- Reset sequence to max existing id to avoid duplicate key errors after seed
SELECT setval(pg_get_serial_sequence('semesters', 'semester_id'), COALESCE((SELECT MAX(semester_id) FROM semesters), 0) + 1, false);

INSERT INTO courses (course_code, dept_code, course_name, credit_hours, teacher_id) VALUES
('CS-401', 'CST', 'Advanced Artificial Intelligence', 4, 'TCH-2026-01'),
('CS-402', 'CST', 'Database Systems & Text-to-SQL', 3, 'TCH-2026-01')
ON CONFLICT (course_code) DO NOTHING;

INSERT INTO enrollments (student_id, course_code, semester_id) VALUES
('STU-2026-1001', 'CS-401', 1),
('STU-2026-1001', 'CS-402', 1),
('STU-2026-1002', 'CS-401', 1)
ON CONFLICT DO NOTHING;

INSERT INTO classrooms (room_id, room_name, building, capacity, room_type) VALUES
('ROOM-101', 'AI & Vision Lab', 'Building A', 50, 'LAB'),
('ROOM-202', 'Grand Lecture Hall 1', 'Building A', 120, 'LECTURE_HALL')
ON CONFLICT (room_id) DO NOTHING;

INSERT INTO time_slots (slot_id, period_number, start_time, end_time, slot_type) VALUES
(1, 1, '09:00:00', '10:30:00', 'LECTURE'),
(2, 2, '10:45:00', '12:15:00', 'LAB'),
(3, 3, '13:00:00', '14:30:00', 'LECTURE')
ON CONFLICT (slot_id) DO NOTHING;

INSERT INTO academic_timetables (semester_id, course_code, teacher_id, room_id, slot_id, day_of_week, academic_year) VALUES
(1, 'CS-401', 'TCH-2026-01', 'ROOM-101', 1, 'Monday', 4),
(1, 'CS-402', 'TCH-2026-01', 'ROOM-202', 2, 'Wednesday', 4)
ON CONFLICT DO NOTHING;

INSERT INTO university_info (category, title, content) VALUES
('general',   'University Name',         'Smart University of Technology (SUT) — offering Bachelor and Master programs.'),
('regulation','Attendance Policy',       'Students must maintain at least 75% attendance per semester in each course to be eligible for final examinations.')
ON CONFLICT DO NOTHING;
