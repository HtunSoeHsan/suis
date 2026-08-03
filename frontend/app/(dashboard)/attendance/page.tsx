"use client";

import { useState, useEffect, useCallback } from "react";
import { attendanceApi, studentsApi, coursesApi } from "@/lib/api";
import type { AttendanceLog, Student, Course } from "@/types";
import { SingleAttendanceDialog } from "@/components/attendance/SingleAttendanceDialog";
import { BatchAttendanceDialog } from "@/components/attendance/BatchAttendanceDialog";
import { CalendarCheck, Loader2, Search, X, ChevronLeft, ChevronRight, ChevronDown, Plus, CheckSquare, Trash2 } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  PRESENT: "bg-emerald-900/30 text-emerald-400 border-emerald-800/50",
  LATE: "bg-amber-900/30 text-amber-400 border-amber-800/50",
  ABSENT: "bg-red-900/30 text-red-400 border-red-800/50",
};

export default function AttendancePage() {
  const [data, setData] = useState<{ total: number; items: AttendanceLog[] } | null>(null);
  const [studentsMap, setStudentsMap] = useState<Record<string, Student>>({});
  const [coursesMap, setCoursesMap] = useState<Record<string, Course>>({});
  const [courses, setCourses] = useState<Course[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"" | "PRESENT" | "LATE" | "ABSENT">("");
  const [filterCourse, setFilterCourse] = useState("");
  const [page, setPage] = useState(0);

  const [showSingleModal, setShowSingleModal] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);

  const limit = 10;

  useEffect(() => {
    coursesApi.list({ limit: 100 }).then((res) => setCourses(res.items)).catch(() => {});
  }, []);

  const fetchAttendance = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params: Record<string, string | number> = {
        skip: page * limit,
        limit,
      };
      if (search) params.search = search;
      if (filterStatus) params.status = filterStatus;
      if (filterCourse) params.course_code = filterCourse;

      const [attRes, stRes, crsRes] = await Promise.all([
        attendanceApi.list(params),
        studentsApi.list({ limit: 200 }),
        coursesApi.list({ limit: 100 }),
      ]);

      setData(attRes);
      const sMap: Record<string, Student> = {};
      stRes.items.forEach((s) => { sMap[s.student_id] = s; });
      setStudentsMap(sMap);

      const cMap: Record<string, Course> = {};
      crsRes.items.forEach((c) => { cMap[c.course_code] = c; });
      setCoursesMap(cMap);
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [search, filterStatus, filterCourse, page]);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  const handleDelete = async (log: AttendanceLog) => {
    if (!confirm(`Delete attendance log #${log.log_id} for student "${log.student_id}"?`)) return;
    try {
      await attendanceApi.delete(log.log_id);
      fetchAttendance();
    } catch (err: unknown) {
      alert((err as Error).message);
    }
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
  };

  const totalPages = Math.ceil((data?.total ?? 0) / limit);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <CalendarCheck className="w-6 h-6 text-emerald-400" /> Attendance Logs & Management
          </h2>
          <p className="text-sm text-slate-400 mt-0.5">{data?.total ?? 0} total attendance verification logs</p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowBatchModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700/60 text-emerald-200 text-sm font-medium transition-colors shadow-lg"
          >
            <CheckSquare className="w-4 h-4 text-emerald-400" /> Class Attendance Sheet (အစုလိုက်)
          </button>

          <button
            onClick={() => setShowSingleModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors shadow-lg shadow-emerald-900/30"
          >
            <Plus className="w-4 h-4" /> Single Entry
          </button>
        </div>
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search by Student ID */}
        <div className="relative flex-1 min-w-48 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            placeholder="Search by Name, Student ID, or Roll No…"
            className="w-full pl-9 pr-9 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-600/50"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Status Filter Buttons */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-500 font-medium">Status:</span>
          {(["", "PRESENT", "LATE", "ABSENT"] as const).map((st) => (
            <button
              key={st}
              onClick={() => { setFilterStatus(st); setPage(0); }}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                filterStatus === st
                  ? st === "" ? "bg-slate-700 border-slate-500 text-white" : `${STATUS_COLORS[st]} border-current`
                  : "border-slate-700 text-slate-400 hover:border-slate-500"
              }`}
            >
              {st === "" ? "All" : st}
            </button>
          ))}
        </div>

        {/* Course Filter Dropdown */}
        <div className="relative min-w-44">
          <select
            value={filterCourse}
            onChange={(e) => { setFilterCourse(e.target.value); setPage(0); }}
            className="w-full pl-3 pr-8 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs font-semibold text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-600/50 appearance-none"
          >
            <option value="">All Courses</option>
            {courses.map((c) => (
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
            <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
          </div>
        ) : error ? (
          <div className="text-center py-16 text-red-400 text-sm">{error}</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-slate-800 bg-slate-950/50">
              <tr className="text-left text-slate-500 text-xs uppercase tracking-wider">
                {["Log ID", "Student Profile", "Course Subject", "Verified At", "Status", "Mode / Confidence", "Actions"].map((h) => (
                  <th key={h} className="px-4 py-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {data?.items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-500">
                    No attendance records found matching filters.{" "}
                    <button onClick={() => setShowBatchModal(true)} className="text-emerald-400 hover:underline">Mark Class Attendance?</button>
                  </td>
                </tr>
              ) : data?.items.map((a) => {
                const student = studentsMap[a.student_id];
                const course = coursesMap[a.course_code];
                const isManual = a.confidence_score === 1.0 || a.confidence_score === null;

                return (
                  <tr key={a.log_id} className="hover:bg-slate-800/30 transition-colors group">
                    <td className="px-4 py-3 font-mono text-slate-500 text-xs">#{a.log_id}</td>
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
                        <span className="font-mono text-violet-400 text-xs">{a.student_id}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {course ? (
                        <div>
                          <p className="font-semibold text-slate-200 text-xs">{course.course_name}</p>
                          <p className="text-[11px] font-mono text-amber-400">{course.course_code}</p>
                        </div>
                      ) : (
                        <span className="font-mono text-amber-400 text-xs">{a.course_code}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs">{formatTime(a.verified_at)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border uppercase tracking-wider font-semibold ${STATUS_COLORS[a.status] ?? "bg-slate-800 text-slate-400"}`}>
                        {a.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {isManual ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700 text-[11px]">
                          Manual Entry
                        </span>
                      ) : (
                        <span className="font-mono text-emerald-400 font-medium">
                          Face AI ({((a.confidence_score ?? 0) * 100).toFixed(1)}%)
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleDelete(a)}
                        className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-red-400 transition-colors"
                        title="Delete Attendance Log"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
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

      {showSingleModal && (
        <SingleAttendanceDialog
          onClose={() => setShowSingleModal(false)}
          onSuccess={fetchAttendance}
        />
      )}

      {showBatchModal && (
        <BatchAttendanceDialog
          onClose={() => setShowBatchModal(false)}
          onSuccess={fetchAttendance}
        />
      )}
    </div>
  );
}
