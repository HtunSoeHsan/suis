"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  GraduationCap,
  Users,
  Building2,
  BookOpen,
  Calendar,
  UserCheck,
  DoorOpen,
  CalendarRange,
  CalendarCheck,
  MessageSquareText,
  ScanFace,
  LayoutDashboard,
  Settings2,
  UserCog,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/students", label: "Students", icon: GraduationCap },
  { href: "/teachers", label: "Teachers", icon: Users },
  { href: "/departments", label: "Departments", icon: Building2 },
  { href: "/courses", label: "Courses", icon: BookOpen },
  { href: "/semesters", label: "Semesters", icon: Calendar },
  { href: "/enrollments", label: "Enrollments", icon: UserCheck },
  { href: "/classrooms", label: "Classrooms", icon: DoorOpen },
  { href: "/timetables", label: "Timetables", icon: CalendarRange },
  { href: "/attendance", label: "Attendance", icon: CalendarCheck },
  { href: "/chatbot", label: "AI Chatbot", icon: MessageSquareText },
  { href: "/face-scanner", label: "Face Scanner", icon: ScanFace },
  { href: "/users", label: "User Management", icon: UserCog },
  { href: "/settings", label: "Settings", icon: Settings2 },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 min-h-screen bg-slate-950 border-r border-slate-800 flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-900/40">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-white text-sm tracking-wide">SUIS</p>
            <p className="text-xs text-slate-400">Smart University</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                active
                  ? "bg-violet-600/20 text-violet-300 border border-violet-600/30 shadow-sm shadow-violet-900/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              )}
            >
              <Icon
                className={cn("w-4 h-4 flex-shrink-0", active ? "text-violet-400" : "")}
              />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-slate-800">
        <p className="text-xs text-slate-500 text-center font-medium">
          SUIS v1.0 — Smart University System
        </p>
      </div>
    </aside>
  );
}
