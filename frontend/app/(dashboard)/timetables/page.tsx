"use client";

import { useState, useEffect, useCallback } from "react";
import { timetablesApi, coursesApi, teachersApi, classroomsApi, timeSlotsApi, semestersApi } from "@/lib/api";
import type { AcademicTimetable, ExamTimetable, Course, Teacher, Classroom, TimeSlot, Semester } from "@/types";
import { TimetableFormDialog } from "@/components/timetables/TimetableFormDialog";
import { PeriodSetupDialog } from "@/components/timetables/PeriodSetupDialog";
import { Plus, Search, X, Loader2, CalendarRange, Trash2, ChevronLeft, ChevronRight, ChevronDown, Clock } from "lucide-react";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

import { useAuth } from "@/context/AuthContext";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

export default function TimetablesPage() {
  const { user } = useAuth();
  const isTeacher = user?.role === "TEACHER";
  const teacherId = user?.teacher_id;

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

  const [semestersMap, setSemestersMap] = useState<Record<number, Semester>>({});

  useEffect(() => {
    Promise.all([
      coursesApi.list({ limit: 100 }),
      semestersApi.list({ limit: 100 }),
    ]).then(([crsRes, semRes]) => {
      setCourses(crsRes.items);
      setSemesters(semRes.items);
      const sMap: Record<number, Semester> = {};
      semRes.items.forEach((s) => { sMap[s.semester_id] = s; });
      setSemestersMap(sMap);
    }).catch(() => {});
  }, []);

  const getTargetClassDetails = (semester?: Semester, course?: Course, tt?: AcademicTimetable) => {
    let semNum: number | null = null;
    let termText = "";

    if (semester) {
      termText = semester.term;
      const match = semester.term.match(/\d+/);
      if (match) {
        semNum = parseInt(match[0]);
      } else if (semester.term.toLowerCase().includes("first") || semester.term.toLowerCase().includes("1st")) {
        semNum = 1;
      } else if (semester.term.toLowerCase().includes("second") || semester.term.toLowerCase().includes("2nd")) {
        semNum = 2;
      } else {
        semNum = semester.semester_id;
      }
    } else if (tt?.semester_id) {
      semNum = tt.semester_id;
    }

    let calculatedYear: number | null = null;
    if (semNum && semNum > 0) {
      calculatedYear = Math.ceil(semNum / 2);
    } else if (course?.academic_year) {
      calculatedYear = course.academic_year;
    } else if (tt?.academic_year) {
      calculatedYear = tt.academic_year;
    }

    const yearLabel = calculatedYear ? `Year ${calculatedYear}` : "All Years";
    const semLabel = semNum ? `Semester ${semNum}` : (termText || "Semester —");
    const majorLabel = course?.major || course?.dept_code || "CST";

    return { yearLabel, semLabel, majorLabel };
  };

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
        if (isTeacher && teacherId) params.teacher_id = teacherId;

        const res = await timetablesApi.listAcademic(params);
        setAcademicData(res);
      } else {
        const params: Record<string, string | number> = {
          skip: page * limit,
          limit,
        };
        if (filterCourse) params.course_code = filterCourse;
        if (filterSemester !== "") params.semester_id = filterSemester;
        if (isTeacher && teacherId) params.supervisor_teacher_id = teacherId;

        const res = await timetablesApi.listExam(params);
        setExamData(res);
      }
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, filterDay, filterCourse, filterSemester, page, isTeacher, teacherId]);

  useEffect(() => {
    fetchTimetables();
  }, [fetchTimetables]);

  const handleDeleteAcademic = (tt: AcademicTimetable) => {
    setModalConfig({
      isOpen: true,
      title: "Delete Academic Schedule",
      message: `Are you sure you want to delete schedule slot for course "${tt.course_code}" on ${tt.day_of_week}?`,
      variant: "danger",
      onConfirm: async () => {
        setModalConfig((prev) => ({ ...prev, isLoading: true }));
        try {
          await timetablesApi.deleteAcademic(tt.timetable_id);
          fetchTimetables();
        } catch (err: unknown) {
          showAlert((err as Error).message, "Delete Failed");
        } finally {
          setModalConfig({ isOpen: false, message: "" });
        }
      },
    });
  };

  const handleDeleteExam = (e: ExamTimetable) => {
    setModalConfig({
      isOpen: true,
      title: "Delete Exam Schedule",
      message: `Are you sure you want to delete exam slot for course "${e.course_code}" on ${e.exam_date}?`,
      variant: "danger",
      onConfirm: async () => {
        setModalConfig((prev) => ({ ...prev, isLoading: true }));
        try {
          await timetablesApi.deleteExam(e.exam_id);
          fetchTimetables();
        } catch (err: unknown) {
          showAlert((err as Error).message, "Delete Failed");
        } finally {
          setModalConfig({ isOpen: false, message: "" });
        }
      },
    });
  };

  const totalItems = activeTab === "academic" ? academicData?.total ?? 0 : examData?.total ?? 0;
  const totalPages = Math.ceil(totalItems / limit);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-theme-text flex items-center gap-2">
              <CalendarRange className="w-6 h-6 text-cyan-400" /> Class & Exam Schedules
            </h2>
            {isTeacher && (
              <span className="px-2.5 py-0.5 rounded-full badge-amber border text-xs font-semibold">
                My Schedule ({teacherId ?? "Teacher"}) · View Only
              </span>
            )}
          </div>
          <p className="text-sm text-theme-sub mt-0.5">{totalItems} scheduled timetable slots</p>
        </div>
        {!isTeacher && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPeriodSetup(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-theme-elevated hover:bg-theme-muted border border-theme-border-hover text-amber-400 text-sm font-medium transition-colors"
            >
              <Clock className="w-4 h-4 text-amber-400" /> Period Setup
            </button>
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-theme-text text-sm font-medium transition-colors shadow-lg shadow-cyan-900/30"
            >
              <Plus className="w-4 h-4" /> Add Schedule Slot
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-theme-border gap-4">
        <button
          onClick={() => { setActiveTab("academic"); setPage(0); }}
          className={`pb-3 text-sm font-semibold transition-colors border-b-2 ${
            activeTab === "academic"
              ? "border-cyan-500 text-cyan-400"
              : "border-transparent text-theme-sub hover:text-theme-text"
          }`}
        >
          Academic Class Timetable
        </button>
        <button
          onClick={() => { setActiveTab("exam"); setPage(0); }}
          className={`pb-3 text-sm font-semibold transition-colors border-b-2 ${
            activeTab === "exam"
              ? "border-cyan-500 text-cyan-400"
              : "border-transparent text-theme-sub hover:text-theme-text"
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
            <span className="text-xs text-theme-muted font-medium">Day:</span>
            {(["", ...DAYS] as const).map((d) => (
              <button
                key={d}
                onClick={() => { setFilterDay(d); setPage(0); }}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                  filterDay === d
                    ? "bg-cyan-600 border-cyan-500 text-theme-text"
                    : "border-theme-border-hover text-theme-sub hover:border-slate-500"
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
            className="w-full pl-3 pr-8 py-2 bg-theme-surface border border-theme-border-hover rounded-lg text-xs font-semibold text-theme-text focus:outline-none focus:ring-2 focus:ring-cyan-600/50 appearance-none"
          >
            <option value="">All Courses</option>
            {courses.map((c) => {
              const teacher = teachersMap[c.teacher_id || ""];
              const tName = teacher ? ` (${teacher.full_name})` : "";
              return (
                <option key={c.course_code} value={c.course_code}>
                  {c.course_code} — {c.course_name}{tName}
                </option>
              );
            })}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-theme-sub pointer-events-none" />
        </div>

        {/* Semester Filter Dropdown */}
        <div className="relative min-w-44">
          <select
            value={filterSemester}
            onChange={(e) => { setFilterSemester(e.target.value ? parseInt(e.target.value) : ""); setPage(0); }}
            className="w-full pl-3 pr-8 py-2 bg-theme-surface border border-theme-border-hover rounded-lg text-xs font-semibold text-theme-text focus:outline-none focus:ring-2 focus:ring-cyan-600/50 appearance-none"
          >
            <option value="">All Semesters</option>
            {semesters.map((s) => (
              <option key={s.semester_id} value={s.semester_id}>
                {s.academic_year} — {s.term} {s.is_active ? "(ACTIVE)" : ""}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-theme-sub pointer-events-none" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-theme-surface border border-theme-border rounded-xl overflow-hidden shadow-xl">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
          </div>
        ) : error ? (
          <div className="text-center py-16 text-red-400 text-sm">{error}</div>
        ) : activeTab === "academic" ? (
          <table className="w-full text-sm">
            <thead className="border-b border-theme-border bg-theme-base/50">
              <tr className="text-left text-theme-sub text-xs uppercase tracking-wider">
                {(isTeacher
                  ? ["Day", "Time Slot", "Course Subject", "Semester", "Target Class", "Assigned Teacher", "Classroom Location"]
                  : ["Day", "Time Slot", "Course Subject", "Semester", "Target Class", "Assigned Teacher", "Classroom Location", "Actions"]
                ).map((h) => (
                  <th key={h} className="px-4 py-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-theme-border">
              {academicData?.items.length === 0 ? (
                <tr>
                  <td colSpan={isTeacher ? 7 : 8} className="text-center py-12 text-theme-muted">
                    No academic schedule slots found matching filters.{" "}
                    {!isTeacher && <button onClick={() => setShowCreate(true)} className="text-cyan-400 hover:underline">Add one?</button>}
                  </td>
                </tr>
              ) : academicData?.items.map((tt) => {
                const course = coursesMap[tt.course_code];
                const teacher = teachersMap[tt.teacher_id];
                const room = classroomsMap[tt.room_id];
                const timeSlot = timeSlotsMap[tt.slot_id];
                const semester = semestersMap[tt.semester_id] || (course?.semester_id ? semestersMap[course.semester_id] : undefined);
                const target = getTargetClassDetails(semester, course, tt);

                return (
                  <tr key={tt.timetable_id} className="hover:bg-theme-elevated/30 transition-colors group">
                    <td className="px-4 py-3 font-semibold text-cyan-400">{tt.day_of_week}</td>
                    <td className="px-4 py-3">
                      {timeSlot ? (
                        <div>
                          <p className="font-semibold text-theme-text text-xs">Period #{timeSlot.period_number}</p>
                          <p className="text-[11px] font-mono text-theme-sub">{timeSlot.start_time} - {timeSlot.end_time}</p>
                        </div>
                      ) : (
                        <span className="font-mono text-theme-sub text-xs">Slot #{tt.slot_id}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {course ? (
                        <div>
                          <p className="font-semibold text-theme-text text-xs">{course.course_name}</p>
                          <p className="text-[11px] font-mono text-amber-400">{course.course_code}</p>
                        </div>
                      ) : (
                        <span className="font-mono text-amber-400 text-xs">{tt.course_code}</span>
                      )}
                    </td>
                    {/* Semester column */}
                    <td className="px-4 py-3">
                      {semester ? (
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium text-theme-text text-xs">{semester.academic_year}</span>
                          <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                            {semester.term}
                            {semester.is_active && (
                              <span className="text-[9px] px-1 py-0.2 rounded badge-emerald border">ACTIVE</span>
                            )}
                          </span>
                        </div>
                      ) : (
                        <span className="text-theme-muted text-xs italic">Semester #{tt.semester_id}</span>
                      )}
                    </td>
                    {/* Target Class column */}
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full badge-violet border text-xs font-bold w-fit">
                            {target.yearLabel}
                          </span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md badge-emerald border text-[11px] font-semibold w-fit">
                            {target.semLabel}
                          </span>
                        </div>
                        <span className="text-xs text-theme-sub font-medium mt-0.5">
                          Major: <span className="font-semibold text-theme-text">{target.majorLabel}</span>
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {teacher ? (
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full badge-sky border flex items-center justify-center font-bold text-xs">
                            {teacher.full_name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-semibold text-theme-text text-xs">{teacher.full_name}</p>
                            <p className="text-[11px] text-theme-sub">{teacher.designation} · <span className="font-mono text-cyan-400">{teacher.teacher_id}</span></p>
                          </div>
                        </div>
                      ) : (
                        <span className="font-mono text-theme-sub text-xs">{tt.teacher_id}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {room ? (
                        <div>
                          <p className="font-semibold text-theme-text text-xs">{room.room_name}</p>
                          <p className="text-[11px] text-theme-sub"><span className="font-mono text-rose-400">{room.room_id}</span> · {room.building}</p>
                        </div>
                      ) : (
                        <span className="font-mono text-rose-400 text-xs">{tt.room_id}</span>
                      )}
                    </td>
                    {!isTeacher && (
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleDeleteAcademic(tt)}
                          className="p-1.5 rounded-md hover:bg-theme-elevated text-theme-sub hover:text-red-400 transition-colors"
                          title="Delete Schedule Slot"
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
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-theme-border bg-theme-base/50">
              <tr className="text-left text-theme-sub text-xs uppercase tracking-wider">
                {(isTeacher
                  ? ["Exam Date", "Exam Time", "Course Subject", "Semester", "Classroom Location", "Supervisor Teacher"]
                  : ["Exam Date", "Exam Time", "Course Subject", "Semester", "Classroom Location", "Supervisor Teacher", "Actions"]
                ).map((h) => (
                  <th key={h} className="px-4 py-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-theme-border">
              {examData?.items.length === 0 ? (
                <tr>
                  <td colSpan={isTeacher ? 6 : 7} className="text-center py-12 text-theme-muted">
                    No exam schedule slots found matching filters.
                  </td>
                </tr>
              ) : examData?.items.map((e) => {
                const course = coursesMap[e.course_code];
                const room = classroomsMap[e.room_id];
                const supervisor = e.supervisor_teacher_id ? teachersMap[e.supervisor_teacher_id] : null;
                const semester = semestersMap[e.semester_id] || (course?.semester_id ? semestersMap[course.semester_id] : undefined);

                return (
                  <tr key={e.exam_id} className="hover:bg-theme-elevated/30 transition-colors group">
                    <td className="px-4 py-3 font-semibold text-cyan-400">{e.exam_date}</td>
                    <td className="px-4 py-3 font-mono text-theme-sub">{e.start_time} - {e.end_time}</td>
                    <td className="px-4 py-3">
                      {course ? (
                        <div>
                          <p className="font-semibold text-theme-text text-xs">{course.course_name}</p>
                          <p className="text-[11px] font-mono text-amber-400">{course.course_code}</p>
                        </div>
                      ) : (
                        <span className="font-mono text-amber-400 text-xs">{e.course_code}</span>
                      )}
                    </td>
                    {/* Semester column */}
                    <td className="px-4 py-3">
                      {semester ? (
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium text-theme-text text-xs">{semester.academic_year}</span>
                          <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                            {semester.term}
                            {semester.is_active && (
                              <span className="text-[9px] px-1 py-0.2 rounded badge-emerald border">ACTIVE</span>
                            )}
                          </span>
                        </div>
                      ) : (
                        <span className="text-theme-muted text-xs italic">Semester #{e.semester_id}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {room ? (
                        <div>
                          <p className="font-semibold text-theme-text text-xs">{room.room_name}</p>
                          <p className="text-[11px] text-theme-sub"><span className="font-mono text-rose-400">{room.room_id}</span> · {room.building}</p>
                        </div>
                      ) : (
                        <span className="font-mono text-rose-400 text-xs">{e.room_id}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {supervisor ? (
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full badge-sky border flex items-center justify-center font-bold text-xs">
                            {supervisor.full_name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-semibold text-theme-text text-xs">{supervisor.full_name}</p>
                            <p className="text-[11px] text-theme-sub">{supervisor.designation} · <span className="font-mono text-cyan-400">{supervisor.teacher_id}</span></p>
                          </div>
                        </div>
                      ) : e.supervisor_teacher_id ? (
                        <span className="font-mono text-theme-sub text-xs">{e.supervisor_teacher_id}</span>
                      ) : (
                        <span className="text-theme-muted text-xs italic">Unassigned</span>
                      )}
                    </td>
                    {!isTeacher && (
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleDeleteExam(e)}
                          className="p-1.5 rounded-md hover:bg-theme-elevated text-theme-sub hover:text-red-400 transition-colors"
                          title="Delete Exam Slot"
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
        <div className="flex items-center justify-between text-sm text-theme-sub">
          <span>Page {page + 1} of {totalPages}</span>
          <div className="flex gap-2">
            <button
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
              className="p-2 rounded-lg bg-theme-elevated border border-theme-border-hover disabled:opacity-40 hover:bg-theme-muted transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              disabled={page + 1 >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="p-2 rounded-lg bg-theme-elevated border border-theme-border-hover disabled:opacity-40 hover:bg-theme-muted transition-colors"
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
