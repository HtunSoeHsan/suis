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
  TrendingUp,
  BookOpen,
  LayoutDashboard,
  ChevronRight,
  Brain,
  ShieldCheck,
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
    students: "…",
    teachers: "…",
    attendance: "…",
    enrolledFaces: "…",
    loading: true,
  });

  useEffect(() => {
    async function loadStats() {
      try {
        const [studRes, teachRes, studFaceRes, teachFaceRes, attRes] =
          await Promise.allSettled([
            studentsApi.list({ limit: 1 }),
            teachersApi.list({ limit: 1 }),
            studentsApi.list({ is_face_registered: true, limit: 1 }),
            teachersApi.list({ is_face_registered: true, limit: 1 }),
            attendanceApi.list({ limit: 1 }),
          ]);

        setStats({
          students:
            studRes.status === "fulfilled" ? (studRes.value.total ?? 0) : 0,
          teachers:
            teachRes.status === "fulfilled" ? (teachRes.value.total ?? 0) : 0,
          attendance:
            attRes.status === "fulfilled" ? (attRes.value.total ?? 0) : 0,
          enrolledFaces:
            (studFaceRes.status === "fulfilled"
              ? (studFaceRes.value.total ?? 0)
              : 0) +
            (teachFaceRes.status === "fulfilled"
              ? (teachFaceRes.value.total ?? 0)
              : 0),
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
      color: "from-violet-500 via-indigo-500 to-purple-600",
      glow: "shadow-violet-500/25",
      hint: "Registered student directory",
      href: "/students",
      trend: "+2 this month",
    },
    {
      label: "Total Teachers",
      value: stats.teachers,
      icon: Users,
      color: "from-sky-500 via-cyan-500 to-teal-600",
      glow: "shadow-sky-500/25",
      hint: "Faculty & academic staff",
      href: "/teachers",
      trend: "Active faculty",
    },
    {
      label: "Attendance Logs",
      value: stats.attendance,
      icon: CalendarCheck,
      color: "from-emerald-500 via-teal-500 to-green-600",
      glow: "shadow-emerald-500/25",
      hint: "Total recorded attendance",
      href: "/attendance",
      trend: "Automated tracking",
    },
    {
      label: "Registered Faces",
      value: stats.enrolledFaces,
      icon: Fingerprint,
      color: "from-rose-500 via-pink-500 to-purple-600",
      glow: "shadow-rose-500/25",
      hint: "Registered face profiles",
      href: "/face-scanner",
      trend: "Face ID System",
    },
  ];

  const visibleStatCards = isAdmin
    ? statCards
    : statCards.filter((c) => c.href !== "/face-scanner");

  const quickLinks = [
    {
      href: "/chatbot",
      label: "Smart Assistant",
      desc: "Ask university data questions in plain English and get instant answers.",
      icon: Brain,
      badge: "AI Assistant",
      color: "from-amber-500 to-orange-500",
      accentBorder: "hover:border-amber-400/60",
      iconBg: "badge-amber border",
    },
    {
      href: "/face-scanner",
      label: "Face Scanner",
      desc: "Real-time webcam recognition for instant attendance verification.",
      icon: ScanFace,
      badge: "Recognition",
      color: "from-emerald-500 to-teal-500",
      accentBorder: "hover:border-emerald-400/60",
      iconBg: "badge-emerald border",
    },
    {
      href: "/students",
      label: "Student Directory",
      desc: "Add profiles, view records & manage facial data for recognition.",
      icon: GraduationCap,
      badge: "Management",
      color: "from-violet-500 to-indigo-500",
      accentBorder: "hover:border-violet-400/60",
      iconBg: "badge-violet border",
    },
    {
      href: "/teachers",
      label: "Faculty Portal",
      desc: "Manage teachers, subjects, departments & user profiles in one place.",
      icon: Users,
      badge: "Faculty",
      color: "from-sky-500 to-blue-500",
      accentBorder: "hover:border-sky-400/60",
      iconBg: "badge-sky border",
    },
  ];

  const visibleQuickLinks = isAdmin
    ? quickLinks
    : quickLinks.filter(
        (l) => l.href !== "/chatbot" && l.href !== "/face-scanner"
      );

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-10">

      {/* ── Hero Banner ─────────────────────────────────────────────── */}
      <div className="relative rounded-3xl overflow-hidden border border-violet-200/60 shadow-2xl hero-banner-bg">
        {/* Decorative orbs — visible in both themes */}
        <div className="absolute -top-20 -left-20 w-80 h-80 bg-violet-400/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-indigo-400/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-fuchsia-400/10 rounded-full blur-3xl pointer-events-none" />

        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.035] pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(rgba(109,40,217,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(109,40,217,0.6) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        <div className="relative z-10 p-8 lg:p-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
          {/* Left: text */}
          <div className="space-y-5 max-w-2xl">
            {/* Tag pill */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-bold uppercase tracking-widest badge-violet shadow-sm backdrop-blur-sm">
              <Sparkles className="w-3.5 h-3.5 animate-pulse" />
              Smart Campus Portal
            </div>

            <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight hero-title-text">
              Smart University{" "}
              <span className="bg-gradient-to-r from-violet-500 via-fuchsia-400 to-indigo-400 bg-clip-text text-transparent">
                Intelligence System
              </span>
            </h1>

            <p className="text-theme-sub text-base leading-relaxed max-w-lg">
              Unified campus management platform with smart analytics,
              real-time face recognition, and automated attendance
              tracking.
            </p>

            {/* Feature pills */}
            <div className="flex flex-wrap gap-2">
              {[
                { icon: Brain, label: "Smart Analytics" },
                { icon: Fingerprint, label: "Face Recognition" },
                { icon: ShieldCheck, label: "Secure Access" },
                { icon: TrendingUp, label: "Live Overview" },
              ].map(({ icon: Ic, label }) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-theme-surface/80 border border-theme-border text-theme-sub backdrop-blur-sm shadow-sm"
                >
                  <Ic className="w-3 h-3 text-violet-500" />
                  {label}
                </span>
              ))}
            </div>

            {/* CTA buttons */}
            {isAdmin && (
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <Link
                  href="/chatbot"
                  className="group inline-flex items-center gap-2.5 px-5 py-2.5 rounded-xl
                    bg-gradient-to-r from-violet-600 to-indigo-600
                    hover:from-violet-500 hover:to-indigo-500
                    text-white text-sm font-semibold
                    shadow-lg shadow-violet-600/30 hover:shadow-violet-500/50
                    transition-all hover:-translate-y-0.5 active:translate-y-0"
                >
                  <MessageSquareText className="w-4 h-4" />
                  <span>Launch Smart Assistant</span>
                  <ArrowRight className="w-4 h-4 text-violet-200 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link
                  href="/face-scanner"
                  className="group inline-flex items-center gap-2.5 px-5 py-2.5 rounded-xl bg-theme-surface/90 backdrop-blur-sm border border-theme-border text-theme-text text-sm font-semibold shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 active:translate-y-0"
                >
                  <ScanFace className="w-4 h-4 text-emerald-500" />
                  <span>Open Attendance Scanner</span>
                  <ChevronRight className="w-4 h-4 text-theme-muted group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>
            )}
          </div>

          {/* Right: floating metrics preview */}
          <div className="hidden lg:flex flex-col gap-3 min-w-[200px]">
            {[
              { label: "Live Sessions", value: "Active", dot: "bg-emerald-400" },
              { label: "Smart Assistant", value: "Ready", dot: "bg-amber-400" },
              { label: "Face Recognition", value: "Active", dot: "bg-sky-400" },
            ].map(({ label, value, dot }) => (
              <div
                key={label}
                className="flex items-center justify-between gap-4 px-4 py-2.5 rounded-xl bg-theme-surface/70 backdrop-blur-sm border border-theme-border shadow-sm"
              >
                <span className="text-xs text-theme-sub font-medium">{label}</span>
                <span className="flex items-center gap-1.5 text-xs font-bold text-theme-text">
                  <span className={`w-2 h-2 rounded-full ${dot} animate-pulse`} />
                  {value}
                </span>
              </div>
            ))}

            <div className="mt-1 px-4 py-3 rounded-xl hero-status-panel border text-center">
              <p className="text-[11px] hero-status-label font-semibold uppercase tracking-wider">System Status</p>
              <p className="text-lg font-black hero-status-value mt-0.5">All Online</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Stats Grid ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {visibleStatCards.map(({ label, value, icon: Icon, color, glow, hint, href, trend }) => (
          <Link
            key={label}
            href={href}
            className="group relative rounded-2xl bg-theme-surface border border-theme-border
              hover:border-theme-border-hover p-6 transition-all duration-300
              hover:-translate-y-1 hover:shadow-xl shadow-sm overflow-hidden"
          >
            {/* Subtle colored bg wash on hover */}
            <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-[0.04] transition-opacity duration-300 from-violet-500 to-indigo-500 pointer-events-none" />

            <div className="relative">
              <div className="flex items-start justify-between mb-5">
                <div
                  className={`w-12 h-12 rounded-xl bg-gradient-to-tr ${color} flex items-center justify-center shadow-lg ${glow} group-hover:scale-110 transition-transform duration-300`}
                >
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] font-medium badge-emerald border px-2 py-0.5 rounded-full">
                  <TrendingUp className="w-2.5 h-2.5" />
                  {trend}
                </span>
              </div>

              <p className="text-3xl font-black text-theme-text tracking-tight mb-1">
                {stats.loading ? (
                  <span className="inline-block w-14 h-8 bg-theme-elevated rounded-lg animate-pulse" />
                ) : (
                  value
                )}
              </p>
              <p className="text-sm font-bold text-theme-text">{label}</p>
              <p className="text-xs font-semibold text-theme-sub mt-0.5">{hint}</p>

              <div className="mt-4 pt-4 border-t border-theme-border flex items-center gap-1 text-xs font-semibold text-violet-500 dark:text-violet-400 opacity-0 group-hover:opacity-100 transition-opacity">
                View all <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* ── Quick-Access Modules ─────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-theme-text flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-violet-500 to-indigo-500 flex items-center justify-center shadow-md shadow-violet-500/30">
              <Zap className="w-4 h-4 text-white" />
            </div>
            Core Intelligence Modules
          </h2>
          <span className="text-xs font-semibold text-theme-sub hidden sm:block">
            {visibleQuickLinks.length} services available
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {visibleQuickLinks.map(({ href, label, desc, icon: Icon, badge, color, accentBorder, iconBg }) => (
            <Link
              key={href}
              href={href}
              className={`group relative rounded-2xl bg-theme-surface border border-theme-border ${accentBorder}
                p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/10
                flex flex-col justify-between overflow-hidden`}
            >
              {/* Top gradient accent line */}
              <div className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r ${color} opacity-0 group-hover:opacity-100 transition-opacity rounded-t-2xl`} />

              <div>
                <div className="flex items-start justify-between mb-5">
                  <div className={`p-3 rounded-xl ${iconBg} group-hover:scale-105 transition-transform duration-300`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full
                    bg-theme-elevated text-theme-sub border border-theme-border">
                    {badge}
                  </span>
                </div>

                <h3 className="text-base font-bold text-theme-text mb-2 group-hover:text-violet-500 transition-colors">
                  {label}
                </h3>
                <p className="text-theme-sub text-xs font-semibold leading-relaxed">
                  {desc}
                </p>
              </div>

              <div className="mt-5 pt-4 border-t border-theme-border flex items-center justify-between">
                <span className="text-xs font-semibold text-violet-500 dark:text-violet-400 group-hover:text-violet-600 dark:group-hover:text-violet-300 transition-colors flex items-center gap-1">
                  Access Module
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </span>
                <LayoutDashboard className="w-3.5 h-3.5 text-theme-muted opacity-0 group-hover:opacity-60 transition-opacity" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* ── System Info bar ─────────────────────────────────────────── */}
      <div className="rounded-2xl border border-theme-border bg-theme-surface px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <BookOpen className="w-4 h-4 text-violet-500" />
          <span className="text-sm font-semibold text-theme-text">Smart University Intelligence System</span>
          <span className="text-xs badge-violet border px-2 py-0.5 rounded-full font-bold">v3.0</span>
        </div>
        <div className="flex items-center gap-5 text-xs text-theme-muted">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Backend Online</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" /> AI Models Ready</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" /> Face Engine Active</span>
        </div>
      </div>

    </div>
  );
}
