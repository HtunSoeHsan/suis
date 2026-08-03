"use client";

import { useState, useEffect } from "react";
import { enrollmentsApi, studentsApi, coursesApi, semestersApi } from "@/lib/api";
import type { Student, Course, Semester } from "@/types";
import { X, Loader2, UserCheck, CheckSquare, Square } from "lucide-react";

interface Props {
  onClose: () => void;
}

export function EnrollmentFormDialog({ onClose }: Props) {
  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);

  const [studentId, setStudentId] = useState("");
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [semesterId, setSemesterId] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      studentsApi.list({ limit: 200 }),
      coursesApi.list({ limit: 200 }),
      semestersApi.list({ limit: 100 }),
    ]).then(([sRes, cRes, semRes]) => {
      setStudents(sRes.items);
      setCourses(cRes.items);
      setSemesters(semRes.items);
      if (sRes.items.length > 0) setStudentId(sRes.items[0].student_id);
      const activeSem = semRes.items.find((s) => s.is_active) ?? semRes.items[0];
      if (activeSem) setSemesterId(activeSem.semester_id.toString());
    }).catch((e: unknown) => setError((e as Error).message));
  }, []);

  const [autoPromote, setAutoPromote] = useState(false);
  const [promoteYear, setPromoteYear] = useState<number>(2);

  const selectedStudent = students.find((s) => s.student_id === studentId);

  useEffect(() => {
    if (selectedStudent) {
      setPromoteYear(Math.min(6, (selectedStudent.academic_year || 1) + 1));
    }
  }, [studentId]);

  const toggleCourse = (code: string) => {
    setSelectedCourses((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      // Use batch API even for single student, supports multi-course
      await enrollmentsApi.createBatch({
        student_ids: [studentId],
        course_codes: selectedCourses,
        semester_id: parseInt(semesterId),
        promote_academic_year: autoPromote ? promoteYear : undefined,
      });
      onClose();
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <h3 className="font-semibold text-white">Enroll Student in Courses</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-200 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Student */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Select Student *</label>
            <select
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-600/50"
            >
              {students.map((s) => (
                <option key={s.student_id} value={s.student_id}>
                  {s.full_name} ({s.roll_number} — {s.dept_code})
                </option>
              ))}
            </select>
            {selectedStudent && (
              <p className="text-[11px] text-slate-400 mt-1">
                Current Year: <span className="text-teal-400 font-semibold">Year {selectedStudent.academic_year}</span>
              </p>
            )}
          </div>

          {/* Course Multi-Select */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-slate-400">
                Select Courses * <span className="text-teal-400">({selectedCourses.length} selected)</span>
              </label>
              {courses.length > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    setSelectedCourses(
                      selectedCourses.length === courses.length ? [] : courses.map((c) => c.course_code)
                    )
                  }
                  className="text-[11px] text-teal-400 hover:text-teal-300 font-medium"
                >
                  {selectedCourses.length === courses.length ? "Deselect All" : "Select All"}
                </button>
              )}
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-y-auto max-h-44 divide-y divide-slate-700/50">
              {courses.length === 0 ? (
                <p className="text-xs text-slate-500 py-6 text-center">No courses available</p>
              ) : (
                courses.map((c) => {
                  const isSelected = selectedCourses.includes(c.course_code);
                  return (
                    <div
                      key={c.course_code}
                      onClick={() => toggleCourse(c.course_code)}
                      className={`flex items-center gap-2.5 px-3 py-2.5 cursor-pointer transition-colors text-xs ${
                        isSelected
                          ? "bg-teal-950/50 text-teal-200"
                          : "text-slate-300 hover:bg-slate-700/50"
                      }`}
                    >
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-teal-400 shrink-0" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-600 shrink-0" />
                      )}
                      <span className="font-mono font-bold text-slate-200">{c.course_code}</span>
                      <span className="truncate text-slate-400">{c.course_name}</span>
                      <span className="ml-auto text-[10px] text-slate-500 shrink-0">{c.dept_code}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Semester */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Select Academic Term *</label>
            <select
              value={semesterId}
              onChange={(e) => setSemesterId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-600/50 font-mono"
            >
              {semesters.map((sem) => (
                <option key={sem.semester_id} value={sem.semester_id}>
                  {sem.academic_year} {sem.term} {sem.is_active ? "(ACTIVE)" : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Auto-Promote */}
          <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-300">
              <input
                type="checkbox"
                checked={autoPromote}
                onChange={(e) => setAutoPromote(e.target.checked)}
                className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-teal-500 focus:ring-teal-500/50"
              />
              Auto-promote student's Academic Year upon enrollment
            </label>
            {autoPromote && (
              <div className="flex items-center gap-2 pl-6 pt-1">
                <span className="text-xs text-slate-400">Promote to Year:</span>
                <select
                  value={promoteYear}
                  onChange={(e) => setPromoteYear(parseInt(e.target.value))}
                  className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs text-teal-300 font-bold focus:outline-none"
                >
                  {[1, 2, 3, 4, 5].map((y) => (
                    <option key={y} value={y}>Year {y}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {error && <p className="text-sm text-red-400 bg-red-900/20 border border-red-800/50 rounded-lg px-3 py-2">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 rounded-lg border border-slate-700 text-slate-300 text-sm hover:bg-slate-800 transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !studentId || selectedCourses.length === 0 || !semesterId}
              className="flex-1 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-sm font-medium transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
              Enroll ({selectedCourses.length} Courses)
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
