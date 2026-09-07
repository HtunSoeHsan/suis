"use client";

import { useState, useEffect } from "react";
import { classroomsApi } from "@/lib/api";
import type { Classroom } from "@/types";
import { X, Loader2, Save } from "lucide-react";

interface Props {
  classroom?: Classroom;
  onClose: () => void;
}

const EMPTY = {
  room_id: "",
  room_name: "",
  building: "Main Academic Building",
  capacity: "60",
  room_type: "Classroom",
};

export function ClassroomFormDialog({ classroom, onClose }: Props) {
  const [form, setForm] = useState({ ...EMPTY });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (classroom) {
      setForm({
        room_id: classroom.room_id,
        room_name: classroom.room_name,
        building: classroom.building,
        capacity: classroom.capacity.toString(),
        room_type: classroom.room_type,
      });
    }
  }, [classroom]);

  const set = (k: keyof typeof EMPTY, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (classroom) {
        await classroomsApi.update(classroom.room_id, {
          room_name: form.room_name,
          building: form.building,
          capacity: parseInt(form.capacity) || 60,
          room_type: form.room_type,
        });
      } else {
        await classroomsApi.create({
          room_id: form.room_id,
          room_name: form.room_name,
          building: form.building,
          capacity: parseInt(form.capacity) || 60,
          room_type: form.room_type,
        });
      }
      onClose();
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-theme-surface border border-theme-border-hover rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-theme-border">
          <h3 className="font-semibold text-theme-text">
            {classroom ? "Edit Classroom" : "Add New Classroom"}
          </h3>
          <button onClick={onClose} className="text-theme-muted hover:text-theme-text transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-theme-sub mb-1.5">Room ID *</label>
            <input
              value={form.room_id}
              onChange={(e) => set("room_id", e.target.value)}
              placeholder="ROOM-101"
              disabled={!!classroom}
              className="w-full px-3 py-2 bg-theme-elevated border border-theme-border-hover rounded-lg text-sm text-theme-text placeholder:text-theme-muted focus:outline-none focus:ring-2 focus:ring-rose-600/50 disabled:opacity-50 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-theme-sub mb-1.5">Room Name *</label>
            <input
              value={form.room_name}
              onChange={(e) => set("room_name", e.target.value)}
              placeholder="Lab 1 - AI Research"
              className="w-full px-3 py-2 bg-theme-elevated border border-theme-border-hover rounded-lg text-sm text-theme-text placeholder:text-theme-muted focus:outline-none focus:ring-2 focus:ring-rose-600/50"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-theme-sub mb-1.5">Building Location *</label>
            <input
              value={form.building}
              onChange={(e) => set("building", e.target.value)}
              placeholder="Main Academic Building"
              className="w-full px-3 py-2 bg-theme-elevated border border-theme-border-hover rounded-lg text-sm text-theme-text placeholder:text-theme-muted focus:outline-none focus:ring-2 focus:ring-rose-600/50"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-theme-sub mb-1.5">Capacity *</label>
              <input
                type="number"
                min="1"
                value={form.capacity}
                onChange={(e) => set("capacity", e.target.value)}
                className="w-full px-3 py-2 bg-theme-elevated border border-theme-border-hover rounded-lg text-sm text-theme-text focus:outline-none focus:ring-2 focus:ring-rose-600/50"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-theme-sub mb-1.5">Room Type *</label>
              <select
                value={form.room_type}
                onChange={(e) => set("room_type", e.target.value)}
                className="w-full px-3 py-2 bg-theme-elevated border border-theme-border-hover rounded-lg text-sm text-theme-text focus:outline-none focus:ring-2 focus:ring-rose-600/50"
              >
                <option value="Classroom">Classroom</option>
                <option value="Lecture Hall">Lecture Hall</option>
                <option value="Lab">Lab</option>
                <option value="Auditorium">Auditorium</option>
                <option value="Seminar Room">Seminar Room</option>
              </select>
            </div>
          </div>

          {error && <p className="text-sm text-red-400 bg-red-900/20 border border-red-800/50 rounded-lg px-3 py-2">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 rounded-lg border border-theme-border-hover text-theme-sub text-sm hover:bg-theme-elevated transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !form.room_id || !form.room_name}
              className="flex-1 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-sm font-medium transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {classroom ? "Save Changes" : "Create Room"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
