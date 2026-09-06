"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import {
  Bell,
  LogOut,
  ShieldCheck,
  UserCheck,
  ChevronDown,
  User,
  Settings,
  Mail,
} from "lucide-react";

const PAGE_TITLES: Record<string, string> = {
  "/": "Dashboard Overview",
  "/students": "Students Directory",
  "/teachers": "Teachers Directory",
  "/departments": "Academic Departments",
  "/courses": "Curriculum Courses",
  "/semesters": "Academic Semesters",
  "/enrollments": "Course Enrollments",
  "/classrooms": "Classrooms & Halls",
  "/timetables": "Timetables & Schedules",
  "/attendance": "Attendance Management",
  "/chatbot": "AI Chatbot Assistant",
  "/face-scanner": "Face Recognition Scanner",
  "/users": "User Management",
  "/settings": "System ID Settings",
};

const ROLE_META = {
  ADMIN: {
    icon: ShieldCheck,
    label: "System Administrator",
    badgeClass: "badge-violet border",
    avatarClass: "from-violet-600 via-indigo-600 to-purple-700",
    glowClass: "shadow-violet-500/20",
  },
  TEACHER: {
    icon: UserCheck,
    label: "Faculty Member",
    badgeClass: "badge-sky border",
    avatarClass: "from-sky-600 via-cyan-600 to-blue-700",
    glowClass: "shadow-sky-500/20",
  },
};

export function Header() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const title = Object.entries(PAGE_TITLES).find(([key]) =>
    key === "/" ? pathname === "/" : pathname.startsWith(key)
  )?.[1] ?? "SUIS Management System";

  const meta = user?.role && user.role in ROLE_META
    ? ROLE_META[user.role as "ADMIN" | "TEACHER"]
    : ROLE_META.TEACHER;
  const RoleIcon = meta.icon;

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="h-16 border-b border-theme-border bg-theme-surface/80 backdrop-blur-sm sticky top-0 z-10 flex items-center justify-between px-6 transition-colors duration-300">
      {/* Page Title */}
      <div>
        <h1 className="text-lg font-semibold text-theme-text">{title}</h1>
      </div>

      <div className="flex items-center gap-3">
        {/* Theme Toggle */}
        <ThemeToggle />

        {/* Notifications */}
        <button className="relative w-9 h-9 rounded-lg bg-theme-surface border border-theme-border flex items-center justify-center text-theme-muted hover:text-theme-text hover:border-theme-border-hover transition-all">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-sky-500 rounded-full" />
        </button>

        {/* User Profile Dropdown */}
        {user ? (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2.5 pl-3 pr-2.5 py-1.5 rounded-xl bg-theme-surface border border-theme-border hover:border-theme-border-hover transition-all group"
            >
              {/* Avatar */}
              <div className={`w-7 h-7 rounded-lg bg-gradient-to-tr ${meta.avatarClass} flex items-center justify-center text-white text-xs font-bold shadow-md ${meta.glowClass}`}>
                {user.username.charAt(0).toUpperCase()}
              </div>

              {/* Name & Role */}
              <div className="hidden sm:block text-left">
                <p className="text-xs font-bold text-theme-text leading-tight">
                  {user.username}
                </p>
                <div className="flex items-center gap-1">
                  <RoleIcon className="w-3 h-3 text-theme-muted" />
                  <span className="text-[10px] text-theme-muted font-medium">{meta.label}</span>
                </div>
              </div>

              <ChevronDown className={`w-3.5 h-3.5 text-theme-muted transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`} />
            </button>

            {/* Dropdown Panel */}
            {dropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-theme-surface border border-theme-border rounded-2xl shadow-2xl shadow-black/30 overflow-hidden z-50">
                {/* Profile Header */}
                <div className="p-4 border-b border-theme-border">
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-xl bg-gradient-to-tr ${meta.avatarClass} flex items-center justify-center text-white text-base font-bold shadow-lg ${meta.glowClass}`}>
                      {user.username.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-theme-text truncate">{user.username}</p>
                      <p className="text-xs text-theme-sub truncate">{user.email}</p>
                      <span className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${meta.badgeClass}`}>
                        <RoleIcon className="w-3 h-3" />
                        {user.role}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Menu Items */}
                <div className="p-1.5 space-y-0.5">
                  <div className="flex items-center gap-3 px-3 py-2 rounded-lg text-theme-sub text-xs">
                    <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="truncate">{user.email}</span>
                  </div>
                  <div className="flex items-center gap-3 px-3 py-2 rounded-lg text-theme-sub text-xs">
                    <User className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>ID: <span className="text-theme-text font-mono">{user.user_id}</span></span>
                  </div>
                </div>

                {/* Divider + Logout */}
                <div className="p-1.5 border-t border-theme-border">
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      if (confirm("Sign out of SUIS Management System?")) {
                        logout();
                      }
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="w-32 h-9 rounded-xl bg-theme-elevated animate-pulse" />
        )}
      </div>
    </header>
  );
}
