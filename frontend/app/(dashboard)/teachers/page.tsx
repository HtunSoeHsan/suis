"use client";

import { useState, useEffect } from "react";
import { teachersApi, departmentsApi } from "@/lib/api";
import type { Teacher, Department } from "@/types";
import {
  Plus, Search, Trash2, Pencil, Camera, CheckCircle2, Clock,
  ChevronLeft, ChevronRight, X, Loader2, Briefcase, ChevronDown, Eye
} from "lucide-react";
import { FaceEnrollDialog } from "@/components/students/FaceEnrollDialog";
import { TeacherFormDialog } from "@/components/teachers/TeacherFormDialog";
import { TeacherDetailDialog } from "@/components/teachers/TeacherDetailDialog";
import { useTeachers } from "@/hooks/useTeachers";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

import { useAuth } from "@/context/AuthContext";

const STATUS_COLORS: Record<string, string> = {
  Active: "badge-emerald border",
  "On Leave": "badge-amber border",
  Retired: "bg-theme-elevated text-theme-sub border-theme-border-hover",
  Resigned: "badge-red border",
};

export default function TeachersPage() {
  const { user } = useAuth();
  const isTeacher = user?.role === "TEACHER";

  const [search, setSearch] = useState("");
  const [filterDept, setFilterDept] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [page, setPage] = useState(0);
  const [departments, setDepartments] = useState<Department[]>([]);

  const [detailTarget, setDetailTarget] = useState<Teacher | null>(null);
  const [enrollTarget, setEnrollTarget] = useState<Teacher | null>(null);
  const [editTarget, setEditTarget] = useState<Teacher | null>(null);
  const [showCreate, setShowCreate] = useState(false);

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
  const { data, isLoading, error, refetch } = useTeachers({
    search,
    skip: page * limit,
    limit,
    ...(filterDept ? { dept_code: filterDept } : {}),
    ...(filterStatus ? { status: filterStatus } : {}),
  });

  useEffect(() => {
    departmentsApi.list({ limit: 100 }).then((res) => setDepartments(res.items)).catch(() => {});
  }, []);

  const showAlert = (message: string, title = "Notification") => {
    setModalConfig({ isOpen: true, title, message, isAlert: true, variant: "warning" });
  };

  const handleDelete = (t: Teacher) => {
    setModalConfig({
      isOpen: true,
      title: "Delete Teacher",
      message: `Are you sure you want to delete faculty member "${t.full_name}" (${t.teacher_id})? This action cannot be undone.`,
      variant: "danger",
      onConfirm: async () => {
        setModalConfig((prev) => ({ ...prev, isLoading: true }));
        try {
          await teachersApi.delete(t.teacher_id);
          refetch();
        } catch (e: unknown) {
          showAlert((e as Error).message, "Delete Failed");
        } finally {
          setModalConfig({ isOpen: false, message: "" });
        }
      },
    });
  };

  const totalPages = Math.ceil((data?.total ?? 0) / limit);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-theme-text">Faculty & Teachers</h2>
            {isTeacher && (
              <span className="px-2.5 py-0.5 rounded-full badge-amber border text-xs font-semibold">
                View Only Mode
              </span>
            )}
          </div>
          <p className="text-sm text-theme-sub mt-0.5">{data?.total ?? 0} total faculty members</p>
        </div>
        {!isTeacher && (
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-theme-text text-sm font-medium transition-colors shadow-lg shadow-indigo-900/30"
          >
            <Plus className="w-4 h-4" /> Add Teacher
          </button>
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
            placeholder="Search by name, ID, designation, email, specialization…"
            className="w-full pl-9 pr-9 py-2 bg-theme-surface border border-theme-border-hover rounded-lg text-sm text-theme-text placeholder:text-theme-muted focus:outline-none focus:ring-2 focus:ring-indigo-600/50"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-theme-muted hover:text-theme-sub">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Department Filter Dropdown */}
        <div className="relative min-w-40">
          <select
            value={filterDept}
            onChange={(e) => { setFilterDept(e.target.value); setPage(0); }}
            className="w-full pl-3 pr-8 py-2 bg-theme-surface border border-theme-border-hover rounded-lg text-xs font-semibold text-theme-text focus:outline-none focus:ring-2 focus:ring-indigo-600/50 appearance-none"
          >
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d.dept_code} value={d.dept_code}>
                {d.dept_code} — {d.dept_name}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-theme-sub pointer-events-none" />
        </div>

        {/* Status filter buttons */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-theme-muted font-medium">Status:</span>
          {(["", "Active", "On Leave", "Retired", "Resigned"] as const).map((st) => (
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
      </div>

      {/* Table */}
      <div className="bg-theme-surface border border-theme-border rounded-xl overflow-hidden shadow-xl">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
          </div>
        ) : error ? (
          <div className="text-center py-16 text-red-400 text-sm">{error}</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-theme-border bg-theme-base/50">
              <tr className="text-left text-theme-sub text-xs uppercase tracking-wider">
                {["Teacher ID", "Name / Email", "Department", "Designation / Specialization", "Contact / NRC", "Status", "Face", "Actions"].map((h) => (
                  <th key={h} className="px-4 py-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-theme-border">
              {data?.items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-theme-muted">
                    No faculty members found.{" "}
                    <button onClick={() => setShowCreate(true)} className="text-indigo-400 hover:underline">Add one?</button>
                  </td>
                </tr>
              ) : (
                data?.items.map((t) => {
                  const statusName = t.status || "Active";
                  const deptObj = departments.find((d) => d.dept_code === t.dept_code);
                  const deptName = deptObj ? deptObj.dept_name : "";
                  return (
                    <tr key={t.teacher_id} className="hover:bg-theme-elevated/30 transition-colors group">
                      <td className="px-4 py-3 font-mono text-indigo-400 text-xs">
                        <button
                          onClick={() => setDetailTarget(t)}
                          className="hover:underline text-left font-semibold text-indigo-400"
                          title="View Teacher Profile Details"
                        >
                          {t.teacher_id}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setDetailTarget(t)}
                          className="hover:text-indigo-300 text-left transition-colors"
                          title="View Teacher Profile Details"
                        >
                          <div className="font-medium text-theme-text">{t.full_name}</div>
                          {t.email && <div className="text-[11px] text-theme-sub">{t.email}</div>}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-mono text-xs font-semibold text-theme-text">{t.dept_code}</div>
                        {deptName && <div className="text-[11px] text-theme-sub font-normal">{deptName}</div>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-theme-text font-medium">{t.designation}</div>
                        {(t.qualification || t.specialization) && (
                          <div className="text-[11px] text-indigo-400">
                            {t.qualification} {t.specialization ? `(${t.specialization})` : ""}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {t.nrc_number && <div className="text-theme-sub font-mono">{t.nrc_number}</div>}
                        <div className="text-theme-sub">{t.phone ?? "—"}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border ${STATUS_COLORS[statusName] ?? "bg-theme-elevated text-theme-sub border-theme-border-hover"}`}>
                          {statusName}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {t.is_face_registered ? (
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
                            onClick={() => setDetailTarget(t)}
                            title="View Full Profile Details"
                            className="p-1.5 rounded-md hover:bg-sky-900/30 hover:text-sky-400 text-theme-muted transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {!isTeacher && (
                            <>
                              <button
                                onClick={() => setEnrollTarget(t)}
                                title="Enroll / Re-enroll face"
                                className="p-1.5 rounded-md hover:bg-emerald-900/30 hover:text-emerald-400 text-theme-muted transition-colors"
                              >
                                <Camera className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setEditTarget(t)}
                                title="Edit"
                                className="p-1.5 rounded-md hover:bg-indigo-900/30 hover:text-indigo-400 text-theme-muted transition-colors"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(t)}
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
        <TeacherDetailDialog
          teacher={detailTarget}
          onClose={() => setDetailTarget(null)}
          onEdit={() => setEditTarget(detailTarget)}
          onFaceEnroll={() => setEnrollTarget(detailTarget)}
        />
      )}
      {enrollTarget && (
        <FaceEnrollDialog
          person={enrollTarget}
          personType="teacher"
          onClose={() => { setEnrollTarget(null); refetch(); }}
        />
      )}
      {(showCreate || editTarget) && (
        <TeacherFormDialog
          teacher={editTarget ?? undefined}
          onClose={() => { setShowCreate(false); setEditTarget(null); refetch(); }}
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
