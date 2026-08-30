"use client";

import { useState, useEffect } from "react";
import { studentsApi, enrollmentsApi } from "@/lib/api";
import type { Student, StudentGPASummary, Enrollment } from "@/types";
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
  A: "bg-blue-900/30 text-blue-400 border-blue-800/50",
  B: "bg-emerald-900/30 text-emerald-400 border-emerald-800/50",
  C: "bg-amber-900/30 text-amber-400 border-amber-800/50",
};

const STATUS_COLORS: Record<string, string> = {
  Active: "bg-emerald-900/30 text-emerald-400 border-emerald-800/50",
  Graduated: "bg-blue-900/30 text-blue-400 border-blue-800/50",
  Suspended: "bg-amber-900/30 text-amber-400 border-amber-800/50",
  Dropped: "bg-red-900/30 text-red-400 border-red-800/50",
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

  // GPA State
  const [gpaMap, setGpaMap] = useState<Record<string, StudentGPASummary>>({});

  // Quick Grade Entry Modal State
  const [gradeModalStudent, setGradeModalStudent] = useState<Student | null>(null);
  const [studentEnrollments, setStudentEnrollments] = useState<Enrollment[]>([]);
  const [loadingEnrollments, setLoadingEnrollments] = useState(false);
  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState<number | "">("");
  const [marksInput, setMarksInput] = useState("");
  const [gradeInput, setGradeInput] = useState("");
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

  // Fetch GPA for students on current page
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
    setSelectedEnrollmentId("");
    setMarksInput("");
    setGradeInput("");
    try {
      const enrRes = await enrollmentsApi.list({ student_id: st.student_id, limit: 100 });
      setStudentEnrollments(enrRes.items);
      if (enrRes.items.length > 0) {
        const first = enrRes.items[0];
        setSelectedEnrollmentId(first.enrollment_id);
        setMarksInput(first.marks !== null && first.marks !== undefined ? first.marks.toString() : "");
        setGradeInput(first.grade || "");
      }
    } catch (e: unknown) {
      setGradeError((e as Error).message);
    } finally {
      setLoadingEnrollments(false);
    }
  };

  const handleEnrollmentChange = (enrId: number) => {
    setSelectedEnrollmentId(enrId);
    const target = studentEnrollments.find((e) => e.enrollment_id === enrId);
    if (target) {
      setMarksInput(target.marks !== null && target.marks !== undefined ? target.marks.toString() : "");
      setGradeInput(target.grade || "");
    }
  };

  const handleSaveGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEnrollmentId) {
      setGradeError("Please select a course enrollment to assign grade.");
      return;
    }
    setIsSavingGrade(true);
    setGradeError(null);
    try {
      const marksVal = marksInput.trim() !== "" ? parseFloat(marksInput) : undefined;
      await enrollmentsApi.updateGrade(Number(selectedEnrollmentId), {
        marks: marksVal,
        grade: gradeInput.trim() || undefined,
      });

      // Refresh GPA for this student
      if (gradeModalStudent) {
        const updatedGPA = await studentsApi.getGPA(gradeModalStudent.student_id);
        setGpaMap((prev) => ({ ...prev, [gradeModalStudent.student_id]: updatedGPA }));
      }
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
            <h2 className="text-xl font-bold text-white">Student Management System</h2>
            {isTeacher && (
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 text-xs font-semibold">
                View Only Mode
              </span>
            )}
          </div>
          <p className="text-sm text-slate-400 mt-0.5">{data?.total ?? 0} total registered students</p>
        </div>
        {!isTeacher && (
          <div className="flex items-center gap-3">
            {checkedStudentIds.length > 0 && (
              <button
                onClick={() => openBatchEnroll()}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-sm font-medium transition-colors shadow-lg shadow-teal-900/30 animate-in fade-in"
              >
                <BookOpen className="w-4 h-4" /> Enroll Selected ({checkedStudentIds.length})
              </button>
            )}
            <button
              onClick={() => setShowConfig(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-300 text-sm font-medium transition-colors shadow-sm"
            >
              <Settings2 className="w-4 h-4 text-violet-400" /> ID Format Rules
            </button>
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
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            placeholder="Search by name, ID, roll no, NRC, email…"
            className="w-full pl-9 pr-9 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-600/50"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-500 font-medium">Status:</span>
          {(["", "Active", "Graduated", "Suspended", "Dropped"] as const).map((st) => (
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

        {/* Section filter */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-500 font-medium">Section:</span>
          {(["", "A", "B", "C"] as const).map((sec) => (
            <button
              key={sec}
              onClick={() => { setFilterSection(sec); setPage(0); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                filterSection === sec
                  ? sec === "" ? "bg-slate-700 border-slate-500 text-white" : `${SECTION_COLORS[sec]} border-current`
                  : "border-slate-700 text-slate-400 hover:border-slate-500"
              }`}
            >
              {sec === "" ? "All" : sec}
            </button>
          ))}
        </div>

        {/* Year filter */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-500 font-medium">Year:</span>
          {(["", 1, 2, 3, 4, 5] as const).map((yr) => (
            <button
              key={yr}
              onClick={() => { setFilterYear(yr); setPage(0); }}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                filterYear === yr
                  ? "bg-violet-600 border-violet-500 text-white"
                  : "border-slate-700 text-slate-400 hover:border-slate-500"
              }`}
            >
              {yr === "" ? "All" : yr}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-violet-400" />
          </div>
        ) : error ? (
          <div className="text-center py-16 text-red-400 text-sm">{error}</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-slate-800 bg-slate-950/50">
              <tr className="text-left text-slate-500 text-xs uppercase tracking-wider">
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={isAllChecked}
                    onChange={toggleSelectAll}
                    className="rounded border-slate-700 bg-slate-800 text-teal-500 focus:ring-teal-500/30"
                  />
                </th>
                {["Student ID", "Name / Email", "Major / Roll", "Year & Section", "CGPA", "Status", "Face", "Actions"].map((h) => (
                  <th key={h} className="px-4 py-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {data?.items.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-slate-500">
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
                      isChecked ? "bg-teal-950/20" : "hover:bg-slate-800/30"
                    }`}>
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleCheckStudent(s.student_id)}
                          className="rounded border-slate-700 bg-slate-800 text-teal-500 focus:ring-teal-500/30"
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
                          <div className="font-medium text-slate-200">{s.full_name}</div>
                          {s.email && <div className="text-[11px] text-slate-400">{s.email}</div>}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        <span className="font-semibold text-slate-300">{s.major || s.dept_code}</span>
                        {s.roll_number && <span className="text-slate-500 ml-1.5 font-mono text-xs">({s.roll_number})</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400 text-xs">Year {s.academic_year}</span>
                          {s.section && (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold border ${SECTION_COLORS[s.section] ?? "bg-slate-800 text-slate-400 border-slate-700"}`}>
                              §{s.section}
                            </span>
                          )}
                        </div>
                      </td>
                      {/* CGPA Column */}
                      <td className="px-4 py-3">
                        {(() => {
                          const summary = gpaMap[s.student_id];
                          const cgpa = summary?.cgpa ?? 0;
                          let cgpaBadgeClass = "bg-slate-800 text-slate-400 border-slate-700";
                          if (cgpa >= 3.5) cgpaBadgeClass = "bg-amber-950/80 text-amber-300 border-amber-600/50";
                          else if (cgpa >= 3.0) cgpaBadgeClass = "bg-emerald-950/80 text-emerald-300 border-emerald-700/60";
                          else if (cgpa >= 2.0) cgpaBadgeClass = "bg-cyan-950/80 text-cyan-300 border-cyan-700/60";
                          else if (cgpa > 0) cgpaBadgeClass = "bg-red-950/80 text-red-300 border-red-700/60";

                          return (
                            <button
                              onClick={() => setDetailTarget(s)}
                              className={`px-2.5 py-0.5 rounded-lg border font-mono font-bold text-xs inline-flex items-center gap-1 transition-transform hover:scale-105 ${cgpaBadgeClass}`}
                              title="Click to view full GPA & Transcript Breakdown"
                            >
                              {cgpa > 0 ? cgpa.toFixed(2) : "No Grades"}
                            </button>
                          );
                        })()}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border ${STATUS_COLORS[statusName] ?? "bg-slate-800 text-slate-400 border-slate-700"}`}>
                          {statusName}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {s.is_face_registered ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-900/30 text-emerald-400 text-xs border border-emerald-800/50">
                            <CheckCircle2 className="w-3 h-3" /> Enrolled
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-900/30 text-amber-400 text-xs border border-amber-800/50">
                            <Clock className="w-3 h-3" /> Pending
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => setDetailTarget(s)}
                            title="View Full Profile Details & Academic Transcript"
                            className="p-1.5 rounded-md hover:bg-sky-900/30 hover:text-sky-400 text-slate-500 transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openGradeModal(s)}
                            title="Assign Marks & Grade (GPA)"
                            className="p-1.5 rounded-md hover:bg-amber-900/30 hover:text-amber-400 text-slate-500 transition-colors"
                          >
                            <Award className="w-4 h-4 text-amber-400" />
                          </button>
                          {!isTeacher && (
                            <>
                              <button
                                onClick={() => openBatchEnroll([s.student_id])}
                                title="Enroll Courses"
                                className="p-1.5 rounded-md hover:bg-teal-900/30 hover:text-teal-400 text-slate-500 transition-colors"
                              >
                                <BookOpen className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setEnrollTarget(s)}
                                title="Enroll / Re-enroll face"
                                className="p-1.5 rounded-md hover:bg-emerald-900/30 hover:text-emerald-400 text-slate-500 transition-colors"
                              >
                                <Camera className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setEditTarget(s)}
                                title="Edit Student Profile & Courses"
                                className="p-1.5 rounded-md hover:bg-violet-900/30 hover:text-violet-400 text-slate-500 transition-colors"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(s)}
                                title="Delete"
                                className="p-1.5 rounded-md hover:bg-red-900/30 hover:text-red-400 text-slate-500 transition-colors"
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

      {/* Quick Grade Entry Modal */}
      {gradeModalStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
              <div>
                <h3 className="font-bold text-white text-base">Assign Marks &amp; Grade (GPA)</h3>
                <p className="text-xs text-slate-400">
                  {gradeModalStudent.full_name} (<code className="font-mono text-amber-400">{gradeModalStudent.student_id}</code>)
                </p>
              </div>
              <button onClick={() => setGradeModalStudent(null)} className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingEnrollments ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
              </div>
            ) : studentEnrollments.length === 0 ? (
              <div className="p-6 text-center space-y-3">
                <p className="text-sm text-slate-400">
                  This student is not currently enrolled in any course. Please enroll the student first.
                </p>
                <button
                  onClick={() => setGradeModalStudent(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-200 text-xs font-semibold hover:bg-slate-700 transition-colors"
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleSaveGrade} className="p-6 space-y-4">
                {gradeError && (
                  <div className="p-3 bg-red-950/60 border border-red-800/80 rounded-xl text-xs text-red-300 font-medium">
                    {gradeError}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Select Enrolled Course &amp; Semester
                  </label>
                  <select
                    value={selectedEnrollmentId}
                    onChange={(e) => handleEnrollmentChange(Number(e.target.value))}
                    className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs font-mono text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  >
                    {studentEnrollments.map((enr) => (
                      <option key={enr.enrollment_id} value={enr.enrollment_id}>
                        {enr.course_code} — Term #{enr.semester_id} {enr.grade ? `(Current Grade: ${enr.grade})` : "(Ungraded)"}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Marks (%) (0 - 100)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={marksInput}
                    onChange={(e) => {
                      setMarksInput(e.target.value);
                      const val = parseFloat(e.target.value);
                      if (!isNaN(val)) {
                        if (val >= 80) setGradeInput("A");
                        else if (val >= 75) setGradeInput("A-");
                        else if (val >= 70) setGradeInput("B+");
                        else if (val >= 65) setGradeInput("B");
                        else if (val >= 60) setGradeInput("B-");
                        else if (val >= 55) setGradeInput("C+");
                        else if (val >= 50) setGradeInput("C");
                        else if (val >= 40) setGradeInput("D");
                        else setGradeInput("F");
                      }
                    }}
                    placeholder="e.g. 85.5"
                    className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm font-mono text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">Entering marks automatically computes Letter Grade &amp; Grade Point (4.0 Scale).</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Letter Grade
                  </label>
                  <select
                    value={gradeInput}
                    onChange={(e) => setGradeInput(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm font-mono font-semibold text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  >
                    <option value="">-- Select Grade --</option>
                    <option value="A">A (4.00 — 80-100%)</option>
                    <option value="A-">A- (3.70 — 75-79%)</option>
                    <option value="B+">B+ (3.30 — 70-74%)</option>
                    <option value="B">B (3.00 — 65-69%)</option>
                    <option value="B-">B- (2.70 — 60-64%)</option>
                    <option value="C+">C+ (2.30 — 55-59%)</option>
                    <option value="C">C (2.00 — 50-54%)</option>
                    <option value="D">D (1.00 — 40-49%)</option>
                    <option value="F">F (0.00 — Below 40%)</option>
                  </select>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setGradeModalStudent(null)}
                    className="flex-1 py-2 rounded-xl border border-slate-700 text-slate-300 text-sm hover:bg-slate-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingGrade}
                    className="flex-1 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2"
                  >
                    {isSavingGrade ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Grade"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
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
