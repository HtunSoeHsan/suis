"use client";

import { useState, useEffect } from "react";
import type { Teacher, Course } from "@/types";
import { coursesApi } from "@/lib/api";
import {
  X, Users, Phone, Mail, Hash, MapPin, BookOpen,
  CheckCircle2, Clock, Pencil, Camera, Briefcase, Award, Calendar, Shield
} from "lucide-react";

interface Props {
  teacher: Teacher;
  onClose: () => void;
  onEdit?: () => void;
  onFaceEnroll?: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  Active: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  "On Leave": "bg-amber-500/15 text-amber-300 border-amber-500/30",
  Retired: "bg-slate-800 text-slate-400 border-slate-700",
  Resigned: "bg-red-500/15 text-red-300 border-red-500/30",
};

export function TeacherDetailDialog({ teacher, onClose, onEdit, onFaceEnroll }: Props) {
  const [assignedCourses, setAssignedCourses] = useState<Course[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);

  useEffect(() => {
    coursesApi.list({ limit: 100 })
      .then((res) => {
        const filtered = res.items.filter((c) => c.teacher_id === teacher.teacher_id);
        setAssignedCourses(filtered);
      })
      .catch(() => {})
      .finally(() => setLoadingCourses(false));
  }, [teacher.teacher_id]);

  const statusName = teacher.status || "Active";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header Banner */}
        <div className="relative bg-gradient-to-r from-sky-950 via-slate-900 to-indigo-950 p-6 border-b border-slate-800">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-start gap-4">
            {/* Avatar Circle */}
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-sky-600 via-cyan-600 to-blue-700 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-sky-900/50 shrink-0">
              {teacher.full_name.charAt(0).toUpperCase()}
            </div>

            <div className="space-y-1 min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold text-white truncate">{teacher.full_name}</h2>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${STATUS_COLORS[statusName] ?? "bg-slate-800 text-slate-400"}`}>
                  {statusName}
                </span>
                {teacher.is_face_registered ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-xs font-medium">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Face Registered
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 text-xs font-medium">
                    <Clock className="w-3 h-3 text-amber-400" /> Face Pending
                  </span>
                )}
              </div>

              <p className="text-xs font-mono text-sky-400 font-semibold">{teacher.teacher_id}</p>

              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300 pt-1">
                <span><strong className="text-slate-400">Designation:</strong> {teacher.designation}</span>
                <span>•</span>
                <span><strong className="text-slate-400">Department:</strong> {teacher.dept_code}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1">
              <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-sky-400" /> Email
              </span>
              <p className="text-xs font-medium text-slate-200 truncate">{teacher.email || "—"}</p>
            </div>

            <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1">
              <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-emerald-400" /> Phone
              </span>
              <p className="text-xs font-medium text-slate-200">{teacher.phone || "—"}</p>
            </div>

            <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1">
              <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                <Hash className="w-3.5 h-3.5 text-indigo-400" /> NRC Number
              </span>
              <p className="text-xs font-mono font-medium text-slate-200 truncate">{teacher.nrc_number || "—"}</p>
            </div>

            <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1">
              <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                <Award className="w-3.5 h-3.5 text-amber-400" /> Qualification
              </span>
              <p className="text-xs font-medium text-slate-200 truncate">{teacher.qualification || "—"}</p>
            </div>

            <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1">
              <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                <Briefcase className="w-3.5 h-3.5 text-violet-400" /> Specialization
              </span>
              <p className="text-xs font-medium text-slate-200 truncate">{teacher.specialization || "—"}</p>
            </div>

            <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1">
              <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-pink-400" /> Joining Date
              </span>
              <p className="text-xs font-medium text-slate-200">{teacher.joining_date || "—"}</p>
            </div>
          </div>

          {/* Assigned Teaching Courses Section */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-sky-400 uppercase tracking-wider flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-sky-400" /> Assigned Teaching Courses ({assignedCourses.length})
            </h3>

            {loadingCourses ? (
              <div className="p-4 text-center text-xs text-slate-500 bg-slate-950/40 rounded-xl border border-slate-800">
                Loading assigned courses…
              </div>
            ) : assignedCourses.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-500 bg-slate-950/40 rounded-xl border border-slate-800">
                No courses assigned to this instructor yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                {assignedCourses.map((c) => (
                  <div
                    key={c.course_code}
                    className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sky-400 text-xs">{c.course_code}</span>
                        {c.major && (
                          <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-mono">
                            {c.major}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-200 font-medium mt-0.5">
                        {c.course_name}
                      </p>
                    </div>
                    <span className="text-[10px] text-slate-500 font-medium">{c.credit_hours} hrs</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Gender & Address */}
          <div className="space-y-3 pt-3 border-t border-slate-800">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Shield className="w-4 h-4 text-sky-400" /> Personal Details
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1">
                <span className="text-slate-500 font-medium">Gender:</span>
                <p className="text-slate-200 font-semibold">{teacher.gender || "—"}</p>
              </div>

              <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1">
                <span className="text-slate-500 font-medium flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-sky-400" /> Address:
                </span>
                <p className="text-slate-200 font-semibold leading-relaxed">{teacher.address || "—"}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 text-sm hover:bg-slate-800 transition-colors"
          >
            Close
          </button>

          <div className="flex items-center gap-2">
            {onFaceEnroll && (
              <button
                onClick={() => { onClose(); onFaceEnroll(); }}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600/20 border border-emerald-600/40 text-emerald-300 text-sm font-semibold hover:bg-emerald-600/30 transition-colors"
              >
                <Camera className="w-4 h-4" /> Face Biometrics
              </button>
            )}

            {onEdit && (
              <button
                onClick={() => { onClose(); onEdit(); }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-sm font-semibold transition-colors shadow-lg shadow-sky-900/30"
              >
                <Pencil className="w-4 h-4" /> Edit Profile
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
