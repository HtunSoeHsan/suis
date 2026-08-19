"use client";

import { useState, useEffect } from "react";
import { attendanceApi, coursesApi, enrollmentsApi, studentsApi, semestersApi } from "@/lib/api";
import type { Course, Student, Semester } from "@/types";
import { X, Loader2, CalendarCheck, CheckCircle2, XCircle, Clock, CheckSquare, CalendarDays } from "lucide-react";

interface BatchAttendanceDialogProps {
  onClose: () => void;
  onSuccess: () => void;
}

interface StudentAttendanceRow {
  student: Student;
  status: "PRESENT" | "LATE" | "ABSENT";
}

export function BatchAttendanceDialog({ onClose, onSuccess }: BatchAttendanceDialogProps) {
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [selectedSemesterId, setSelectedSemesterId] = useState<number | "ALL">("ALL");

  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>("");
  const [selectedSection, setSelectedSection] = useState<string>("ALL");

  const [rows, setRows] = useState<StudentAttendanceRow[]>([]);
  const [isLoadingCourses, setIsLoadingCourses] = useState(true);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Default to today's date
  const todayStr = new Date().toISOString().split("T")[0];
  const [attendanceDate, setAttendanceDate] = useState(todayStr);

  useEffect(() => {
    Promise.all([
      semestersApi.list({ limit: 100 }),
      coursesApi.list({ limit: 200 }),
    ])
      .then(([semRes, crsRes]) => {
        setSemesters(semRes.items);
        setCourses(crsRes.items);

        const activeSem = semRes.items.find((s) => s.is_active) ?? semRes.items[0];
        if (activeSem) {
          setSelectedSemesterId(activeSem.semester_id);
        }
      })
      .catch((err: unknown) => setError((err as Error).message))
      .finally(() => setIsLoadingCourses(false));
  }, []);

  // Filter courses strictly by selected semester
  const filteredCourses = courses.filter((c) => {
    if (selectedSemesterId === "ALL") return true;
    return c.semester_id === selectedSemesterId;
  });

  // Filter student rows by section
  const displayedRows = rows.filter((r) => {
    if (selectedSection === "ALL") return true;
    return r.student.section === selectedSection;
  });

  // When semester changes, auto-select first matching course (use courses + selectedSemesterId as deps to avoid infinite loop)
  useEffect(() => {
    const filtered = courses.filter((c) =>
      selectedSemesterId === "ALL" ? true : c.semester_id === selectedSemesterId
    );
    if (filtered.length > 0) {
      const isValid = filtered.some((c) => c.course_code === selectedCourse);
      if (!isValid) {
        setSelectedCourse(filtered[0].course_code);
      }
    } else {
      setSelectedCourse("");
      setRows([]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSemesterId, courses]);

  // Fetch enrolled students whenever selectedCourse changes
  useEffect(() => {
    if (!selectedCourse) {
      setRows([]);
      return;
    }

    setIsLoadingStudents(true);
    setError(null);

    Promise.all([
      enrollmentsApi.list({ course_code: selectedCourse, limit: 200 }),
      studentsApi.list({ limit: 500 }),
    ])
      .then(([enrRes, stRes]) => {
        const studentMap: Record<string, Student> = {};
        stRes.items.forEach((s) => { studentMap[s.student_id] = s; });

        const enrolledStudents: Student[] = enrRes.items
          .map((e) => studentMap[e.student_id])
          .filter((s): s is Student => Boolean(s));

        setRows(
          enrolledStudents.map((s) => ({
            student: s,
            status: "PRESENT", // default all present
          }))
        );
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : typeof err === "object" && err ? JSON.stringify(err) : String(err);
        setError(msg);
      })
      .finally(() => setIsLoadingStudents(false));
  }, [selectedCourse]);

  const handleSetAllStatus = (status: "PRESENT" | "LATE" | "ABSENT") => {
    const displayedIds = new Set(displayedRows.map((r) => r.student.student_id));
    setRows((prev) =>
      prev.map((r) => (displayedIds.has(r.student.student_id) ? { ...r, status } : r))
    );
  };

  const handleStudentStatusChange = (studentId: string, status: "PRESENT" | "LATE" | "ABSENT") => {
    setRows((prev) =>
      prev.map((r) => (r.student.student_id === studentId ? { ...r, status } : r))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourse) {
      setError("Please select a valid course.");
      return;
    }
    if (displayedRows.length === 0) {
      setError("No enrolled students found for the selected section.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Build ISO datetime: selected date at current time
      const now = new Date();
      const [year, month, day] = attendanceDate.split("-").map(Number);
      const verifiedAt = new Date(year, month - 1, day, now.getHours(), now.getMinutes(), now.getSeconds());

      await attendanceApi.createBatch({
        course_code: selectedCourse,
        verified_at: verifiedAt.toISOString(),
        items: displayedRows.map((r) => ({
          student_id: r.student.student_id,
          status: r.status,
          confidence_score: 1.0,
        })),
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
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50 flex-shrink-0">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-lg">
            <CheckSquare className="w-5 h-5" />
            <span>Class Attendance Sheet (အစုလိုက် ကောက်ရန်)</span>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 bg-red-950/60 border border-red-800/60 rounded-xl text-xs text-red-300">
              {error}
            </div>
          )}

          {/* Attendance Date Picker */}
          <div className="flex items-center gap-3 bg-slate-950/60 px-4 py-3 rounded-xl border border-cyan-900/50">
            <CalendarDays className="w-4 h-4 text-cyan-400 flex-shrink-0" />
            <div className="flex-1">
              <label className="block text-[11px] font-semibold text-cyan-400 uppercase tracking-wider mb-1">
                Attendance Date (ရက်စွဲ)
              </label>
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  type="date"
                  value={attendanceDate}
                  max={todayStr}
                  onChange={(e) => setAttendanceDate(e.target.value)}
                  className="px-2.5 py-1.5 bg-slate-900 border border-cyan-800/60 rounded-lg text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-600/50 [color-scheme:dark]"
                />
                {attendanceDate !== todayStr && (
                  <button
                    type="button"
                    onClick={() => setAttendanceDate(todayStr)}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-cyan-800/60 bg-cyan-950/40 text-cyan-400 hover:bg-cyan-900/40 transition-colors"
                  >
                    Today
                  </button>
                )}
                {attendanceDate !== todayStr && (
                  <span className="text-xs text-amber-400 font-medium">
                    ⚠ Past date recording
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* 3-Step Selector Row: Semester -> Course -> Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
            {/* 1. Semester Selector */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                1. Select Academic Term
              </label>
              <select
                value={selectedSemesterId}
                onChange={(e) => setSelectedSemesterId(e.target.value === "ALL" ? "ALL" : Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-semibold text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              >
                <option value="ALL">-- All Semesters --</option>
                {semesters.map((s) => (
                  <option key={s.semester_id} value={s.semester_id}>
                    {s.academic_year} ({s.term}) {s.is_active ? " ★ ACTIVE" : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Course Selector */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                2. Select Course
              </label>
              {isLoadingCourses ? (
                <div className="py-2">
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                </div>
              ) : (
                <select
                  value={selectedCourse}
                  onChange={(e) => setSelectedCourse(e.target.value)}
                  disabled={filteredCourses.length === 0}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-semibold text-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 disabled:opacity-50"
                >
                  {filteredCourses.length === 0 ? (
                    <option value="">No courses in semester</option>
                  ) : (
                    filteredCourses.map((c) => (
                      <option key={c.course_code} value={c.course_code}>
                        {c.course_code} — {c.course_name}
                      </option>
                    ))
                  )}
                </select>
              )}
            </div>

            {/* 3. Section Filter */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                3. Filter Section (အစု)
              </label>
              <select
                value={selectedSection}
                onChange={(e) => setSelectedSection(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-semibold text-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
              >
                <option value="ALL">-- All Sections --</option>
                <option value="A">Section A</option>
                <option value="B">Section B</option>
                <option value="C">Section C</option>
              </select>
            </div>
          </div>

          {/* Quick Bulk Actions & Counter */}
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-medium text-slate-400">
              Showing <span className="text-emerald-400 font-bold">{displayedRows.length}</span> enrolled student{displayedRows.length !== 1 ? "s" : ""}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleSetAllStatus("PRESENT")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950 border border-emerald-800/80 text-emerald-300 text-xs font-bold hover:bg-emerald-900 transition-colors"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> All Present
              </button>
              <button
                type="button"
                onClick={() => handleSetAllStatus("ABSENT")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-950 border border-red-800/80 text-red-300 text-xs font-bold hover:bg-red-900 transition-colors"
              >
                <XCircle className="w-3.5 h-3.5" /> All Absent
              </button>
            </div>
          </div>

          {/* Student Table */}
          <div className="bg-slate-950/40 border border-slate-800 rounded-xl overflow-hidden">
            {isLoadingStudents ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
              </div>
            ) : displayedRows.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-sm">
                {!selectedCourse ? (
                  "Please select a course above to load enrolled students."
                ) : (
                  <>No enrolled students found for course <span className="font-mono text-amber-400">{selectedCourse}</span>{selectedSection !== "ALL" ? ` in Section ${selectedSection}` : ""}.</>
                )}
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="border-b border-slate-800 bg-slate-950">
                  <tr className="text-left text-slate-500 text-xs uppercase tracking-wider">
                    <th className="px-4 py-3">Roll No</th>
                    <th className="px-4 py-3">Student Name</th>
                    <th className="px-4 py-3">Section</th>
                    <th className="px-4 py-3 text-right">Attendance Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {displayedRows.map(({ student, status }) => (
                    <tr key={student.student_id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-3 font-mono font-semibold text-violet-400 text-xs">
                        {student.roll_number}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-200 text-xs">{student.full_name}</p>
                        <p className="text-[11px] font-mono text-slate-500">{student.student_id}</p>
                      </td>
                      <td className="px-4 py-3">
                        {student.section && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-violet-950/60 text-violet-300 border border-violet-800/50">
                            §{student.section}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          {[
                            { val: "PRESENT", label: "Present", icon: CheckCircle2, active: "bg-emerald-600 text-white border-emerald-500" },
                            { val: "LATE", label: "Late", icon: Clock, active: "bg-amber-600 text-white border-amber-500" },
                            { val: "ABSENT", label: "Absent", icon: XCircle, active: "bg-red-600 text-white border-red-500" },
                          ].map((b) => {
                            const Icon = b.icon;
                            const isSelected = status === b.val;
                            return (
                              <button
                                key={b.val}
                                type="button"
                                onClick={() => handleStudentStatusChange(student.student_id, b.val as any)}
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-bold transition-all ${
                                  isSelected
                                    ? b.active
                                    : "border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                                }`}
                              >
                                <Icon className="w-3.5 h-3.5" />
                                <span>{b.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-950/50 flex-shrink-0">
          <p className="text-xs text-slate-400">
            Total {displayedRows.length} students enrolled in <span className="font-mono text-emerald-400 font-bold">{selectedCourse || "—"}</span>
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || rows.length === 0 || !selectedCourse}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-colors shadow-lg shadow-emerald-900/30 disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CalendarCheck className="w-4 h-4" />
              )}
              Save Attendance Sheet ({rows.length})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
