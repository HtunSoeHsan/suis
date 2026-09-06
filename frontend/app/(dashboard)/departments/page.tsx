"use client";

import { useState, useEffect, useCallback } from "react";
import { departmentsApi, teachersApi } from "@/lib/api";
import type { Department, Teacher } from "@/types";
import { DepartmentFormDialog } from "@/components/departments/DepartmentFormDialog";
import { Plus, Search, X, Loader2, Building2, Pencil, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

export default function DepartmentsPage() {
  const { user } = useAuth();
  const isTeacher = user?.role === "TEACHER";

  const [data, setData] = useState<{ total: number; items: Department[] } | null>(null);
  const [teachersMap, setTeachersMap] = useState<Record<string, Teacher>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [showCreate, setShowCreate] = useState(false);
  const [editDept, setEditDept] = useState<Department | null>(null);
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

  const fetchDepartments = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [deptRes, teachRes] = await Promise.all([
        departmentsApi.list({ search, skip: page * limit, limit }),
        teachersApi.list({ limit: 100 }),
      ]);
      setData(deptRes);
      const map: Record<string, Teacher> = {};
      teachRes.items.forEach((t) => { map[t.teacher_id] = t; });
      setTeachersMap(map);
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [search, page]);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  const handleDelete = (d: Department) => {
    setModalConfig({
      isOpen: true,
      title: "Delete Department",
      message: `Are you sure you want to delete department "${d.dept_name}" (${d.dept_code})? This action cannot be undone.`,
      variant: "danger",
      onConfirm: async () => {
        setModalConfig((prev) => ({ ...prev, isLoading: true }));
        try {
          await departmentsApi.delete(d.dept_code);
          fetchDepartments();
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
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-theme-text flex items-center gap-2">
              <Building2 className="w-6 h-6 text-sky-400" /> Departments
            </h2>
            {isTeacher && (
              <span className="px-2.5 py-0.5 rounded-full badge-amber border text-xs font-semibold">
                View Only Mode
              </span>
            )}
          </div>
          <p className="text-sm text-theme-sub mt-0.5">{data?.total ?? 0} total academic departments</p>
        </div>
        {!isTeacher && (
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-sm font-medium transition-colors shadow-lg shadow-sky-900/30"
          >
            <Plus className="w-4 h-4" /> Add Department
          </button>
        )}
      </div>

      {/* Search bar */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-muted" />
        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          placeholder="Search code or department name…"
          className="w-full pl-9 pr-9 py-2 bg-theme-surface border border-theme-border-hover rounded-lg text-sm text-theme-text placeholder:text-theme-muted focus:outline-none focus:ring-2 focus:ring-sky-600/50"
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-theme-muted hover:text-theme-sub">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-theme-surface border border-theme-border rounded-xl overflow-hidden shadow-xl">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-sky-400" />
          </div>
        ) : error ? (
          <div className="text-center py-16 text-red-400 text-sm">{error}</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-theme-border bg-theme-base/50">
              <tr className="text-left text-theme-sub text-xs uppercase tracking-wider">
                {(isTeacher
                  ? ["Dept Code", "Department Name", "Location", "Head of Department"]
                  : ["Dept Code", "Department Name", "Location", "Head of Department", "Actions"]
                ).map((h) => (
                  <th key={h} className="px-4 py-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-theme-border">
              {data?.items.length === 0 ? (
                <tr>
                  <td colSpan={isTeacher ? 4 : 5} className="text-center py-12 text-theme-muted">
                    No departments found.{" "}
                    {!isTeacher && <button onClick={() => setShowCreate(true)} className="text-sky-400 hover:underline">Add one?</button>}
                  </td>
                </tr>
              ) : data?.items.map((d) => {
                const headTeacher = d.head_teacher_id ? teachersMap[d.head_teacher_id] : null;
                return (
                  <tr key={d.dept_code} className="hover:bg-theme-elevated/30 transition-colors group">
                    <td className="px-4 py-3 font-mono font-bold text-sky-400 text-xs">{d.dept_code}</td>
                    <td className="px-4 py-3 font-semibold text-theme-text">{d.dept_name}</td>
                    <td className="px-4 py-3 text-theme-sub">{d.building_location ?? "—"}</td>
                    <td className="px-4 py-3">
                      {headTeacher ? (
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-sky-900/50 border border-sky-700/60 flex items-center justify-center text-sky-300 font-bold text-xs">
                            {headTeacher.full_name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-semibold text-theme-text text-xs">{headTeacher.full_name}</p>
                            <p className="text-[11px] text-theme-sub">{headTeacher.designation} · <span className="font-mono text-sky-400">{headTeacher.teacher_id}</span></p>
                          </div>
                        </div>
                      ) : d.head_teacher_id ? (
                        <span className="font-mono text-theme-sub text-xs">{d.head_teacher_id}</span>
                      ) : (
                        <span className="text-theme-muted text-xs italic">Unassigned</span>
                      )}
                    </td>
                    {!isTeacher && (
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setEditDept(d)}
                            className="p-1.5 rounded-md hover:bg-theme-elevated text-theme-sub hover:text-sky-400 transition-colors"
                            title="Edit Department"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(d)}
                            className="p-1.5 rounded-md hover:bg-theme-elevated text-theme-sub hover:text-red-400 transition-colors"
                            title="Delete Department"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
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

      {(showCreate || editDept) && (
        <DepartmentFormDialog
          department={editDept ?? undefined}
          onClose={() => {
            setShowCreate(false);
            setEditDept(null);
            fetchDepartments();
          }}
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
