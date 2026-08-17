"use client";

import { useState, useEffect, useCallback } from "react";
import { coursesApi, teachersApi, departmentsApi, semestersApi } from "@/lib/api";
import type { Course, Teacher, Department, Semester } from "@/types";
import { CourseFormDialog } from "@/components/courses/CourseFormDialog";
import { Plus, Search, X, Loader2, BookOpen, Pencil, Trash2, ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";

export default function CoursesPage() {
  const [data, setData] = useState<{ total: number; items: Course[] } | null>(null);
  const [teachersMap, setTeachersMap] = useState<Record<string, Teacher>>({});
  const [departments, setDepartments] = useState<Department[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [semestersMap, setSemestersMap] = useState<Record<number, Semester>>({});

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [filterDept, setFilterDept] = useState("");
  const [filterSemester, setFilterSemester] = useState("");
  const [page, setPage] = useState(0);

  const [showCreate, setShowCreate] = useState(false);
  const [editCourse, setEditCourse] = useState<Course | null>(null);

  const limit = 10;

  useEffect(() => {
    departmentsApi.list({ limit: 100 }).then((res) => setDepartments(res.items)).catch(() => {});
    semestersApi.list({ limit: 100 }).then((res) => {
      setSemesters(res.items);
      const sMap: Record<number, Semester> = {};
      res.items.forEach((s) => { sMap[s.semester_id] = s; });
      setSemestersMap(sMap);
    }).catch(() => {});
  }, []);

  const fetchCourses = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [crsRes, teachRes] = await Promise.all([
        coursesApi.list({
          search,
          skip: page * limit,
          limit,
          ...(filterDept ? { dept_code: filterDept } : {}),
          ...(filterSemester ? { semester_id: Number(filterSemester) } : {}),
        }),
        teachersApi.list({ limit: 100 }),
      ]);
      setData(crsRes);
      const map: Record<string, Teacher> = {};
      teachRes.items.forEach((t) => { map[t.teacher_id] = t; });
      setTeachersMap(map);
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [search, filterDept, filterSemester, page]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const handleDelete = async (c: Course) => {
    if (!confirm(`Delete course "${c.course_name}" (${c.course_code})?`)) return;
    try {
      await coursesApi.delete(c.course_code);
      fetchCourses();
    } catch (e: unknown) {
      alert((e as Error).message);
    }
  };

  const totalPages = Math.ceil((data?.total ?? 0) / limit);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-amber-400" /> Courses & Curriculum
          </h2>
          <p className="text-sm text-slate-400 mt-0.5">{data?.total ?? 0} total curriculum courses</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium transition-colors shadow-lg shadow-amber-900/30"
        >
          <Plus className="w-4 h-4" /> Add Course
        </button>
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-48 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            placeholder="Search course code or name…"
            className="w-full pl-9 pr-9 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-600/50"
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
            onChange={(e) => { setFilterSemester(e.target.value); setPage(0); }}
            className="w-full pl-3 pr-8 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs font-semibold text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-600/50 appearance-none cursor-pointer"
          >
            <option value="">All Semesters</option>
            {semesters.map((s) => (
              <option key={s.semester_id} value={s.semester_id}>
                {s.academic_year} — {s.term} {s.is_active ? " ★ ACTIVE" : ""}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
        </div>

        {/* Department Filter Dropdown */}
        <div className="relative min-w-40">
          <select
            value={filterDept}
            onChange={(e) => { setFilterDept(e.target.value); setPage(0); }}
            className="w-full pl-3 pr-8 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs font-semibold text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-600/50 appearance-none cursor-pointer"
          >
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d.dept_code} value={d.dept_code}>
                {d.dept_code} — {d.dept_name}
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
            <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
          </div>
        ) : error ? (
          <div className="text-center py-16 text-red-400 text-sm">{error}</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-slate-800 bg-slate-950/50">
              <tr className="text-left text-slate-500 text-xs uppercase tracking-wider">
                {["Course Code", "Course Name", "Semester", "Department", "Credits", "Assigned Teacher", "Actions"].map((h) => (
                  <th key={h} className="px-4 py-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {data?.items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-500">
                    No courses found.{" "}
                    <button onClick={() => setShowCreate(true)} className="text-amber-400 hover:underline">Add one?</button>
                  </td>
                </tr>
              ) : data?.items.map((c) => {
                const teacher = c.teacher_id ? teachersMap[c.teacher_id] : null;
                const sem = c.semester_id ? semestersMap[c.semester_id] : null;

                return (
                  <tr key={c.course_code} className="hover:bg-slate-800/30 transition-colors group">
                    <td className="px-4 py-3 font-mono font-bold text-amber-400 text-xs">{c.course_code}</td>
                    <td className="px-4 py-3 font-semibold text-slate-200">{c.course_name}</td>
                    <td className="px-4 py-3 text-xs">
                      {sem ? (
                        <span className="px-2 py-0.5 rounded-full bg-amber-950/60 border border-amber-800/60 text-amber-300 text-[11px] font-medium inline-flex items-center gap-1">
                          {sem.academic_year} · {sem.term}
                        </span>
                      ) : (
                        <span className="text-slate-500 italic text-[11px]">Unassigned</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-sky-400">{c.dept_code}</td>
                    <td className="px-4 py-3 text-slate-300 font-medium">{c.credit_hours} hrs</td>
                    <td className="px-4 py-3">
                      {teacher ? (
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-amber-900/50 border border-amber-700/60 flex items-center justify-center text-amber-300 font-bold text-xs">
                            {teacher.full_name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-200 text-xs">{teacher.full_name}</p>
                            <p className="text-[11px] text-slate-400">{teacher.designation} · <span className="font-mono text-amber-400">{teacher.teacher_id}</span></p>
                          </div>
                        </div>
                      ) : c.teacher_id ? (
                        <span className="font-mono text-slate-400 text-xs">{c.teacher_id}</span>
                      ) : (
                        <span className="text-slate-500 text-xs italic">Unassigned</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setEditCourse(c)}
                          className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-amber-400 transition-colors"
                          title="Edit Course"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(c)}
                          className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-red-400 transition-colors"
                          title="Delete Course"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
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

      {(showCreate || editCourse) && (
        <CourseFormDialog
          course={editCourse ?? undefined}
          onClose={() => {
            setShowCreate(false);
            setEditCourse(null);
            fetchCourses();
          }}
        />
      )}
    </div>
  );
}
