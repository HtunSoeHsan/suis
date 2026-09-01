"use client";

import { useState, useEffect, useCallback } from "react";
import { enrollmentsApi, studentsApi, coursesApi, semestersApi } from "@/lib/api";
import type { Enrollment, Student, Course, Semester } from "@/types";
import { EnrollmentFormDialog } from "@/components/enrollments/EnrollmentFormDialog";
import { BatchEnrollmentDialog } from "@/components/enrollments/BatchEnrollmentDialog";
import { Plus, Search, X, Loader2, UserCheck, Trash2, Layers, ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { useAuth } from "@/context/AuthContext";

export default function EnrollmentsPage() {
  const { user } = useAuth();
  const isTeacher = user?.role === "TEACHER";
  const [data, setData] = useState<{ total: number; items: Enrollment[] } | null>(null);
  const [studentsMap, setStudentsMap] = useState<Record<string, Student>>({});
  const [coursesMap, setCoursesMap] = useState<Record<string, Course>>({});
  const [semestersMap, setSemestersMap] = useState<Record<number, Semester>>({});

  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [filterSemester, setFilterSemester] = useState<number | "">("");
  const [filterCourse, setFilterCourse] = useState("");
  const [page, setPage] = useState(0);

  const [showCreate, setShowCreate] = useState(false);
  const [showBatch, setShowBatch] = useState(false);

  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title?: string;
    message: string;
    onConfirm?: () => void;
    isAlert?: boolean;
    variant?: "danger" | "warning" | "info";
    isLoading?: boolean;
  }>({ isOpen: false, message: "" });

  const limit = 10;

  const showAlert = (message: string, title = "Notification") => {
    setModalConfig({ isOpen: true, title, message, isAlert: true, variant: "warning" });
  };

  useEffect(() => {
    Promise.all([
      semestersApi.list({ limit: 100 }),
      coursesApi.list({ limit: 100 }),
    ]).then(([semRes, crsRes]) => {
      setSemesters(semRes.items);
      setCourses(crsRes.items);
    }).catch(() => { });
  }, []);

  const fetchEnrollments = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params: Record<string, string | number> = {
        skip: page * limit,
        limit,
      };
      if (search) params.search = search;
      if (filterSemester !== "") params.semester_id = filterSemester;
      if (filterCourse) params.course_code = filterCourse;

      const [enrRes, stRes, crsRes, semRes] = await Promise.all([
        enrollmentsApi.list(params),
        studentsApi.list({ limit: 2000 }),
        coursesApi.list({ limit: 1000 }),
        semestersApi.list({ limit: 500 }),
      ]);

      setData(enrRes);

      const sMap: Record<string, Student> = {};
      stRes.items.forEach((s) => { sMap[s.student_id] = s; });
      setStudentsMap(sMap);

      const cMap: Record<string, Course> = {};
      crsRes.items.forEach((c) => { cMap[c.course_code] = c; });
      setCoursesMap(cMap);

      const semMap: Record<number, Semester> = {};
      semRes.items.forEach((sem) => { semMap[sem.semester_id] = sem; });
      setSemestersMap(semMap);
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [search, filterSemester, filterCourse, page]);

  useEffect(() => {
    fetchEnrollments();
  }, [fetchEnrollments]);

  const handleDelete = (e: Enrollment) => {
    setModalConfig({
      isOpen: true,
      title: "Remove Enrollment",
      message: `Are you sure you want to unenroll student "${e.student_id}" from course "${e.course_code}"?`,
      variant: "danger",
      onConfirm: async () => {
        setModalConfig((prev) => ({ ...prev, isLoading: true }));
        try {
          await enrollmentsApi.delete(e.enrollment_id);
          fetchEnrollments();
        } catch (err: unknown) {
          showAlert((err as Error).message, "Remove Failed");
        } finally {
          setModalConfig({ isOpen: false, message: "" });
        }
      },
    });
  };

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString([], { dateStyle: "medium" });
  };

  const totalPages = Math.ceil((data?.total ?? 0) / limit);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <UserCheck className="w-6 h-6 text-teal-400" /> Course Enrollments
            </h2>
            {isTeacher && (
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 text-xs font-semibold">
                View Only Mode
              </span>
            )}
          </div>
          <p className="text-sm text-slate-400 mt-0.5">{data?.total ?? 0} total active student enrollments</p>
        </div>
        {!isTeacher && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowBatch(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-950/80 hover:bg-teal-900 border border-teal-700/60 text-teal-200 text-sm font-medium transition-colors shadow-lg"
            >
              <Layers className="w-4 h-4 text-teal-400" /> Batch Enroll (အစုလိုက်)
            </button>
          </div>
        )}
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search by Student ID */}
        <div className="relative flex-1 min-w-48 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            placeholder="Search Student Name, ID, Roll No, or Course…"
            className="w-full pl-9 pr-9 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-600/50"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Semester Filter Dropdown */}
        <div className="relative min-w-44">
          <select
            value={filterSemester}
            onChange={(e) => { setFilterSemester(e.target.value ? parseInt(e.target.value) : ""); setPage(0); }}
            className="w-full pl-3 pr-8 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs font-semibold text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-600/50 appearance-none"
          >
            <option value="">All Semesters</option>
            {semesters.map((s) => (
              <option key={s.semester_id} value={s.semester_id}>
                {s.academic_year} — {s.term} {s.is_active ? "(ACTIVE)" : ""}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
        </div>

        {/* Course Filter Dropdown */}
        <div className="relative min-w-44">
          <select
            value={filterCourse}
            onChange={(e) => { setFilterCourse(e.target.value); setPage(0); }}
            className="w-full pl-3 pr-8 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs font-semibold text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-600/50 appearance-none"
          >
            <option value="">All Courses</option>
            {courses
              .filter((c) => filterSemester === "" || !c.semester_id || c.semester_id === filterSemester)
              .map((c) => (
                <option key={c.course_code} value={c.course_code}>
                  {c.course_code} — {c.course_name}
                </option>
              ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-teal-400" />
          </div>
        ) : error ? (
          <div className="text-center py-16 text-red-400 text-sm">{error}</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-slate-800 bg-slate-950/50">
              <tr className="text-left text-slate-500 text-xs uppercase tracking-wider">
                {(isTeacher
                  ? ["Student Profile", "Enrolled Course", "Academic Term", "Enrolled Date"]
                  : ["Student Profile", "Enrolled Course", "Academic Term", "Enrolled Date", "Actions"]
                ).map((h) => (
                  <th key={h} className="px-4 py-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {data?.items.length === 0 ? (
                <tr>
                  <td colSpan={isTeacher ? 4 : 5} className="text-center py-12 text-slate-500">
                    No course enrollments found.{" "}
                    {!isTeacher && <button onClick={() => setShowBatch(true)} className="text-teal-400 hover:underline">Batch Enroll Students?</button>}
                  </td>
                </tr>
              ) : data?.items.map((e) => {
                const student = studentsMap[e.student_id];
                const course = coursesMap[e.course_code];
                const semester = semestersMap[e.semester_id];
                return (
                  <tr key={e.enrollment_id} className="hover:bg-slate-800/30 transition-colors group">
                    <td className="px-4 py-3">
                      {student ? (
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-violet-900/50 border border-violet-700/60 flex items-center justify-center text-violet-300 font-bold text-xs">
                            {student.full_name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-200 text-xs">{student.full_name}</p>
                            <p className="text-[11px] text-slate-400"><span className="font-mono text-violet-400">{student.student_id}</span> · Roll: {student.roll_number}</p>
                          </div>
                        </div>
                      ) : (
                        <span className="font-mono text-violet-400 text-xs">{e.student_id}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {course ? (
                        <div>
                          <p className="font-semibold text-slate-200 text-xs">{course.course_name}</p>
                          <p className="text-[11px] font-mono text-amber-400">{course.course_code} · {course.dept_code} ({course.credit_hours} cr)</p>
                        </div>
                      ) : (
                        <span className="font-mono text-amber-400 text-xs">{e.course_code}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {semester ? (
                        <div>
                          <p className="font-semibold text-slate-300 text-xs">{semester.academic_year} ({semester.term})</p>
                          {semester.is_active && <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">ACTIVE TERM</span>}
                        </div>
                      ) : (
                        <span className="font-mono text-slate-400 text-xs">Term #{e.semester_id}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-300 text-xs">{formatDate(e.enrolled_at)}</td>
                    {!isTeacher && (
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleDelete(e)}
                          className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-red-400 transition-colors"
                          title="Unenroll / Drop Course"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-slate-400">
          <span>Page {page + 1} of {totalPages}</span>
          <div className="flex gap-2">
            <button
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
              className="p-2 rounded-lg bg-slate-800 border border-slate-700 disabled:opacity-40 hover:bg-slate-700 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              disabled={page + 1 >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="p-2 rounded-lg bg-slate-800 border border-slate-700 disabled:opacity-40 hover:bg-slate-700 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {showCreate && (
        <EnrollmentFormDialog
          onClose={() => {
            setShowCreate(false);
            fetchEnrollments();
          }}
        />
      )}

      {showBatch && (
        <BatchEnrollmentDialog
          onClose={() => setShowBatch(false)}
          onSuccess={fetchEnrollments}
        />
      )}

      <ConfirmModal
        isOpen={modalConfig.isOpen}
        title={modalConfig.title}
        message={modalConfig.message}
        isAlert={modalConfig.isAlert}
        variant={modalConfig.variant}
        isLoading={modalConfig.isLoading}
        onConfirm={modalConfig.onConfirm}
        onCancel={() => setModalConfig({ isOpen: false, message: "" })}
      />
    </div>
  );
}
