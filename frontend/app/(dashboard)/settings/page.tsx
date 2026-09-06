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
  const [prefix, setPrefix] = useState("STU-2026");
  const [seqPadding, setSeqPadding] = useState(4);
  const [template, setTemplate] = useState("{PREFIX}-{SEQ:04d}");

  const [rollPrefix, setRollPrefix] = useState("MUB-");
  const [rollPadding, setRollPadding] = useState(4);

  const [teacherPrefix, setTeacherPrefix] = useState("TCH-2026");
  const [teacherPadding, setTeacherPadding] = useState(3);
  const [teacherIncludeDept, setTeacherIncludeDept] = useState(false);

  const fetchSettings = () => {
    setLoading(true);
    settingsApi.getIDFormat()
      .then((idRes) => {
        setConfig(idRes);
        setPrefix(idRes.prefix ?? "STU-2026");
        setSeqPadding(idRes.seq_padding ?? 4);
        setTemplate(idRes.student_id_template ?? "{PREFIX}-{SEQ:04d}");

        setRollPrefix(idRes.roll_prefix ?? "MUB-");
        setRollPadding(idRes.roll_padding ?? 4);

        setTeacherPrefix(idRes.teacher_prefix ?? "TCH-2026");
        setTeacherPadding(idRes.teacher_padding ?? 3);
        setTeacherIncludeDept(idRes.teacher_include_dept ?? false);
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
      const generatedTemplate = `{PREFIX}-{SEQ:0${seqPadding}d}`;
      const updated = await settingsApi.updateIDFormat({
        student_id_template: generatedTemplate,
        prefix,
        seq_padding: seqPadding,
        roll_prefix: rollPrefix,
        roll_padding: rollPadding,
        teacher_prefix: teacherPrefix,
        teacher_padding: teacherPadding,
        teacher_include_dept: teacherIncludeDept,
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
  const renderStudentPreview = () => {
    const cleanPrefix = prefix.endsWith("-") ? prefix.slice(0, -1) : prefix;
    return `${cleanPrefix}-${strPad(1, seqPadding)}`;
  };

  const renderRollPreview = () => `${rollPrefix}${strPad(1, rollPadding)}`;
  const renderTeacherPreview = () => {
    const cleanPrefix = teacherPrefix.endsWith("-") ? teacherPrefix.slice(0, -1) : teacherPrefix;
    return `${cleanPrefix}-${strPad(1, teacherPadding)}`;
  };

  const strPad = (n: number, p: number) => n.toString().padStart(p, "0");

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-theme-text flex items-center gap-2">
            <Settings2 className="w-6 h-6 text-violet-400" />
            System Settings & Format Rules
          </h2>
          <p className="text-sm text-theme-sub mt-1">
            Centralized management for ID auto-generation rules, roll numbers, and system configurations.
          </p>
        </div>
        <button
          onClick={fetchSettings}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-theme-border-hover bg-theme-surface hover:bg-theme-elevated text-theme-sub text-sm font-medium transition-colors"
        >
          <RefreshCw className="w-4 h-4 text-theme-sub" /> Refresh
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
          <button onClick={() => setMsg(null)} className="text-theme-sub hover:text-theme-text">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20 bg-theme-surface border border-theme-border rounded-2xl">
          <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
          {/* SECTION 1: STUDENT ID RULES */}
          <div className="bg-theme-surface border border-theme-border rounded-2xl p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between border-b border-theme-border pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-violet-950/60 border border-violet-800/50 text-violet-400">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-theme-text text-base">Student ID Generation Rules</h3>
                  <p className="text-xs text-theme-sub">Format structure used when auto-assigning Student IDs</p>
                </div>
              </div>
              <span className="text-xs font-mono px-3 py-1 rounded-full bg-violet-950 text-violet-300 border border-violet-800/60">
                Preview: {renderStudentPreview()}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-theme-sub mb-1.5">ID Prefix</label>
                <input
                  type="text"
                  value={prefix}
                  onChange={(e) => setPrefix(e.target.value)}
                  placeholder="STU-2026"
                  className="w-full px-3.5 py-2 bg-theme-elevated border border-theme-border-hover rounded-xl text-sm font-mono text-theme-text focus:outline-none focus:ring-2 focus:ring-violet-600/50"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-theme-sub mb-1.5">Sequence Digits Padding</label>
                <select
                  value={seqPadding}
                  onChange={(e) => setSeqPadding(parseInt(e.target.value))}
                  className="w-full px-3.5 py-2 bg-theme-elevated border border-theme-border-hover rounded-xl text-sm text-theme-text focus:outline-none focus:ring-2 focus:ring-violet-600/50"
                >
                  {[3, 4, 5, 6].map((p) => (
                    <option key={p} value={p}>
                      {p} Digits (e.g. {strPad(1, p)})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* SECTION 2: ROLL NUMBER RULES */}
          <div className="bg-theme-surface border border-theme-border rounded-2xl p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between border-b border-theme-border pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-teal-950/60 border border-teal-800/50 text-teal-400">
                  <Hash className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-theme-text text-base">Roll Number Generation Rules</h3>
                  <p className="text-xs text-theme-sub">Prefix and digit padding for student roll numbers</p>
                </div>
              </div>
              <span className="text-xs font-mono px-3 py-1 rounded-full bg-teal-950 text-teal-300 border border-teal-800/60">
                Preview: {renderRollPreview()}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-theme-sub mb-1.5">Roll Prefix</label>
                <input
                  type="text"
                  value={rollPrefix}
                  onChange={(e) => setRollPrefix(e.target.value)}
                  placeholder="R"
                  className="w-full px-3.5 py-2 bg-theme-elevated border border-theme-border-hover rounded-xl text-sm font-mono text-theme-text focus:outline-none focus:ring-2 focus:ring-teal-600/50"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-theme-sub mb-1.5">Sequence Padding</label>
                <select
                  value={rollPadding}
                  onChange={(e) => setRollPadding(parseInt(e.target.value))}
                  className="w-full px-3.5 py-2 bg-theme-elevated border border-theme-border-hover rounded-xl text-sm text-theme-text focus:outline-none focus:ring-2 focus:ring-teal-600/50"
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
          <div className="bg-theme-surface border border-theme-border rounded-2xl p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between border-b border-theme-border pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-950/60 border border-indigo-800/50 text-indigo-400">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-theme-text text-base">Teacher ID Rules</h3>
                  <p className="text-xs text-theme-sub">Prefix and sequence padding for Teacher IDs</p>
                </div>
              </div>
              <span className="text-xs font-mono px-3 py-1 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800/60">
                Preview: {renderTeacherPreview()}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-theme-sub mb-1.5">Teacher Prefix</label>
                <input
                  type="text"
                  value={teacherPrefix}
                  onChange={(e) => setTeacherPrefix(e.target.value)}
                  placeholder="TCH-2026"
                  className="w-full px-3.5 py-2 bg-theme-elevated border border-theme-border-hover rounded-xl text-sm font-mono text-theme-text focus:outline-none focus:ring-2 focus:ring-indigo-600/50"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-theme-sub mb-1.5">Sequence Padding</label>
                <select
                  value={teacherPadding}
                  onChange={(e) => setTeacherPadding(parseInt(e.target.value))}
                  className="w-full px-3.5 py-2 bg-theme-elevated border border-theme-border-hover rounded-xl text-sm text-theme-text focus:outline-none focus:ring-2 focus:ring-indigo-600/50"
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
