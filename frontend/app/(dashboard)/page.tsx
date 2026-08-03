"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  GraduationCap,
  Users,
  CalendarCheck,
  MessageSquareText,
  ScanFace,
  Brain,
  TrendingUp,
  ArrowRight,
  Sparkles,
  Zap,
  Fingerprint,
} from "lucide-react";
import { studentsApi, teachersApi, attendanceApi } from "@/lib/api";

interface StatsData {
  students: number | string;
  teachers: number | string;
  attendance: number | string;
  enrolledFaces: number | string;
  apiConnected: boolean;
  loading: boolean;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<StatsData>({
    students: "...",
    teachers: "...",
    attendance: "...",
    enrolledFaces: "...",
    apiConnected: false,
    loading: true,
  });

  useEffect(() => {
    async function loadStats() {
      try {
        const [studRes, teachRes, attRes] = await Promise.allSettled([
          studentsApi.list({ limit: 100 }),
          teachersApi.list({ limit: 100 }),
          attendanceApi.list({ limit: 100 }),
        ]);

        let studentCount = 0;
        let studentEnrolled = 0;
        if (studRes.status === "fulfilled") {
          studentCount = studRes.value.total ?? studRes.value.items?.length ?? 0;
          studentEnrolled = studRes.value.items?.filter((s) => s.is_face_registered).length ?? 0;
        }

        let teacherCount = 0;
        let teacherEnrolled = 0;
        if (teachRes.status === "fulfilled") {
          teacherCount = teachRes.value.total ?? teachRes.value.items?.length ?? 0;
          teacherEnrolled = teachRes.value.items?.filter((t) => t.is_face_registered).length ?? 0;
        }

        let attendanceCount = 0;
        if (attRes.status === "fulfilled") {
          attendanceCount = attRes.value.total ?? attRes.value.items?.length ?? 0;
        }

        const isOk =
          studRes.status === "fulfilled" ||
          teachRes.status === "fulfilled" ||
          attRes.status === "fulfilled";

        setStats({
          students: studentCount,
          teachers: teacherCount,
          attendance: attendanceCount,
          enrolledFaces: studentEnrolled + teacherEnrolled,
          apiConnected: isOk,
          loading: false,
        });
      } catch {
        setStats((prev) => ({ ...prev, apiConnected: false, loading: false }));
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
      label: "Today's Attendance",
      value: stats.attendance,
      icon: CalendarCheck,
      color: "from-emerald-500 via-teal-600 to-green-700",
      shadow: "shadow-emerald-500/20",
      hint: "Biometric & auto-verified",
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

  const quickLinks = [
    {
      href: "/chatbot",
      label: "AI Text-to-SQL",
      desc: "Ask complex university data questions in plain English",
      icon: MessageSquareText,
      badge: "Llama 3.3 70B",
      accent: "from-amber-500/20 via-amber-500/5 to-transparent border-amber-500/30 hover:border-amber-500/60",
      iconBg: "bg-amber-500/10 text-amber-400",
    },
    {
      href: "/face-scanner",
      label: "Face Scanner",
      desc: "Real-time webcam identification & liveness detection",
      icon: ScanFace,
      badge: "InsightFace",
      accent: "from-emerald-500/20 via-emerald-500/5 to-transparent border-emerald-500/30 hover:border-emerald-500/60",
      iconBg: "bg-emerald-500/10 text-emerald-400",
    },
    {
      href: "/students",
      label: "Student Directory",
      desc: "Add profiles, view details & enroll biometric facial data",
      icon: GraduationCap,
      badge: "Management",
      accent: "from-violet-500/20 via-violet-500/5 to-transparent border-violet-500/30 hover:border-violet-500/60",
      iconBg: "bg-violet-500/10 text-violet-400",
    },
    {
      href: "/teachers",
      label: "Faculty Portal",
      desc: "Manage teachers, subjects, departments & biometric IDs",
      icon: Users,
      badge: "Faculty",
      accent: "from-blue-500/20 via-blue-500/5 to-transparent border-blue-500/30 hover:border-blue-500/60",
      iconBg: "bg-blue-500/10 text-blue-400",
    },
  ];

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

            <h1 className="text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight">
              Smart University{" "}
              <span className="bg-gradient-to-r from-violet-400 via-fuchsia-300 to-indigo-300 bg-clip-text text-transparent">
                Intelligence System
              </span>
            </h1>

            <p className="text-slate-300 text-base leading-relaxed">
              Unified AI command center with instant Text-to-SQL analytics, real-time biometric identification, and automated attendance tracking.
            </p>

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
                className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700 text-slate-200 text-sm font-semibold transition-all backdrop-blur-md hover:-translate-y-0.5"
              >
                <ScanFace className="w-4 h-4 text-emerald-400" />
                <span>Open Biometric Scanner</span>
              </Link>
            </div>
          </div>

          {/* Connection Pill */}
          <div className="flex flex-col items-end gap-3 w-full lg:w-auto">
            <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-xl shadow-lg">
              {stats.apiConnected ? (
                <>
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                  <span className="text-xs font-semibold text-emerald-400">Backend API Active</span>
                </>
              ) : (
                <>
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse"></span>
                  <span className="text-xs font-medium text-amber-400">API Syncing (Port 8001)</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {statCards.map(({ label, value, icon: Icon, color, shadow, hint, href }) => (
          <Link
            key={label}
            href={href}
            className="group relative rounded-2xl bg-slate-900/90 border border-slate-800/80 hover:border-slate-700/90 p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl shadow-black/40 overflow-hidden"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-tr ${color} flex items-center justify-center shadow-lg ${shadow} group-hover:scale-110 transition-transform`}>
                <Icon className="w-6 h-6 text-white" />
              </div>
              <span className="text-xs text-slate-500 group-hover:text-violet-400 transition-colors flex items-center gap-1 font-medium">
                View <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </span>
            </div>

            <div className="space-y-1">
              <p className="text-3xl font-black text-white tracking-tight">
                {stats.loading ? (
                  <span className="inline-block w-12 h-8 bg-slate-800 rounded animate-pulse" />
                ) : (
                  value
                )}
              </p>
              <p className="text-sm font-semibold text-slate-300">{label}</p>
              <p className="text-xs text-slate-500">{hint}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick Access Modules */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
            <Zap className="w-5 h-5 text-violet-400" />
            <span>Core Intelligence Modules</span>
          </h2>
          <span className="text-xs text-slate-500">Select a service to launch</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {quickLinks.map(({ href, label, desc, icon: Icon, badge, accent, iconBg }) => (
            <Link
              key={href}
              href={href}
              className={`group relative rounded-2xl bg-slate-900/90 bg-gradient-to-b ${accent} border p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/50 flex flex-col justify-between`}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-xl ${iconBg} group-hover:scale-105 transition-transform`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700/60">
                    {badge}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-white mb-2 group-hover:text-violet-300 transition-colors">
                  {label}
                </h3>
                <p className="text-slate-400 text-xs leading-relaxed mb-6">
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

