"use client";

import { useEffect, useRef, useState } from "react";
import { useCamera } from "@/hooks/useCamera";
import { studentsApi, teachersApi } from "@/lib/api";
import type { Student, Teacher } from "@/types";
import { Camera, X, CheckCircle2, Loader2, AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  person: Student | Teacher;
  personType: "student" | "teacher";
  onClose: () => void;
}

type Status = "idle" | "capturing" | "processing" | "success" | "error";

export function FaceEnrollDialog({ person, personType, onClose }: Props) {
  const { videoRef, state: camState, startCamera, stopCamera, captureFrame } = useCamera();
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const overlayRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  const isStudent = (p: Student | Teacher): p is Student => "student_id" in p;

  const handleCapture = async () => {
    const frame = captureFrame();
    if (!frame) { setMessage("Could not capture frame."); return; }
    setStatus("processing");
    setMessage("Extracting face embedding…");
    try {
      const api = personType === "student" ? studentsApi : teachersApi;
      const targetId = isStudent(person) ? person.student_id : (person as Teacher).teacher_id;
      const result = await api.enrollFace(targetId, frame);
      setStatus("success");
      setMessage(result.message || "Face enrolled successfully!");
    } catch (e: unknown) {
      setStatus("error");
      setMessage((e as Error).message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-theme-surface border border-theme-border-hover rounded-2xl shadow-2xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-theme-border">
          <div>
            <h3 className="font-semibold text-theme-text">Face Enrollment</h3>
            <p className="text-xs text-theme-sub mt-0.5">
              {person.full_name} · {isStudent(person) ? person.student_id : (person as Teacher).teacher_id}
            </p>
          </div>
          <button onClick={onClose} className="text-theme-muted hover:text-theme-text transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Camera view */}
        <div className="p-5 space-y-4">
          <div className="relative rounded-xl overflow-hidden bg-theme-base aspect-video border border-theme-border">
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
            />
            <canvas ref={overlayRef} className="absolute inset-0 w-full h-full pointer-events-none" />

            {/* Face guide overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-40 h-48 rounded-full border-2 border-dashed border-violet-400/50 flex items-center justify-center">
                <div className="w-36 h-44 rounded-full border border-violet-600/30" />
              </div>
            </div>

            {/* Camera error */}
            {!camState.isActive && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-theme-sub gap-2">
                <AlertTriangle className="w-8 h-8" />
                <p className="text-sm">{camState.error ?? "Camera not active"}</p>
                <button onClick={startCamera} className="text-xs text-violet-400 hover:underline">Try again</button>
              </div>
            )}

            {/* Status overlay */}
            {status === "processing" && (
              <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2">
                <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
                <p className="text-sm text-theme-text">Processing…</p>
              </div>
            )}
            {status === "success" && (
              <div className="absolute inset-0 bg-emerald-900/60 flex flex-col items-center justify-center gap-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                <p className="text-sm text-theme-text font-medium">Enrolled!</p>
              </div>
            )}
          </div>

          {/* Instruction */}
          <p className="text-xs text-theme-muted text-center">
            Position your face inside the oval guide, then click Capture.
          </p>

          {/* Message */}
          {message && (
            <p className={`text-sm px-3 py-2 rounded-lg border text-center
              ${status === "success"
                ? "bg-emerald-900/20 border-emerald-800/50 text-emerald-300"
                : status === "error"
                ? "bg-red-900/20 border-red-800/50 text-red-300"
                : "bg-theme-elevated border-theme-border-hover text-theme-sub"
              }`}>
              {message}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            {status === "success" ? (
              <button onClick={onClose} className="flex-1 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors inline-flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> Done
              </button>
            ) : (
              <>
                <button onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-theme-border-hover text-theme-sub text-sm hover:bg-theme-elevated transition-colors">
                  Cancel
                </button>
                {status === "error" ? (
                  <button onClick={() => { setStatus("idle"); setMessage(""); }} className="flex-1 py-2.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-theme-text text-sm transition-colors inline-flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4" /> Retry
                  </button>
                ) : (
                  <button
                    onClick={handleCapture}
                    disabled={!camState.isActive || status === "processing"}
                    className="flex-1 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2"
                  >
                    <Camera className="w-4 h-4" />
                    {status === "processing" ? "Processing…" : "Capture & Enroll"}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
