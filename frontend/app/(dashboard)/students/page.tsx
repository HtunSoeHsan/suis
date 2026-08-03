"use client";

import { useState } from "react";
import { studentsApi } from "@/lib/api";
import type { Student } from "@/types";
import {
  Plus, Search, Trash2, Pencil, Camera, CheckCircle2, Clock,
  ChevronLeft, ChevronRight, X, Loader2, Settings2, BookOpen, UserCheck, ShieldAlert
} from "lucide-react";
import { FaceEnrollDialog } from "@/components/students/FaceEnrollDialog";
import { StudentFormDialog } from "@/components/students/StudentFormDialog";
import { IDConfigDialog } from "@/components/students/IDConfigDialog";
import { BatchEnrollmentDialog } from "@/components/enrollments/BatchEnrollmentDialog";
import { useStudents } from "@/hooks/useStudents";

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
  const [search, setSearch] = useState("");
  const [filterSection, setFilterSection] = useState<"" | "A" | "B" | "C">("");
  const [filterYear, setFilterYear] = useState<number | "">("");
  const [filterStatus, setFilterStatus] = useState<"" | "Active" | "Graduated" | "Suspended" | "Dropped">("");
  const [page, setPage] = useState(0);

  // Checked student IDs for batch actions
  const [checkedStudentIds, setCheckedStudentIds] = useState<string[]>([]);

  // Dialog states
  const [enrollTarget, setEnrollTarget] = useState<Student | null>(null);
  const [editTarget, setEditTarget] = useState<Student | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [showBatchEnroll, setShowBatchEnroll] = useState(false);
  const [batchTargetIds, setBatchTargetIds] = useState<string[]>([]);

  const limit = 10;
  const { data, isLoading, error, refetch } = useStudents({
    search,
    skip: page * limit,
    limit,
    ...(filterSection ? { section: filterSection } : {}),
    ...(filterYear !== "" ? { academic_year: filterYear } : {}),
    ...(filterStatus ? { status: filterStatus } : {}),
  });

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

  const handleDelete = async (s: Student) => {
    if (!confirm(`Delete student "${s.full_name}" (${s.student_id})?`)) return;
    try {
      await studentsApi.delete(s.student_id);
      setCheckedStudentIds((prev) => prev.filter((id) => id !== s.student_id));
      refetch();
    } catch (e: unknown) {
      alert((e as Error).message);
    }
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
          <h2 className="text-xl font-bold text-white">Student Management System</h2>
          <p className="text-sm text-slate-400 mt-0.5">{data?.total ?? 0} total registered students</p>
        </div>
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
                {["Student ID", "Name / Email", "Dept / Roll", "Year & Section", "NRC / Contact", "Status", "Face", "Actions"].map((h) => (
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
                      <td className="px-4 py-3 font-mono text-violet-400 text-xs">{s.student_id}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-200">{s.full_name}</div>
                        {s.email && <div className="text-[11px] text-slate-400">{s.email}</div>}
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        <span className="font-semibold text-slate-300">{s.dept_code}</span>
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
                      <td className="px-4 py-3 text-xs">
                        {s.nrc_number && <div className="text-slate-300 font-mono">{s.nrc_number}</div>}
                        <div className="text-slate-400">{s.phone ?? "—"}</div>
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
        <IDConfigDialog
          onClose={() => { setShowConfig(false); refetch(); }}
        />
      )}
      {showBatchEnroll && (
        <BatchEnrollmentDialog
          initialStudentIds={batchTargetIds}
          onClose={() => { setShowBatchEnroll(false); setBatchTargetIds([]); }}
          onSuccess={() => { setShowBatchEnroll(false); setBatchTargetIds([]); setCheckedStudentIds([]); refetch(); }}
        />
      )}
    </div>
  );
}
