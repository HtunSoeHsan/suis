"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useCamera } from "@/hooks/useCamera";
import { studentsApi, visionApi } from "@/lib/api";
import type { FaceRetrieveInfoResponse, StudentGPASummary } from "@/types";
import {
  ScanFace, Loader2, CheckCircle2, XCircle, AlertTriangle, Play, Square,
  User, GraduationCap, Users, BookOpen, Clock, Brain,
  Phone, Hash, Activity, ChevronDown, ChevronUp, Award
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
      if (match[1]) parts.push(<strong key={`b-${key}-${i++}`} className="text-theme-text font-bold">{match[1]}</strong>);
      else if (match[2]) parts.push(<em key={`e-${key}-${i++}`} className="text-theme-sub italic">{match[2]}</em>);
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
      result.push(<p key={idx} className="text-sm font-bold text-theme-text mt-3 mb-1">{text}</p>);
    } else if (/^[-*•]\s/.test(trimmed)) {
      const text = trimmed.replace(/^[-*•]\s/, "");
      result.push(
        <div key={idx} className="flex items-start gap-2 text-sm text-theme-sub leading-relaxed">
          <span className="text-violet-400 mt-1 flex-shrink-0">•</span>
          <span>{parseInline(text, idx)}</span>
        </div>
      );
    } else {
      result.push(<p key={idx} className="text-sm text-theme-sub leading-relaxed">{parseInline(trimmed, idx)}</p>);
    }
  });

  return result;
}

function ConfidenceBar({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color = pct >= 80 ? "bg-emerald-500" : pct >= 60 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-theme-sub">
        <span>Match confidence</span><span className="font-mono font-bold text-theme-text">{pct}%</span>
      </div>
      <div className="h-1.5 bg-theme-elevated rounded-full overflow-hidden">
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
    <div className="bg-theme-surface/60 border border-theme-border/80 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-theme-surface/40 transition-colors"
      >
        <div className="flex items-center gap-2 text-sm font-semibold text-theme-sub">
          <Icon className="w-4 h-4 text-violet-400" />
          {title}
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-theme-muted" /> : <ChevronDown className="w-4 h-4 text-theme-muted" />}
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

function ProfileField({ label, value }: { label: string; value?: string | number | boolean | null }) {
  const displayVal = (value === null || value === undefined || value === "") ? "—" : value;
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-theme-border/40 text-xs">
      <span className="text-theme-muted font-medium">{label}</span>
      <span className="text-theme-text font-semibold text-right">{displayVal}</span>
    </div>
  );
}

export default function FaceScannerPage() {
  const { videoRef, state: camState, startCamera, stopCamera, captureFrame } = useCamera();
  const [scanStatus, setScanStatus] = useState<ScanStatus>("idle");
  const [result, setResult] = useState<FaceRetrieveInfoResponse | null>(null);
  const [gpaData, setGpaData] = useState<StudentGPASummary | null>(null);
  const [error, setError] = useState("");
  const [autoMode, setAutoMode] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const scan = useCallback(async () => {
    const frame = captureFrame();
    if (!frame) return;
    setScanStatus("scanning");
    setError("");
    setGpaData(null);
    try {
      const res = await visionApi.retrieveInfo(frame);
      setResult(res);
      setScanStatus(res.identified ? "identified" : "unknown");

      if (res.identified && res.target_type === "student" && res.profile?.student_id) {
        studentsApi.getGPA(res.profile.student_id as string)
          .then((gpa) => setGpaData(gpa))
          .catch(() => {});
      }
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
    idle:       { color: "border-theme-border-hover",     bg: "bg-theme-elevated",       text: "text-theme-sub"  },
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
          <h2 className="text-xl font-bold text-theme-text">Face Recognition Scanner</h2>
          <p className="text-sm text-theme-sub mt-0.5">Scan face to retrieve full profile, courses & attendance</p>
        </div>
        <div className="flex gap-2.5">
          <button
            onClick={() => setAutoMode((a) => !a)}
            disabled={!camState.isActive}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all border
              ${autoMode
                ? "bg-emerald-900/30 border-emerald-700/60 text-emerald-300 hover:bg-emerald-900/50"
                : "bg-theme-surface border-theme-border-hover text-theme-sub hover:bg-theme-elevated"
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
          <div className={`relative rounded-2xl overflow-hidden border-2 ${statusConfig.color} transition-colors duration-500 aspect-video bg-theme-base`}>
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
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-theme-muted">
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
            <div className="h-full min-h-[320px] bg-theme-surface/60 border border-theme-border rounded-2xl flex flex-col items-center justify-center gap-4 text-slate-600">
              <ScanFace className="w-16 h-16" />
              <div className="text-center">
                <p className="text-sm font-medium text-theme-muted">No scan result yet</p>
                <p className="text-xs text-slate-600 mt-1">Start camera and scan a face to retrieve full profile</p>
              </div>
            </div>
          ) : !result.identified ? (
            <div className="h-full min-h-[320px] bg-theme-surface/60 border border-amber-900/30 rounded-2xl flex flex-col items-center justify-center gap-4 text-center p-8">
              <XCircle className="w-14 h-14 text-amber-500" />
              <div>
                <p className="text-base font-bold text-amber-300">No Match Found</p>
                <p className="text-sm text-theme-muted mt-1">{result.message}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Identity Header Card */}
              <div className="bg-theme-surface/90 border border-theme-border rounded-2xl p-5">
                <div className="flex items-start gap-4">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-xl flex-shrink-0
                    ${isStudent
                      ? "bg-gradient-to-tr from-violet-600 to-indigo-700 shadow-violet-900/40"
                      : "bg-gradient-to-tr from-sky-600 to-blue-700 shadow-sky-900/40"}`}>
                    {isStudent
                      ? <GraduationCap className="w-8 h-8 text-theme-text" />
                      : <Users className="w-8 h-8 text-theme-text" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-xl font-black text-theme-text">{profile.full_name as string}</h3>
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border uppercase tracking-wider
                        ${isStudent
                          ? "badge-violet border"
                          : "badge-sky border"}`}>
                        {result.target_type}
                      </span>
                      {isStudent && (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold font-mono badge-cgpa-high border">
                          CGPA: {(profile.cgpa as number | undefined)?.toFixed(2) ?? "0.00"} / 4.00
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-theme-sub mt-0.5">{profile.dept_code as string} Department</p>

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
                      <ProfileField label="Email" value={profile.email as string} />
                      <ProfileField label="NRC Number" value={profile.nrc_number as string} />
                      <ProfileField label="Gender" value={profile.gender as string} />
                      <ProfileField label="Date of Birth" value={profile.date_of_birth as string} />
                      <ProfileField label="Blood Type" value={profile.blood_type as string} />
                      <ProfileField label="Address" value={profile.address as string} />
                      <ProfileField label="Guardian Name" value={profile.guardian_name as string} />
                      <ProfileField label="Guardian Phone" value={profile.guardian_phone as string} />
                      <ProfileField label="Department" value={profile.dept_code as string} />
                      <ProfileField label="Major" value={profile.major as string} />
                      <ProfileField label="Academic Year" value={profile.academic_year !== undefined && profile.academic_year !== null ? `Year ${profile.academic_year}` : null} />
                      <ProfileField label="Roll Number" value={profile.roll_number as string} />
                      <ProfileField label="Section" value={profile.section as string} />
                      <ProfileField label="Phone" value={profile.phone as string} />
                      <ProfileField label="Admission Year" value={profile.admission_year as number} />
                      <ProfileField label="Status" value={profile.status as string} />
                      <ProfileField label="Face Registered" value={profile.is_face_registered as boolean} />
                    </>
                  ) : (
                    <>
                      <ProfileField label="Teacher ID" value={profile.teacher_id as string} />
                      <ProfileField label="Full Name" value={profile.full_name as string} />
                      <ProfileField label="Department" value={profile.dept_code as string} />
                      <ProfileField label="Designation" value={profile.designation as string} />
                      <ProfileField label="Qualification" value={profile.qualification as string} />
                      <ProfileField label="Specialization" value={profile.specialization as string} />
                      <ProfileField label="Joining Date" value={profile.joining_date as string} />
                      <ProfileField label="Phone" value={profile.phone as string} />
                      <ProfileField label="Email" value={profile.email as string} />
                      <ProfileField label="NRC Number" value={profile.nrc_number as string} />
                      <ProfileField label="Gender" value={profile.gender as string} />
                      <ProfileField label="Address" value={profile.address as string} />
                      <ProfileField label="Status" value={profile.status as string} />
                      <ProfileField label="Face Registered" value={profile.is_face_registered as boolean} />
                    </>
                  )}
                </div>
              </SectionCard>

              {/* Academic Performance & GPA Breakdown Card */}
              {isStudent && gpaData && (
                <SectionCard title={`Academic Performance (CGPA: ${(profile.cgpa as number | undefined)?.toFixed(2) ?? "0.00"})`} icon={Award}>
                  <div className="mt-2 space-y-3">
                    <div className="flex items-center justify-between text-xs p-3 bg-theme-surface/80 border border-theme-border rounded-xl">
                      <div>
                        <span className="text-theme-sub font-medium">Cumulative GPA:</span>
                        <span className="ml-2 font-mono font-bold text-amber-400 text-sm">{(profile.cgpa as number | undefined)?.toFixed(2) ?? "0.00"} / 4.00</span>
                      </div>
                      <div className="text-theme-sub">
                        <span>Earned Credits: </span>
                        <span className="font-mono font-bold text-theme-text">{gpaData.total_earned_credits} cr</span>
                      </div>
                    </div>

                    {gpaData.semesters.map((sem) => (
                      <div key={sem.semester_id} className="p-3 bg-theme-surface/60 border border-theme-border/80 rounded-xl space-y-2">
                        <div className="flex items-center justify-between text-xs border-b border-theme-border pb-1.5">
                          <span className="font-bold text-theme-text">{sem.academic_year} ({sem.term})</span>
                          <span className="px-2 py-0.5 rounded badge-cgpa-high border font-mono font-bold text-xs">
                            Semester GPA: {sem.gpa.toFixed(2)}
                          </span>
                        </div>
                        <div className="divide-y divide-theme-border/40 text-xs">
                          {sem.courses.map((c) => (
                            <div key={c.enrollment_id} className="py-1.5 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-cyan-400 font-bold">{c.course_code}</span>
                                <span className="text-theme-sub font-medium">{c.course_name}</span>
                                {c.grade_point != null && (
                                  <span className="px-1.5 py-0.2 rounded badge-cgpa-high border font-bold font-mono text-[10px]">
                                    GPA: {c.grade_point.toFixed(2)}
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-theme-sub font-mono">{c.credit_hours} cr</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </SectionCard>
              )}

              {/* Enrolled Courses */}
              {result.courses && result.courses.length > 0 && (
                <SectionCard title={`Enrolled Courses (${result.courses.length})`} icon={BookOpen}>
                  <div className="mt-2 space-y-2">
                    {result.courses.map((c, i) => (
                      <div key={i} className="flex items-start justify-between gap-3 p-3 bg-theme-surface/60 rounded-xl border border-theme-border/60">
                        <div>
                          <p className="text-sm font-semibold text-theme-text">{c.course_name as string}</p>
                          <p className="text-xs text-theme-muted mt-0.5">
                            {c.course_code as string}
                            {c.teacher_name ? ` · ${c.teacher_name}` : ""}
                          </p>
                        </div>
                        <span className="text-xs text-theme-sub bg-theme-elevated px-2 py-0.5 rounded-full flex-shrink-0">
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
                      <div key={i} className="flex items-center justify-between gap-3 p-3 bg-theme-surface/60 rounded-xl border border-theme-border/60">
                        <div className="flex items-start gap-3">
                          <div className="w-2 h-2 mt-1.5 rounded-full bg-violet-500 flex-shrink-0" />
                          <div>
                            <p className="text-xs font-semibold text-theme-text">{t.course_name as string}</p>
                            <p className="text-[11px] text-theme-muted">{t.room_name as string}</p>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-xs font-bold text-theme-sub">{t.day_of_week as string}</p>
                          <p className="text-[11px] text-theme-muted">
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
                        <p className="text-[11px] text-theme-muted mt-0.5 capitalize">{status.toLowerCase()}</p>
                      </div>
                    ))}
                  </div>
                </SectionCard>
              )}

              {/* AI Summary */}
              {result.ai_summary && (
                <SectionCard title="AI Summary" icon={Brain} defaultOpen={false}>
                  <div className="mt-2 bg-theme-surface/60 rounded-xl p-4 border border-theme-border/60 space-y-1">
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
