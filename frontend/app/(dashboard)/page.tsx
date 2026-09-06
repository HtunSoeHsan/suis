"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  GraduationCap,
  Users,
  CalendarCheck,
  MessageSquareText,
  ScanFace,
  ArrowRight,
  Sparkles,
  Zap,
  Fingerprint,
} from "lucide-react";
import { studentsApi, teachersApi, attendanceApi } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

interface StatsData {
  students: number | string;
  teachers: number | string;
  attendance: number | string;
  enrolledFaces: number | string;
  loading: boolean;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const [stats, setStats] = useState<StatsData>({
    students: "...",
    teachers: "...",
    attendance: "...",
    enrolledFaces: "...",
    loading: true,
  });

  useEffect(() => {
    async function loadStats() {
      try {
        const [studRes, teachRes, studFaceRes, teachFaceRes, attRes] = await Promise.allSettled([
          studentsApi.list({ limit: 1 }),
          teachersApi.list({ limit: 1 }),
          studentsApi.list({ is_face_registered: true, limit: 1 }),
          teachersApi.list({ is_face_registered: true, limit: 1 }),
          attendanceApi.list({ limit: 1 }),
        ]);

        const studentCount = studRes.status === "fulfilled" ? studRes.value.total ?? 0 : 0;
        const teacherCount = teachRes.status === "fulfilled" ? teachRes.value.total ?? 0 : 0;
        const studentFaceCount = studFaceRes.status === "fulfilled" ? studFaceRes.value.total ?? 0 : 0;
        const teacherFaceCount = teachFaceRes.status === "fulfilled" ? teachFaceRes.value.total ?? 0 : 0;
        const attendanceCount = attRes.status === "fulfilled" ? attRes.value.total ?? 0 : 0;

        setStats({
          students: studentCount,
          teachers: teacherCount,
          attendance: attendanceCount,
          enrolledFaces: studentFaceCount + teacherFaceCount,
          loading: false,
        });
      } catch {
        setStats((prev) => ({ ...prev, loading: false }));
      }
    }

    loadStats();
  }, []);

  const statCards = [
    {
      label: "Total Students",
      value: stats.students,
      icon: GraduationCap,
      color: "from-violet-600 via-indigo-600 to-purple-700",
      shadow: "shadow-violet-500/20",
      hint: "Registered student directory",
      href: "/students",
    },
    {
      label: "Total Teachers",
      value: stats.teachers,
      icon: Users,
      color: "from-blue-600 via-cyan-600 to-teal-700",
      shadow: "shadow-blue-500/20",
      hint: "Faculty & academic staff",
      href: "/teachers",
    },
    {
      label: "Attendance Logs",
      value: stats.attendance,
      icon: CalendarCheck,
      color: "from-emerald-500 via-teal-600 to-green-700",
      shadow: "shadow-emerald-500/20",
      hint: "Total recorded attendance logs",
      href: "/attendance",
    },
    {
      label: "Biometric Faces",
      value: stats.enrolledFaces,
      icon: Fingerprint,
      color: "from-rose-500 via-pink-600 to-purple-700",
      shadow: "shadow-rose-500/20",
      hint: "ArcFace 512-d embeddings",
      href: "/face-scanner",
    },
  ];

  const visibleStatCards = isAdmin
    ? statCards
    : statCards.filter((c) => c.href !== "/face-scanner");

  const quickLinks = [
    {
      href: "/chatbot",
      label: "AI Text-to-SQL",
      desc: "Ask complex university data questions in plain English",
      icon: MessageSquareText,
      badge: "Llama 3.3 70B",
      accent: "border-amber-500/30 hover:border-amber-500/60",
      iconBg: "bg-amber-500/10 text-amber-400",
    },
    {
      href: "/face-scanner",
      label: "Face Scanner",
      desc: "Real-time webcam identification & liveness detection",
      icon: ScanFace,
      badge: "InsightFace",
      accent: "border-emerald-500/30 hover:border-emerald-500/60",
      iconBg: "bg-emerald-500/10 text-emerald-400",
    },
    {
      href: "/students",
      label: "Student Directory",
      desc: "Add profiles, view details & enroll biometric facial data",
      icon: GraduationCap,
      badge: "Management",
      accent: "border-violet-500/30 hover:border-violet-500/60",
      iconBg: "bg-violet-500/10 text-violet-400",
    },
    {
      href: "/teachers",
      label: "Faculty Portal",
      desc: "Manage teachers, subjects, departments & biometric IDs",
      icon: Users,
      badge: "Faculty",
      accent: "border-blue-500/30 hover:border-blue-500/60",
      iconBg: "bg-blue-500/10 text-blue-400",
    },
  ];

  const visibleQuickLinks = isAdmin
    ? quickLinks
    : quickLinks.filter((l) => l.href !== "/chatbot" && l.href !== "/face-scanner");

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-10">
      {/* Top Banner / Hero */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-violet-950 via-slate-900 to-indigo-950 border border-violet-800/40 p-8 lg:p-10 shadow-2xl shadow-violet-950/50">
        {/* Ambient glow backgrounds */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-violet-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
          <div className="space-y-4 max-w-2xl">
            <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/30 text-violet-300 text-xs font-semibold tracking-wider uppercase backdrop-blur-md">
              <Sparkles className="w-3.5 h-3.5 text-violet-400 animate-pulse" />
              <span>Next-Gen Campus Intelligence</span>
            </div>

            <h1 className="text-4xl lg:text-5xl font-extrabold text-theme-text tracking-tight leading-tight">
              Smart University{" "}
              <span className="bg-gradient-to-r from-violet-400 via-fuchsia-300 to-indigo-300 bg-clip-text text-transparent">
                Intelligence System
              </span>
            </h1>

            <p className="text-theme-sub text-base leading-relaxed">
              Unified AI command center with instant Text-to-SQL analytics, real-time biometric identification, and automated attendance tracking.
            </p>

            {isAdmin && (
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link
                  href="/chatbot"
                  className="group relative inline-flex items-center gap-2.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-sm font-semibold transition-all shadow-lg shadow-violet-900/50 hover:shadow-violet-800/80 hover:-translate-y-0.5"
                >
                  <MessageSquareText className="w-4 h-4" />
                  <span>Launch AI Assistant</span>
                  <ArrowRight className="w-4 h-4 text-violet-200 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link
                  href="/face-scanner"
                  className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-xl bg-theme-elevated/90 hover:bg-theme-muted/90 border border-theme-border-hover text-theme-text text-sm font-semibold transition-all backdrop-blur-md hover:-translate-y-0.5"
                >
                  <ScanFace className="w-4 h-4 text-emerald-400" />
                  <span>Open Biometric Scanner</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {visibleStatCards.map(({ label, value, icon: Icon, color, shadow, hint, href }) => (
          <Link
            key={label}
            href={href}
            className="group relative rounded-2xl bg-theme-surface border border-theme-border hover:border-theme-border-hover p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl shadow-black/10 overflow-hidden"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-tr ${color} flex items-center justify-center shadow-lg ${shadow} group-hover:scale-110 transition-transform`}>
                <Icon className="w-6 h-6 text-white" />
              </div>
              <span className="text-xs text-theme-muted group-hover:text-violet-400 transition-colors flex items-center gap-1 font-medium">
                View <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </span>
            </div>

            <div className="space-y-1">
              <p className="text-3xl font-black text-theme-text tracking-tight">
                {stats.loading ? (
                  <span className="inline-block w-12 h-8 bg-theme-elevated rounded animate-pulse" />
                ) : (
                  value
                )}
              </p>
              <p className="text-sm font-semibold text-theme-sub">{label}</p>
              <p className="text-xs text-theme-muted">{hint}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick Access Modules */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-theme-text flex items-center gap-2.5">
            <Zap className="w-5 h-5 text-violet-400" />
            <span>Core Intelligence Modules</span>
          </h2>
          <span className="text-xs text-theme-muted">Select a service to launch</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {visibleQuickLinks.map(({ href, label, desc, icon: Icon, badge, accent, iconBg }) => (
            <Link
              key={href}
              href={href}
              className={`group relative rounded-2xl bg-theme-surface border ${accent} p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/20 flex flex-col justify-between`}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-xl ${iconBg} group-hover:scale-105 transition-transform`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-theme-elevated text-theme-muted border border-theme-border">
                    {badge}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-theme-text mb-2 group-hover:text-violet-400 transition-colors">
                  {label}
                </h3>
                <p className="text-theme-sub text-xs leading-relaxed mb-6">
                  {desc}
                </p>
              </div>

              <div className="flex items-center text-xs font-semibold text-violet-400 group-hover:text-violet-300">
                <span>Access Module</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
