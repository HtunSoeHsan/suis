"use client";

import { useState, useEffect } from "react";
import { enrollmentsApi, studentsApi, coursesApi, semestersApi, departmentsApi } from "@/lib/api";
import type { Student, Course, Semester, Department } from "@/types";
import { X, Loader2, Users, BookOpen, Layers, CheckSquare, Square, Sparkles, ArrowRight } from "lucide-react";

interface Props {
  initialStudentIds?: string[];
  onClose: () => void;
  onSuccess: () => void;
}

export function BatchEnrollmentDialog({ initialStudentIds, onClose, onSuccess }: Props) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [allStudents, setAllStudents] = useState<Student[]>([]);

  // Selection states
  const [semesterId, setSemesterId] = useState("");
  const [courseDeptFilter, setCourseDeptFilter] = useState("ALL");
  const [studentMajorFilter, setStudentMajorFilter] = useState("ALL");
  const [studentYearFilter, setStudentYearFilter] = useState<number | "ALL">("ALL");

  const [selectedCourseCodes, setSelectedCourseCodes] = useState<string[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>(initialStudentIds ?? []);

  // Auto promote
  const [autoPromote, setAutoPromote] = useState(false);
  const [promoteYear, setPromoteYear] = useState<number>(4);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [resultMsg, setResultMsg] = useState("");

  useEffect(() => {
    Promise.all([
      departmentsApi.list({ limit: 100 }),
      semestersApi.list({ limit: 100 }),
      coursesApi.list({ limit: 500 }),
      studentsApi.list({ limit: 1000 }),
    ])
      .then(([dRes, semRes, cRes, sRes]) => {
        setDepartments(dRes.items);
        setSemesters(semRes.items);
        setAllCourses(cRes.items);
        setAllStudents(sRes.items);

        const activeSem = semRes.items.find((s) => s.is_active) ?? semRes.items[0];
        if (activeSem) setSemesterId(activeSem.semester_id.toString());
      })
      .catch((e: unknown) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, []);

  const selectedSemester = semesters.find((s) => s.semester_id.toString() === semesterId);
  const isSemester3 = selectedSemester && (
    selectedSemester.term.includes("3") ||
    selectedSemester.semester_id === 3 ||
    selectedSemester.term.toLowerCase().includes("sem 3") ||
    selectedSemester.term.toLowerCase().includes("semester 3")
  );

  // Filtered courses & students
  const filteredCourses = allCourses.filter((c) => {
    // Filter by target semester
    if (semesterId && c.semester_id && c.semester_id !== parseInt(semesterId)) {
      return false;
    }
    // Filter by department
    if (courseDeptFilter !== "ALL" && c.dept_code !== courseDeptFilter) {
      return false;
    }
    return true;
  });

  const filteredStudents = allStudents.filter((s) => {
    const sMajor = (s.major ?? s.dept_code ?? "").toUpperCase();
    const filterMajor = studentMajorFilter.toUpperCase();
    const matchMajor =
      studentMajorFilter === "ALL" ||
      sMajor === filterMajor ||
      sMajor.includes(filterMajor);

    const matchYear =
      studentYearFilter === "ALL" ||
      String(s.academic_year) === String(studentYearFilter);

    return matchMajor && matchYear;
  });

  // Select all handlers
  const toggleSelectAllCourses = () => {
    const visibleCodes = filteredCourses.map((c) => c.course_code);
    const allSelected = visibleCodes.every((code) => selectedCourseCodes.includes(code));
    if (allSelected) {
      setSelectedCourseCodes((prev) => prev.filter((c) => !visibleCodes.includes(c)));
    } else {
      setSelectedCourseCodes((prev) => Array.from(new Set([...prev, ...visibleCodes])));
    }
  };

  const toggleSelectAllStudents = () => {
    const visibleIds = filteredStudents.map((s) => s.student_id);
    const allSelected = visibleIds.every((id) => selectedStudentIds.includes(id));
    if (allSelected) {
      setSelectedStudentIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
    } else {
      setSelectedStudentIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  const toggleCourse = (code: string) => {
    setSelectedCourseCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const toggleStudent = (id: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const [updateMajor, setUpdateMajor] = useState<string>("NO_CHANGE");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const effectiveMajor = updateMajor !== "NO_CHANGE" ? updateMajor : undefined;
      const res = await enrollmentsApi.createBatch({
        semester_id: parseInt(semesterId),
        course_codes: selectedCourseCodes,
        student_ids: selectedStudentIds,
        promote_academic_year: autoPromote ? promoteYear : undefined,
        update_major: effectiveMajor,
      });

      setResultMsg(
        `Successfully created ${res.total_enrolled} course enrollments for ${res.enrolled_student_count} students! Saved academic year & major updates in database.`
      );
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1200);
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const totalCalculated = selectedCourseCodes.length * selectedStudentIds.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 shrink-0">
          <h3 className="font-semibold text-white flex items-center gap-2 text-lg">
            <Layers className="w-5 h-5 text-teal-400" /> Batch Course Enrollment
          </h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-200 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-teal-400" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto flex-1">
            {/* Step 1: Semester Selector */}
            <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl">
              <label className="block text-xs font-semibold text-teal-400 tracking-wider uppercase mb-2">
                1. Target Academic Semester *
              </label>
              <select
                value={semesterId}
                onChange={(e) => setSemesterId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm font-medium text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500/50 font-mono"
              >
                {semesters.map((sem) => (
                  <option key={sem.semester_id} value={sem.semester_id}>
                    {sem.academic_year} — {sem.term} {sem.is_active ? "(ACTIVE SEMESTER)" : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Grid 2 Column: Step 2 Courses & Step 3 Students */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Step 2: Courses Selection */}
              <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl flex flex-col h-[340px]">
                <div className="flex items-center justify-between mb-3 shrink-0">
                  <span className="text-xs font-semibold text-teal-400 tracking-wider uppercase flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4" /> 2. Select Courses ({selectedCourseCodes.length})
                  </span>
                  <button
                    type="button"
                    onClick={toggleSelectAllCourses}
                    className="text-xs text-teal-400 hover:text-teal-300 font-medium flex items-center gap-1"
                  >
                    Select All
                  </button>
                </div>

                {/* Filter */}
                <div className="mb-3 shrink-0">
                  <select
                    value={courseDeptFilter}
                    onChange={(e) => setCourseDeptFilter(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-300 focus:outline-none"
                  >
                    <option value="ALL">All Departments</option>
                    {departments.map((d) => (
                      <option key={d.dept_code} value={d.dept_code}>
                        {d.dept_code} — {d.dept_name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Course List */}
                <div className="overflow-y-auto space-y-1.5 pr-1 flex-1">
                  {filteredCourses.length === 0 ? (
                    <p className="text-xs text-slate-500 py-8 text-center">No courses found</p>
                  ) : (
                    filteredCourses.map((c) => {
                      const isSelected = selectedCourseCodes.includes(c.course_code);
                      return (
                        <div
                          key={c.course_code}
                          onClick={() => toggleCourse(c.course_code)}
                          className={`flex items-center justify-between p-2.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                            isSelected
                              ? "bg-teal-950/40 border-teal-700/70 text-teal-200"
                              : "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800/80"
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate pr-2">
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-teal-400 shrink-0" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-600 shrink-0" />
                            )}
                            <span className="font-mono font-bold text-slate-200">{c.course_code}</span>
                            <span className="truncate text-slate-400">{c.course_name}</span>
                          </div>
                          <span className="text-[10px] font-semibold bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700 shrink-0">
                            {c.dept_code}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Step 3: Students Selection */}
              <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl flex flex-col h-[340px]">
                <div className="flex items-center justify-between mb-3 shrink-0">
                  <span className="text-xs font-semibold text-teal-400 tracking-wider uppercase flex items-center gap-1.5">
                    <Users className="w-4 h-4" /> 3. Select Students ({selectedStudentIds.length})
                  </span>
                  <button
                    type="button"
                    onClick={toggleSelectAllStudents}
                    className="text-xs text-teal-400 hover:text-teal-300 font-medium flex items-center gap-1"
                  >
                    Select All
                  </button>
                </div>

                {/* Filters */}
                <div className="grid grid-cols-2 gap-2 mb-3 shrink-0">
                  <select
                    value={studentMajorFilter}
                    onChange={(e) => setStudentMajorFilter(e.target.value)}
                    className="w-full px-2 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-300 focus:outline-none"
                  >
                    <option value="ALL">All Majors</option>
                    <option value="CST">CST</option>
                    <option value="CS">CS</option>
                    <option value="CT">CT</option>
                  </select>
                  <select
                    value={studentYearFilter}
                    onChange={(e) =>
                      setStudentYearFilter(
                        e.target.value === "ALL" ? "ALL" : parseInt(e.target.value)
                      )
                    }
                    className="w-full px-2 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-300 focus:outline-none"
                  >
                    <option value="ALL">All Years</option>
                    {[1, 2, 3, 4, 5].map((y) => (
                      <option key={y} value={y}>
                        Year {y}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Student List */}
                <div className="overflow-y-auto space-y-1.5 pr-1 flex-1">
                  {filteredStudents.length === 0 ? (
                    <p className="text-xs text-slate-500 py-8 text-center">No students found</p>
                  ) : (
                    filteredStudents.map((s) => {
                      const isSelected = selectedStudentIds.includes(s.student_id);
                      return (
                        <div
                          key={s.student_id}
                          onClick={() => toggleStudent(s.student_id)}
                          className={`flex items-center justify-between p-2.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                            isSelected
                              ? "bg-teal-950/40 border-teal-700/70 text-teal-200"
                              : "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800/80"
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate pr-2">
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-teal-400 shrink-0" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-600 shrink-0" />
                            )}
                            <span className="font-medium text-slate-200">{s.full_name}</span>
                            <span className="font-mono text-[11px] text-slate-400">({s.roll_number})</span>
                          </div>
                          <span className="text-[10px] font-semibold bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700 shrink-0">
                            Yr {s.academic_year}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Step 4: Auto-Promote & Major Update Banner */}
            <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-300">
                  <input
                    type="checkbox"
                    checked={autoPromote}
                    onChange={(e) => setAutoPromote(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-teal-500 focus:ring-teal-500/50"
                  />
                  Promote Selected Students' Academic Year upon enrollment
                </label>
                {autoPromote && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-400">Promote to:</span>
                    <select
                      value={promoteYear}
                      onChange={(e) => setPromoteYear(parseInt(e.target.value))}
                      className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs text-teal-300 font-bold focus:outline-none"
                    >
                      {[1, 2, 3, 4, 5].map((y) => (
                        <option key={y} value={y}>
                          Year {y}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {isSemester3 && (
                <div className="flex items-center justify-between border-t border-slate-800/80 pt-2.5 text-xs animate-in fade-in duration-150">
                  <span className="font-semibold text-slate-300">Update Student Major (အတန်းပြောင်းချိန် Major သိမ်းရန်):</span>
                  <select
                    value={updateMajor}
                    onChange={(e) => setUpdateMajor(e.target.value)}
                    className="px-2.5 py-1 bg-slate-800 border border-slate-700 rounded text-xs text-amber-300 font-bold focus:outline-none"
                  >
                    <option value="NO_CHANGE">Keep Current Major</option>
                    <option value="CS">CS (Computer Science)</option>
                    <option value="CT">CT (Computer Technology)</option>
                  </select>
                </div>
              )}
            </div>

            {/* Calculation & Summary Footer */}
            <div className="p-4 bg-teal-950/40 border border-teal-800/60 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-teal-200">
                <Sparkles className="w-4 h-4 text-teal-400 shrink-0" />
                <span>
                  Ready to enroll <strong>{selectedStudentIds.length} Students</strong> into{" "}
                  <strong>{selectedCourseCodes.length} Courses</strong> (Total{" "}
                  <strong className="text-teal-300 text-sm font-mono">{totalCalculated} Records</strong>)
                </span>
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-400 bg-red-900/20 border border-red-800/50 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
            {resultMsg && (
              <p className="text-sm text-emerald-400 bg-emerald-900/20 border border-emerald-800/50 rounded-lg px-3 py-2 font-medium">
                {resultMsg}
              </p>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-sm hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || selectedCourseCodes.length === 0 || selectedStudentIds.length === 0}
                className="flex-1 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-sm font-medium transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2 shadow-lg shadow-teal-950"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                Batch Enroll ({totalCalculated})
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
