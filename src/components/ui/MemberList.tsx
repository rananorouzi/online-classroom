"use client";

import { useState } from "react";
import PersonDropdown from "@/components/ui/PersonDropdown";
import type { PersonOption } from "@/components/ui/PersonDropdown";
import Avatar from "@/components/ui/Avatar";

interface Enrollment {
  id: string;
  userId: string;
  user: PersonOption & { role: string };
}

interface MemberListProps {
  courseId: string;
  enrollments: Enrollment[];
  students: PersonOption[];
  teachers: PersonOption[];
  isPending: boolean;
  onEnroll: (courseId: string) => void;
  onUnenroll: (courseId: string, userId: string) => void;
  onAssignTeacher: (courseId: string) => void;
  onUnassignTeacher: (courseId: string, userId: string) => void;
  assignStudentId: string;
  setAssignStudentId: (id: string) => void;
  assignTeacherId: string;
  setAssignTeacherId: (id: string) => void;
}

export default function MemberList({
  courseId,
  enrollments,
  students,
  teachers,
  isPending,
  onEnroll,
  onUnenroll,
  onAssignTeacher,
  onUnassignTeacher,
  assignStudentId,
  setAssignStudentId,
  assignTeacherId,
  setAssignTeacherId,
}: MemberListProps) {
  const [activeTab, setActiveTab] = useState<"students" | "teachers">("students");

  const courseStudents = enrollments.filter((e) => e.user.role === "STUDENT");
  const courseTeachers = enrollments.filter((e) => e.user.role === "TEACHER");

  const enrolledIds = new Set(enrollments.map((e) => e.userId));
  const availableStudents = students.filter((s) => !enrolledIds.has(s.id));
  const availableTeachers = teachers.filter((t) => !enrolledIds.has(t.id));

  const members = activeTab === "students" ? courseStudents : courseTeachers;
  const available = activeTab === "students" ? availableStudents : availableTeachers;
  const allPool = activeTab === "students" ? students : teachers;

  return (
    <div className="border-t border-zinc-800 bg-zinc-900/30">
      {/* Tab bar */}
      <div className="flex border-b border-zinc-800">
        {(["students", "teachers"] as const).map((tab) => {
          const count = tab === "students" ? courseStudents.length : courseTeachers.length;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-3 text-xs font-semibold uppercase tracking-wider transition cursor-pointer ${
                activeTab === tab
                  ? "text-gold border-b-2 border-gold"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {tab} ({count})
            </button>
          );
        })}
      </div>

      <div className="p-5">
        {members.length > 0 ? (
          <div className="mb-4 space-y-2">
            {members.map((enrollment) => (
              <div
                key={enrollment.id}
                className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-2.5"
              >
                <div className="flex items-center gap-3">
                  <Avatar name={enrollment.user.name} email={enrollment.user.email} />
                  <div>
                    <p className="text-sm text-primary">
                      {enrollment.user.name || "Unnamed"}
                    </p>
                    <p className="text-xs text-zinc-500">{enrollment.user.email}</p>
                  </div>
                </div>
                <button
                  onClick={() =>
                    activeTab === "students"
                      ? onUnenroll(courseId, enrollment.userId)
                      : onUnassignTeacher(courseId, enrollment.userId)
                  }
                  disabled={isPending}
                  className="rounded-lg border border-zinc-700 px-3 py-1 text-xs text-red-500 transition hover:text-red-400 hover:border-red-800/50 disabled:opacity-50 cursor-pointer"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="mb-4 text-sm text-zinc-600">
            No {activeTab} {activeTab === "students" ? "enrolled" : "assigned"} yet.
          </p>
        )}

        {available.length > 0 && (
          <div className="flex items-center gap-2">
            <PersonDropdown
              value={activeTab === "students" ? assignStudentId : assignTeacherId}
              onChange={activeTab === "students" ? setAssignStudentId : setAssignTeacherId}
              options={available}
              placeholder={`Select a ${activeTab === "students" ? "student" : "teacher"}…`}
            />
            <button
              onClick={() =>
                activeTab === "students"
                  ? onEnroll(courseId)
                  : onAssignTeacher(courseId)
              }
              disabled={
                isPending ||
                (activeTab === "students" ? !assignStudentId : !assignTeacherId)
              }
              className="rounded-lg bg-gold px-4 py-2 text-sm font-medium text-zinc-950 transition hover:bg-gold/90 disabled:opacity-50 cursor-pointer"
            >
              {isPending
                ? activeTab === "students" ? "Adding…" : "Assigning…"
                : activeTab === "students" ? "Add" : "Assign"}
            </button>
          </div>
        )}
        {available.length === 0 && allPool.length > 0 && (
          <p className="text-xs text-zinc-600">
            All {activeTab} are already {activeTab === "students" ? "enrolled" : "assigned"}.
          </p>
        )}
      </div>
    </div>
  );
}
