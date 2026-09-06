"use client";

import { useState, useEffect, useCallback } from "react";
import { semestersApi } from "@/lib/api";
import type { Semester } from "@/types";
import { SemesterFormDialog } from "@/components/semesters/SemesterFormDialog";
import { Plus, Loader2, Calendar, CheckCircle2, Pencil, Trash2, Zap, Search, X, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, ChevronDown } from "lucide-react";

import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { useAuth } from "@/context/AuthContext";

export default function SemestersPage() {
  const { user } = useAuth();
  const isTeacher = user?.role === "TEACHER";
  const [data, setData] = useState<{ total: number; items: Semester[] } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [filterActive, setFilterActive] = useState<"" | "true" | "false">("");
  const [sortBy, setSortBy] = useState<"academic_year" | "term" | "start_date" | "is_active">("academic_year");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(0);

  const [showCreate, setShowCreate] = useState(false);
  const [editSem, setEditSem] = useState<Semester | null>(null);

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
    setModalConfig({
      isOpen: true,
      title,
      message,
      isAlert: true,
      variant: "warning",
    });
  };

  const showConfirm = (message: string, onConfirm: () => Promise<void>, title = "Confirm Delete") => {
    setModalConfig({
      isOpen: true,
      title,
      message,
      variant: "danger",
      onConfirm: async () => {
        setModalConfig((prev) => ({ ...prev, isLoading: true }));
        try {
          await onConfirm();
        } finally {
          setModalConfig({ isOpen: false, message: "" });
        }
      },
    });
  };

  const fetchSemesters = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params: Record<string, string | number | boolean> = {
        skip: page * limit,
        limit,
        sort_by: sortBy,
        order: sortOrder,
      };
      if (search) params.search = search;
      if (filterActive !== "") params.is_active = filterActive === "true";

      const res = await semestersApi.list(params);
      setData(res);
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [search, filterActive, sortBy, sortOrder, page]);

  useEffect(() => {
    fetchSemesters();
  }, [fetchSemesters]);

  const handleHeaderClick = (field: "academic_year" | "term" | "start_date" | "is_active") => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
    setPage(0);
  };

  const handleToggleActive = async (s: Semester) => {
    try {
      if (s.is_active) {
        await semestersApi.deactivate(s.semester_id);
      } else {
        await semestersApi.activate(s.semester_id);
      }
      fetchSemesters();
    } catch (e: unknown) {
      showAlert((e as Error).message, "Activation Limit Exceeded");
    }
  };

  const handleDelete = (s: Semester) => {
    showConfirm(
      `Are you sure you want to delete semester "${s.academic_year} ${s.term}"? This action cannot be undone.`,
      async () => {
        try {
          await semestersApi.delete(s.semester_id);
          fetchSemesters();
        } catch (e: unknown) {
          showAlert((e as Error).message, "Delete Failed");
        }
      }
    );
  };

  const totalPages = Math.ceil((data?.total ?? 0) / limit);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-theme-text flex items-center gap-2">
              <Calendar className="w-6 h-6 text-emerald-400" /> Academic Semesters
            </h2>
            {isTeacher && (
              <span className="px-2.5 py-0.5 rounded-full badge-amber border text-xs font-semibold">
                View Only Mode
              </span>
            )}
          </div>
          <p className="text-sm text-theme-sub mt-0.5">
            {data?.total ?? 0} total terms configured — (Supports up to 5 Multi-Active Semesters)
          </p>
        </div>
        {!isTeacher && (
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors shadow-lg shadow-emerald-900/30"
          >
            <Plus className="w-4 h-4" /> Add Semester
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
            placeholder="Search year or term (e.g. 2025-2026)…"
            className="w-full pl-9 pr-9 py-2 bg-theme-surface border border-theme-border-hover rounded-lg text-sm text-theme-text placeholder:text-theme-muted focus:outline-none focus:ring-2 focus:ring-emerald-600/50"
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
          {[
            { value: "", label: "All" },
            { value: "true", label: "Active" },
            { value: "false", label: "Inactive" },
          ].map(({ value, label }) => (
            <button
              key={value}
              onClick={() => { setFilterActive(value as any); setPage(0); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                filterActive === value
                  ? "bg-emerald-600 border-emerald-500 text-white"
                  : "border-theme-border-hover text-theme-sub hover:border-slate-500"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Sort By Dropdown */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-theme-muted font-medium">Sort By:</span>
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value as any);
                setPage(0);
              }}
              className="pl-3 pr-8 py-1.5 bg-theme-surface border border-theme-border-hover rounded-lg text-xs font-semibold text-theme-text focus:outline-none focus:ring-2 focus:ring-emerald-600/50 appearance-none"
            >
              <option value="academic_year">Academic Year</option>
              <option value="term">Term</option>
              <option value="start_date">Start Date</option>
              <option value="is_active">Status</option>
              <option value="semester_id">Semester ID</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-theme-sub pointer-events-none" />
          </div>

          <button
            onClick={() => {
              setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
              setPage(0);
            }}
            title={sortOrder === "asc" ? "Order: Ascending (Click for Descending)" : "Order: Descending (Click for Ascending)"}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-theme-border-hover bg-theme-surface hover:bg-theme-elevated text-theme-sub text-xs font-semibold transition-colors"
          >
            {sortOrder === "asc" ? (
              <><ArrowUp className="w-3.5 h-3.5 text-emerald-400" /> ASC</>
            ) : (
              <><ArrowDown className="w-3.5 h-3.5 text-emerald-400" /> DESC</>
            )}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-theme-surface border border-theme-border rounded-xl overflow-hidden shadow-xl">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
          </div>
        ) : error ? (
          <div className="text-center py-16 text-red-400 text-sm">{error}</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-theme-border bg-theme-base/50">
              <tr className="text-left text-theme-sub text-xs uppercase tracking-wider">
                {[
                  { key: "academic_year", label: "Academic Year" },
                  { key: "term", label: "Term" },
                  { key: "start_date", label: "Start Date" },
                  { key: null, label: "End Date" },
                  { key: "is_active", label: "Status" },
                  ...(isTeacher ? [] : [{ key: null, label: "Actions" }]),
                ].map(({ key, label }) => {
                  if (!key) {
                    return <th key={label} className="px-4 py-3 font-medium">{label}</th>;
                  }
                  const isSorted = sortBy === key;
                  return (
                    <th key={label} className="px-4 py-3 font-medium">
                      <button
                        onClick={() => handleHeaderClick(key as any)}
                        className="inline-flex items-center gap-1.5 hover:text-emerald-400 transition-colors group focus:outline-none"
                      >
                        <span className={isSorted ? "text-emerald-400 font-bold" : ""}>{label}</span>
                        {isSorted ? (
                          sortOrder === "asc" ? (
                            <ArrowUp className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <ArrowDown className="w-3.5 h-3.5 text-emerald-400" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3.5 h-3.5 text-slate-600 group-hover:text-theme-sub" />
                        )}
                      </button>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-theme-border">
              {data?.items.length === 0 ? (
                <tr>
                  <td colSpan={isTeacher ? 5 : 6} className="text-center py-12 text-theme-muted">
                    No semesters configured yet.{" "}
                    {!isTeacher && <button onClick={() => setShowCreate(true)} className="text-emerald-400 hover:underline">Add one?</button>}
                  </td>
                </tr>
              ) : data?.items.map((s) => (
                <tr key={s.semester_id} className="hover:bg-theme-elevated/30 transition-colors group">
                  <td className="px-4 py-3 font-mono font-bold text-emerald-400 text-xs">{s.academic_year}</td>
                  <td className="px-4 py-3 font-semibold text-theme-text">{s.term}</td>
                  <td className="px-4 py-3 text-theme-sub text-xs">{s.start_date}</td>
                  <td className="px-4 py-3 text-theme-sub text-xs">{s.end_date}</td>
                  <td className="px-4 py-3">
                    {isTeacher ? (
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                        s.is_active
                          ? "badge-emerald"
                          : "bg-theme-elevated text-theme-sub border-theme-border-hover"
                      }`}>
                        {s.is_active ? (
                          <><CheckCircle2 className="w-3.5 h-3.5" /> Active</>
                        ) : (
                          <><Zap className="w-3.5 h-3.5" /> Inactive</>
                        )}
                      </span>
                    ) : (
                      <button
                        onClick={() => handleToggleActive(s)}
                        title={s.is_active ? "Click to deactivate semester" : "Click to activate semester (max 5 active)"}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all border ${
                          s.is_active
                            ? "btn-set-active-on"
                            : "btn-set-active"
                        }`}
                      >
                        {s.is_active ? (
                          <><CheckCircle2 className="w-3.5 h-3.5" /> Active</>
                        ) : (
                          <><Zap className="w-3.5 h-3.5" /> Set Active</>
                        )}
                      </button>
                    )}
                  </td>
                  {!isTeacher && (
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setEditSem(s)}
                          className="p-1.5 rounded-md hover:bg-theme-elevated text-theme-sub hover:text-emerald-400 transition-colors"
                          title="Edit Semester"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(s)}
                          className="p-1.5 rounded-md hover:bg-theme-elevated text-theme-sub hover:text-red-400 transition-colors"
                          title="Delete Semester"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
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

      {(showCreate || editSem) && (
        <SemesterFormDialog
          semester={editSem ?? undefined}
          onClose={() => {
            setShowCreate(false);
            setEditSem(null);
            fetchSemesters();
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
