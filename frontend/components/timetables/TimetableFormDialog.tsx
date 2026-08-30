"use client";

import { useState, useEffect } from "react";
import { timetablesApi, coursesApi, teachersApi, classroomsApi, timeSlotsApi, semestersApi } from "@/lib/api";
import type { Course, Teacher, Classroom, TimeSlot, Semester } from "@/types";
import { X, Loader2, Calendar, FileText } from "lucide-react";

interface Props {
  defaultType?: "academic" | "exam";
  onClose: () => void;
}

export function TimetableFormDialog({ defaultType = "academic", onClose }: Props) {
  const [scheduleType, setScheduleType] = useState<"academic" | "exam">(defaultType);

  const [courses, setCourses] = useState<Course[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);

  // Common fields
  const [courseCode, setCourseCode] = useState("");
  const [roomId, setRoomId] = useState("");
  const [semesterId, setSemesterId] = useState("");

  // Academic fields
  const [teacherId, setTeacherId] = useState("");
  const [slotId, setSlotId] = useState("");
  const [dayOfWeek, setDayOfWeek] = useState("Monday");

  // Exam fields
  const [examDate, setExamDate] = useState(new Date().toISOString().split("T")[0]);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("11:00");
  const [supervisorTeacherId, setSupervisorTeacherId] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      coursesApi.list({ limit: 100 }),
      teachersApi.list({ limit: 100 }),
      classroomsApi.list({ limit: 100 }),
      timeSlotsApi.list({ limit: 100 }),
      semestersApi.list({ limit: 100 }),
    ]).then(([cRes, tRes, rRes, tsRes, semRes]) => {
      setCourses(cRes.items);
      setTeachers(tRes.items);
      setClassrooms(rRes.items);
      setTimeSlots(tsRes.items);
      setSemesters(semRes.items);

      if (cRes.items.length > 0) {
        const firstCourse = cRes.items[0];
        setCourseCode(firstCourse.course_code);
        if (firstCourse.teacher_id) {
          setTeacherId(firstCourse.teacher_id);
          setSupervisorTeacherId(firstCourse.teacher_id);
        } else if (tRes.items.length > 0) {
          setTeacherId(tRes.items[0].teacher_id);
          setSupervisorTeacherId(tRes.items[0].teacher_id);
        }
        if (firstCourse.semester_id) {
          setSemesterId(firstCourse.semester_id.toString());
        } else {
          const activeSem = semRes.items.find((s) => s.is_active) ?? semRes.items[0];
          if (activeSem) setSemesterId(activeSem.semester_id.toString());
        }
      } else {
        if (tRes.items.length > 0) {
          setTeacherId(tRes.items[0].teacher_id);
          setSupervisorTeacherId(tRes.items[0].teacher_id);
        }
        const activeSem = semRes.items.find((s) => s.is_active) ?? semRes.items[0];
        if (activeSem) setSemesterId(activeSem.semester_id.toString());
      }
      if (rRes.items.length > 0) setRoomId(rRes.items[0].room_id);
      if (tsRes.items.length > 0) setSlotId(tsRes.items[0].slot_id.toString());
    }).catch(() => {});
  }, []);

  const handleCourseChange = (code: string) => {
    setCourseCode(code);
    const selectedCourse = courses.find((c) => c.course_code === code);
    if (selectedCourse) {
      if (selectedCourse.teacher_id) {
        setTeacherId(selectedCourse.teacher_id);
        setSupervisorTeacherId(selectedCourse.teacher_id);
      }
      if (selectedCourse.semester_id) {
        setSemesterId(selectedCourse.semester_id.toString());
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (scheduleType === "academic") {
        await timetablesApi.createAcademic({
          course_code: courseCode,
          teacher_id: teacherId,
          room_id: roomId,
          slot_id: parseInt(slotId),
          semester_id: parseInt(semesterId),
          day_of_week: dayOfWeek,
        });
      } else {
        await timetablesApi.createExam({
          course_code: courseCode,
          room_id: roomId,
          semester_id: parseInt(semesterId),
          exam_date: examDate,
          start_time: startTime.length === 5 ? `${startTime}:00` : startTime,
          end_time: endTime.length === 5 ? `${endTime}:00` : endTime,
          supervisor_teacher_id: supervisorTeacherId || null,
        });
      }
      onClose();
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-2xl">
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <h3 className="font-semibold text-white">
            {scheduleType === "academic" ? "Add Academic Class Schedule" : "Add Exam Schedule"}
          </h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-200 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Schedule Type Selector */}
        <div className="px-5 pt-4">
          <div className="grid grid-cols-2 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setScheduleType("academic")}
              className={`py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
                scheduleType === "academic"
                  ? "bg-cyan-600 text-white shadow-md"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Calendar className="w-3.5 h-3.5" /> Class Schedule
            </button>
            <button
              type="button"
              onClick={() => setScheduleType("exam")}
              className={`py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
                scheduleType === "exam"
                  ? "bg-cyan-600 text-white shadow-md"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <FileText className="w-3.5 h-3.5" /> Exam Schedule
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {scheduleType === "academic" ? (
            /* Academic fields */
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Day of Week *</label>
                <select
                  value={dayOfWeek}
                  onChange={(e) => setDayOfWeek(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-600/50"
                >
                  {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Time Period *</label>
                <select
                  value={slotId}
                  onChange={(e) => setSlotId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-600/50"
                >
                  {timeSlots.map((ts) => (
                    <option key={ts.slot_id} value={ts.slot_id}>
                      Period {ts.period_number} ({ts.start_time} - {ts.end_time})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            /* Exam fields */
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Exam Date *</label>
                <input
                  type="date"
                  value={examDate}
                  onChange={(e) => setExamDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-600/50"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Start Time *</label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-600/50 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">End Time *</label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-600/50 font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Course Subject *</label>
            <select
              value={courseCode}
              onChange={(e) => handleCourseChange(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-600/50"
            >
              {courses.map((c) => {
                const teacher = teachers.find((t) => t.teacher_id === c.teacher_id);
                const teacherLabel = teacher ? ` (${teacher.full_name})` : c.teacher_id ? ` (${c.teacher_id})` : " (No Teacher)";
                return (
                  <option key={c.course_code} value={c.course_code}>
                    {c.course_code} — {c.course_name}{teacherLabel}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                {scheduleType === "academic" ? "Teacher *" : "Supervisor Teacher"}
              </label>
              <select
                value={scheduleType === "academic" ? teacherId : supervisorTeacherId}
                onChange={(e) => scheduleType === "academic" ? setTeacherId(e.target.value) : setSupervisorTeacherId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-600/50"
              >
                {scheduleType === "exam" && <option value="">-- No Supervisor --</option>}
                {teachers.map((t) => (
                  <option key={t.teacher_id} value={t.teacher_id}>
                    {t.full_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Class / Exam Hall *</label>
              <select
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-600/50"
              >
                {classrooms.map((r) => (
                  <option key={r.room_id} value={r.room_id}>
                    {r.room_id} ({r.room_name})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Academic Semester *</label>
            <select
              value={semesterId}
              onChange={(e) => setSemesterId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-600/50 font-mono"
            >
              {semesters.map((sem) => (
                <option key={sem.semester_id} value={sem.semester_id}>
                  {sem.academic_year} {sem.term} {sem.is_active ? "(ACTIVE)" : ""}
                </option>
              ))}
            </select>
          </div>

          {error && <p className="text-sm text-red-400 bg-red-900/20 border border-red-800/50 rounded-lg px-3 py-2">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 rounded-lg border border-slate-700 text-slate-300 text-sm hover:bg-slate-800 transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !courseCode || !roomId || !semesterId || (scheduleType === "academic" && (!teacherId || !slotId))}
              className="flex-1 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}
              {scheduleType === "academic" ? "Save Class Schedule" : "Save Exam Schedule"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
