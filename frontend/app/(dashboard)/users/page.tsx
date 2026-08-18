"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { usersApi, studentsApi, teachersApi } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { UserDetail, UserRole, Student, Teacher } from "@/types";
import {
  Plus, Search, Trash2, Pencil, KeyRound, X, Loader2,
  ChevronLeft, ChevronRight, ShieldCheck, UserCheck,
  ShieldAlert, Eye, EyeOff, RefreshCw, Link2, ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Role metadata ─────────────────────────────────────────────────────────────
const ROLE_META: Record<Exclude<UserRole, "STUDENT">, { label: string; badge: string; icon: React.ElementType }> = {
  ADMIN:   { label: "Admin",   badge: "bg-violet-500/15 text-violet-300 border-violet-500/30",  icon: ShieldCheck },
  TEACHER: { label: "Teacher", badge: "bg-sky-500/15 text-sky-300 border-sky-500/30",           icon: UserCheck },
};

// ─── Modal wrapper ────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl shadow-black/60 w-full max-w-md mx-4 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 flex-shrink-0">
          <h3 className="text-base font-semibold text-white">{title}</h3>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

// ─── Password input with toggle ───────────────────────────────────────────────
function PasswordInput({ value, onChange, placeholder = "Password" }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 pr-10 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-600/50"
      />
      <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}

// ─── Profile Link Picker ──────────────────────────────────────────────────────
function ProfileLinkPicker({
  role,
  value,
  onChange,
}: {
  role: UserRole;
  value: string;
  onChange: (id: string, name: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Array<{ id: string; name: string; sub: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [selectedName, setSelectedName] = useState("");
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Fetch unlinked profiles when search changes
  useEffect(() => {
    if (role === "ADMIN") { setResults([]); return; }
    setLoading(true);
    const params: Record<string, string | number | boolean> = { unlinked: true, limit: 20 };
    if (search) params.search = search;

    const promise = role === "STUDENT"
      ? studentsApi.list(params).then((res) =>
          res.items.map((s: Student) => ({ id: s.student_id, name: s.full_name, sub: `${s.dept_code} · Year ${s.academic_year}` }))
        )
      : teachersApi.list(params).then((res) =>
          res.items.map((t: Teacher) => ({ id: t.teacher_id, name: t.full_name, sub: `${t.dept_code} · ${t.designation}` }))
        );

    promise
      .then(setResults)
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
  }, [role, search]);

  const handleSelect = (id: string, name: string) => {
    setSelectedName(name);
    onChange(id, name);
    setOpen(false);
    setSearch("");
  };

  const handleClear = () => {
    setSelectedName("");
    onChange("", "");
  };

  if (role === "ADMIN") return null;

  const label = role === "STUDENT" ? "Link to Student Profile" : "Link to Teacher Profile";
  const placeholder = role === "STUDENT" ? "Search student by name or ID…" : "Search teacher by name or ID…";

  return (
    <div className="space-y-1" ref={wrapRef}>
      <label className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
        <Link2 className="w-3 h-3 text-violet-400" /> {label}
        <span className="text-slate-600 font-normal">(optional)</span>
      </label>

      {value && selectedName ? (
        // Selected state
        <div className="flex items-center justify-between px-3 py-2 bg-slate-800 border border-violet-600/40 rounded-lg">
          <div>
            <p className="text-sm text-slate-200 font-medium">{selectedName}</p>
            <p className="text-xs text-violet-400 font-mono">{value}</p>
          </div>
          <button type="button" onClick={handleClear} className="text-slate-500 hover:text-red-400 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        // Search input + dropdown
        <div className="relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setOpen(true); }}
              onFocus={() => setOpen(true)}
              placeholder={placeholder}
              className="w-full pl-8 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-600/50"
            />
            {loading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 animate-spin text-slate-500" />}
          </div>
          {open && (
            <div className="absolute z-10 top-full mt-1 w-full bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden">
              {results.length === 0 ? (
                <p className="px-3 py-3 text-xs text-slate-500 text-center">
                  {loading ? "Searching…" : "No unlinked profiles found"}
                </p>
              ) : (
                <ul className="max-h-44 overflow-y-auto divide-y divide-slate-800">
                  {results.map((r) => (
                    <li key={r.id}>
                      <button
                        type="button"
                        onClick={() => handleSelect(r.id, r.name)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-slate-800 transition-colors"
                      >
                        <div className="w-7 h-7 rounded-md bg-violet-600/20 border border-violet-700/30 flex items-center justify-center text-violet-300 text-xs font-bold flex-shrink-0">
                          {r.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm text-slate-200 font-medium truncate">{r.name}</p>
                          <p className="text-xs text-slate-500 font-mono">{r.id} · {r.sub}</p>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Create Dialog ────────────────────────────────────────────────────────────
function CreateUserDialog({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({
    username: "", email: "", password: "", role: "TEACHER" as UserRole,
    link_student_id: "", link_teacher_id: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLinkChange = (id: string) => {
    if (form.role === "STUDENT") setForm((f) => ({ ...f, link_student_id: id }));
    else if (form.role === "TEACHER") setForm((f) => ({ ...f, link_teacher_id: id }));
  };

  const linkedId = form.role === "STUDENT" ? form.link_student_id : form.role === "TEACHER" ? form.link_teacher_id : "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.username || !form.email || !form.password) { setError("Username, email and password are required."); return; }
    setLoading(true);
    try {
      const payload: Record<string, string> = { username: form.username, email: form.email, password: form.password, role: form.role };
      if (form.link_student_id) payload.link_student_id = form.link_student_id;
      if (form.link_teacher_id) payload.link_teacher_id = form.link_teacher_id;
      await usersApi.create(payload as Parameters<typeof usersApi.create>[0]);
      onSuccess();
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title="Create New User" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-400">Username</label>
          <input value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} placeholder="e.g. john_doe"
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-600/50" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-400">Email</label>
          <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="john@example.com"
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-600/50" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-400">Password</label>
          <PasswordInput value={form.password} onChange={(v) => setForm((f) => ({ ...f, password: v }))} placeholder="Min. 6 characters" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-400">Role</label>
          <select value={form.role}
            onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as UserRole, link_student_id: "", link_teacher_id: "" }))}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-600/50">
            <option value="TEACHER">Teacher</option>
            <option value="ADMIN">Admin</option>
          </select>
        </div>

        {/* Profile Link Picker — shown for STUDENT and TEACHER only */}
        <ProfileLinkPicker
          role={form.role}
          value={linkedId}
          onChange={(id) => handleLinkChange(id)}
        />

        {error && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="flex-1 py-2 rounded-lg border border-slate-700 text-slate-300 text-sm hover:bg-slate-800 transition-colors">Cancel</button>
          <button type="submit" disabled={loading}
            className="flex-1 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Create User
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Edit Dialog ──────────────────────────────────────────────────────────────
function EditUserDialog({ user, onClose, onSuccess }: { user: UserDetail; onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({ username: user.username, email: user.email, role: user.role });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await usersApi.update(user.user_id, form);
      onSuccess();
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title={`Edit User — ${user.username}`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-400">Username</label>
          <input value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-600/50" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-400">Email</label>
          <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-600/50" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-400">Role</label>
          <select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as UserRole }))}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-600/50">
            <option value="TEACHER">Teacher</option>
            <option value="ADMIN">Admin</option>
          </select>
        </div>
        {error && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="flex-1 py-2 rounded-lg border border-slate-700 text-slate-300 text-sm hover:bg-slate-800 transition-colors">Cancel</button>
          <button type="submit" disabled={loading}
            className="flex-1 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Pencil className="w-4 h-4" />}
            Save Changes
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Reset Password Dialog ────────────────────────────────────────────────────
function ResetPasswordDialog({ user, onClose, onSuccess }: { user: UserDetail; onClose: () => void; onSuccess: () => void }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (password !== confirm) { setError("Passwords do not match."); return; }
    setLoading(true);
    try {
      await usersApi.resetPassword(user.user_id, password);
      setDone(true);
      setTimeout(onSuccess, 1200);
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title={`Reset Password — ${user.username}`} onClose={onClose}>
      {done ? (
        <div className="text-center py-4 space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto">
            <KeyRound className="w-6 h-6 text-emerald-400" />
          </div>
          <p className="text-sm text-emerald-400 font-medium">Password reset successfully!</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-xs text-slate-400">Setting a new password for <span className="text-slate-200 font-semibold">{user.username}</span>.</p>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-400">New Password</label>
            <PasswordInput value={password} onChange={setPassword} placeholder="Min. 6 characters" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-400">Confirm Password</label>
            <PasswordInput value={confirm} onChange={setConfirm} placeholder="Re-enter password" />
          </div>
          {error && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 rounded-lg border border-slate-700 text-slate-300 text-sm hover:bg-slate-800 transition-colors">Cancel</button>
            <button type="submit" disabled={loading}
              className="flex-1 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
              Reset Password
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}

// ─── Linked Profile Cell ──────────────────────────────────────────────────────
function LinkedProfileCell({ user }: { user: UserDetail }) {
  const { student_id, teacher_id, linked_name, role } = user;

  if (!student_id && !teacher_id) {
    return <span className="text-slate-600 text-xs">Not linked</span>;
  }

  const id = student_id ?? teacher_id!;
  const href = student_id ? `/students` : `/teachers`;
  const idColor = student_id ? "text-teal-400" : "text-sky-400";
  const badgeBg = student_id ? "bg-teal-500/10 border-teal-500/20 hover:bg-teal-500/20" : "bg-sky-500/10 border-sky-500/20 hover:bg-sky-500/20";

  return (
    <div className="space-y-0.5">
      {linked_name && (
        <p className="text-xs text-slate-300 font-medium truncate max-w-[140px]" title={linked_name}>
          {linked_name}
        </p>
      )}
      <Link
        href={href}
        title={`Go to ${role === "STUDENT" ? "Students" : "Teachers"} page`}
        className={cn(
          "inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-mono transition-colors",
          idColor, badgeBg
        )}
      >
        {id}
        <ExternalLink className="w-2.5 h-2.5 opacity-60" />
      </Link>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const router = useRouter();

  const [users, setUsers] = useState<UserDetail[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState<"" | UserRole>("");
  const [page, setPage] = useState(0);
  const limit = 15;

  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<UserDetail | null>(null);
  const [resetTarget, setResetTarget] = useState<UserDetail | null>(null);

  // Admin-only guard
  useEffect(() => {
    if (currentUser && currentUser.role !== "ADMIN") {
      router.replace("/");
    }
  }, [currentUser, router]);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const params: Record<string, string | number> = { skip: page * limit, limit };
      if (search) params.search = search;
      if (filterRole) params.role = filterRole;
      const res = await usersApi.list(params);
      setUsers(res.items);
      setTotal(res.total);
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [page, search, filterRole]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleDelete = async (u: UserDetail) => {
    if (u.user_id === currentUser?.user_id) { alert("You cannot delete your own account."); return; }
    if (!confirm(`Delete user "${u.username}"? This cannot be undone.`)) return;
    try {
      await usersApi.delete(u.user_id);
      fetchUsers();
    } catch (e: unknown) {
      alert((e as Error).message);
    }
  };

  const totalPages = Math.ceil(total / limit);
  const roles: Array<"" | UserRole> = ["", "ADMIN", "TEACHER"];

  if (currentUser && currentUser.role !== "ADMIN") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
        <ShieldAlert className="w-12 h-12 text-red-400" />
        <h2 className="text-xl font-bold text-white">Access Denied</h2>
        <p className="text-slate-400 text-sm">User Management is restricted to Administrators only.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">User Management</h2>
          <p className="text-sm text-slate-400 mt-0.5">{total} registered user accounts</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchUsers}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-300 text-sm font-medium transition-colors">
            <RefreshCw className="w-4 h-4 text-slate-400" /> Refresh
          </button>
          <button onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors shadow-lg shadow-violet-900/30">
            <Plus className="w-4 h-4" /> Add User
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            placeholder="Search by username or email…"
            className="w-full pl-9 pr-9 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-600/50" />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-500 font-medium">Role:</span>
          {roles.map((r) => {
            const meta = r ? ROLE_META[r] : null;
            return (
              <button key={r || "all"} onClick={() => { setFilterRole(r); setPage(0); }}
                className={cn("px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors",
                  filterRole === r
                    ? r ? `${meta!.badge} border-current` : "bg-slate-700 border-slate-500 text-white"
                    : "border-slate-700 text-slate-400 hover:border-slate-500")}>
                {r || "All"}
              </button>
            );
          })}
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-violet-400" />
          </div>
        ) : error ? (
          <div className="text-center py-16 text-red-400 text-sm">{error}</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-slate-800 bg-slate-950/50">
              <tr className="text-left text-slate-500 text-xs uppercase tracking-wider">
                {["User ID", "Username", "Email", "Role", "Linked Profile", "Created", "Actions"].map((h) => (
                  <th key={h} className="px-4 py-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-500">
                    No users found.{" "}
                    <button onClick={() => setShowCreate(true)} className="text-violet-400 hover:underline">Add one?</button>
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const meta = ROLE_META[u.role as Exclude<UserRole, "STUDENT">] ?? {
                    label: u.role, badge: "bg-slate-500/15 text-slate-300 border-slate-500/30", icon: UserCheck,
                  };
                  const RoleIcon = meta.icon;
                  const isSelf = u.user_id === currentUser?.user_id;
                  return (
                    <tr key={u.user_id} className="hover:bg-slate-800/30 transition-colors group">
                      <td className="px-4 py-3 font-mono text-violet-400 text-xs">{u.user_id}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600/40 to-indigo-600/40 border border-violet-700/30 flex items-center justify-center text-violet-300 text-xs font-bold flex-shrink-0">
                            {u.username.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium text-slate-200">{u.username}</span>
                          {isSelf && (
                            <span className="text-[10px] bg-violet-600/20 text-violet-300 border border-violet-500/30 px-1.5 py-0.5 rounded-full font-semibold">You</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs">{u.email}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold border uppercase tracking-wider ${meta.badge}`}>
                          <RoleIcon className="w-3 h-3" />
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <LinkedProfileCell user={u} />
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {new Date(u.created_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => setEditTarget(u)} title="Edit user"
                            className="p-1.5 rounded-md hover:bg-violet-900/30 hover:text-violet-400 text-slate-500 transition-colors">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => setResetTarget(u)} title="Reset password"
                            className="p-1.5 rounded-md hover:bg-amber-900/30 hover:text-amber-400 text-slate-500 transition-colors">
                            <KeyRound className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(u)} title="Delete user" disabled={isSelf}
                            className="p-1.5 rounded-md hover:bg-red-900/30 hover:text-red-400 text-slate-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-slate-400">
          <span>Page {page + 1} of {totalPages} — {total} total users</span>
          <div className="flex gap-2">
            <button disabled={page === 0} onClick={() => setPage((p) => p - 1)}
              className="p-2 rounded-lg bg-slate-800 border border-slate-700 disabled:opacity-40 hover:bg-slate-700 transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button disabled={page + 1 >= totalPages} onClick={() => setPage((p) => p + 1)}
              className="p-2 rounded-lg bg-slate-800 border border-slate-700 disabled:opacity-40 hover:bg-slate-700 transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Dialogs */}
      {showCreate && (
        <CreateUserDialog onClose={() => setShowCreate(false)} onSuccess={() => { setShowCreate(false); fetchUsers(); }} />
      )}
      {editTarget && (
        <EditUserDialog user={editTarget} onClose={() => setEditTarget(null)} onSuccess={() => { setEditTarget(null); fetchUsers(); }} />
      )}
      {resetTarget && (
        <ResetPasswordDialog user={resetTarget} onClose={() => setResetTarget(null)} onSuccess={() => setResetTarget(null)} />
      )}
    </div>
  );
}
