"use client";

import { useState, useEffect } from "react";
import type { Student, Department, Course, Semester } from "@/types";
import { studentsApi, departmentsApi, coursesApi, semestersApi, enrollmentsApi } from "@/lib/api";
import { X, Loader2, Save, ChevronDown, BookOpen, Check, User, Phone, GraduationCap, ShieldCheck } from "lucide-react";

interface Props {
  student?: Student;
  onClose: () => void;
}

const EMPTY = {
  student_id: "", full_name: "", dept_code: "CST",
  roll_number: "", academic_year: "4", phone: "", section: "",
  email: "", nrc_number: "", gender: "Male", date_of_birth: "",
  blood_type: "", address: "", guardian_name: "", guardian_phone: "",
  admission_year: new Date().getFullYear().toString(), status: "Active", major: "CST",
  cgpa: "",
};

const SECTIONS = [
  { value: "", label: "No Section" },
  { value: "A", label: "Section A" },
  { value: "B", label: "Section B" },
  { value: "C", label: "Section C" },
];

export function StudentFormDialog({ student, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<"academic" | "personal" | "guardian">("academic");
  const [form, setForm] = useState({ ...EMPTY });
  const [departments, setDepartments] = useState<Department[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [selectedSemesterId, setSelectedSemesterId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    departmentsApi.list({ limit: 100 }).then((res) => {
      setDepartments(res.items);
    }).catch(() => {});

    semestersApi.list({ limit: 50 }).then((res) => {
      setSemesters(res.items);
      const active = res.items.find((s) => s.is_active);
      if (active) setSelectedSemesterId(active.semester_id);
      else if (res.items.length > 0) setSelectedSemesterId(res.items[0].semester_id);
    }).catch(() => {});

    coursesApi.list({ limit: 100 }).then((res) => {
      setCourses(res.items);
    }).catch(() => {});
  }, [student]);

  useEffect(() => {
    if (student) {
      setForm({
        student_id: student.student_id,
        full_name: student.full_name,
        dept_code: student.dept_code ?? "",
        roll_number: student.roll_number ?? "",
        academic_year: student.academic_year?.toString() ?? "4",
        phone: student.phone ?? "",
        section: student.section ?? "",
        email: student.email ?? "",
        nrc_number: student.nrc_number ?? "",
        gender: student.gender ?? "Male",
        date_of_birth: student.date_of_birth ?? "",
        blood_type: student.blood_type ?? "",
        address: student.address ?? "",
        guardian_name: student.guardian_name ?? "",
        guardian_phone: student.guardian_phone ?? "",
        admission_year: student.admission_year?.toString() ?? new Date().getFullYear().toString(),
        status: student.status ?? "Active",
        major: student.major ?? "",
        cgpa: student.cgpa != null ? student.cgpa.toString() : "",
      });

      enrollmentsApi.list({ student_id: student.student_id, limit: 100 }).then((res) => {
        setSelectedCourses(res.items.map((e) => e.course_code));
      }).catch(() => {});
    }
  }, [student]);

  const matchingCourses = courses.filter((c) => {
    return selectedSemesterId ? c.semester_id === selectedSemesterId : true;
  });

  const handleSemesterChange = (newSemId: number | null) => {
    setSelectedSemesterId(newSemId);
    setSelectedCourses([]);
  };

  const toggleCourse = (code: string) => {
    setSelectedCourses((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const set = (k: keyof typeof EMPTY, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const payload = {
        full_name: form.full_name,
        dept_code: form.dept_code,
        roll_number: form.roll_number || undefined,
        academic_year: form.academic_year ? parseInt(form.academic_year) : 4,
        phone: form.phone || undefined,
        section: (form.section || undefined) as "A" | "B" | "C" | undefined,
        email: form.email || undefined,
        nrc_number: form.nrc_number || undefined,
        gender: (form.gender || undefined) as "Male" | "Female" | "Other" | undefined,
        date_of_birth: form.date_of_birth || undefined,
        blood_type: (form.blood_type || undefined) as any,
        address: form.address || undefined,
        guardian_name: form.guardian_name || undefined,
        guardian_phone: form.guardian_phone || undefined,
        admission_year: form.admission_year ? parseInt(form.admission_year) : undefined,
        status: (form.status || "Active") as any,
        major: form.major || undefined,
        cgpa: form.cgpa ? parseFloat(form.cgpa) : undefined,
      };

      let targetStudentId = student?.student_id;

      if (student) {
        await studentsApi.update(student.student_id, payload);
      } else {
        const created = await studentsApi.create({
          ...payload,
          student_id: form.student_id || undefined,
        });
        targetStudentId = created.student_id;
      }

      if (targetStudentId && selectedSemesterId && selectedCourses.length > 0) {
        await enrollmentsApi.createBatch({
          student_ids: [targetStudentId],
          course_codes: selectedCourses,
          semester_id: selectedSemesterId,
        });
      }

      onClose();
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full px-3 py-2 bg-theme-elevated border border-theme-border-hover rounded-lg text-sm text-theme-text placeholder:text-theme-muted focus:outline-none focus:ring-2 focus:ring-violet-600/50 disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-theme-surface border border-theme-border-hover rounded-2xl shadow-2xl w-full max-w-xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-theme-border shrink-0">
          <h3 className="font-semibold text-theme-text text-lg flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-violet-400" />
            {student ? "Edit Student Profile & Enrollments" : "Add Student & Enroll Courses"}
          </h3>
          <button onClick={onClose} className="text-theme-muted hover:text-theme-text transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-theme-border px-5 bg-theme-base/40">
          {[
            { id: "academic", label: "Academic & Courses", icon: GraduationCap },
            { id: "personal", label: "Personal Details", icon: User },
            { id: "guardian", label: "Guardian & Contact", icon: Phone },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id as any)}
              className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 transition-colors ${
                activeTab === id
                  ? "border-violet-500 text-violet-400 bg-violet-950/20"
                  : "border-transparent text-theme-sub hover:text-theme-text"
              }`}
            >
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* TAB 1: ACADEMIC & COURSES */}
          {activeTab === "academic" && (
            <div className="space-y-4 animate-in fade-in">
              {/* Full Name & Student ID */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-theme-sub mb-1.5">Full Name *</label>
                  <input type="text" value={form.full_name}
                    onChange={(e) => set("full_name", e.target.value)}
                    placeholder="Mg Mg" required className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-theme-sub mb-1.5">
                    {student ? "Student ID" : "Student ID (Auto)"}
                  </label>
                  <input type="text" value={form.student_id}
                    onChange={(e) => set("student_id", e.target.value)}
                    placeholder={student ? form.student_id : "Auto-generated"}
                    disabled={!!student} className={inputClass} />
                </div>
              </div>

              {/* Major + Section */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-theme-sub mb-1.5">Major *</label>
                  <div className="relative">
                    <select
                      value={form.major || form.dept_code || "CST"}
                      onChange={(e) => {
                        const val = e.target.value;
                        set("major", val);
                        set("dept_code", val);
                      }}
                      required
                      className={`${inputClass} appearance-none pr-9`}
                    >
                      <option value="CST">CST — Computer Science & Technology</option>
                      <option value="CS">CS — Computer Science</option>
                      <option value="CT">CT — Computer Technology</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-sub pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-theme-sub mb-1.5">Section</label>
                  <div className="grid grid-cols-4 gap-1">
                    {SECTIONS.map(({ value }) => (
                      <button key={value} type="button"
                        onClick={() => set("section", value)}
                        className={`py-2 rounded-lg text-xs font-semibold border transition-colors ${
                          form.section === value
                            ? "bg-teal-600 border-teal-500 text-theme-text"
                            : "border-theme-border-hover text-theme-sub hover:border-slate-500 hover:text-theme-text"
                        }`}>
                        {value || "—"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Academic Year */}
              <div>
                <label className="block text-xs font-medium text-theme-sub mb-1.5">Academic Year (1–5) *</label>
                <div className="grid grid-cols-5 gap-1.5">
                  {[1, 2, 3, 4, 5].map((y) => (
                    <button key={y} type="button" onClick={() => set("academic_year", String(y))}
                      className={`py-2 rounded-lg text-sm font-semibold border transition-colors ${
                        form.academic_year === String(y)
                          ? "bg-violet-600 border-violet-500 text-white"
                          : "border-theme-border-hover text-theme-sub hover:border-slate-500 hover:text-theme-text"
                      }`}>
                      Year {y}
                    </button>
                  ))}
                </div>
              </div>

              {/* Roll Number, Status & CGPA */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-theme-sub mb-1.5">Roll Number</label>
                  <input type="text" value={form.roll_number}
                    onChange={(e) => set("roll_number", e.target.value)}
                    placeholder="Auto-generated (e.g. R001)" className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-theme-sub mb-1.5">Student Status</label>
                  <select value={form.status} onChange={(e) => set("status", e.target.value)} className={inputClass}>
                    <option value="Active">Active (တက်ရောက်ဆဲ)</option>
                    <option value="Graduated">Graduated (ကျောင်းဆင်း)</option>
                    <option value="Suspended">Suspended (ကျောင်းနား)</option>
                    <option value="Dropped">Dropped (ကျောင်းထွက်)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-theme-sub mb-1.5">CGPA (0.00 – 4.00)</label>
                  <input type="number" step="0.01" min="0" max="4.0" value={form.cgpa}
                    onChange={(e) => set("cgpa", e.target.value)}
                    placeholder="e.g. 3.50" className={inputClass} />
                </div>
              </div>

              {/* Integrated Course Enrollment */}
              <div className="pt-2 border-t border-theme-border space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-teal-400 uppercase tracking-wider flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-teal-400" /> Course Enrollment
                  </label>
                </div>

                {/* Semester Selector */}
                <div className="relative">
                  <label className="block text-[11px] text-theme-muted mb-1">Semester (ပညာသင်နှစ်)</label>
                  <div className="relative">
                    <select
                      value={selectedSemesterId ?? ""}
                      onChange={(e) => handleSemesterChange(e.target.value ? parseInt(e.target.value) : null)}
                      className="w-full pl-3 pr-8 py-1.5 bg-theme-elevated border border-theme-border-hover rounded-lg text-xs font-medium text-theme-text focus:outline-none focus:ring-2 focus:ring-teal-600/50 appearance-none"
                    >
                      <option value="">-- No Semester --</option>
                      {semesters.map((s) => (
                        <option key={s.semester_id} value={s.semester_id}>
                          {s.academic_year} ({s.term}){s.is_active ? " ★ ACTIVE" : ""}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-theme-sub pointer-events-none" />
                  </div>
                </div>

                {matchingCourses.length === 0 ? (
                  <div className="p-3 bg-theme-surface/60 border border-theme-border rounded-lg text-xs text-theme-muted text-center">
                    No matching courses found for ({form.dept_code}).
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-1.5 max-h-36 overflow-y-auto pr-1">
                    {matchingCourses.map((c) => {
                      const isSelected = selectedCourses.includes(c.course_code);
                      return (
                        <button key={c.course_code} type="button" onClick={() => toggleCourse(c.course_code)}
                          className={`flex items-center justify-between p-2 rounded-lg border text-left text-xs transition-colors ${
                            isSelected
                              ? "badge-sky border border-teal-500"
                              : "bg-theme-elevated/60 border-theme-border-hover text-theme-sub hover:border-slate-500"
                          }`}>
                          <div>
                            <span className="font-mono font-bold text-teal-400 mr-2">{c.course_code}</span>
                            <span>{c.course_name}</span>
                          </div>
                          <div className={`w-4 h-4 rounded flex items-center justify-center border ${
                            isSelected ? "bg-teal-600 border-teal-500 text-theme-text" : "border-slate-600"
                          }`}>
                            {isSelected && <Check className="w-3 h-3" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: PERSONAL DETAILS */}
          {activeTab === "personal" && (
            <div className="space-y-4 animate-in fade-in">
              {/* Email & Phone */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-theme-sub mb-1.5">Email Address</label>
                  <input type="email" value={form.email}
                    onChange={(e) => set("email", e.target.value)}
                    placeholder="student@ucspyay.edu.mm" className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-theme-sub mb-1.5">Phone Number</label>
                  <input type="text" value={form.phone}
                    onChange={(e) => set("phone", e.target.value)}
                    placeholder="+95912345678" className={inputClass} />
                </div>
              </div>

              {/* NRC & DOB */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-theme-sub mb-1.5">NRC Number (မှတ်ပုံတင်)</label>
                  <input type="text" value={form.nrc_number}
                    onChange={(e) => set("nrc_number", e.target.value)}
                    placeholder="12/PAYA(N)123456" className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-theme-sub mb-1.5">
                    Date of Birth <span className="text-theme-muted font-normal">(အနည်းဆုံး ၁၅ နှစ်)</span>
                  </label>
                  <input
                    type="date"
                    value={form.date_of_birth}
                    max={(() => {
                      const d = new Date();
                      d.setFullYear(d.getFullYear() - 15);
                      return d.toISOString().split("T")[0];
                    })()}
                    onChange={(e) => set("date_of_birth", e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>

              {/* Gender & Blood Type */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-theme-sub mb-1.5">Gender</label>
                  <select value={form.gender} onChange={(e) => set("gender", e.target.value)} className={inputClass}>
                    <option value="Male">Male (ကျား)</option>
                    <option value="Female">Female (မ)</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-theme-sub mb-1.5">Blood Type</label>
                  <select value={form.blood_type} onChange={(e) => set("blood_type", e.target.value)} className={inputClass}>
                    <option value="">Select Blood Type…</option>
                    {["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"].map((bt) => (
                      <option key={bt} value={bt}>{bt}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Major / Specialization */}
              <div>
                <label className="block text-xs font-medium text-theme-sub mb-1.5">Major / Specialization</label>
                <select value={form.major} onChange={(e) => set("major", e.target.value)} className={inputClass}>
                  <option value="">-- Select Major --</option>
                  <option value="CST">CST — Computer Science &amp; Technology</option>
                  <option value="CS">CS — Computer Science</option>
                  <option value="CT">CT — Computer Technology</option>
                </select>
              </div>
            </div>
          )}

          {/* TAB 3: GUARDIAN & ADDRESS */}
          {activeTab === "guardian" && (
            <div className="space-y-4 animate-in fade-in">
              {/* Guardian Name & Phone */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-theme-sub mb-1.5">Guardian Name (အုပ်ထိန်းသူ)</label>
                  <input type="text" value={form.guardian_name}
                    onChange={(e) => set("guardian_name", e.target.value)}
                    placeholder="U Ba" className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-theme-sub mb-1.5">Guardian Phone</label>
                  <input type="text" value={form.guardian_phone}
                    onChange={(e) => set("guardian_phone", e.target.value)}
                    placeholder="+95998765432" className={inputClass} />
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="block text-xs font-medium text-theme-sub mb-1.5">Address (နေရပ်လိပ်စာ / အဆောင်)</label>
                <textarea rows={3} value={form.address}
                  onChange={(e) => set("address", e.target.value)}
                  placeholder="University Campus, Hall No. 3..."
                  className={`${inputClass} resize-none`} />
              </div>

              {/* Admission Year */}
              <div>
                <label className="block text-xs font-medium text-theme-sub mb-1.5">Admission Year (ကျောင်းစတင်တက်ရောက်သည့်နှစ်)</label>
                <input type="number" value={form.admission_year}
                  onChange={(e) => set("admission_year", e.target.value)}
                  placeholder="2022" className={inputClass} />
              </div>
            </div>
          )}

          {error && (
            <p className="text-sm text-red-400 bg-red-900/20 border border-red-800/50 rounded-lg px-3 py-2">{error}</p>
          )}

          {/* Submit buttons */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2 rounded-lg border border-theme-border-hover text-theme-sub text-sm hover:bg-theme-elevated transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading || !form.full_name || !form.dept_code}
              className="flex-1 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {student ? "Save Changes" : `Create Student & Enroll (${selectedCourses.length})`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
