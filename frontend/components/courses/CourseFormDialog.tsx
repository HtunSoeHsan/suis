"use client";

import { useState, useEffect } from "react";
import { coursesApi, departmentsApi, teachersApi, semestersApi } from "@/lib/api";
import type { Course, Department, Teacher, Semester } from "@/types";
import { X, Loader2, Save, ChevronDown } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface Props {
  course?: Course;
  onClose: () => void;
}

const EMPTY = {
  course_code: "",
  dept_code: "CST",
  course_name: "",
  credit_hours: "3",
  teacher_id: "",
  semester_id: "",
  major: "CST",
  academic_year: "1",
};

const MAJOR_OPTIONS = [
  { value: "CST", label: "CST — Computer Science & Technology" },
  { value: "CS",  label: "CS  — Computer Science" },
  { value: "CT",  label: "CT  — Computer Technology" },
];

export function CourseFormDialog({ course, onClose }: Props) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    ...EMPTY,
    teacher_id: (!course && user?.role === "TEACHER" && user?.teacher_id) ? user.teacher_id : "",
  });
  const [departments, setDepartments] = useState<Department[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    departmentsApi.list({ limit: 100 }).then((res) => setDepartments(res.items)).catch(() => {});
    teachersApi.list({ limit: 100 }).then((res) => setTeachers(res.items)).catch(() => {});
    semestersApi.list({ limit: 100 }).then((res) => setSemesters(res.items)).catch(() => {});
  }, []);

  useEffect(() => {
    if (course) {
      setForm({
        course_code: course.course_code,
        dept_code: course.dept_code,
        course_name: course.course_name,
        credit_hours: course.credit_hours.toString(),
        teacher_id: course.teacher_id ?? "",
        semester_id: course.semester_id?.toString() ?? "",
        major: course.major ?? "CST",
        academic_year: course.academic_year?.toString() ?? "1",
      });
    }
  }, [course]);

  const filteredTeachers = teachers.filter((t) => !form.dept_code || t.dept_code === form.dept_code);

  const set = (k: keyof typeof EMPTY, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const payload = {
        dept_code: form.dept_code,
        course_name: form.course_name,
        credit_hours: parseInt(form.credit_hours) || 3,
        teacher_id: form.teacher_id || undefined,
        semester_id: form.semester_id ? parseInt(form.semester_id) : undefined,
        major: form.major || undefined,
        academic_year: form.academic_year ? parseInt(form.academic_year) : 1,
      };
      if (course) {
        await coursesApi.update(course.course_code, payload);
      } else {
        await coursesApi.create({ course_code: form.course_code, ...payload });
      }
      onClose();
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const inputCls = "w-full px-3 py-2 bg-theme-elevated border border-theme-border-hover rounded-lg text-sm text-theme-text placeholder:text-theme-muted focus:outline-none focus:ring-2 focus:ring-amber-600/50 disabled:opacity-50";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-theme-surface border border-theme-border-hover rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-theme-border">
          <h3 className="font-semibold text-theme-text">
            {course ? "Edit Course" : "Add New Course"}
          </h3>
          <button onClick={onClose} className="text-theme-muted hover:text-theme-text transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Course Code */}
          <div>
            <label className="block text-xs font-medium text-theme-sub mb-1.5">Course Code *</label>
            <input
              value={form.course_code}
              onChange={(e) => set("course_code", e.target.value)}
              placeholder="CS-401"
              disabled={!!course}
              required
              className={`${inputCls} font-mono`}
            />
          </div>

          {/* Course Name */}
          <div>
            <label className="block text-xs font-medium text-theme-sub mb-1.5">Course Name *</label>
            <input
              value={form.course_name}
              onChange={(e) => set("course_name", e.target.value)}
              placeholder="Advanced Artificial Intelligence"
              required
              className={inputCls}
            />
          </div>

          {/* Major & Academic Year */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-theme-sub mb-1.5">Major (ဘာသာရပ်)</label>
              <div className="relative">
                <select
                  value={form.major}
                  onChange={(e) => {
                    set("major", e.target.value);
                    if (e.target.value) set("dept_code", e.target.value);
                  }}
                  className={`${inputCls} appearance-none pr-9`}
                >
                  <option value="">-- All Majors --</option>
                  {MAJOR_OPTIONS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-sub pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-theme-sub mb-1.5">Target Year Level *</label>
              <div className="relative">
                <select
                  value={form.academic_year}
                  onChange={(e) => set("academic_year", e.target.value)}
                  className={`${inputCls} appearance-none pr-9 font-semibold text-violet-300`}
                >
                  <option value="1">Year 1 (First Year)</option>
                  <option value="2">Year 2 (Second Year)</option>
                  <option value="3">Year 3 (Third Year)</option>
                  <option value="4">Year 4 (Fourth / Final)</option>
                  <option value="5">Year 5 (Master / Honor)</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-sub pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Semester — from Operations semesters */}
          <div>
            <label className="block text-xs font-medium text-theme-sub mb-1.5">
              Semester <span className="text-slate-600 font-normal">(optional — ဘယ် Semester ကသင်ရမဲ့ course)</span>
            </label>
            <select
              value={form.semester_id}
              onChange={(e) => set("semester_id", e.target.value)}
              className={`${inputCls} appearance-none`}
            >
              <option value="">-- Select Semester --</option>
              {semesters.map((s) => (
                <option key={s.semester_id} value={s.semester_id}>
                  {s.academic_year} — {s.term}{s.is_active ? " ★ ACTIVE" : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Department + Credit Hours */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-theme-sub mb-1.5">Department *</label>
              <select
                value={form.dept_code}
                onChange={(e) => set("dept_code", e.target.value)}
                className={inputCls}
              >
                {departments.length === 0 ? (
                  <option value="CST">CST</option>
                ) : (
                  departments.map((d) => (
                    <option key={d.dept_code} value={d.dept_code}>
                      {d.dept_code} — {d.dept_name}
                    </option>
                  ))
                )}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-theme-sub mb-1.5">Credit Hours *</label>
              <input
                type="number" min="1" max="10"
                value={form.credit_hours}
                onChange={(e) => set("credit_hours", e.target.value)}
                className={inputCls}
              />
            </div>
          </div>

          {/* Assigned Teacher (Filtered by Department) */}
          <div>
            <label className="block text-xs font-medium text-theme-sub mb-1.5">
              Assigned Teacher {form.dept_code ? `(${form.dept_code} Department)` : ""}
            </label>
            <select
              value={form.teacher_id}
              onChange={(e) => set("teacher_id", e.target.value)}
              className={inputCls}
            >
              <option value="">-- None Assigned --</option>
              {filteredTeachers.map((t) => (
                <option key={t.teacher_id} value={t.teacher_id}>
                  {t.full_name} ({t.teacher_id})
                </option>
              ))}
            </select>
          </div>

          {error && (
            <p className="text-sm text-red-400 bg-red-900/20 border border-red-800/50 rounded-lg px-3 py-2">{error}</p>
          )}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2 rounded-lg border border-theme-border-hover text-theme-sub text-sm hover:bg-theme-elevated transition-colors">
              Cancel
            </button>
            <button type="submit"
              disabled={loading || !form.course_code || !form.course_name}
              className="flex-1 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-theme-text text-sm font-medium transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {course ? "Save Changes" : "Create Course"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
