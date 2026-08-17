export type UserRole = "ADMIN" | "TEACHER" | "STUDENT";

export interface User {
  user_id: string;
  username: string;
  email: string;
  role: UserRole;
  student_id?: string | null;
  teacher_id?: string | null;
}

export interface UserDetail extends User {
  linked_name?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Student {
  student_id: string;
  user_id?: string | null;
  dept_code: string;
  full_name: string;
  academic_year: number;
  roll_number: string;
  phone?: string | null;
  section?: "A" | "B" | "C" | null;

  // Extended Profile Fields
  email?: string | null;
  nrc_number?: string | null;
  gender?: "Male" | "Female" | "Other" | null;
  date_of_birth?: string | null;
  blood_type?: "A+" | "A-" | "B+" | "B-" | "O+" | "O-" | "AB+" | "AB-" | null;
  address?: string | null;
  guardian_name?: string | null;
  guardian_phone?: string | null;
  admission_year?: number | null;
  status?: "Active" | "Graduated" | "Suspended" | "Dropped" | null;
  major?: string | null;

  attendance_rate: number;
  is_face_registered: boolean;
  created_at: string;
  updated_at: string;
}


export interface Teacher {
  teacher_id: string;
  user_id?: string | null;
  dept_code: string;
  full_name: string;
  designation: string;
  phone?: string | null;

  // Extended Profile Fields
  email?: string | null;
  nrc_number?: string | null;
  gender?: "Male" | "Female" | "Other" | null;
  qualification?: string | null;
  specialization?: string | null;
  joining_date?: string | null;
  status?: "Active" | "On Leave" | "Retired" | "Resigned" | null;
  address?: string | null;

  is_face_registered: boolean;
  created_at: string;
}

export interface Department {
  dept_code: string;
  dept_name: string;
  building_location?: string | null;
  head_teacher_id?: string | null;
  created_at: string;
}

export interface Course {
  course_code: string;
  dept_code: string;
  course_name: string;
  credit_hours: number;
  teacher_id?: string | null;
  semester_id?: number | null;
  major?: string | null;
}

export interface Semester {
  semester_id: number;
  academic_year: string;
  term: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

export interface Enrollment {
  enrollment_id: number;
  student_id: string;
  course_code: string;
  semester_id: number;
  enrolled_at: string;
}

export interface BatchEnrollmentResponse {
  total_enrolled: number;
  enrolled_student_count: number;
  enrolled_course_count: number;
  promoted_academic_year?: number | null;
}

export interface Classroom {
  room_id: string;
  room_name: string;
  building: string;
  capacity: number;
  room_type: string;
}

export interface TimeSlot {
  slot_id: number;
  period_number: number;
  start_time: string;
  end_time: string;
  slot_type: string;
}

export interface AcademicTimetable {
  timetable_id: number;
  semester_id: number;
  course_code: string;
  teacher_id: string;
  room_id: string;
  slot_id: number;
  day_of_week: string;
}

export interface ExamTimetable {
  exam_id: number;
  semester_id: number;
  course_code: string;
  room_id: string;
  exam_date: string;
  start_time: string;
  end_time: string;
  supervisor_teacher_id?: string | null;
}

export interface AttendanceLog {
  log_id: number;
  student_id: string;
  course_code: string;
  verified_at: string;
  confidence_score?: number | null;
  status: "PRESENT" | "LATE" | "ABSENT";
}

export interface IDConfig {
  student_id_template: string;
  prefix: string;
  seq_padding: number;
  roll_prefix: string;
  roll_padding: number;
  teacher_prefix?: string;
  teacher_padding?: number;
  preview_example: string;
  preview_roll_example: string;
  preview_teacher_example?: string;
}


export interface ListResponse<T> {
  total: number;
  items: T[];
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  sql_query?: string | null;
  raw_data?: Record<string, unknown>[] | null;
  query_type?: string;
  timestamp: Date;
}

export interface ChatResponse {
  answer: string;
  sql_query: string | null;
  raw_data: Record<string, unknown>[] | null;
  query_type: string;
}

export interface FaceIdentifyResponse {
  identified: boolean;
  target_id: string | null;
  target_type: string | null;
  full_name: string | null;
  dept_code: string | null;
  similarity_score: number | null;
  liveness_score: number | null;
  attendance_marked: boolean;
  message: string;
}

export interface FaceRetrieveInfoResponse {
  identified: boolean;
  target_id?: string | null;
  target_type?: string | null;
  similarity_score?: number | null;
  liveness_score?: number | null;
  profile?: Record<string, unknown> | null;
  courses?: Record<string, unknown>[] | null;
  timetables?: Record<string, unknown>[] | null;
  attendance_summary?: Record<string, unknown> | null;
  ai_summary?: string | null;
  message: string;
}

export type PersonType = "student" | "teacher";
