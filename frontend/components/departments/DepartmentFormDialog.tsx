"use client";

import { useState, useEffect } from "react";
import { departmentsApi, teachersApi } from "@/lib/api";
import type { Department, Teacher } from "@/types";
import { X, Loader2, Save } from "lucide-react";

interface Props {
  department?: Department;
  onClose: () => void;
}

const EMPTY = {
  dept_code: "",
  dept_name: "",
  building_location: "",
  head_teacher_id: "",
};

export function DepartmentFormDialog({ department, onClose }: Props) {
  const [form, setForm] = useState({ ...EMPTY });
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    teachersApi.list({ limit: 100 })
      .then((res) => setTeachers(res.items))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (department) {
      setForm({
        dept_code: department.dept_code,
        dept_name: department.dept_name,
        building_location: department.building_location ?? "",
        head_teacher_id: department.head_teacher_id ?? "",
      });
    }
  }, [department]);

  const set = (k: keyof typeof EMPTY, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (department) {
        await departmentsApi.update(department.dept_code, {
          dept_name: form.dept_name,
          building_location: form.building_location || undefined,
          head_teacher_id: form.head_teacher_id || undefined,
        });
      } else {
        await departmentsApi.create({
          dept_code: form.dept_code,
          dept_name: form.dept_name,
          building_location: form.building_location || undefined,
          head_teacher_id: form.head_teacher_id || undefined,
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
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <h3 className="font-semibold text-white">
            {department ? "Edit Department" : "Add New Department"}
          </h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-200 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Department Code *</label>
            <input
              value={form.dept_code}
              onChange={(e) => set("dept_code", e.target.value)}
              placeholder="e.g. 01, 02 or CS"
              disabled={!!department}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-600/50 disabled:opacity-50 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Department Name *</label>
            <input
              value={form.dept_name}
              onChange={(e) => set("dept_name", e.target.value)}
              placeholder="Computer Science & Technology"
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-600/50"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Building Location</label>
            <input
              value={form.building_location}
              onChange={(e) => set("building_location", e.target.value)}
              placeholder="Building A - Room 101"
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-600/50"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Department Head Teacher</label>
            <select
              value={form.head_teacher_id}
              onChange={(e) => set("head_teacher_id", e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-600/50"
            >
              <option value="">-- None / Unassigned --</option>
              {teachers.map((t) => (
                <option key={t.teacher_id} value={t.teacher_id}>
                  {t.full_name} ({t.teacher_id} - {t.designation})
                </option>
              ))}
            </select>
          </div>

          {error && <p className="text-sm text-red-400 bg-red-900/20 border border-red-800/50 rounded-lg px-3 py-2">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 rounded-lg border border-slate-700 text-slate-300 text-sm hover:bg-slate-800 transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !form.dept_code || !form.dept_name}
              className="flex-1 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-sm font-medium transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {department ? "Save Changes" : "Create Department"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
