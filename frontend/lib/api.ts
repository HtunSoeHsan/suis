const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";

async function apiFetch<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const token = typeof window !== "undefined" ? localStorage.getItem("suis_token") : null;
  const authHeaders: Record<string, string> = {};
  if (token) {
    authHeaders["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
      ...options?.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let errDetail = res.statusText;
    if (text) {
      try {
        const errJson = JSON.parse(text);
        let rawDetail = errJson.detail ?? errJson.message ?? errDetail;
        if (typeof rawDetail === "object" && rawDetail !== null) {
          if (Array.isArray(rawDetail)) {
            rawDetail = rawDetail.map((d: Record<string, unknown>) => String(d.msg || JSON.stringify(d))).join("; ");
          } else {
            rawDetail = String((rawDetail as Record<string, unknown>).msg || JSON.stringify(rawDetail));
          }
        }
        errDetail = String(rawDetail);
      } catch {
        errDetail = text;
      }
    }
    throw new Error(errDetail || `API error ${res.status}`);
  }

  if (res.status === 204) {
    return {} as T;
  }

  const text = await res.text();
  if (!text || text.trim() === "") {
    return {} as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    return {} as T;
  }
}

// ─── Authentication ──────────────────────────────────────────────────────────
export const authApi = {
  login: (data: { username: string; password: string }) =>
    apiFetch<{ access_token: string; token_type: string; user: import("@/types").User }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  getMe: () => apiFetch<import("@/types").User>("/api/auth/me"),
  seedPasswords: () => apiFetch<{ message: string; users_updated: string[] }>("/api/auth/seed-passwords", { method: "POST" }),
};

// ─── Users (Management) ───────────────────────────────────────────────────────
export const usersApi = {
  list: (params?: Record<string, string | number | boolean>) => {
    const qs = params ? "?" + new URLSearchParams(params as Record<string, string>).toString() : "";
    return apiFetch<{ total: number; items: import("@/types").UserDetail[] }>(`/api/users${qs}`);
  },
  get: (id: string) => apiFetch<import("@/types").UserDetail>(`/api/users/${id}`),
  create: (data: { username: string; email: string; password: string; role: string; link_student_id?: string; link_teacher_id?: string }) =>
    apiFetch<import("@/types").UserDetail>("/api/users", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: string, data: { username?: string; email?: string; role?: string }) =>
    apiFetch<import("@/types").UserDetail>(`/api/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  resetPassword: (id: string, new_password: string) =>
    apiFetch<{ message: string }>(`/api/users/${id}/reset-password`, {
      method: "POST",
      body: JSON.stringify({ new_password }),
    }),
  delete: (id: string) =>
    apiFetch<void>(`/api/users/${id}`, { method: "DELETE" }),
};

// ─── Students ─────────────────────────────────────────────────────────────────
export const studentsApi = {
  list: (params?: Record<string, string | number | boolean>) => {
    const qs = params ? "?" + new URLSearchParams(params as Record<string, string>).toString() : "";
    return apiFetch<{ total: number; items: import("@/types").Student[] }>(`/api/students${qs}`);
  },
  get: (id: string) => apiFetch<import("@/types").Student>(`/api/students/${id}`),
  create: (data: Record<string, unknown>) =>
    apiFetch<import("@/types").Student>("/api/students", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Record<string, unknown>) =>
    apiFetch<import("@/types").Student>(`/api/students/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    apiFetch<void>(`/api/students/${id}`, { method: "DELETE" }),
  enrollFace: (id: string, image_base64: string) =>
    apiFetch<{ message: string }>(`/api/students/${id}/face`, {
      method: "POST",
      body: JSON.stringify({ image_base64 }),
    }),
  getGPA: (id: string) => apiFetch<import("@/types").StudentGPASummary>(`/api/students/${id}/gpa`),
  updateSemesterGPA: (id: string, data: { semester_id: number; gpa: number }) =>
    apiFetch<import("@/types").Student>(`/api/students/${id}/semester-gpa`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  graduate: (id: string) =>
    apiFetch<import("@/types").Student>(`/api/students/${id}/graduate`, {
      method: "POST",
    }),
  batchGraduate: (student_ids: string[]) =>
    apiFetch<{ message: string; graduated_count: number }>("/api/students/batch-graduate", {
      method: "POST",
      body: JSON.stringify({ student_ids }),
    }),
};

// ─── Teachers ─────────────────────────────────────────────────────────────────
export const teachersApi = {
  list: (params?: Record<string, string | number | boolean>) => {
    const qs = params ? "?" + new URLSearchParams(params as Record<string, string>).toString() : "";
    return apiFetch<{ total: number; items: import("@/types").Teacher[] }>(`/api/teachers${qs}`);
  },
  get: (id: string) => apiFetch<import("@/types").Teacher>(`/api/teachers/${id}`),
  create: (data: Record<string, unknown>) =>
    apiFetch<import("@/types").Teacher>("/api/teachers", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Record<string, unknown>) =>
    apiFetch<import("@/types").Teacher>(`/api/teachers/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    apiFetch<void>(`/api/teachers/${id}`, { method: "DELETE" }),
  enrollFace: (id: string, image_base64: string) =>
    apiFetch<{ message: string }>(`/api/teachers/${id}/face`, {
      method: "POST",
      body: JSON.stringify({ image_base64 }),
    }),
};

// ─── Attendance ───────────────────────────────────────────────────────────────
export const attendanceApi = {
  list: (params?: Record<string, string | number | boolean>) => {
    const qs = params ? "?" + new URLSearchParams(params as Record<string, string>).toString() : "";
    return apiFetch<{ total: number; items: import("@/types").AttendanceLog[] }>(`/api/attendance${qs}`);
  },
  create: (data: { student_id: string; course_code: string; status: string; confidence_score?: number }) =>
    apiFetch<import("@/types").AttendanceLog>("/api/attendance", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  createBatch: (data: {
    course_code: string;
    verified_at?: string; // ISO datetime string for custom date
    items: Array<{ student_id: string; status: string; confidence_score?: number }>;
  }) =>
    apiFetch<{ total_recorded: number; course_code: string }>("/api/attendance/batch", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  delete: (id: number) =>
    apiFetch<void>(`/api/attendance/${id}`, { method: "DELETE" }),
};

// ─── Departments ──────────────────────────────────────────────────────────────
export const departmentsApi = {
  list: (params?: Record<string, string | number | boolean>) => {
    const qs = params ? "?" + new URLSearchParams(params as Record<string, string>).toString() : "";
    return apiFetch<{ total: number; items: import("@/types").Department[] }>(`/api/departments${qs}`);
  },
  get: (code: string) => apiFetch<import("@/types").Department>(`/api/departments/${code}`),
  create: (data: Record<string, unknown>) =>
    apiFetch<import("@/types").Department>("/api/departments", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (code: string, data: Record<string, unknown>) =>
    apiFetch<import("@/types").Department>(`/api/departments/${code}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  delete: (code: string) =>
    apiFetch<void>(`/api/departments/${code}`, { method: "DELETE" }),
};

// ─── Courses ──────────────────────────────────────────────────────────────────
export const coursesApi = {
  list: (params?: Record<string, string | number | boolean>) => {
    const qs = params ? "?" + new URLSearchParams(params as Record<string, string>).toString() : "";
    return apiFetch<{ total: number; items: import("@/types").Course[] }>(`/api/courses${qs}`);
  },
  get: (code: string) => apiFetch<import("@/types").Course>(`/api/courses/${code}`),
  create: (data: Record<string, unknown>) =>
    apiFetch<import("@/types").Course>("/api/courses", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (code: string, data: Record<string, unknown>) =>
    apiFetch<import("@/types").Course>(`/api/courses/${code}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  delete: (code: string) =>
    apiFetch<void>(`/api/courses/${code}`, { method: "DELETE" }),
};
// ─── Semesters ────────────────────────────────────────────────────────────────
export const semestersApi = {
  list: (params?: Record<string, string | number | boolean>) => {
    const qs = params ? "?" + new URLSearchParams(params as Record<string, string>).toString() : "";
    return apiFetch<{ total: number; items: import("@/types").Semester[] }>(`/api/semesters${qs}`);
  },
  get: (id: number) => apiFetch<import("@/types").Semester>(`/api/semesters/${id}`),
  create: (data: Record<string, unknown>) =>
    apiFetch<import("@/types").Semester>("/api/semesters", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: number, data: Record<string, unknown>) =>
    apiFetch<import("@/types").Semester>(`/api/semesters/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  activate: (id: number) =>
    apiFetch<import("@/types").Semester>(`/api/semesters/${id}/activate`, {
      method: "POST",
    }),
  deactivate: (id: number) =>
    apiFetch<import("@/types").Semester>(`/api/semesters/${id}/deactivate`, {
      method: "POST",
    }),
  delete: (id: number) =>
    apiFetch<void>(`/api/semesters/${id}`, { method: "DELETE" }),
};

// ─── Enrollments ──────────────────────────────────────────────────────────────
export const enrollmentsApi = {
  list: (params?: Record<string, string | number | boolean>) => {
    const qs = params ? "?" + new URLSearchParams(params as Record<string, string>).toString() : "";
    return apiFetch<{ total: number; items: import("@/types").Enrollment[] }>(`/api/enrollments${qs}`);
  },
  create: (data: Record<string, unknown>) =>
    apiFetch<import("@/types").Enrollment>("/api/enrollments", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  createBatch: (data: {
    student_ids: string[];
    course_codes: string[];
    semester_id: number;
    promote_academic_year?: number;
    update_major?: string;
  }) =>
    apiFetch<import("@/types").BatchEnrollmentResponse>("/api/enrollments/batch", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  delete: (id: number) =>
    apiFetch<void>(`/api/enrollments/${id}`, { method: "DELETE" }),
  updateGrade: (id: number, data: { grade_point?: number }) =>
    apiFetch<import("@/types").Enrollment>(`/api/enrollments/${id}/grade`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
};

// ─── Classrooms ───────────────────────────────────────────────────────────────
export const classroomsApi = {
  list: (params?: Record<string, string | number | boolean>) => {
    const qs = params ? "?" + new URLSearchParams(params as Record<string, string>).toString() : "";
    return apiFetch<{ total: number; items: import("@/types").Classroom[] }>(`/api/classrooms${qs}`);
  },
  get: (id: string) => apiFetch<import("@/types").Classroom>(`/api/classrooms/${id}`),
  create: (data: Record<string, unknown>) =>
    apiFetch<import("@/types").Classroom>("/api/classrooms", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Record<string, unknown>) =>
    apiFetch<import("@/types").Classroom>(`/api/classrooms/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    apiFetch<void>(`/api/classrooms/${id}`, { method: "DELETE" }),
};

// ─── Time Slots ───────────────────────────────────────────────────────────────
export const timeSlotsApi = {
  list: (params?: Record<string, string | number | boolean>) => {
    const qs = params ? "?" + new URLSearchParams(params as Record<string, string>).toString() : "";
    return apiFetch<{ total: number; items: import("@/types").TimeSlot[] }>(`/api/time-slots${qs}`);
  },
  create: (data: Record<string, unknown>) =>
    apiFetch<import("@/types").TimeSlot>("/api/time-slots", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: number, data: Record<string, unknown>) =>
    apiFetch<import("@/types").TimeSlot>(`/api/time-slots/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  delete: (id: number) =>
    apiFetch<void>(`/api/time-slots/${id}`, { method: "DELETE" }),
};

// ─── Timetables ───────────────────────────────────────────────────────────────
export const timetablesApi = {
  listAcademic: (params?: Record<string, string | number | boolean>) => {
    const qs = params ? "?" + new URLSearchParams(params as Record<string, string>).toString() : "";
    return apiFetch<{ total: number; items: import("@/types").AcademicTimetable[] }>(`/api/timetables/academic${qs}`);
  },
  createAcademic: (data: Record<string, unknown>) =>
    apiFetch<import("@/types").AcademicTimetable>("/api/timetables/academic", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  deleteAcademic: (id: number) =>
    apiFetch<void>(`/api/timetables/academic/${id}`, { method: "DELETE" }),
  listExam: (params?: Record<string, string | number | boolean>) => {
    const qs = params ? "?" + new URLSearchParams(params as Record<string, string>).toString() : "";
    return apiFetch<{ total: number; items: import("@/types").ExamTimetable[] }>(`/api/timetables/exam${qs}`);
  },
  createExam: (data: Record<string, unknown>) =>
    apiFetch<import("@/types").ExamTimetable>("/api/timetables/exam", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  deleteExam: (id: number) =>
    apiFetch<void>(`/api/timetables/exam/${id}`, { method: "DELETE" }),
};

// ─── Chat ─────────────────────────────────────────────────────────────────────
export const chatApi = {
  send: (message: string, provider?: string, model?: string) =>
    apiFetch<import("@/types").ChatResponse>("/api/chat", {
      method: "POST",
      body: JSON.stringify({ message, provider, model }),
    }),
  getModels: () =>
    apiFetch<{
      groq_available: boolean;
      openrouter_available: boolean;
      default_provider: string;
      models: Array<{ provider: string; id: string; name: string; is_free?: boolean }>;
    }>("/api/chat/models"),
};

// ─── Settings ─────────────────────────────────────────────────────────────────
export const settingsApi = {
  getIDFormat: () => apiFetch<import("@/types").IDConfig>("/api/settings/id-format"),
  updateIDFormat: (data: {
    student_id_template: string;
    prefix: string;
    seq_padding: number;
    roll_prefix: string;
    roll_padding: number;
    teacher_prefix?: string;
    teacher_padding?: number;
    teacher_include_dept?: boolean;
  }) =>
    apiFetch<import("@/types").IDConfig>("/api/settings/id-format", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

// ─── Vision ───────────────────────────────────────────────────────────────────
export const visionApi = {
  identify: (image_base64: string) =>
    apiFetch<import("@/types").FaceIdentifyResponse>("/api/vision/identify", {
      method: "POST",
      body: JSON.stringify({ image_base64 }),
    }),
  retrieveInfo: (image_base64: string) =>
    apiFetch<import("@/types").FaceRetrieveInfoResponse>("/api/vision/retrieve-info", {
      method: "POST",
      body: JSON.stringify({ image_base64 }),
    }),
  liveness: (image_base64: string) =>
    apiFetch<{ liveness_score: number; is_live: boolean }>("/api/vision/liveness", {
      method: "POST",
      body: JSON.stringify({ image_base64 }),
    }),
};
