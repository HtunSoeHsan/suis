"use client";

import { useState, useEffect, useCallback } from "react";
import { timetablesApi, coursesApi, teachersApi, classroomsApi, timeSlotsApi, semestersApi } from "@/lib/api";
import type { AcademicTimetable, ExamTimetable, Course, Teacher, Classroom, TimeSlot, Semester } from "@/types";
import { TimetableFormDialog } from "@/components/timetables/TimetableFormDialog";
import { PeriodSetupDialog } from "@/components/timetables/PeriodSetupDialog";
import { Plus, Search, X, Loader2, CalendarRange, Trash2, ChevronLeft, ChevronRight, ChevronDown, Clock } from "lucide-react";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

export default function TimetablesPage() {
  const [academicData, setAcademicData] = useState<{ total: number; items: AcademicTimetable[] } | null>(null);
  const [examData, setExamData] = useState<{ total: number; items: ExamTimetable[] } | null>(null);
  const [activeTab, setActiveTab] = useState<"academic" | "exam">("academic");

  const [coursesMap, setCoursesMap] = useState<Record<string, Course>>({});
  const [teachersMap, setTeachersMap] = useState<Record<string, Teacher>>({});
  const [classroomsMap, setClassroomsMap] = useState<Record<string, Classroom>>({});
  const [timeSlotsMap, setTimeSlotsMap] = useState<Record<number, TimeSlot>>({});

  const [courses, setCourses] = useState<Course[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);

  const [filterDay, setFilterDay] = useState("");
  const [filterCourse, setFilterCourse] = useState("");
  const [filterSemester, setFilterSemester] = useState<number | "">("");
  const [page, setPage] = useState(0);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showPeriodSetup, setShowPeriodSetup] = useState(false);

  const limit = 10;

  useEffect(() => {
    Promise.all([
      coursesApi.list({ limit: 100 }),
      semestersApi.list({ limit: 100 }),
    ]).then(([crsRes, semRes]) => {
      setCourses(crsRes.items);
      setSemesters(semRes.items);
    }).catch(() => {});
  }, []);

  const fetchTimetables = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [crsRes, teachRes, rmRes, tsRes] = await Promise.all([
        coursesApi.list({ limit: 100 }),
        teachersApi.list({ limit: 100 }),
        classroomsApi.list({ limit: 100 }),
        timeSlotsApi.list({ limit: 100 }),
      ]);

      const cMap: Record<string, Course> = {};
      crsRes.items.forEach((c) => { cMap[c.course_code] = c; });
      setCoursesMap(cMap);

      const tMap: Record<string, Teacher> = {};
      teachRes.items.forEach((t) => { tMap[t.teacher_id] = t; });
      setTeachersMap(tMap);

      const rMap: Record<string, Classroom> = {};
      rmRes.items.forEach((r) => { rMap[r.room_id] = r; });
      setClassroomsMap(rMap);

      const tsMap: Record<number, TimeSlot> = {};
      tsRes.items.forEach((ts) => { tsMap[ts.slot_id] = ts; });
      setTimeSlotsMap(tsMap);

      if (activeTab === "academic") {
        const params: Record<string, string | number> = {
          skip: page * limit,
          limit,
        };
        if (filterDay) params.day_of_week = filterDay;
        if (filterCourse) params.course_code = filterCourse;
        if (filterSemester !== "") params.semester_id = filterSemester;

        const res = await timetablesApi.listAcademic(params);
        setAcademicData(res);
      } else {
        const params: Record<string, string | number> = {
          skip: page * limit,
          limit,
        };
        if (filterCourse) params.course_code = filterCourse;
        if (filterSemester !== "") params.semester_id = filterSemester;

        const res = await timetablesApi.listExam(params);
        setExamData(res);
      }
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, filterDay, filterCourse, filterSemester, page]);

  useEffect(() => {
    fetchTimetables();
  }, [fetchTimetables]);

  const handleDeleteAcademic = async (tt: AcademicTimetable) => {
    if (!confirm(`Delete schedule slot for course "${tt.course_code}" on ${tt.day_of_week}?`)) return;
    try {
      await timetablesApi.deleteAcademic(tt.timetable_id);
      fetchTimetables();
    } catch (err: unknown) {
      alert((err as Error).message);
    }
  };

  const handleDeleteExam = async (e: ExamTimetable) => {
    if (!confirm(`Delete exam slot for course "${e.course_code}" on ${e.exam_date}?`)) return;
    try {
      await timetablesApi.deleteExam(e.exam_id);
      fetchTimetables();
    } catch (err: unknown) {
      alert((err as Error).message);
    }
  };

  const totalItems = activeTab === "academic" ? academicData?.total ?? 0 : examData?.total ?? 0;
  const totalPages = Math.ceil(totalItems / limit);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <CalendarRange className="w-6 h-6 text-cyan-400" /> Class & Exam Schedules
          </h2>
          <p className="text-sm text-slate-400 mt-0.5">{totalItems} scheduled timetable slots</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPeriodSetup(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-400 text-sm font-medium transition-colors"
          >
            <Clock className="w-4 h-4 text-amber-400" /> Period Setup
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium transition-colors shadow-lg shadow-cyan-900/30"
          >
            <Plus className="w-4 h-4" /> Add Schedule Slot
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 gap-4">
        <button
          onClick={() => { setActiveTab("academic"); setPage(0); }}
          className={`pb-3 text-sm font-semibold transition-colors border-b-2 ${
            activeTab === "academic"
              ? "border-cyan-500 text-cyan-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          Academic Class Timetable
        </button>
        <button
          onClick={() => { setActiveTab("exam"); setPage(0); }}
          className={`pb-3 text-sm font-semibold transition-colors border-b-2 ${
            activeTab === "exam"
              ? "border-cyan-500 text-cyan-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          Exam Timetable
        </button>
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Day Filter (For Academic Tab) */}
        {activeTab === "academic" && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-500 font-medium">Day:</span>
            {(["", ...DAYS] as const).map((d) => (
              <button
                key={d}
                onClick={() => { setFilterDay(d); setPage(0); }}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                  filterDay === d
                    ? "bg-cyan-600 border-cyan-500 text-white"
                    : "border-slate-700 text-slate-400 hover:border-slate-500"
                }`}
              >
                {d === "" ? "All Days" : d}
              </button>
            ))}
          </div>
        )}

        {/* Course Filter Dropdown */}
        <div className="relative min-w-44">
          <select
            value={filterCourse}
            onChange={(e) => { setFilterCourse(e.target.value); setPage(0); }}
            className="w-full pl-3 pr-8 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs font-semibold text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-600/50 appearance-none"
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

        {/* Semester Filter Dropdown */}
        <div className="relative min-w-44">
          <select
            value={filterSemester}
            onChange={(e) => { setFilterSemester(e.target.value ? parseInt(e.target.value) : ""); setPage(0); }}
            className="w-full pl-3 pr-8 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs font-semibold text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-600/50 appearance-none"
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
      </div>

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
          </div>
        ) : error ? (
          <div className="text-center py-16 text-red-400 text-sm">{error}</div>
        ) : activeTab === "academic" ? (
          <table className="w-full text-sm">
            <thead className="border-b border-slate-800 bg-slate-950/50">
              <tr className="text-left text-slate-500 text-xs uppercase tracking-wider">
                {["Day", "Time Slot", "Course Subject", "Assigned Teacher", "Classroom Location", "Actions"].map((h) => (
                  <th key={h} className="px-4 py-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {academicData?.items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-500">
                    No academic schedule slots found matching filters.{" "}
                    <button onClick={() => setShowCreate(true)} className="text-cyan-400 hover:underline">Add one?</button>
                  </td>
                </tr>
              ) : academicData?.items.map((tt) => {
                const course = coursesMap[tt.course_code];
                const teacher = teachersMap[tt.teacher_id];
                const room = classroomsMap[tt.room_id];
                const timeSlot = timeSlotsMap[tt.slot_id];

                return (
                  <tr key={tt.timetable_id} className="hover:bg-slate-800/30 transition-colors group">
                    <td className="px-4 py-3 font-semibold text-cyan-400">{tt.day_of_week}</td>
                    <td className="px-4 py-3">
                      {timeSlot ? (
                        <div>
                          <p className="font-semibold text-slate-200 text-xs">Period #{timeSlot.period_number}</p>
                          <p className="text-[11px] font-mono text-slate-400">{timeSlot.start_time} - {timeSlot.end_time}</p>
                        </div>
                      ) : (
                        <span className="font-mono text-slate-300 text-xs">Slot #{tt.slot_id}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {course ? (
                        <div>
                          <p className="font-semibold text-slate-200 text-xs">{course.course_name}</p>
                          <p className="text-[11px] font-mono text-amber-400">{course.course_code}</p>
                        </div>
                      ) : (
                        <span className="font-mono text-amber-400 text-xs">{tt.course_code}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {teacher ? (
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-cyan-900/50 border border-cyan-700/60 flex items-center justify-center text-cyan-300 font-bold text-xs">
                            {teacher.full_name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-200 text-xs">{teacher.full_name}</p>
                            <p className="text-[11px] text-slate-400">{teacher.designation} · <span className="font-mono text-cyan-400">{teacher.teacher_id}</span></p>
                          </div>
                        </div>
                      ) : (
                        <span className="font-mono text-slate-400 text-xs">{tt.teacher_id}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {room ? (
                        <div>
                          <p className="font-semibold text-slate-200 text-xs">{room.room_name}</p>
                          <p className="text-[11px] text-slate-400"><span className="font-mono text-rose-400">{room.room_id}</span> · {room.building}</p>
                        </div>
                      ) : (
                        <span className="font-mono text-rose-400 text-xs">{tt.room_id}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleDeleteAcademic(tt)}
                        className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-red-400 transition-colors"
                        title="Delete Schedule Slot"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-slate-800 bg-slate-950/50">
              <tr className="text-left text-slate-500 text-xs uppercase tracking-wider">
                {["Exam Date", "Exam Time", "Course Subject", "Exam Hall Location", "Supervisor Teacher", "Actions"].map((h) => (
                  <th key={h} className="px-4 py-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {examData?.items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-500">
                    No exam schedule slots found matching filters.
                  </td>
                </tr>
              ) : examData?.items.map((e) => {
                const course = coursesMap[e.course_code];
                const room = classroomsMap[e.room_id];
                const supervisor = e.supervisor_teacher_id ? teachersMap[e.supervisor_teacher_id] : null;

                return (
                  <tr key={e.exam_id} className="hover:bg-slate-800/30 transition-colors group">
                    <td className="px-4 py-3 font-semibold text-cyan-400">{e.exam_date}</td>
                    <td className="px-4 py-3 font-mono text-slate-300">{e.start_time} - {e.end_time}</td>
                    <td className="px-4 py-3">
                      {course ? (
                        <div>
                          <p className="font-semibold text-slate-200 text-xs">{course.course_name}</p>
                          <p className="text-[11px] font-mono text-amber-400">{course.course_code}</p>
                        </div>
                      ) : (
                        <span className="font-mono text-amber-400 text-xs">{e.course_code}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {room ? (
                        <div>
                          <p className="font-semibold text-slate-200 text-xs">{room.room_name}</p>
                          <p className="text-[11px] text-slate-400"><span className="font-mono text-rose-400">{room.room_id}</span> · {room.building}</p>
                        </div>
                      ) : (
                        <span className="font-mono text-rose-400 text-xs">{e.room_id}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {supervisor ? (
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-cyan-900/50 border border-cyan-700/60 flex items-center justify-center text-cyan-300 font-bold text-xs">
                            {supervisor.full_name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-200 text-xs">{supervisor.full_name}</p>
                            <p className="text-[11px] text-slate-400">{supervisor.designation} · <span className="font-mono text-cyan-400">{supervisor.teacher_id}</span></p>
                          </div>
                        </div>
                      ) : e.supervisor_teacher_id ? (
                        <span className="font-mono text-slate-400 text-xs">{e.supervisor_teacher_id}</span>
                      ) : (
                        <span className="text-slate-500 text-xs italic">Unassigned</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleDeleteExam(e)}
                        className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-red-400 transition-colors"
                        title="Delete Exam Slot"
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

      {showCreate && (
        <TimetableFormDialog
          defaultType={activeTab}
          onClose={() => {
            setShowCreate(false);
            fetchTimetables();
          }}
        />
      )}

      {showPeriodSetup && (
        <PeriodSetupDialog
          onClose={() => setShowPeriodSetup(false)}
          onUpdated={fetchTimetables}
        />
      )}
    </div>
  );
}
