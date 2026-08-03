"use client";

import { useState, useEffect } from "react";
import { attendanceApi, studentsApi, coursesApi } from "@/lib/api";
import type { Student, Course } from "@/types";
import { X, Loader2, CalendarCheck, UserCheck } from "lucide-react";

interface SingleAttendanceDialogProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function SingleAttendanceDialog({ onClose, onSuccess }: SingleAttendanceDialogProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [studentId, setStudentId] = useState("");
  const [courseCode, setCourseCode] = useState("");
  const [status, setStatus] = useState<"PRESENT" | "LATE" | "ABSENT">("PRESENT");

  useEffect(() => {
    Promise.all([
      studentsApi.list({ limit: 200 }),
      coursesApi.list({ limit: 100 }),
    ])
      .then(([stRes, crsRes]) => {
        setStudents(stRes.items);
        setCourses(crsRes.items);
        if (stRes.items.length > 0) setStudentId(stRes.items[0].student_id);
        if (crsRes.items.length > 0) setCourseCode(crsRes.items[0].course_code);
      })
      .catch((err: unknown) => setError((err as Error).message))
      .finally(() => setIsLoadingData(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId || !courseCode) {
      setError("Please select both a student and a course.");
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
                  {students.map((s) => (
                    <option key={s.student_id} value={s.student_id}>
                      {s.roll_number} — {s.full_name} ({s.student_id})
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
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  required
                >
                  {courses.map((c) => (
                    <option key={c.course_code} value={c.course_code}>
                      {c.course_code} — {c.course_name}
                    </option>
                  ))}
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
                  disabled={isSubmitting}
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
