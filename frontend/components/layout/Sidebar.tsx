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
  Award,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import type { UserRole } from "@/types";

// roles: undefined = visible to all, otherwise only listed roles can see it
const navItems: { href: string; label: string; icon: React.ElementType; roles?: UserRole[] }[] = [
  { href: "/",            label: "Dashboard",       icon: LayoutDashboard },
  { href: "/students",    label: "Students",        icon: GraduationCap,  roles: ["ADMIN", "TEACHER"] },
  { href: "/teachers",    label: "Teachers",        icon: Users,          roles: ["ADMIN", "TEACHER"] },
  { href: "/departments", label: "Departments",     icon: Building2,      roles: ["ADMIN", "TEACHER"] },
  { href: "/courses",     label: "Courses",         icon: BookOpen },
  { href: "/semesters",   label: "Semesters",       icon: Calendar,       roles: ["ADMIN", "TEACHER"] },
  { href: "/enrollments", label: "Enrollments",     icon: UserCheck,      roles: ["ADMIN"] },
  { href: "/classrooms",  label: "Classrooms",      icon: DoorOpen,       roles: ["ADMIN", "TEACHER"] },
  { href: "/timetables",  label: "Timetables",      icon: CalendarRange },
  { href: "/attendance",  label: "Attendance",      icon: CalendarCheck },
  { href: "/chatbot",     label: "AI Chatbot",      icon: MessageSquareText, roles: ["ADMIN"] },
  { href: "/face-scanner",label: "Face Scanner",    icon: ScanFace,        roles: ["ADMIN"] },
  { href: "/users",       label: "User Management", icon: UserCog,        roles: ["ADMIN"] },
  { href: "/settings",    label: "Settings",        icon: Settings2,      roles: ["ADMIN"] },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const role = user?.role ?? "TEACHER";
  const visibleItems = navItems.filter((item) =>
    !item.roles || item.roles.includes(role as UserRole)
  );

  return (
    <aside className="w-64 min-h-screen bg-theme-surface border-r border-theme-border flex flex-col transition-colors duration-300">
      {/* Logo */}
      <div className="p-6 border-b border-theme-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-900/40">
            <BookOpen className="w-5 h-5 text-theme-text" />
          </div>
          <div>
            <p className="font-bold text-theme-text text-sm tracking-wide">SUIS</p>
            <p className="text-xs text-theme-muted">Smart University</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {visibleItems.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                active
                  ? "bg-violet-600/20 text-violet-400 border border-violet-600/30 shadow-sm shadow-violet-900/30"
                  : "text-theme-sub hover:text-theme-text hover:bg-theme-elevated"
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
      <div className="p-4 border-t border-theme-border">
        <p className="text-xs text-theme-muted text-center font-medium">
          SUIS — Smart University System
        </p>
      </div>
    </aside>
  );
}
