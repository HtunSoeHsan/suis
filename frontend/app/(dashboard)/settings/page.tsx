"use client";

import { useState, useEffect } from "react";
import { settingsApi } from "@/lib/api";
import type { IDConfig } from "@/types";
import {
  Settings2, Save, Loader2, RefreshCw, CheckCircle2,
  GraduationCap, Hash, Users, X
} from "lucide-react";

export default function SettingsPage() {
  const [config, setConfig] = useState<IDConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Form states
  const [prefix, setPrefix] = useState("STU");
  const [seqPadding, setSeqPadding] = useState(4);
  const [template, setTemplate] = useState("STU-{YEAR}-{DEPT}-{SEQ:04d}");

  const [rollPrefix, setRollPrefix] = useState("R");
  const [rollPadding, setRollPadding] = useState(3);

  const [teacherPrefix, setTeacherPrefix] = useState("TCH");
  const [teacherPadding, setTeacherPadding] = useState(3);

  const fetchSettings = () => {
    setLoading(true);
    settingsApi.getIDFormat()
      .then((idRes) => {
        setConfig(idRes);
        setPrefix(idRes.prefix ?? "STU");
        setSeqPadding(idRes.seq_padding ?? 4);
        setTemplate(idRes.student_id_template ?? "STU-{YEAR}-{DEPT}-{SEQ:04d}");

        setRollPrefix(idRes.roll_prefix ?? "R");
        setRollPadding(idRes.roll_padding ?? 3);

        setTeacherPrefix(idRes.teacher_prefix ?? "TCH");
        setTeacherPadding(idRes.teacher_padding ?? 3);
      })
      .catch((e: unknown) => {
        setMsg({ type: "error", text: (e as Error).message });
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      const updated = await settingsApi.updateIDFormat({
        student_id_template: template,
        prefix,
        seq_padding: seqPadding,
        roll_prefix: rollPrefix,
        roll_padding: rollPadding,
        teacher_prefix: teacherPrefix,
        teacher_padding: teacherPadding,
      });
      setConfig(updated);
      setMsg({ type: "success", text: "Central System ID & Code format rules updated successfully!" });
    } catch (err: unknown) {
      setMsg({ type: "error", text: (err as Error).message });
    } finally {
      setSaving(false);
    }
  };

  // Preview computations
  const currentYear = new Date().getFullYear().toString();
  const renderStudentPreview = () => {
    const pad = "1".padStart(seqPadding, "0");
    return template
      .replace("{PREFIX}", prefix)
      .replace("{YEAR}", currentYear)
      .replace("{DEPT}", "CST")
      .replace(/\{SEQ:?[^}]*\}/, pad);
  };

  const renderRollPreview = () => `${rollPrefix}${strPad(1, rollPadding)}`;
  const renderTeacherPreview = () => `${teacherPrefix}-${currentYear}-CST-${strPad(1, teacherPadding)}`;

  const strPad = (n: number, p: number) => n.toString().padStart(p, "0");

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Settings2 className="w-6 h-6 text-violet-400" />
            System Settings & Format Rules
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Centralized management for ID auto-generation rules, roll numbers, and system configurations.
          </p>
        </div>
        <button
          onClick={fetchSettings}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-300 text-sm font-medium transition-colors"
        >
          <RefreshCw className="w-4 h-4 text-slate-400" /> Refresh
        </button>
      </div>

      {msg && (
        <div
          className={`p-4 rounded-xl border text-sm flex items-center justify-between ${
            msg.type === "success"
              ? "bg-emerald-950/40 border-emerald-800/60 text-emerald-300"
              : "bg-red-950/40 border-red-800/60 text-red-300"
          }`}
        >
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> {msg.text}
          </span>
          <button onClick={() => setMsg(null)} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20 bg-slate-900 border border-slate-800 rounded-2xl">
          <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
          {/* SECTION 1: STUDENT ID RULES */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-violet-950/60 border border-violet-800/50 text-violet-400">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-white text-base">Student ID Generation Rules</h3>
                  <p className="text-xs text-slate-400">Format structure used when auto-assigning Student IDs</p>
                </div>
              </div>
              <span className="text-xs font-mono px-3 py-1 rounded-full bg-violet-950 text-violet-300 border border-violet-800/60">
                Preview: {renderStudentPreview()}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">ID Prefix</label>
                <input
                  type="text"
                  value={prefix}
                  onChange={(e) => setPrefix(e.target.value)}
                  placeholder="STU"
                  className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm font-mono text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-600/50"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Sequence Digits Padding</label>
                <select
                  value={seqPadding}
                  onChange={(e) => setSeqPadding(parseInt(e.target.value))}
                  className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-600/50"
                >
                  {[3, 4, 5, 6].map((p) => (
                    <option key={p} value={p}>
                      {p} Digits (e.g. {strPad(1, p)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Format Template</label>
                <input
                  type="text"
                  value={template}
                  onChange={(e) => setTemplate(e.target.value)}
                  placeholder="STU-{YEAR}-{DEPT}-{SEQ:04d}"
                  className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm font-mono text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-600/50"
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: ROLL NUMBER RULES */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-teal-950/60 border border-teal-800/50 text-teal-400">
                  <Hash className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-white text-base">Roll Number Generation Rules</h3>
                  <p className="text-xs text-slate-400">Prefix and digit padding for student roll numbers</p>
                </div>
              </div>
              <span className="text-xs font-mono px-3 py-1 rounded-full bg-teal-950 text-teal-300 border border-teal-800/60">
                Preview: {renderRollPreview()}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Roll Prefix</label>
                <input
                  type="text"
                  value={rollPrefix}
                  onChange={(e) => setRollPrefix(e.target.value)}
                  placeholder="R"
                  className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm font-mono text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-600/50"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Sequence Padding</label>
                <select
                  value={rollPadding}
                  onChange={(e) => setRollPadding(parseInt(e.target.value))}
                  className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-600/50"
                >
                  {[2, 3, 4].map((p) => (
                    <option key={p} value={p}>
                      {p} Digits (e.g. {strPad(1, p)})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* SECTION 3: TEACHER ID RULES */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-950/60 border border-indigo-800/50 text-indigo-400">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-white text-base">Teacher ID Rules</h3>
                  <p className="text-xs text-slate-400">Prefix and sequence padding for Teacher IDs</p>
                </div>
              </div>
              <span className="text-xs font-mono px-3 py-1 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800/60">
                Preview: {renderTeacherPreview()}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Teacher Prefix</label>
                <input
                  type="text"
                  value={teacherPrefix}
                  onChange={(e) => setTeacherPrefix(e.target.value)}
                  placeholder="TCH"
                  className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm font-mono text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600/50"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Sequence Padding</label>
                <select
                  value={teacherPadding}
                  onChange={(e) => setTeacherPadding(parseInt(e.target.value))}
                  className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600/50"
                >
                  {[2, 3, 4].map((p) => (
                    <option key={p} value={p}>
                      {p} Digits (e.g. {strPad(1, p)})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-all shadow-lg shadow-violet-900/30 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save All Settings
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
