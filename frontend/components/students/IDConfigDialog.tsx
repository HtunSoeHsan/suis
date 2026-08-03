"use client";

import { useState, useEffect } from "react";
import { settingsApi } from "@/lib/api";
import { X, Loader2, Save, Sparkles, Settings2, Hash, User } from "lucide-react";

interface Props {
  onClose: () => void;
}

export function IDConfigDialog({ onClose }: Props) {
  const [activeTab, setActiveTab] = useState<"student_id" | "roll_number">("student_id");

  // Student ID state
  const [template, setTemplate] = useState("STU-{YEAR}-{DEPT}-{SEQ:04d}");
  const [prefix, setPrefix] = useState("STU");
  const [padding, setPadding] = useState(4);
  const [preview, setPreview] = useState("");

  // Roll Number state — simple: prefix + sequence only
  const [rollPrefix, setRollPrefix] = useState("R");
  const [rollPadding, setRollPadding] = useState(3);
  const [rollPreview, setRollPreview] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    settingsApi.getIDFormat()
      .then((cfg) => {
        setTemplate(cfg.student_id_template);
        setPrefix(cfg.prefix);
        setPadding(cfg.seq_padding);
        setPreview(cfg.preview_example);

        setRollPrefix(cfg.roll_prefix || "R");
        setRollPadding(cfg.roll_padding || 3);
        setRollPreview(cfg.preview_roll_example || "R001");
      })
      .catch((e: unknown) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, []);

  // Student ID live preview
  const computeIDPreview = (tmpl: string, pfx: string, pad: number) => {
    const yr = new Date().getFullYear().toString();
    const dept = "CST";
    let res = tmpl.replace("{PREFIX}", pfx).replace("{YEAR}", yr).replace("{DEPT}", dept);
    const seqStr = "1".padStart(pad, "0");
    res = res.replace(/\{SEQ:?[^}]*\}/, seqStr);
    return res;
  };

  // Roll Number live preview: just prefix + padded seq
  const computeRollPreview = (pfx: string, pad: number) => `${pfx}${"1".padStart(pad, "0")}`;

  const handleTemplateChange = (val: string) => {
    setTemplate(val);
    setPreview(computeIDPreview(val, prefix, padding));
  };

  const handlePrefixChange = (val: string) => {
    setPrefix(val);
    setPreview(computeIDPreview(template, val, padding));
  };

  const handlePaddingChange = (val: number) => {
    setPadding(val);
    setPreview(computeIDPreview(template, prefix, val));
  };

  const handleRollPrefixChange = (val: string) => {
    setRollPrefix(val);
    setRollPreview(computeRollPreview(val, rollPadding));
  };

  const handleRollPaddingChange = (val: number) => {
    setRollPadding(val);
    setRollPreview(computeRollPreview(rollPrefix, val));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    setSuccess(false);
    try {
      const updated = await settingsApi.updateIDFormat({
        student_id_template: template,
        prefix,
        seq_padding: padding,
        roll_prefix: rollPrefix,
        roll_padding: rollPadding,
      });
      setPreview(updated.preview_example);
      setRollPreview(updated.preview_roll_example);
      setSuccess(true);
      setTimeout(() => onClose(), 800);
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-violet-400" /> ID &amp; Roll Number Format Rules
          </h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-200 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-5 pt-4">
          <div className="grid grid-cols-2 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab("student_id")}
              className={`py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
                activeTab === "student_id"
                  ? "bg-violet-600 text-white shadow-md"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <User className="w-3.5 h-3.5" /> Student ID Rules
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("roll_number")}
              className={`py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
                activeTab === "roll_number"
                  ? "bg-violet-600 text-white shadow-md"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Hash className="w-3.5 h-3.5" /> Roll Number Rules
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-violet-400" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {activeTab === "student_id" ? (
              /* ── Student ID Tab ── */
              <div className="space-y-4">
                <div className="p-3.5 bg-violet-950/40 border border-violet-800/60 rounded-xl">
                  <div className="flex items-center gap-1.5 text-xs text-violet-300 font-medium mb-1">
                    <Sparkles className="w-3.5 h-3.5" /> Live Student ID Preview
                  </div>
                  <p className="font-mono text-base font-bold text-violet-200 tracking-wider">
                    {preview || "STU-2026-CST-0001"}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Student ID Template *</label>
                  <input
                    value={template}
                    onChange={(e) => handleTemplateChange(e.target.value)}
                    placeholder="STU-{YEAR}-{DEPT}-{SEQ:04d}"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 font-mono focus:outline-none focus:ring-2 focus:ring-violet-600/50"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Tokens: <code className="text-violet-400">{`{PREFIX}`}</code>, <code className="text-violet-400">{`{YEAR}`}</code>, <code className="text-violet-400">{`{DEPT}`}</code>, <code className="text-violet-400">{`{SEQ:04d}`}</code>
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">ID Prefix *</label>
                    <input
                      value={prefix}
                      onChange={(e) => handlePrefixChange(e.target.value)}
                      placeholder="STU"
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 font-mono focus:outline-none focus:ring-2 focus:ring-violet-600/50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">Sequence Padding *</label>
                    <select
                      value={padding}
                      onChange={(e) => handlePaddingChange(parseInt(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-600/50"
                    >
                      <option value={3}>3 digits (001)</option>
                      <option value={4}>4 digits (0001)</option>
                      <option value={5}>5 digits (00001)</option>
                    </select>
                  </div>
                </div>
              </div>
            ) : (
              /* ── Roll Number Tab ── */
              <div className="space-y-4">
                {/* Live Preview */}
                <div className="p-3.5 bg-violet-950/40 border border-violet-800/60 rounded-xl">
                  <div className="flex items-center gap-1.5 text-xs text-violet-300 font-medium mb-1">
                    <Sparkles className="w-3.5 h-3.5" /> Live Roll Number Preview
                  </div>
                  <p className="font-mono text-xl font-bold text-violet-200 tracking-widest">
                    {rollPreview || `${rollPrefix}${"1".padStart(rollPadding, "0")}`}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">Format: <code className="text-violet-400">{rollPrefix}</code> + zero-padded sequence</p>
                </div>

                {/* Roll Prefix */}
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Roll Number Prefix *</label>
                  <input
                    value={rollPrefix}
                    onChange={(e) => handleRollPrefixChange(e.target.value)}
                    placeholder="R"
                    maxLength={20}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 font-mono focus:outline-none focus:ring-2 focus:ring-violet-600/50"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    ဥပမာ: <code className="text-violet-300">R</code> → R001 &nbsp;|&nbsp;
                    <code className="text-violet-300">CS-</code> → CS-001 &nbsp;|&nbsp;
                    <code className="text-violet-300">Roll-</code> → Roll-001
                  </p>
                </div>

                {/* Sequence Padding */}
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Sequence Digits *</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { val: 2, label: "2 digits", eg: "01" },
                      { val: 3, label: "3 digits", eg: "001" },
                      { val: 4, label: "4 digits", eg: "0001" },
                    ].map(({ val, label, eg }) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => handleRollPaddingChange(val)}
                        className={`py-2.5 rounded-lg border text-xs font-medium transition-colors flex flex-col items-center gap-0.5 ${
                          rollPadding === val
                            ? "bg-violet-600/20 border-violet-500 text-violet-200"
                            : "border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200"
                        }`}
                      >
                        <span>{label}</span>
                        <code className="text-[10px] opacity-75">({eg})</code>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Examples */}
                <div className="p-3 bg-slate-950/50 border border-slate-800 rounded-xl">
                  <p className="text-[11px] text-slate-500 font-medium mb-1.5">Generated examples:</p>
                  <div className="flex gap-3 font-mono text-xs">
                    {[1, 2, 3].map((n) => (
                      <span key={n} className="text-teal-300">
                        {rollPrefix}{String(n).padStart(rollPadding, "0")}
                      </span>
                    ))}
                    <span className="text-slate-600">…</span>
                  </div>
                </div>
              </div>
            )}

            {error && <p className="text-sm text-red-400 bg-red-900/20 border border-red-800/50 rounded-lg px-3 py-2">{error}</p>}
            {success && <p className="text-sm text-emerald-400 bg-emerald-900/20 border border-emerald-800/50 rounded-lg px-3 py-2">Rules saved successfully!</p>}

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose} className="flex-1 py-2 rounded-lg border border-slate-700 text-slate-300 text-sm hover:bg-slate-800 transition-colors">
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || !template || !rollPrefix}
                className="flex-1 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Format Rules
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
