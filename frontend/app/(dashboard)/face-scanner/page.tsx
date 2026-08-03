"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useCamera } from "@/hooks/useCamera";
import { visionApi } from "@/lib/api";
import type { FaceRetrieveInfoResponse } from "@/types";
import {
  ScanFace, Loader2, CheckCircle2, XCircle, AlertTriangle, Play, Square,
  User, GraduationCap, Users, BookOpen, Clock, Brain,
  Phone, Hash, Activity, ChevronDown, ChevronUp,
} from "lucide-react";

type ScanStatus = "idle" | "scanning" | "identified" | "unknown" | "error";

// Simple inline markdown → JSX renderer (bold, italic, bullets, headers, line breaks)
function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split("\n");
  const result: React.ReactNode[] = [];

  const parseInline = (line: string, key: number): React.ReactNode => {
    const parts: React.ReactNode[] = [];
    const regex = /\*\*(.+?)\*\*|\*(.+?)\*/g;
    let last = 0;
    let match;
    let i = 0;
    while ((match = regex.exec(line)) !== null) {
      if (match.index > last) parts.push(<span key={`t-${key}-${i++}`}>{line.slice(last, match.index)}</span>);
      if (match[1]) parts.push(<strong key={`b-${key}-${i++}`} className="text-white font-bold">{match[1]}</strong>);
      else if (match[2]) parts.push(<em key={`e-${key}-${i++}`} className="text-slate-300 italic">{match[2]}</em>);
      last = match.index + match[0].length;
    }
    if (last < line.length) parts.push(<span key={`t-${key}-${i++}`}>{line.slice(last)}</span>);
    return <>{parts}</>;
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed) {
      result.push(<div key={idx} className="h-2" />);
    } else if (/^#{1,3}\s/.test(trimmed)) {
      const text = trimmed.replace(/^#{1,3}\s/, "");
      result.push(<p key={idx} className="text-sm font-bold text-white mt-3 mb-1">{text}</p>);
    } else if (/^[-*•]\s/.test(trimmed)) {
      const text = trimmed.replace(/^[-*•]\s/, "");
      result.push(
        <div key={idx} className="flex items-start gap-2 text-sm text-slate-300 leading-relaxed">
          <span className="text-violet-400 mt-1 flex-shrink-0">•</span>
          <span>{parseInline(text, idx)}</span>
        </div>
      );
    } else {
      result.push(<p key={idx} className="text-sm text-slate-300 leading-relaxed">{parseInline(trimmed, idx)}</p>);
    }
  });

  return result;
}

function ConfidenceBar({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color = pct >= 80 ? "bg-emerald-500" : pct >= 60 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-slate-400">
        <span>Match confidence</span><span className="font-mono font-bold text-white">{pct}%</span>
      </div>
      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function SectionCard({ title, icon: Icon, children, defaultOpen = true }: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-900/40 transition-colors"
      >
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-300">
          <Icon className="w-4 h-4 text-violet-400" />
          {title}
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

function ProfileField({ label, value }: { label: string; value?: string | number | boolean | null }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="flex items-start justify-between gap-3 py-1.5 border-b border-slate-800/50 last:border-0">
      <span className="text-xs text-slate-500 flex-shrink-0">{label}</span>
      <span className="text-xs text-slate-200 font-medium text-right">
        {typeof value === "boolean" ? (value ? "✓ Yes" : "✗ No") : String(value)}
      </span>
    </div>
  );
}

export default function FaceScannerPage() {
  const { videoRef, state: camState, startCamera, stopCamera, captureFrame } = useCamera();
  const [scanStatus, setScanStatus] = useState<ScanStatus>("idle");
  const [result, setResult] = useState<FaceRetrieveInfoResponse | null>(null);
  const [error, setError] = useState("");
  const [autoMode, setAutoMode] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const scan = useCallback(async () => {
    const frame = captureFrame();
    if (!frame) return;
    setScanStatus("scanning");
    setError("");
    try {
      const res = await visionApi.retrieveInfo(frame);
      setResult(res);
      setScanStatus(res.identified ? "identified" : "unknown");
    } catch (e: unknown) {
      setError((e as Error).message);
      setScanStatus("error");
    }
  }, [captureFrame]);

  // Auto scan every 4 seconds
  useEffect(() => {
    if (autoMode && camState.isActive) {
      intervalRef.current = setInterval(scan, 4000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [autoMode, camState.isActive, scan]);

  const handleToggleCamera = () => {
    if (camState.isActive) { stopCamera(); setAutoMode(false); setScanStatus("idle"); }
    else startCamera();
  };

  const statusConfig = {
    idle:       { color: "border-slate-700",     bg: "bg-slate-800",       text: "text-slate-400"  },
    scanning:   { color: "border-violet-600/60",  bg: "bg-violet-900/20",   text: "text-violet-400" },
    identified: { color: "border-emerald-600/60", bg: "bg-emerald-900/20",  text: "text-emerald-400" },
    unknown:    { color: "border-amber-600/60",   bg: "bg-amber-900/20",    text: "text-amber-400"  },
    error:      { color: "border-red-600/60",     bg: "bg-red-900/20",      text: "text-red-400"    },
  }[scanStatus];

  const profile = result?.profile ?? {};
  const isStudent = result?.target_type === "student";

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Face Recognition Scanner</h2>
          <p className="text-sm text-slate-400 mt-0.5">Scan face to retrieve full profile, courses & attendance</p>
        </div>
        <div className="flex gap-2.5">
          <button
            onClick={() => setAutoMode((a) => !a)}
            disabled={!camState.isActive}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all border
              ${autoMode
                ? "bg-emerald-900/30 border-emerald-700/60 text-emerald-300 hover:bg-emerald-900/50"
                : "bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800"
              } disabled:opacity-40`}
          >
            {autoMode ? "⬤ Auto ON" : "○ Auto OFF"}
          </button>
          <button
            onClick={handleToggleCamera}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all inline-flex items-center gap-2
              ${camState.isActive
                ? "bg-red-900/30 border border-red-700/60 text-red-300 hover:bg-red-900/50"
                : "bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-900/40"}`}
          >
            {camState.isActive ? <><Square className="w-4 h-4" /> Stop</> : <><Play className="w-4 h-4" /> Start Camera</>}
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Camera Column */}
        <div className="lg:col-span-2 space-y-3">
          {/* Camera Viewport */}
          <div className={`relative rounded-2xl overflow-hidden border-2 ${statusConfig.color} transition-colors duration-500 aspect-video bg-slate-950`}>
            <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />

            {/* Face targeting overlay */}
            {camState.isActive && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                {[["top-6 left-6", "border-t-2 border-l-2"],
                  ["top-6 right-6", "border-t-2 border-r-2"],
                  ["bottom-6 left-6", "border-b-2 border-l-2"],
                  ["bottom-6 right-6", "border-b-2 border-r-2"]
                ].map(([pos, border], i) => (
                  <div key={i} className={`absolute ${pos} w-7 h-7 ${border} border-violet-400/60 rounded-sm`} />
                ))}
                {scanStatus === "scanning" && (
                  <div className="w-40 h-48 rounded-full border-2 border-dashed border-violet-400/40 animate-pulse" />
                )}
              </div>
            )}

            {/* No camera placeholder */}
            {!camState.isActive && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-slate-500">
                <ScanFace className="w-14 h-14" />
                <p className="text-sm">{camState.error ?? "Click 'Start Camera' to begin"}</p>
              </div>
            )}

            {/* Status badge */}
            {camState.isActive && (
              <div className="absolute top-3 left-3">
                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${statusConfig.bg} ${statusConfig.text} border ${statusConfig.color}`}>
                  {scanStatus === "scanning" && <Loader2 className="w-3 h-3 animate-spin" />}
                  {scanStatus === "identified" && <CheckCircle2 className="w-3 h-3" />}
                  {scanStatus === "unknown" && <AlertTriangle className="w-3 h-3" />}
                  {scanStatus === "error" && <XCircle className="w-3 h-3" />}
                  {scanStatus === "idle" ? "Ready" :
                   scanStatus === "scanning" ? "Processing…" :
                   scanStatus === "identified" ? "Identified" :
                   scanStatus === "unknown" ? "No Match" : "Error"}
                </div>
              </div>
            )}

            {/* Auto badge */}
            {autoMode && camState.isActive && (
              <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2 py-1 bg-emerald-900/60 rounded-full border border-emerald-700/50">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                <span className="text-[10px] font-bold text-emerald-300">AUTO</span>
              </div>
            )}
          </div>

          {/* Scan button */}
          {camState.isActive && !autoMode && (
            <button
              onClick={scan}
              disabled={scanStatus === "scanning"}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold transition-all disabled:opacity-50 inline-flex items-center justify-center gap-2 shadow-lg shadow-violet-900/30"
            >
              {scanStatus === "scanning"
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Identifying…</>
                : <><ScanFace className="w-5 h-5" /> Scan & Retrieve Info</>
              }
            </button>
          )}

          {/* Error */}
          {scanStatus === "error" && error && (
            <div className="p-3 bg-red-950/50 border border-red-800/50 rounded-xl text-xs text-red-300 flex items-start gap-2">
              <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              {error}
            </div>
          )}
        </div>

        {/* Result Column */}
        <div className="lg:col-span-3">
          {!result ? (
            <div className="h-full min-h-[320px] bg-slate-900/60 border border-slate-800 rounded-2xl flex flex-col items-center justify-center gap-4 text-slate-600">
              <ScanFace className="w-16 h-16" />
              <div className="text-center">
                <p className="text-sm font-medium text-slate-500">No scan result yet</p>
                <p className="text-xs text-slate-600 mt-1">Start camera and scan a face to retrieve full profile</p>
              </div>
            </div>
          ) : !result.identified ? (
            <div className="h-full min-h-[320px] bg-slate-900/60 border border-amber-900/30 rounded-2xl flex flex-col items-center justify-center gap-4 text-center p-8">
              <XCircle className="w-14 h-14 text-amber-500" />
              <div>
                <p className="text-base font-bold text-amber-300">No Match Found</p>
                <p className="text-sm text-slate-500 mt-1">{result.message}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Identity Header Card */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5">
                <div className="flex items-start gap-4">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-xl flex-shrink-0
                    ${isStudent
                      ? "bg-gradient-to-tr from-violet-600 to-indigo-700 shadow-violet-900/40"
                      : "bg-gradient-to-tr from-sky-600 to-blue-700 shadow-sky-900/40"}`}>
                    {isStudent
                      ? <GraduationCap className="w-8 h-8 text-white" />
                      : <Users className="w-8 h-8 text-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-xl font-black text-white">{profile.full_name as string}</h3>
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border uppercase tracking-wider
                        ${isStudent
                          ? "bg-violet-500/15 text-violet-300 border-violet-500/30"
                          : "bg-sky-500/15 text-sky-300 border-sky-500/30"}`}>
                        {result.target_type}
                      </span>
                    </div>
                    <p className="text-sm text-slate-400 mt-0.5">{profile.dept_code as string} Department</p>

                    <div className="mt-3">
                      <ConfidenceBar score={result.similarity_score ?? 0} />
                    </div>
                  </div>
                </div>

                {/* Identity verified badge */}
                <div className="mt-4">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-900/20 border border-emerald-800/40 rounded-lg text-xs text-emerald-300">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Identity verified via biometric scan
                  </div>
                </div>
              </div>

              {/* Profile Details */}
              <SectionCard title="Profile Information" icon={User}>
                <div className="mt-1 space-y-0">
                  {isStudent ? (
                    <>
                      <ProfileField label="Student ID" value={profile.student_id as string} />
                      <ProfileField label="Full Name" value={profile.full_name as string} />
                      <ProfileField label="Department" value={profile.dept_code as string} />
                      <ProfileField label="Academic Year" value={`Year ${profile.academic_year}`} />
                      <ProfileField label="Roll Number" value={profile.roll_number as string} />
                      <ProfileField label="Phone" value={profile.phone as string} />
                      <ProfileField label="Email" value={profile.email as string} />
                      <ProfileField label="NRC Number" value={profile.nrc_number as string} />
                      <ProfileField label="Gender" value={profile.gender as string} />
                      <ProfileField label="Blood Type" value={profile.blood_type as string} />
                      <ProfileField label="Status" value={profile.status as string} />
                      <ProfileField label="Attendance Rate" value={`${profile.attendance_rate}%`} />
                      <ProfileField label="Face Registered" value={profile.is_face_registered as boolean} />
                    </>
                  ) : (
                    <>
                      <ProfileField label="Teacher ID" value={profile.teacher_id as string} />
                      <ProfileField label="Full Name" value={profile.full_name as string} />
                      <ProfileField label="Department" value={profile.dept_code as string} />
                      <ProfileField label="Designation" value={profile.designation as string} />
                      <ProfileField label="Phone" value={profile.phone as string} />
                      <ProfileField label="Email" value={profile.email as string} />
                      <ProfileField label="Face Registered" value={profile.is_face_registered as boolean} />
                    </>
                  )}
                </div>
              </SectionCard>

              {/* Enrolled Courses */}
              {result.courses && result.courses.length > 0 && (
                <SectionCard title={`Enrolled Courses (${result.courses.length})`} icon={BookOpen}>
                  <div className="mt-2 space-y-2">
                    {result.courses.map((c, i) => (
                      <div key={i} className="flex items-start justify-between gap-3 p-3 bg-slate-900/60 rounded-xl border border-slate-800/60">
                        <div>
                          <p className="text-sm font-semibold text-white">{c.course_name as string}</p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {c.course_code as string}
                            {c.teacher_name ? ` · ${c.teacher_name}` : ""}
                          </p>
                        </div>
                        <span className="text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full flex-shrink-0">
                          {c.credit_hours as number} cr
                        </span>
                      </div>
                    ))}
                  </div>
                </SectionCard>
              )}

              {/* Timetable */}
              {result.timetables && result.timetables.length > 0 && (
                <SectionCard title="Class Timetable" icon={Clock} defaultOpen={false}>
                  <div className="mt-2 space-y-2">
                    {result.timetables.map((t, i) => (
                      <div key={i} className="flex items-center justify-between gap-3 p-3 bg-slate-900/60 rounded-xl border border-slate-800/60">
                        <div className="flex items-start gap-3">
                          <div className="w-2 h-2 mt-1.5 rounded-full bg-violet-500 flex-shrink-0" />
                          <div>
                            <p className="text-xs font-semibold text-white">{t.course_name as string}</p>
                            <p className="text-[11px] text-slate-500">{t.room_name as string}</p>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-xs font-bold text-slate-300">{t.day_of_week as string}</p>
                          <p className="text-[11px] text-slate-500">
                            {(t.start_time as string).slice(0, 5)} – {(t.end_time as string).slice(0, 5)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </SectionCard>
              )}

              {/* Attendance Summary */}
              {result.attendance_summary && Object.keys(result.attendance_summary).length > 0 && (
                <SectionCard title="Attendance Summary" icon={Activity} defaultOpen={false}>
                  <div className="mt-2 flex gap-3">
                    {Object.entries(result.attendance_summary).map(([status, count]) => (
                      <div key={status} className={`flex-1 p-3 rounded-xl border text-center
                        ${status === "PRESENT" ? "bg-emerald-900/20 border-emerald-800/40" :
                          status === "LATE" ? "bg-amber-900/20 border-amber-800/40" :
                          "bg-red-900/20 border-red-800/40"}`}>
                        <p className={`text-xl font-black ${status === "PRESENT" ? "text-emerald-300" : status === "LATE" ? "text-amber-300" : "text-red-300"}`}>
                          {count as number}
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5 capitalize">{status.toLowerCase()}</p>
                      </div>
                    ))}
                  </div>
                </SectionCard>
              )}

              {/* AI Summary */}
              {result.ai_summary && (
                <SectionCard title="AI Summary" icon={Brain} defaultOpen={false}>
                  <div className="mt-2 bg-slate-950/60 rounded-xl p-4 border border-slate-800/60 space-y-1">
                    {renderMarkdown(result.ai_summary)}
                  </div>
                </SectionCard>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
