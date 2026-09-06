"use client";

import { useState, useEffect } from "react";
import { studentsApi, enrollmentsApi, semestersApi, coursesApi } from "@/lib/api";
import type { Student, StudentGPASummary, Enrollment, Semester, Course } from "@/types";
import {
  Plus, Search, Trash2, Pencil, Camera, CheckCircle2, Clock,
  ChevronLeft, ChevronRight, X, Loader2, Settings2, BookOpen, UserCheck, ShieldAlert, Eye, Award
} from "lucide-react";
import { FaceEnrollDialog } from "@/components/students/FaceEnrollDialog";
import { StudentFormDialog } from "@/components/students/StudentFormDialog";
import { IDConfigDialog } from "@/components/students/IDConfigDialog";
import { StudentDetailDialog } from "@/components/students/StudentDetailDialog";
import { BatchEnrollmentDialog } from "@/components/enrollments/BatchEnrollmentDialog";
import { useStudents } from "@/hooks/useStudents";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

import { useAuth } from "@/context/AuthContext";

const SECTION_COLORS: Record<string, string> = {
  A: "badge-blue border",
  B: "badge-emerald border",
  C: "badge-amber border",
};

const STATUS_COLORS: Record<string, string> = {
  Active: "badge-emerald border",
  Graduated: "badge-blue border",
  Suspended: "badge-amber border",
  Dropped: "badge-red border",
};

export default function StudentsPage() {
  const { user } = useAuth();
  const isTeacher = user?.role === "TEACHER";

  const [search, setSearch] = useState("");
  const [filterSection, setFilterSection] = useState<"" | "A" | "B" | "C">("");
  const [filterYear, setFilterYear] = useState<number | "">("");
  const [filterStatus, setFilterStatus] = useState<"" | "Active" | "Graduated" | "Suspended" | "Dropped">("");
  const [page, setPage] = useState(0);

  // Checked student IDs for batch actions
  const [checkedStudentIds, setCheckedStudentIds] = useState<string[]>([]);

  // GPA Map State (auto-calculated from course GPAs across semesters)
  const [gpaMap, setGpaMap] = useState<Record<string, StudentGPASummary>>({});

  // Course GPA Entry Modal State
  const [gpaEntryMode, setGpaEntryMode] = useState<"course" | "semester">("semester");
  const [gradeModalStudent, setGradeModalStudent] = useState<Student | null>(null);
  const [studentEnrollments, setStudentEnrollments] = useState<Enrollment[]>([]);
  const [gradeModalSemesters, setGradeModalSemesters] = useState<Semester[]>([]);
  const [gradeModalCourses, setGradeModalCourses] = useState<Course[]>([]);
  const [selectedSemesterId, setSelectedSemesterId] = useState<number | "">("");
  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState<number | "">("");
  const [gpaInput, setGpaInput] = useState("");
  const [loadingEnrollments, setLoadingEnrollments] = useState(false);
  const [isSavingGrade, setIsSavingGrade] = useState(false);
  const [gradeError, setGradeError] = useState<string | null>(null);

  // Dialog states
  const [detailTarget, setDetailTarget] = useState<Student | null>(null);
  const [enrollTarget, setEnrollTarget] = useState<Student | null>(null);
  const [editTarget, setEditTarget] = useState<Student | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [showBatchEnroll, setShowBatchEnroll] = useState(false);
  const [batchTargetIds, setBatchTargetIds] = useState<string[]>([]);

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
  const { data, isLoading, error, refetch } = useStudents({
    search,
    skip: page * limit,
    limit,
    ...(filterSection ? { section: filterSection } : {}),
    ...(filterYear !== "" ? { academic_year: filterYear } : {}),
    ...(filterStatus ? { status: filterStatus } : {}),
  });

  // Fetch calculated GPA for students on current page
  useEffect(() => {
    if (!data?.items) return;
    const gMap: Record<string, StudentGPASummary> = {};
    Promise.all(
      data.items.map(async (st) => {
        try {
          const g = await studentsApi.getGPA(st.student_id);
          gMap[st.student_id] = g;
        } catch {
          // ignore
        }
      })
    ).then(() => setGpaMap(gMap));
  }, [data?.items]);

  const openGradeModal = async (st: Student) => {
    setGradeModalStudent(st);
    setLoadingEnrollments(true);
    setGradeError(null);
    setSelectedSemesterId("");
    setSelectedEnrollmentId("");
    setGpaInput("");
    try {
      const [enrRes, semRes, crsRes] = await Promise.all([
        enrollmentsApi.list({ student_id: st.student_id, limit: 100 }),
        semestersApi.list({ limit: 100 }),
        coursesApi.list({ limit: 200 }),
      ]);
      const enrollments = enrRes.items;
      setStudentEnrollments(enrollments);
      setGradeModalSemesters(semRes.items);
      setGradeModalCourses(crsRes.items);

      if (enrollments.length > 0) {
        const firstSemId = enrollments[0].semester_id;
        setSelectedSemesterId(firstSemId);
        setSelectedEnrollmentId(enrollments[0].enrollment_id);
        setGpaInput(enrollments[0].grade_point?.toString() ?? "");
      } else if (semRes.items.length > 0) {
        setSelectedSemesterId(semRes.items[0].semester_id);
      }
    } catch (e: unknown) {
      setGradeError((e as Error).message);
    } finally {
      setLoadingEnrollments(false);
    }
  };

  const handleSemesterChange = (semId: number) => {
    setSelectedSemesterId(semId);
    const first = studentEnrollments.find((e) => e.semester_id === semId);
    if (first) {
      setSelectedEnrollmentId(first.enrollment_id);
      setGpaInput(first.grade_point?.toString() ?? "");
    } else {
      setSelectedEnrollmentId("");
      setGpaInput("");
    }
  };

  const handleCourseChange = (enrId: number) => {
    setSelectedEnrollmentId(enrId);
    const target = studentEnrollments.find((e) => e.enrollment_id === enrId);
    setGpaInput(target?.grade_point?.toString() ?? "");
  };

  const handleSaveGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSemesterId) {
      setGradeError("Semester ရွေးချယ်ပေးပါ။");
      return;
    }
    const gpa = parseFloat(gpaInput);
    if (isNaN(gpa) || gpa < 0 || gpa > 4.0) {
      setGradeError("GPA သည် 0.00 မှ 4.00 အတွင်း ဖြစ်ရပါမည်။");
      return;
    }
    setIsSavingGrade(true);
    setGradeError(null);
    try {
      if (gpaEntryMode === "course") {
        if (!selectedEnrollmentId) {
          setGradeError("Course (ဘာသာရပ်) ရွေးချယ်ပေးပါ။");
          setIsSavingGrade(false);
          return;
        }
        await enrollmentsApi.updateGrade(Number(selectedEnrollmentId), { grade_point: gpa });
      } else {
        if (gradeModalStudent) {
          await studentsApi.updateSemesterGPA(gradeModalStudent.student_id, {
            semester_id: Number(selectedSemesterId),
            gpa: gpa,
          });
        }
      }

      if (gradeModalStudent) {
        const updatedGPA = await studentsApi.getGPA(gradeModalStudent.student_id);
        setGpaMap((prev) => ({ ...prev, [gradeModalStudent.student_id]: updatedGPA }));
      }
      refetch();
      setGradeModalStudent(null);
    } catch (err: unknown) {
      setGradeError((err as Error).message);
    } finally {
      setIsSavingGrade(false);
    }
  };

  const showAlert = (message: string, title = "Notification") => {
    setModalConfig({ isOpen: true, title, message, isAlert: true, variant: "warning" });
  };

  const allPageIds = data?.items.map((s) => s.student_id) ?? [];
  const isAllChecked = allPageIds.length > 0 && allPageIds.every((id) => checkedStudentIds.includes(id));

  const toggleSelectAll = () => {
    if (isAllChecked) {
      setCheckedStudentIds((prev) => prev.filter((id) => !allPageIds.includes(id)));
    } else {
      setCheckedStudentIds((prev) => Array.from(new Set([...prev, ...allPageIds])));
    }
  };

  const toggleCheckStudent = (id: string) => {
    setCheckedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleDelete = (s: Student) => {
    setModalConfig({
      isOpen: true,
      title: "Delete Student Profile",
      message: `Are you sure you want to delete student "${s.full_name}" (${s.student_id})? This action cannot be undone.`,
      variant: "danger",
      onConfirm: async () => {
        setModalConfig((prev) => ({ ...prev, isLoading: true }));
        try {
          await studentsApi.delete(s.student_id);
          setCheckedStudentIds((prev) => prev.filter((id) => id !== s.student_id));
          refetch();
        } catch (e: unknown) {
          showAlert((e as Error).message, "Delete Failed");
        } finally {
          setModalConfig({ isOpen: false, message: "" });
        }
      },
    });
  };

  const openBatchEnroll = (ids?: string[]) => {
    setBatchTargetIds(ids ?? checkedStudentIds);
    setShowBatchEnroll(true);
  };

  const totalPages = Math.ceil((data?.total ?? 0) / limit);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-theme-text">Student Management System</h2>
            {isTeacher && (
              <span className="px-2.5 py-0.5 rounded-full badge-amber border text-xs font-semibold">
                View Only Mode
              </span>
            )}
          </div>
          <p className="text-sm text-theme-sub mt-0.5">{data?.total ?? 0} total registered students</p>
        </div>
        {!isTeacher && (
          <div className="flex items-center gap-3">
            {checkedStudentIds.length > 0 && (
              <button
                onClick={() => openBatchEnroll()}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-theme-text text-sm font-medium transition-colors shadow-lg shadow-teal-900/30 animate-in fade-in"
              >
                <BookOpen className="w-4 h-4" /> Enroll Selected ({checkedStudentIds.length})
              </button>
            )}
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors shadow-lg shadow-violet-900/30"
            >
              <Plus className="w-4 h-4" /> Add Student
            </button>
          </div>
        )}
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-48 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-muted" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            placeholder="Search by name, ID, roll no, NRC, email…"
            className="w-full pl-9 pr-9 py-2 bg-theme-surface border border-theme-border-hover rounded-lg text-sm text-theme-text placeholder:text-theme-muted focus:outline-none focus:ring-2 focus:ring-violet-600/50"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-theme-muted hover:text-theme-sub">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-theme-muted font-medium">Status:</span>
          {(["", "Active", "Graduated", "Suspended", "Dropped"] as const).map((st) => (
            <button
              key={st}
              onClick={() => { setFilterStatus(st); setPage(0); }}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                filterStatus === st
                  ? st === "" ? "filter-active border" : `${STATUS_COLORS[st]} border-current`
                  : "border-theme-border-hover text-theme-sub hover:border-slate-500"
              }`}
            >
              {st === "" ? "All" : st}
            </button>
          ))}
        </div>

        {/* Section filter */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-theme-muted font-medium">Section:</span>
          {(["", "A", "B", "C"] as const).map((sec) => (
            <button
              key={sec}
              onClick={() => { setFilterSection(sec); setPage(0); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                filterSection === sec
                  ? sec === "" ? "filter-active border" : `${SECTION_COLORS[sec]} border-current`
                  : "border-theme-border-hover text-theme-sub hover:border-slate-500"
              }`}
            >
              {sec === "" ? "All" : sec}
            </button>
          ))}
        </div>

        {/* Year filter */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-theme-muted font-medium">Year:</span>
          {(["", 1, 2, 3, 4, 5] as const).map((yr) => (
            <button
              key={yr}
              onClick={() => { setFilterYear(yr); setPage(0); }}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                filterYear === yr
                  ? "bg-violet-600 border-violet-500 text-white"
                  : "border-theme-border-hover text-theme-sub hover:border-slate-500"
              }`}
            >
              {yr === "" ? "All" : yr}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-theme-surface border border-theme-border rounded-xl overflow-hidden shadow-xl">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-violet-400" />
          </div>
        ) : error ? (
          <div className="text-center py-16 text-red-400 text-sm">{error}</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-theme-border bg-theme-base/50">
              <tr className="text-left text-theme-sub text-xs uppercase tracking-wider">
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={isAllChecked}
                    onChange={toggleSelectAll}
                    className="rounded border-theme-border-hover bg-theme-elevated text-teal-500 focus:ring-teal-500/30"
                  />
                </th>
                {["Student ID", "Name / Email", "Major / Roll", "Year & Section", "CGPA", "Status", "Face", "Actions"].map((h) => (
                  <th key={h} className="px-4 py-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-theme-border">
              {data?.items.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-theme-muted">
                    No students found.{" "}
                    <button onClick={() => setShowCreate(true)} className="text-violet-400 hover:underline">Add one?</button>
                  </td>
                </tr>
              ) : (
                data?.items.map((s) => {
                  const isChecked = checkedStudentIds.includes(s.student_id);
                  const statusName = s.status || "Active";
                  return (
                    <tr key={s.student_id} className={`transition-colors group ${
                      isChecked ? "bg-teal-950/20" : "hover:bg-theme-elevated/30"
                    }`}>
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleCheckStudent(s.student_id)}
                          className="rounded border-theme-border-hover bg-theme-elevated text-teal-500 focus:ring-teal-500/30"
                        />
                      </td>
                      <td className="px-4 py-3 font-mono text-violet-400 text-xs">
                        <button
                          onClick={() => setDetailTarget(s)}
                          className="hover:underline text-left font-semibold text-violet-400"
                          title="View Student Profile Details"
                        >
                          {s.student_id}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setDetailTarget(s)}
                          className="hover:text-violet-300 text-left transition-colors"
                          title="View Student Profile Details"
                        >
                          <div className="font-medium text-theme-text">{s.full_name}</div>
                          {s.email && <div className="text-[11px] text-theme-sub">{s.email}</div>}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-theme-sub">
                        <span className="font-semibold text-theme-sub">{s.major || s.dept_code}</span>
                        {s.roll_number && <span className="text-theme-muted ml-1.5 font-mono text-xs">({s.roll_number})</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-theme-sub text-xs">Year {s.academic_year}</span>
                          {s.section && (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold border ${SECTION_COLORS[s.section] ?? "bg-theme-elevated text-theme-sub border-theme-border-hover"}`}>
                              §{s.section}
                            </span>
                          )}
                        </div>
                      </td>
                      {/* CGPA Column */}
                      <td className="px-4 py-3">
                        {(() => {
                          const cgpa = s.cgpa ?? 0;
                          let cgpaBadgeClass = "bg-theme-elevated text-theme-sub border-theme-border-hover";
                          if (cgpa >= 3.5) cgpaBadgeClass = "badge-cgpa-high border";
                          else if (cgpa >= 3.0) cgpaBadgeClass = "badge-cgpa-good border";
                          else if (cgpa >= 2.0) cgpaBadgeClass = "badge-cgpa-avg border";
                          else if (cgpa > 0) cgpaBadgeClass = "badge-cgpa-low border";

                          return (
                            <button
                              onClick={() => setDetailTarget(s)}
                              className={`px-2.5 py-0.5 rounded-lg border font-mono font-bold text-xs inline-flex items-center gap-1 transition-transform hover:scale-105 ${cgpaBadgeClass}`}
                              title="Click to view student profile & GPA details"
                            >
                              {cgpa > 0 ? cgpa.toFixed(2) : "N/A"}
                            </button>
                          );
                        })()}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border ${STATUS_COLORS[statusName] ?? "bg-theme-elevated text-theme-sub border-theme-border-hover"}`}>
                          {statusName}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {s.is_face_registered ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full badge-emerald border text-xs">
                            <CheckCircle2 className="w-3 h-3" /> Enrolled
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full badge-amber border text-xs">
                            <Clock className="w-3 h-3" /> Pending
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => setDetailTarget(s)}
                            title="View Full Profile Details & Academic Transcript"
                            className="p-1.5 rounded-md hover:bg-sky-900/30 hover:text-sky-400 text-theme-muted transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openGradeModal(s)}
                            title="Assign Course GPA"
                            className="p-1.5 rounded-md hover:bg-amber-900/30 hover:text-amber-400 text-theme-muted transition-colors"
                          >
                            <Award className="w-4 h-4 text-amber-400" />
                          </button>
                          {!isTeacher && (
                            <>
                              <button
                                onClick={() => openBatchEnroll([s.student_id])}
                                title="Enroll Courses"
                                className="p-1.5 rounded-md hover:bg-teal-900/30 hover:text-teal-400 text-theme-muted transition-colors"
                              >
                                <BookOpen className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setEnrollTarget(s)}
                                title="Enroll / Re-enroll face"
                                className="p-1.5 rounded-md hover:bg-emerald-900/30 hover:text-emerald-400 text-theme-muted transition-colors"
                              >
                                <Camera className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setEditTarget(s)}
                                title="Edit Student Profile & Courses"
                                className="p-1.5 rounded-md hover:bg-violet-900/30 hover:text-violet-400 text-theme-muted transition-colors"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(s)}
                                title="Delete"
                                className="p-1.5 rounded-md hover:bg-red-900/30 hover:text-red-400 text-theme-muted transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
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

      {/* Dialogs */}
      {detailTarget && (
        <StudentDetailDialog
          student={detailTarget}
          onClose={() => setDetailTarget(null)}
          onEdit={!isTeacher ? () => setEditTarget(detailTarget) : undefined}
          onFaceEnroll={!isTeacher ? () => setEnrollTarget(detailTarget) : undefined}
        />
      )}
      {enrollTarget && (
        <FaceEnrollDialog
          person={enrollTarget}
          personType="student"
          onClose={() => { setEnrollTarget(null); refetch(); }}
        />
      )}
      {(showCreate || editTarget) && (
        <StudentFormDialog
          student={editTarget ?? undefined}
          onClose={() => { setShowCreate(false); setEditTarget(null); refetch(); }}
        />
      )}
      {showConfig && (
        <IDConfigDialog onClose={() => setShowConfig(false)} />
      )}
      {showBatchEnroll && (
        <BatchEnrollmentDialog
          initialStudentIds={batchTargetIds}
          onClose={() => { setShowBatchEnroll(false); setBatchTargetIds([]); }}
          onSuccess={() => { refetch(); }}
        />
      )}

      {/* Dual-Mode GPA Entry Modal */}
      {gradeModalStudent && (() => {
        const uniqueSemIds = [...new Set(studentEnrollments.map((e) => e.semester_id))];
        const coursesInSem = studentEnrollments.filter((e) => e.semester_id === selectedSemesterId);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-theme-surface border border-theme-border rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4.5 border-b border-theme-border bg-theme-surface/60">
                <div>
                  <h3 className="font-bold text-theme-text text-lg">GPA / Grade Entry</h3>
                  <p className="text-sm text-theme-sub mt-0.5">
                    {gradeModalStudent.full_name} · <code className="font-mono text-amber-400 font-bold">{gradeModalStudent.student_id}</code>
                  </p>
                </div>
                <button onClick={() => setGradeModalStudent(null)} className="p-1.5 text-theme-sub hover:text-theme-text hover:bg-theme-elevated rounded-lg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Mode Switcher Tabs */}
              <div className="grid grid-cols-2 bg-theme-surface/80 p-1.5 border-b border-theme-border text-sm font-semibold">
                <button
                  type="button"
                  onClick={() => setGpaEntryMode("course")}
                  className={`py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all ${
                    gpaEntryMode === "course"
                      ? "bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20"
                      : "text-theme-sub hover:text-theme-text hover:bg-theme-elevated/50"
                  }`}
                >
                  <BookOpen className="w-4 h-4" /> ဘာသာရပ်အလိုက် (By Course)
                </button>
                <button
                  type="button"
                  onClick={() => setGpaEntryMode("semester")}
                  className={`py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all ${
                    gpaEntryMode === "semester"
                      ? "bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20"
                      : "text-theme-sub hover:text-theme-text hover:bg-theme-elevated/50"
                  }`}
                >
                  <Award className="w-4 h-4" /> Semester အလိုက် (By Semester)
                </button>
              </div>

              {loadingEnrollments ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
                </div>
              ) : (
                <form onSubmit={handleSaveGrade} className="p-6 space-y-5">
                  {gradeError && (
                    <div className="p-3 bg-red-950/60 border border-red-800/70 rounded-xl text-xs text-red-300 font-medium">{gradeError}</div>
                  )}

                  {/* Mode 1: By Course */}
                  {gpaEntryMode === "course" ? (
                    studentEnrollments.length === 0 ? (
                      <div className="p-6 text-center text-xs text-theme-sub space-y-2 bg-theme-base/40 rounded-xl border border-theme-border">
                        <p className="font-semibold text-theme-sub">ကျောင်းသားသည် မည်သည့် Course မျှ enroll မလုပ်ရသေးပါ။</p>
                        <p className="text-theme-muted">Course အလိုက် ထည့်ရန် မမီမီ Enroll မဖြစ်သေးပါက "Semester အလိုက်" Tab ကို အသုံးပြုနိုင်ပါသည်။</p>
                      </div>
                    ) : (
                      <>
                        {/* Semester Select */}
                        <div>
                          <label className="block text-xs font-semibold text-theme-sub uppercase tracking-wider mb-2">Semester ရွေးပါ</label>
                          <select
                            value={selectedSemesterId}
                            onChange={(e) => handleSemesterChange(Number(e.target.value))}
                            className="w-full px-4 py-2.5 bg-theme-elevated border border-theme-border-hover rounded-xl text-sm text-theme-text font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                          >
                            {uniqueSemIds.map((semId) => {
                              const sem = gradeModalSemesters.find((s) => s.semester_id === semId);
                              return (
                                <option key={semId} value={semId}>
                                  {sem ? `${sem.academic_year} · ${sem.term}` : `Semester #${semId}`}
                                </option>
                              );
                            })}
                          </select>
                        </div>

                        {/* Course Select */}
                        <div>
                          <label className="block text-xs font-semibold text-theme-sub uppercase tracking-wider mb-2">Course (ဘာသာရပ်)</label>
                          <select
                            value={selectedEnrollmentId}
                            onChange={(e) => handleCourseChange(Number(e.target.value))}
                            className="w-full px-4 py-2.5 bg-theme-elevated border border-theme-border-hover rounded-xl text-sm font-mono text-theme-text font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                          >
                            {coursesInSem.map((enr) => {
                              const crs = gradeModalCourses.find((c) => c.course_code === enr.course_code);
                              const courseLabel = crs ? `${enr.course_code} — ${crs.course_name}` : enr.course_code;
                              return (
                                <option key={enr.enrollment_id} value={enr.enrollment_id}>
                                  {courseLabel}
                                  {enr.grade_point != null ? ` (GPA: ${enr.grade_point.toFixed(2)})` : " (မထည့်ရသေး)"}
                                </option>
                              );
                            })}
                          </select>
                        </div>

                        {/* Course GPA Input */}
                        <div>
                          <label className="block text-xs font-semibold text-theme-sub uppercase tracking-wider mb-2">Course GPA (0.00 – 4.00)</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max="4.0"
                            value={gpaInput}
                            onChange={(e) => setGpaInput(e.target.value)}
                            placeholder="e.g. 3.70"
                            className="w-full px-4 py-3 bg-theme-elevated border border-theme-border-hover rounded-xl text-2xl font-mono font-bold text-amber-300 text-center focus:outline-none focus:ring-2 focus:ring-amber-500/40 placeholder:text-theme-muted placeholder:text-base placeholder:font-normal"
                            autoFocus
                          />
                        </div>
                      </>
                    )
                  ) : (
                    /* Mode 2: By Semester */
                    <>
                      <div>
                        <label className="block text-xs font-semibold text-theme-sub uppercase tracking-wider mb-2">Semester ရွေးပါ</label>
                        <select
                          value={selectedSemesterId}
                          onChange={(e) => setSelectedSemesterId(Number(e.target.value))}
                          className="w-full px-4 py-2.5 bg-theme-elevated border border-theme-border-hover rounded-xl text-sm text-theme-text font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                        >
                          {gradeModalSemesters.map((sem) => (
                            <option key={sem.semester_id} value={sem.semester_id}>
                              {sem.academic_year} · {sem.term} {sem.is_active ? "★ Active" : ""}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-theme-sub uppercase tracking-wider mb-2">Semester GPA / CGPA (0.00 – 4.00)</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="4.0"
                          value={gpaInput}
                          onChange={(e) => setGpaInput(e.target.value)}
                          placeholder="e.g. 3.50"
                          className="w-full px-4 py-3 bg-theme-elevated border border-theme-border-hover rounded-xl text-2xl font-mono font-bold text-amber-300 text-center focus:outline-none focus:ring-2 focus:ring-amber-500/40 placeholder:text-theme-muted placeholder:text-base placeholder:font-normal"
                          autoFocus
                        />
                        <p className="text-xs text-theme-muted mt-1.5">ထို Semester တစ်ခုလုံးအတွက် သို့မဟုတ် စုစုပေါင်း CGPA ကို တိုက်ရိုက် Manual ထည့်ပေးပါ။</p>
                      </div>
                    </>
                  )}

                  {/* Buttons */}
                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => setGradeModalStudent(null)}
                      className="flex-1 py-2.5 rounded-xl border border-theme-border-hover text-theme-sub text-sm font-semibold hover:bg-theme-elevated transition-colors">
                      Cancel
                    </button>
                    <button type="submit" disabled={isSavingGrade}
                      className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-sm font-bold transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20">
                      {isSavingGrade ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save GPA"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        );
      })()}



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
