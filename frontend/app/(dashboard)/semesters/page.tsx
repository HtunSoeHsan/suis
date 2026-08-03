"use client";

import { useState, useEffect, useCallback } from "react";
import { semestersApi } from "@/lib/api";
import type { Semester } from "@/types";
import { SemesterFormDialog } from "@/components/semesters/SemesterFormDialog";
import { Plus, Loader2, Calendar, CheckCircle2, Pencil, Trash2, Zap, Search, X, ChevronLeft, ChevronRight } from "lucide-react";

export default function SemestersPage() {
  const [data, setData] = useState<{ total: number; items: Semester[] } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [filterActive, setFilterActive] = useState<"" | "true" | "false">("");
  const [page, setPage] = useState(0);

  const [showCreate, setShowCreate] = useState(false);
  const [editSem, setEditSem] = useState<Semester | null>(null);

  const limit = 10;

  const fetchSemesters = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params: Record<string, string | number | boolean> = {
        skip: page * limit,
        limit,
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
  }, [search, filterActive, page]);

  useEffect(() => {
    fetchSemesters();
  }, [fetchSemesters]);

  const handleActivate = async (s: Semester) => {
    try {
      await semestersApi.activate(s.semester_id);
      fetchSemesters();
    } catch (e: unknown) {
      alert((e as Error).message);
    }
  };

  const handleDelete = async (s: Semester) => {
    if (!confirm(`Delete semester "${s.academic_year} ${s.term}"?`)) return;
    try {
      await semestersApi.delete(s.semester_id);
      fetchSemesters();
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
            <Calendar className="w-6 h-6 text-emerald-400" /> Academic Semesters
          </h2>
          <p className="text-sm text-slate-400 mt-0.5">{data?.total ?? 0} total terms configured</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors shadow-lg shadow-emerald-900/30"
        >
          <Plus className="w-4 h-4" /> Add Semester
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
            placeholder="Search year or term (e.g. 2025-2026)…"
            className="w-full pl-9 pr-9 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-600/50"
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
                  : "border-slate-700 text-slate-400 hover:border-slate-500"
              }`}
            >
              {label}
            </button>
          ))}
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
                {["Academic Year", "Term", "Start Date", "End Date", "Status", "Actions"].map((h) => (
                  <th key={h} className="px-4 py-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {data?.items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-500">
                    No semesters configured yet.{" "}
                    <button onClick={() => setShowCreate(true)} className="text-emerald-400 hover:underline">Add one?</button>
                  </td>
                </tr>
              ) : data?.items.map((s) => (
                <tr key={s.semester_id} className="hover:bg-slate-800/30 transition-colors group">
                  <td className="px-4 py-3 font-mono font-bold text-emerald-400 text-xs">{s.academic_year}</td>
                  <td className="px-4 py-3 font-semibold text-slate-200">{s.term}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{s.start_date}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{s.end_date}</td>
                  <td className="px-4 py-3">
                    {s.is_active ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-900/40 text-emerald-400 border border-emerald-700/60 text-xs font-bold uppercase tracking-wider">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Current Active
                      </span>
                    ) : (
                      <button
                        onClick={() => handleActivate(s)}
                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 text-xs transition-colors"
                      >
                        <Zap className="w-3 h-3 text-amber-400" /> Set Active
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEditSem(s)}
                        className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-emerald-400 transition-colors"
                        title="Edit Semester"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(s)}
                        className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-red-400 transition-colors"
                        title="Delete Semester"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
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
    </div>
  );
}
