"use client";

import { useState, useEffect } from "react";
import { attendanceApi, studentsApi, coursesApi, semestersApi } from "@/lib/api";
import type { Student, Course, Semester } from "@/types";
import { X, Loader2, CalendarCheck, UserCheck } from "lucide-react";

interface SingleAttendanceDialogProps {
  onClose: () => void;
  onSuccess: () => void;
}

import { useAuth } from "@/context/AuthContext";
import { enrollmentsApi } from "@/lib/api";

interface SingleAttendanceDialogProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function SingleAttendanceDialog({ onClose, onSuccess }: SingleAttendanceDialogProps) {
  const { user } = useAuth();
  const isTeacher = user?.role === "TEACHER";

  const [students, setStudents] = useState<Student[]>([]);
  const [enrolledStudents, setEnrolledStudents] = useState<Student[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [selectedSemesterId, setSelectedSemesterId] = useState<number | "ALL">("ALL");
  const [courses, setCourses] = useState<Course[]>([]);

  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isLoadingEnrolled, setIsLoadingEnrolled] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [studentId, setStudentId] = useState("");
  const [courseCode, setCourseCode] = useState("");
  const [status, setStatus] = useState<"PRESENT" | "LATE" | "ABSENT">("PRESENT");

  useEffect(() => {
    Promise.all([
      studentsApi.list({ limit: 500 }),
      semestersApi.list({ limit: 100 }),
      coursesApi.list({
        limit: 200,
        ...(isTeacher && user?.teacher_id ? { teacher_id: user.teacher_id } : {}),
      }),
    ])
      .then(([stRes, semRes, crsRes]) => {
        setStudents(stRes.items);
        setSemesters(semRes.items);
        setCourses(crsRes.items);

        const activeSem = semRes.items.find((s) => s.is_active) ?? semRes.items[0];
        if (activeSem) {
          setSelectedSemesterId(activeSem.semester_id);
        }
      })
      .catch((err: unknown) => setError((err as Error).message))
      .finally(() => setIsLoadingData(false));
  }, [isTeacher, user?.teacher_id]);

  const filteredCourses = courses.filter((c) => {
    if (isTeacher && user?.teacher_id && c.teacher_id !== user.teacher_id) return false;
    if (selectedSemesterId === "ALL") return true;
    return c.semester_id === selectedSemesterId;
  });

  useEffect(() => {
    if (filteredCourses.length > 0) {
      const isValid = filteredCourses.some((c) => c.course_code === courseCode);
      if (!isValid) {
        setCourseCode(filteredCourses[0].course_code);
      }
    } else {
      setCourseCode("");
    }
  }, [selectedSemesterId, filteredCourses]);

  // Fetch enrolled students whenever courseCode changes
  useEffect(() => {
    if (!courseCode) {
      setEnrolledStudents([]);
      setStudentId("");
      return;
    }

    setIsLoadingEnrolled(true);
    enrollmentsApi.list({ course_code: courseCode, limit: 200 })
      .then((enrRes) => {
        const enrolledStudentIds = new Set(enrRes.items.map((e) => e.student_id));
        const matched = students.filter((s) => enrolledStudentIds.has(s.student_id));
        setEnrolledStudents(matched.length > 0 ? matched : students);
        if (matched.length > 0) {
          setStudentId(matched[0].student_id);
        } else if (students.length > 0) {
          setStudentId(students[0].student_id);
        }
      })
      .catch(() => {
        setEnrolledStudents(students);
      })
      .finally(() => setIsLoadingEnrolled(false));
  }, [courseCode, students]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId || !courseCode) {
      setError("Please select both a student and a valid course.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await attendanceApi.create({
        student_id: studentId,
        course_code: courseCode,
        status,
        confidence_score: 1.0,
      });
      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-lg">
            <UserCheck className="w-5 h-5" />
            <span>Record Single Attendance (Manual)</span>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-950/60 border border-red-800/60 rounded-xl text-xs text-red-300">
              {error}
            </div>
          )}

          {isLoadingData ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
            </div>
          ) : (
            <>
              {/* Student Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Select Student
                </label>
                <select
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  required
                >
                  {enrolledStudents.map((s) => (
                    <option key={s.student_id} value={s.student_id}>
                      {s.roll_number} — {s.full_name} ({s.student_id})
                    </option>
                  ))}
                </select>
              </div>

              {/* Academic Term / Semester Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Select Academic Term / Semester
                </label>
                <select
                  value={selectedSemesterId}
                  onChange={(e) => setSelectedSemesterId(e.target.value === "ALL" ? "ALL" : Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                >
                  <option value="ALL">-- All Semesters --</option>
                  {semesters.map((s) => (
                    <option key={s.semester_id} value={s.semester_id}>
                      {s.academic_year} — {s.term} {s.is_active ? " ★ ACTIVE" : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Course Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Select Course
                </label>
                <select
                  value={courseCode}
                  onChange={(e) => setCourseCode(e.target.value)}
                  disabled={filteredCourses.length === 0}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 disabled:opacity-50"
                  required
                >
                  {filteredCourses.length === 0 ? (
                    <option value="">No courses in this semester</option>
                  ) : (
                    filteredCourses.map((c) => (
                      <option key={c.course_code} value={c.course_code}>
                        {c.course_code} — {c.course_name} ({c.major ?? c.dept_code})
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Status Radio Buttons */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Attendance Status
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: "PRESENT", label: "Present (တက်)", color: "border-emerald-600 bg-emerald-950/40 text-emerald-300" },
                    { value: "LATE", label: "Late (နောက်ကျ)", color: "border-amber-600 bg-amber-950/40 text-amber-300" },
                    { value: "ABSENT", label: "Absent (ပျက်)", color: "border-red-600 bg-red-950/40 text-red-300" },
                  ].map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setStatus(item.value as any)}
                      className={`py-2 px-2 rounded-xl border text-xs font-bold transition-all ${
                        status === item.value
                          ? `${item.color} ring-2 ring-emerald-500/30`
                          : "border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !courseCode}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-colors shadow-lg shadow-emerald-900/30 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CalendarCheck className="w-4 h-4" />
                  )}
                  Save Record
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
