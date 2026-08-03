"use client";

import { useState, useEffect } from "react";
import type { Teacher, Department } from "@/types";
import { teachersApi, departmentsApi } from "@/lib/api";
import { X, Loader2, Save, ChevronDown, User, Briefcase, GraduationCap } from "lucide-react";

interface Props {
  teacher?: Teacher;
  onClose: () => void;
}

const DESIGNATIONS = [
  "Professor",
  "Associate Professor",
  "Lecturer",
  "Assistant Lecturer",
  "Tutor / Demonstrator",
];

const STATUSES = [
  "Active",
  "On Leave",
  "Retired",
  "Resigned",
];

const EMPTY = {
  teacher_id: "", full_name: "", dept_code: "",
  designation: "Lecturer", phone: "", email: "",
  nrc_number: "", gender: "Male", qualification: "",
  specialization: "", joining_date: "", status: "Active", address: "",
};

export function TeacherFormDialog({ teacher, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<"employment" | "personal">("employment");
  const [form, setForm] = useState({ ...EMPTY });
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    departmentsApi.list({ limit: 100 }).then((res) => {
      setDepartments(res.items);
      if (!teacher && res.items.length > 0) {
        setForm((f) => ({ ...f, dept_code: res.items[0].dept_code }));
      }
    }).catch(() => {});
  }, [teacher]);

  useEffect(() => {
    if (teacher) {
      setForm({
        teacher_id: teacher.teacher_id,
        full_name: teacher.full_name,
        dept_code: teacher.dept_code ?? "",
        designation: teacher.designation ?? "Lecturer",
        phone: teacher.phone ?? "",
        email: teacher.email ?? "",
        nrc_number: teacher.nrc_number ?? "",
        gender: teacher.gender ?? "Male",
        qualification: teacher.qualification ?? "",
        specialization: teacher.specialization ?? "",
        joining_date: teacher.joining_date ?? "",
        status: teacher.status ?? "Active",
        address: teacher.address ?? "",
      });
    }
  }, [teacher]);

  const set = (k: keyof typeof EMPTY, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(""); setLoading(true);
    try {
      const payload = {
        full_name: form.full_name,
        dept_code: form.dept_code,
        designation: form.designation,
        phone: form.phone || undefined,
        email: form.email || undefined,
        nrc_number: form.nrc_number || undefined,
        gender: (form.gender || undefined) as "Male" | "Female" | "Other" | undefined,
        qualification: form.qualification || undefined,
        specialization: form.specialization || undefined,
        joining_date: form.joining_date || undefined,
        status: (form.status || "Active") as any,
        address: form.address || undefined,
      };

      if (teacher) {
        await teachersApi.update(teacher.teacher_id, payload);
      } else {
        await teachersApi.create({
          ...payload,
          teacher_id: form.teacher_id || undefined,
        });
      }
      onClose();
    } catch (e: unknown) { setError((e as Error).message); }
    finally { setLoading(false); }
  };

  const inputClass = "w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-600/50 disabled:opacity-50";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 shrink-0">
          <h3 className="font-semibold text-white text-lg flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-indigo-400" />
            {teacher ? "Edit Faculty Profile" : "Add New Faculty Member"}
          </h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-200 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 px-5 bg-slate-950/40">
          {[
            { id: "employment", label: "Academic & Employment", icon: Briefcase },
            { id: "personal", label: "Personal & Contact", icon: User },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id as any)}
              className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 transition-colors ${
                activeTab === id
                  ? "border-indigo-500 text-indigo-400 bg-indigo-950/20"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* TAB 1: ACADEMIC & EMPLOYMENT */}
          {activeTab === "employment" && (
            <div className="space-y-4 animate-in fade-in">
              {/* Full Name & Teacher ID */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Full Name *</label>
                  <input type="text" value={form.full_name}
                    onChange={(e) => set("full_name", e.target.value)}
                    placeholder="Dr. Smith Johnson" required className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">
                    {teacher ? "Teacher ID" : "Teacher ID (Auto if blank)"}
                  </label>
                  <input type="text" value={form.teacher_id}
                    onChange={(e) => set("teacher_id", e.target.value)}
                    placeholder={teacher ? form.teacher_id : "Auto-generated"}
                    disabled={!!teacher} className={inputClass} />
                </div>
              </div>

              {/* Department Dropdown & Designation Dropdown */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Department *</label>
                  <div className="relative">
                    <select value={form.dept_code} onChange={(e) => set("dept_code", e.target.value)}
                      required className={`${inputClass} appearance-none pr-9`}>
                      {departments.length === 0 ? (
                        <option value="" disabled>Loading departments…</option>
                      ) : departments.map((d) => (
                        <option key={d.dept_code} value={d.dept_code}>
                          {d.dept_code} — {d.dept_name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Designation (ရာထူး) *</label>
                  <div className="relative">
                    <select value={form.designation} onChange={(e) => set("designation", e.target.value)}
                      required className={`${inputClass} appearance-none pr-9`}>
                      {DESIGNATIONS.map((des) => (
                        <option key={des} value={des}>{des}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Qualification & Specialization */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Qualification (ဘွဲ့)</label>
                  <input type="text" value={form.qualification}
                    onChange={(e) => set("qualification", e.target.value)}
                    placeholder="e.g. Ph.D (IT), M.C.Sc" className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Specialization (အထူးပြု)</label>
                  <input type="text" value={form.specialization}
                    onChange={(e) => set("specialization", e.target.value)}
                    placeholder="e.g. Artificial Intelligence" className={inputClass} />
                </div>
              </div>

              {/* Status & Joining Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Employment Status</label>
                  <select value={form.status} onChange={(e) => set("status", e.target.value)} className={inputClass}>
                    {STATUSES.map((st) => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Joining Date</label>
                  <input type="date" value={form.joining_date}
                    onChange={(e) => set("joining_date", e.target.value)}
                    className={inputClass} />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PERSONAL & CONTACT */}
          {activeTab === "personal" && (
            <div className="space-y-4 animate-in fade-in">
              {/* Email & Phone */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Email Address</label>
                  <input type="email" value={form.email}
                    onChange={(e) => set("email", e.target.value)}
                    placeholder="teacher@ucspyay.edu.mm" className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Phone Number</label>
                  <input type="text" value={form.phone}
                    onChange={(e) => set("phone", e.target.value)}
                    placeholder="+95912345678" className={inputClass} />
                </div>
              </div>

              {/* NRC & Gender */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">NRC Number (မှတ်ပုံတင်)</label>
                  <input type="text" value={form.nrc_number}
                    onChange={(e) => set("nrc_number", e.target.value)}
                    placeholder="12/PAYA(N)654321" className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Gender</label>
                  <select value={form.gender} onChange={(e) => set("gender", e.target.value)} className={inputClass}>
                    <option value="Male">Male (ကျား)</option>
                    <option value="Female">Female (မ)</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Address (နေရပ်လိပ်စာ)</label>
                <textarea rows={3} value={form.address}
                  onChange={(e) => set("address", e.target.value)}
                  placeholder="Staff Housing, Pyay University Campus..."
                  className={`${inputClass} resize-none`} />
              </div>
            </div>
          )}

          {error && <p className="text-sm text-red-400 bg-red-900/20 border border-red-800/50 rounded-lg px-3 py-2">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 rounded-lg border border-slate-700 text-slate-300 text-sm hover:bg-slate-800 transition-colors">Cancel</button>
            <button type="submit" disabled={loading || !form.full_name || !form.dept_code}
              className="flex-1 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {teacher ? "Save Changes" : "Create Teacher"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
