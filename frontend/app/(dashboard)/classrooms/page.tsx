"use client";

import { useState, useEffect, useCallback } from "react";
import { classroomsApi } from "@/lib/api";
import type { Classroom } from "@/types";
import { ClassroomFormDialog } from "@/components/classrooms/ClassroomFormDialog";
import { Plus, Search, X, Loader2, DoorOpen, Pencil, Trash2, ChevronLeft, ChevronRight } from "lucide-react";

export default function ClassroomsPage() {
  const [data, setData] = useState<{ total: number; items: Classroom[] } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [page, setPage] = useState(0);

  const [showCreate, setShowCreate] = useState(false);
  const [editRoom, setEditRoom] = useState<Classroom | null>(null);

  const limit = 10;

  const fetchClassrooms = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await classroomsApi.list({
        search,
        skip: page * limit,
        limit,
        ...(filterType ? { room_type: filterType } : {}),
      });
      setData(res);
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [search, filterType, page]);

  useEffect(() => {
    fetchClassrooms();
  }, [fetchClassrooms]);

  const handleDelete = async (c: Classroom) => {
    if (!confirm(`Delete room "${c.room_name}" (${c.room_id})?`)) return;
    try {
      await classroomsApi.delete(c.room_id);
      fetchClassrooms();
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
            <DoorOpen className="w-6 h-6 text-rose-400" /> Classrooms & Halls
          </h2>
          <p className="text-sm text-slate-400 mt-0.5">{data?.total ?? 0} total campus learning spaces</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-sm font-medium transition-colors shadow-lg shadow-rose-900/30"
        >
          <Plus className="w-4 h-4" /> Add Room
        </button>
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search bar */}
        <div className="relative flex-1 min-w-48 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            placeholder="Search room ID, name, or building…"
            className="w-full pl-9 pr-9 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-600/50"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Room Type Filters */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-500 font-medium">Type:</span>
          {[
            { value: "", label: "All" },
            { value: "LECTURE", label: "Lecture Hall" },
            { value: "LAB", label: "Lab" },
            { value: "EXAM", label: "Exam Hall" },
            { value: "SEMINAR", label: "Seminar Room" },
          ].map(({ value, label }) => (
            <button
              key={value}
              onClick={() => { setFilterType(value); setPage(0); }}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                filterType === value
                  ? "bg-rose-600 border-rose-500 text-white"
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
            <Loader2 className="w-6 h-6 animate-spin text-rose-400" />
          </div>
        ) : error ? (
          <div className="text-center py-16 text-red-400 text-sm">{error}</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-slate-800 bg-slate-950/50">
              <tr className="text-left text-slate-500 text-xs uppercase tracking-wider">
                {["Room ID", "Room Name", "Building", "Type", "Capacity", "Actions"].map((h) => (
                  <th key={h} className="px-4 py-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {data?.items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-500">
                    No classrooms found.{" "}
                    <button onClick={() => setShowCreate(true)} className="text-rose-400 hover:underline">Add one?</button>
                  </td>
                </tr>
              ) : data?.items.map((c) => (
                <tr key={c.room_id} className="hover:bg-slate-800/30 transition-colors group">
                  <td className="px-4 py-3 font-mono font-bold text-rose-400 text-xs">{c.room_id}</td>
                  <td className="px-4 py-3 font-semibold text-slate-200">{c.room_name}</td>
                  <td className="px-4 py-3 text-slate-400">{c.building}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
                      {c.room_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-300">{c.capacity} seats</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEditRoom(c)}
                        className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-rose-400 transition-colors"
                        title="Edit Room"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(c)}
                        className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-red-400 transition-colors"
                        title="Delete Room"
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

      {(showCreate || editRoom) && (
        <ClassroomFormDialog
          classroom={editRoom ?? undefined}
          onClose={() => {
            setShowCreate(false);
            setEditRoom(null);
            fetchClassrooms();
          }}
        />
      )}
    </div>
  );
}
