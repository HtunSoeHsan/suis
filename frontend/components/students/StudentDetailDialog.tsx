"use client";

import { useState, useEffect } from "react";
import type { Student, Enrollment, Course, StudentGPASummary } from "@/types";
import { enrollmentsApi, coursesApi, studentsApi } from "@/lib/api";
import {
  X, GraduationCap, User, Phone, BookOpen, Calendar,
  CheckCircle2, Clock, Pencil, Camera, Mail, Hash, MapPin,
  HeartPulse, Shield, FileText, Activity, Award, TrendingUp
} from "lucide-react";

import { useAuth } from "@/context/AuthContext";

interface Props {
  student: Student;
  onClose: () => void;
  onEdit?: () => void;
  onFaceEnroll?: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  Active: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  Graduated: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  Suspended: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  Dropped: "bg-red-500/15 text-red-300 border-red-500/30",
};

export function StudentDetailDialog({ student, onClose, onEdit, onFaceEnroll }: Props) {
  const { user } = useAuth();
  const isTeacher = user?.role === "TEACHER";

  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [courses, setCourses] = useState<Record<string, Course>>({});
  const [gpaData, setGpaData] = useState<StudentGPASummary | null>(null);
  const [loadingEnrollments, setLoadingEnrollments] = useState(true);

  useEffect(() => {
    Promise.all([
      enrollmentsApi.list({ student_id: student.student_id, limit: 100 }),
      coursesApi.list({ limit: 100 }),
      studentsApi.getGPA(student.student_id).catch(() => null),
    ])
      .then(([enrRes, crsRes, gpaRes]) => {
        setEnrollments(enrRes.items);
        const cMap: Record<string, Course> = {};
        crsRes.items.forEach((c) => { cMap[c.course_code] = c; });
        setCourses(cMap);
        if (gpaRes) setGpaData(gpaRes);
      })
      .catch(() => {})
      .finally(() => setLoadingEnrollments(false));
  }, [student.student_id]);

  const statusName = student.status || "Active";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Banner Header */}
        <div className="relative bg-gradient-to-r from-violet-950 via-slate-900 to-indigo-950 p-6 border-b border-slate-800">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-start gap-4">
            {/* Avatar Circle */}
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-purple-700 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-violet-900/50 shrink-0">
              {student.full_name.charAt(0).toUpperCase()}
            </div>

            <div className="space-y-1 min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold text-white truncate">{student.full_name}</h2>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${STATUS_COLORS[statusName] ?? "bg-slate-800 text-slate-400"}`}>
                  {statusName}
                </span>
                {student.is_face_registered ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-xs font-medium">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Face Registered
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 text-xs font-medium">
                    <Clock className="w-3 h-3 text-amber-400" /> Face Pending
                  </span>
                )}
              </div>

              <p className="text-xs font-mono text-violet-400 font-semibold">{student.student_id}</p>

              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300 pt-1">
                <span><strong className="text-slate-400">Major:</strong> {student.major || student.dept_code}</span>
                <span>•</span>
                <span><strong className="text-slate-400">Academic Year:</strong> Year {student.academic_year}</span>
                {student.roll_number && (
                  <>
                    <span>•</span>
                    <span><strong className="text-slate-400">Roll:</strong> <code className="font-mono text-teal-300">{student.roll_number}</code></span>
                  </>
                )}
                {student.section && (
                  <>
                    <span>•</span>
                    <span><strong className="text-slate-400">Section:</strong> {student.section}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Grid of Key Metadata */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1">
              <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-violet-400" /> Email
              </span>
              <p className="text-xs font-medium text-slate-200 truncate">{student.email || "—"}</p>
            </div>

            <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1">
              <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-emerald-400" /> Phone
              </span>
              <p className="text-xs font-medium text-slate-200">{student.phone || "—"}</p>
            </div>

            <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1">
              <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                <Hash className="w-3.5 h-3.5 text-sky-400" /> NRC Number
              </span>
              <p className="text-xs font-mono font-medium text-slate-200 truncate">{student.nrc_number || "—"}</p>
            </div>

            <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1">
              <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-amber-400" /> Gender
              </span>
              <p className="text-xs font-medium text-slate-200">{student.gender || "—"}</p>
            </div>

            <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1">
              <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-pink-400" /> Date of Birth
              </span>
              <p className="text-xs font-medium text-slate-200">{student.date_of_birth || "—"}</p>
            </div>

            <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1">
              <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                <HeartPulse className="w-3.5 h-3.5 text-rose-400" /> Blood Type
              </span>
              <p className="text-xs font-bold text-rose-300">{student.blood_type || "—"}</p>
            </div>
          </div>

          {/* Enrolled Courses Section */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-teal-400 uppercase tracking-wider flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-teal-400" /> Enrolled Courses ({enrollments.length})
            </h3>

            {loadingEnrollments ? (
              <div className="p-4 text-center text-xs text-slate-500 bg-slate-950/40 rounded-xl border border-slate-800">
                Loading enrolled courses…
              </div>
            ) : enrollments.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-500 bg-slate-950/40 rounded-xl border border-slate-800">
                No courses enrolled for this student yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                {enrollments.map((enr) => {
                  const course = courses[enr.course_code];
                  const matchingSem = gpaData?.semesters.find((s) => s.semester_id === enr.semester_id);
                  const semBadgeLabel = matchingSem ? matchingSem.term : `Semester #${enr.semester_id}`;
                  return (
                    <div
                      key={enr.enrollment_id}
                      className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-teal-400 text-xs">{enr.course_code}</span>
                          <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-mono">
                            {semBadgeLabel}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-xs text-slate-200 font-medium truncate">
                            {course ? course.course_name : "Course Details"}
                          </p>
                          {enr.grade_point != null && (
                            <span className="px-1.5 py-0.2 rounded bg-amber-950/80 border border-amber-600/50 text-amber-300 font-bold font-mono text-[10px] shrink-0">
                              GPA: {enr.grade_point.toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>
                      {course && (
                        <span className="text-[10px] text-slate-500 font-medium shrink-0">{course.credit_hours} hrs</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Academic Performance */}
          <div className="space-y-3 pt-3 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-400" /> Academic Performance
              </h3>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-amber-950/80 border border-amber-600/50 text-amber-300 text-xs font-bold font-mono">
                  CGPA: {student.cgpa ? student.cgpa.toFixed(2) : "0.00"} / 4.00
                </span>
              </div>
            </div>

            {gpaData && gpaData.semesters.length > 0 ? (
              <div className="space-y-3">
                {gpaData.semesters.map((sem) => (
                  <div key={sem.semester_id} className="bg-slate-950/80 border border-slate-800 rounded-xl overflow-hidden p-3.5 space-y-2">
                    <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{sem.academic_year} — {sem.term}</span>
                        {sem.is_active && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-700/60 font-semibold">ACTIVE</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400 font-mono">{sem.total_credits} Credits</span>
                        <span className="px-2.5 py-1 rounded bg-amber-950/80 text-amber-300 border border-amber-600/50 font-mono text-xs font-bold">
                          Semester GPA: {sem.gpa.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    <div className="divide-y divide-slate-800/40">
                      {sem.courses.map((c) => (
                        <div key={c.enrollment_id} className="py-2 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-cyan-400 font-bold">{c.course_code}</span>
                            <span className="text-slate-200 font-medium">{c.course_name}</span>
                            {c.grade_point != null && (
                              <span className="px-2 py-0.5 rounded bg-amber-950/80 border border-amber-600/50 text-amber-300 font-bold font-mono text-[11px]">
                                GPA: {c.grade_point.toFixed(2)}
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-400 font-mono">{c.credit_hours} cr</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
          <div className="space-y-3 pt-3 border-t border-slate-800">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Shield className="w-4 h-4 text-violet-400" /> Guardian &amp; Additional Information
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1">
                <span className="text-slate-500 font-medium">Guardian Name:</span>
                <p className="text-slate-200 font-semibold">{student.guardian_name || "—"}</p>
              </div>

              <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1">
                <span className="text-slate-500 font-medium">Guardian Phone:</span>
                <p className="text-slate-200 font-semibold">{student.guardian_phone || "—"}</p>
              </div>

              <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1">
                <span className="text-slate-500 font-medium">Admission Year:</span>
                <p className="text-slate-200 font-semibold">{student.admission_year || "—"}</p>
              </div>

              <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1">
                <span className="text-slate-500 font-medium flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-violet-400" /> Address:
                </span>
                <p className="text-slate-200 font-semibold leading-relaxed">{student.address || "—"}</p>
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

          {!isTeacher && (
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
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-colors shadow-lg shadow-violet-900/30"
                >
                  <Pencil className="w-4 h-4" /> Edit Profile
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
