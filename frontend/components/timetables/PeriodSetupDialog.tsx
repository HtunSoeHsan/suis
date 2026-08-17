"use client";

import { useState, useEffect } from "react";
import { timeSlotsApi } from "@/lib/api";
import type { TimeSlot } from "@/types";
import {
  X, Loader2, Clock, Plus, Trash2, Pencil, Save, Sparkles, Check, AlertCircle
} from "lucide-react";

interface Props {
  onClose: () => void;
  onUpdated?: () => void;
}

const DEFAULT_FORM = {
  period_number: 1,
  start_time: "09:00",
  end_time: "09:45",
  slot_type: "LECTURE",
};

const SLOT_TYPES = [
  { value: "LECTURE", label: "Lecture / Class" },
  { value: "LAB", label: "Laboratory" },
  { value: "LUNCH_BREAK", label: "Lunch Break" },
];

export function PeriodSetupDialog({ onClose, onUpdated }: Props) {
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...DEFAULT_FORM });

  const fetchSlots = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await timeSlotsApi.list({ limit: 100 });
      // Sort by period_number then start_time
      const sorted = res.items.sort((a, b) => a.period_number - b.period_number);
      setSlots(sorted);

      // Auto-set next period number for convenience
      if (sorted.length > 0) {
        const maxP = Math.max(...sorted.map((s) => s.period_number));
        setForm((f) => ({ ...f, period_number: maxP + 1 }));
      }
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSlots();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const payload = {
        period_number: Number(form.period_number),
        start_time: form.start_time.length === 5 ? `${form.start_time}:00` : form.start_time,
        end_time: form.end_time.length === 5 ? `${form.end_time}:00` : form.end_time,
        slot_type: form.slot_type,
      };

      if (editingId) {
        await timeSlotsApi.update(editingId, payload);
      } else {
        await timeSlotsApi.create(payload);
      }

      setForm({ ...DEFAULT_FORM, period_number: slots.length + 1 });
      setEditingId(null);
      await fetchSlots();
      if (onUpdated) onUpdated();
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (slot: TimeSlot) => {
    setEditingId(slot.slot_id);
    setForm({
      period_number: slot.period_number,
      start_time: slot.start_time.substring(0, 5),
      end_time: slot.end_time.substring(0, 5),
      slot_type: slot.slot_type,
    });
  };

  const handleDelete = async (slot_id: number) => {
    if (!confirm("Are you sure you want to delete this period time slot?")) return;
    try {
      await timeSlotsApi.delete(slot_id);
      await fetchSlots();
      if (onUpdated) onUpdated();
    } catch (e: unknown) {
      alert((e as Error).message);
    }
  };

  const handleGeneratePresets = async () => {
    if (!confirm("Generate standard university timetable periods (Period 1 to 7 + Lunch Break)?")) return;
    setSaving(true);
    setError("");
    try {
      const presets = [
        { period_number: 1, start_time: "09:00:00", end_time: "09:45:00", slot_type: "LECTURE" },
        { period_number: 2, start_time: "09:50:00", end_time: "10:35:00", slot_type: "LECTURE" },
        { period_number: 3, start_time: "10:40:00", end_time: "11:25:00", slot_type: "LECTURE" },
        { period_number: 4, start_time: "11:30:00", end_time: "12:15:00", slot_type: "LECTURE" },
        { period_number: 5, start_time: "12:15:00", end_time: "13:00:00", slot_type: "LUNCH_BREAK" },
        { period_number: 6, start_time: "13:00:00", end_time: "13:45:00", slot_type: "LECTURE" },
        { period_number: 7, start_time: "13:50:00", end_time: "14:35:00", slot_type: "LECTURE" },
        { period_number: 8, start_time: "14:40:00", end_time: "15:25:00", slot_type: "LECTURE" },
      ];

      for (const p of presets) {
        await timeSlotsApi.create(p);
      }
      await fetchSlots();
      if (onUpdated) onUpdated();
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const inputCls = "px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/50";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-600 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-900/30">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Period Setup (Timetable Time Slots)</h3>
              <p className="text-xs text-slate-400">Configure daily periods, start/end times, and lunch breaks</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-200 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Preset generator if empty */}
          {slots.length === 0 && !loading && (
            <div className="p-4 bg-amber-950/40 border border-amber-800/60 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
                <div>
                  <h4 className="text-xs font-bold text-amber-300">Quick Start: Standard Schedule Presets</h4>
                  <p className="text-[11px] text-amber-400/80">Generate Period 1 to 8 + Lunch Break with 45-min slots</p>
                </div>
              </div>
              <button
                onClick={handleGeneratePresets}
                disabled={saving}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold transition-colors shrink-0 flex items-center gap-1.5"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                Auto-Generate
              </button>
            </div>
          )}

          {/* Form: Add or Edit Period */}
          <form onSubmit={handleSave} className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-3">
            <h4 className="text-xs font-semibold text-amber-400 tracking-wider uppercase flex items-center gap-2">
              {editingId ? <Pencil className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
              {editingId ? `Edit Period #${form.period_number}` : "Add New Period / Time Slot"}
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">Period No. *</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={form.period_number}
                  onChange={(e) => setForm({ ...form, period_number: parseInt(e.target.value) || 1 })}
                  className={`${inputCls} w-full`}
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">Start Time *</label>
                <input
                  type="time"
                  value={form.start_time}
                  onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                  className={`${inputCls} w-full font-mono`}
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">End Time *</label>
                <input
                  type="time"
                  value={form.end_time}
                  onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                  className={`${inputCls} w-full font-mono`}
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">Slot Type *</label>
                <select
                  value={form.slot_type}
                  onChange={(e) => setForm({ ...form, slot_type: e.target.value })}
                  className={`${inputCls} w-full`}
                >
                  {SLOT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {error && (
              <div className="p-2.5 bg-red-950/50 border border-red-800 text-red-300 rounded-lg text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-1">
              {editingId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(null);
                    setForm({ ...DEFAULT_FORM, period_number: slots.length + 1 });
                  }}
                  className="px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 text-xs hover:bg-slate-800 transition-colors"
                >
                  Cancel Edit
                </button>
              )}
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold transition-colors disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                {editingId ? "Update Period" : "Save Period"}
              </button>
            </div>
          </form>

          {/* List of Configured Periods */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Configured Periods ({slots.length})
              </h4>
              {slots.length > 0 && (
                <button
                  onClick={handleGeneratePresets}
                  disabled={saving}
                  className="text-[11px] text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3" /> Auto-Preset Standard Periods
                </button>
              )}
            </div>

            {loading ? (
              <div className="py-12 flex justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
              </div>
            ) : slots.length === 0 ? (
              <p className="text-xs text-slate-500 py-8 text-center bg-slate-950/40 rounded-xl border border-slate-800">
                No periods configured yet. Add your first period above.
              </p>
            ) : (
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-800/80">
                {slots.map((s) => (
                  <div
                    key={s.slot_id}
                    className="flex items-center justify-between p-3 text-xs hover:bg-slate-800/40 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-lg bg-amber-950/70 border border-amber-800/60 text-amber-300 font-bold flex items-center justify-center font-mono">
                        P{s.period_number}
                      </span>
                      <div>
                        <div className="font-mono font-medium text-slate-200 flex items-center gap-2">
                          <span>{s.start_time.substring(0, 5)}</span>
                          <span className="text-slate-600">—</span>
                          <span>{s.end_time.substring(0, 5)}</span>
                        </div>
                        <span className="text-[10px] text-slate-500 capitalize">
                          {s.slot_type === "lunch" ? "🍱 Lunch Break" : s.slot_type === "lab" ? "🧪 Lab Period" : s.slot_type}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(s)}
                        className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition-colors"
                        title="Edit Period"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(s.slot_id)}
                        className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
                        title="Delete Period"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
