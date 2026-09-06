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
  const selectedSemester = semesters.find((s) => s.semester_id.toString() === semesterId);

  const isSemester3 = selectedSemester && (
    selectedSemester.term.includes("3") ||
    selectedSemester.semester_id === 3 ||
    selectedSemester.term.toLowerCase().includes("sem 3") ||
    selectedSemester.term.toLowerCase().includes("semester 3")
  );

  // Filter courses ONLY by selected semester
  const filteredCourses = courses.filter((c) => {
    return semesterId && c.semester_id ? c.semester_id === parseInt(semesterId) : true;
  });

  useEffect(() => {
    setSelectedCourses([]); // clear selection when semester or student changes
  }, [semesterId, studentId]);

  useEffect(() => {
    if (selectedStudent) {
      setPromoteYear(Math.min(6, (selectedStudent.academic_year || 1) + 1));
      setSelectedCourses([]); // clear on student change
    }
  }, [studentId]);

  const toggleCourse = (code: string) => {
    setSelectedCourses((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const [updateStudentMajor, setUpdateStudentMajor] = useState<string>("NO_CHANGE");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const effectiveMajor = updateStudentMajor !== "NO_CHANGE" ? updateStudentMajor : undefined;
      // Use batch API even for single student, supports multi-course
      await enrollmentsApi.createBatch({
        student_ids: [studentId],
        course_codes: selectedCourses,
        semester_id: parseInt(semesterId),
        promote_academic_year: autoPromote ? promoteYear : undefined,
        update_major: effectiveMajor,
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
      <div className="bg-theme-surface border border-theme-border-hover rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-theme-border">
          <h3 className="font-semibold text-theme-text">Enroll Student in Courses</h3>
          <button onClick={onClose} className="text-theme-muted hover:text-theme-text transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Semester Selector */}
          <div>
            <label className="block text-xs font-medium text-theme-sub mb-1.5">Select Academic Term / Semester *</label>
            <select
              value={semesterId}
              onChange={(e) => setSemesterId(e.target.value)}
              className="w-full px-3 py-2 bg-theme-elevated border border-theme-border-hover rounded-lg text-sm text-theme-text focus:outline-none focus:ring-2 focus:ring-teal-600/50 font-mono"
            >
              {semesters.map((sem) => (
                <option key={sem.semester_id} value={sem.semester_id}>
                  {sem.academic_year} {sem.term} {sem.is_active ? "(ACTIVE)" : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Student */}
          <div>
            <label className="block text-xs font-medium text-theme-sub mb-1.5">Select Student *</label>
            <select
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              className="w-full px-3 py-2 bg-theme-elevated border border-theme-border-hover rounded-lg text-sm text-theme-text focus:outline-none focus:ring-2 focus:ring-teal-600/50"
            >
              {students.map((s) => (
                <option key={s.student_id} value={s.student_id}>
                  {s.full_name} ({s.roll_number} — {s.major ?? s.dept_code})
                </option>
              ))}
            </select>
            {selectedStudent && (
              <p className="text-[11px] text-theme-sub mt-1 flex items-center gap-2">
                <span>Current Year: <span className="text-teal-400 font-semibold">Year {selectedStudent.academic_year}</span></span>
                <span>·</span>
                <span>Major: <span className="text-amber-400 font-semibold">{selectedStudent.major ?? selectedStudent.dept_code}</span></span>
              </p>
            )}
          </div>

          {/* Course Multi-Select */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-theme-sub">
                Select Courses * <span className="text-teal-400">({selectedCourses.length} selected)</span>
                {selectedSemester && (
                  <span className="ml-2 text-[10px] text-theme-muted">
                    — {selectedSemester.term}
                  </span>
                )}
              </label>
              {filteredCourses.length > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    setSelectedCourses(
                      selectedCourses.length === filteredCourses.length ? [] : filteredCourses.map((c) => c.course_code)
                    )
                  }
                  className="text-[11px] text-teal-400 hover:text-teal-300 font-medium"
                >
                  {selectedCourses.length === filteredCourses.length ? "Deselect All" : "Select All"}
                </button>
              )}
            </div>
            <div className="bg-theme-elevated border border-theme-border-hover rounded-lg overflow-y-auto max-h-44 divide-y divide-theme-border/50">
              {filteredCourses.length === 0 ? (
                <p className="text-xs text-theme-muted py-6 text-center">
                  {courses.length === 0 ? "No courses available" : "No courses match selected semester / major"}
                </p>
              ) : (
                filteredCourses.map((c) => {
                  const isSelected = selectedCourses.includes(c.course_code);
                  return (
                    <div
                      key={c.course_code}
                      onClick={() => toggleCourse(c.course_code)}
                      className={`flex items-center gap-2.5 px-3 py-2.5 cursor-pointer transition-colors text-xs ${
                        isSelected
                          ? "bg-teal-950/50 text-teal-200"
                          : "text-theme-sub hover:bg-theme-muted/50"
                      }`}
                    >
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-teal-400 shrink-0" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-600 shrink-0" />
                      )}
                      <span className="font-mono font-bold text-theme-text">{c.course_code}</span>
                      <span className="truncate text-theme-sub">{c.course_name}</span>
                      {c.major && (
                        <span className="ml-auto font-mono text-[10px] px-1.5 py-0.5 rounded bg-theme-surface text-teal-300">
                          {c.major}
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Auto-Promote & Major Update */}
          <div className="p-3 bg-theme-surface/60 border border-theme-border rounded-xl space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-theme-sub">
                <input
                  type="checkbox"
                  checked={autoPromote}
                  onChange={(e) => setAutoPromote(e.target.checked)}
                  className="w-4 h-4 rounded border-theme-border-hover bg-theme-elevated text-teal-500 focus:ring-teal-500/50"
                />
                Promote Student's Academic Year upon enrollment
              </label>
              {autoPromote && (
                <select
                  value={promoteYear}
                  onChange={(e) => setPromoteYear(parseInt(e.target.value))}
                  className="px-2 py-1 bg-theme-elevated border border-theme-border-hover rounded text-xs text-teal-300 font-bold focus:outline-none"
                >
                  {[1, 2, 3, 4, 5].map((y) => (
                    <option key={y} value={y}>Year {y}</option>
                  ))}
                </select>
              )}
            </div>

            {isSemester3 && (
              <div className="flex items-center justify-between border-t border-theme-border/80 pt-2 text-xs animate-in fade-in duration-150">
                <span className="font-semibold text-theme-sub">Update Student Major (အတန်းပြောင်းချိန် Major သိမ်းရန်):</span>
                <select
                  value={updateStudentMajor}
                  onChange={(e) => setUpdateStudentMajor(e.target.value)}
                  className="px-2.5 py-1 bg-theme-elevated border border-theme-border-hover rounded text-xs text-amber-300 font-bold focus:outline-none"
                >
                  <option value="NO_CHANGE">Keep Current Major ({selectedStudent?.major ?? selectedStudent?.dept_code ?? "None"})</option>
                  <option value="CS">CS (Computer Science)</option>
                  <option value="CT">CT (Computer Technology)</option>
                </select>
              </div>
            )}
          </div>

          {error && <p className="text-sm text-red-400 bg-red-900/20 border border-red-800/50 rounded-lg px-3 py-2">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 rounded-lg border border-theme-border-hover text-theme-sub text-sm hover:bg-theme-elevated transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !studentId || selectedCourses.length === 0 || !semesterId}
              className="flex-1 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-theme-text text-sm font-medium transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2"
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
