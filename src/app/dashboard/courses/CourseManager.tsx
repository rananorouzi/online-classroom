"use client";

import { useState, useTransition } from "react";
import {
  createCourse,
  updateCourse,
  deleteCourse,
  enrollStudent,
  unenrollStudent,
  assignTeacher,
  unassignTeacher,
} from "@/app/actions/teacher";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AlertBanner from "@/components/ui/AlertBanner";
import MemberList from "@/components/ui/MemberList";

interface Person {
  id: string;
  name: string | null;
  email: string;
}

interface Enrollment {
  id: string;
  userId: string;
  user: Person & { role: string };
}

interface Course {
  id: string;
  title: string;
  description: string | null;
  enrollments: Enrollment[];
  _count: { weeks: number };
}

interface Props {
  courses: Course[];
  students: Person[];
  teachers: Person[];
}

export default function CourseManager({ courses, students, teachers }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [membersId, setMembersId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [assignStudentId, setAssignStudentId] = useState("");
  const [assignTeacherId, setAssignTeacherId] = useState("");

  function wrap(fn: () => Promise<void>) {
    setError(null);
    startTransition(async () => {
      try {
        await fn();
        router.refresh();
      } catch (e: unknown) {
        setError((e as Error).message);
      }
    });
  }

  function handleCreate() {
    if (!newTitle.trim()) return;
    wrap(async () => {
      await createCourse(newTitle, newDesc);
      setNewTitle("");
      setNewDesc("");
      setShowCreate(false);
    });
  }

  function startEdit(course: Course) {
    setEditingId(course.id);
    setEditTitle(course.title);
    setEditDesc(course.description || "");
    setError(null);
  }

  function handleUpdate(courseId: string) {
    if (!editTitle.trim()) return;
    wrap(async () => {
      await updateCourse(courseId, editTitle, editDesc);
      setEditingId(null);
    });
  }

  function handleDelete(courseId: string, memberCount: number) {
    if (memberCount > 0) {
      setError("Remove all members before deleting.");
      return;
    }
    if (!confirm("Delete this course? This cannot be undone.")) return;
    wrap(async () => {
      await deleteCourse(courseId);
      if (expandedId === courseId) setExpandedId(null);
    });
  }

  function handleEnroll(courseId: string) {
    if (!assignStudentId) return;
    wrap(async () => {
      await enrollStudent(courseId, assignStudentId);
      setAssignStudentId("");
    });
  }

  function handleUnenroll(courseId: string, userId: string) {
    wrap(() => unenrollStudent(courseId, userId));
  }

  function handleAssignTeacher(courseId: string) {
    if (!assignTeacherId) return;
    wrap(async () => {
      await assignTeacher(courseId, assignTeacherId);
      setAssignTeacherId("");
    });
  }

  function handleUnassignTeacher(courseId: string, userId: string) {
    wrap(() => unassignTeacher(courseId, userId));
  }

  const courseStudents = (c: Course) => c.enrollments.filter((e) => e.user.role === "STUDENT");
  const courseTeachers = (c: Course) => c.enrollments.filter((e) => e.user.role === "TEACHER");

  return (
    <div>
      {error && (
        <AlertBanner message={error} variant="error" onDismiss={() => setError(null)} />
      )}

      {/* Create */}
      {!showCreate ? (
        <button
          onClick={() => { setShowCreate(true); setError(null); }}
          className="mb-8 inline-flex items-center gap-2 rounded-lg bg-gold px-4 py-2 text-sm font-medium text-zinc-950 transition hover:bg-gold/90"
        >
          <span className="text-lg leading-none">+</span> New Course
        </button>
      ) : (
        <div className="mb-8 rounded-xl border border-gold/30 bg-zinc-950 p-6">
          <h3 className="mb-4 text-sm font-semibold text-gold">Create New Course</h3>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Course title"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-primary placeholder:text-zinc-600 focus:border-gold/50 focus:outline-none"
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
            <textarea
              placeholder="Description (optional)"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-primary placeholder:text-zinc-600 focus:border-gold/50 focus:outline-none resize-none"
            />
            <div className="flex gap-2">
              <button
                onClick={handleCreate}
                disabled={isPending || !newTitle.trim()}
                className="rounded-lg bg-gold px-4 py-2 text-sm font-medium text-zinc-950 transition hover:bg-gold/90 disabled:opacity-50"
              >
                {isPending ? "Creating…" : "Create"}
              </button>
              <button
                onClick={() => { setShowCreate(false); setNewTitle(""); setNewDesc(""); }}
                className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-400 transition hover:text-primary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Course List */}
      {courses.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-12 text-center">
          <p className="text-zinc-400">No courses yet. Create your first course above.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {courses.map((course) => {
            const isOpen = expandedId === course.id;
            const showMembers = membersId === course.id;
            return (
              <div key={course.id} className="rounded-xl border border-zinc-800 bg-zinc-950 overflow-hidden">
                {/* Accordion Header */}
                <button
                  type="button"
                  onClick={() => setExpandedId(isOpen ? null : course.id)}
                  className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left cursor-pointer hover:bg-zinc-900/50 transition"
                >
                  <div className="min-w-0 flex-1">
                    <span className="text-lg font-semibold text-primary">{course.title}</span>
                    <div className="mt-1 flex items-center gap-4 text-xs text-zinc-600">
                      <span>{course._count.weeks} week{course._count.weeks !== 1 ? "s" : ""}</span>
                      <span>{courseStudents(course).length} student{courseStudents(course).length !== 1 ? "s" : ""}</span>
                      <span>{courseTeachers(course).length} teacher{courseTeachers(course).length !== 1 ? "s" : ""}</span>
                    </div>
                  </div>
                  <svg
                    className={`h-5 w-5 shrink-0 text-zinc-500 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Accordion Body */}
                {isOpen && (
                  <div className="border-t border-zinc-800">
                    <div className="p-5">
                      {editingId === course.id ? (
                        <div className="space-y-3">
                          <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-primary focus:border-gold/50 focus:outline-none"
                            onKeyDown={(e) => e.key === "Enter" && handleUpdate(course.id)}
                          />
                          <textarea
                            value={editDesc}
                            onChange={(e) => setEditDesc(e.target.value)}
                            rows={2}
                            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-primary focus:border-gold/50 focus:outline-none resize-none"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleUpdate(course.id)}
                              disabled={isPending || !editTitle.trim()}
                              className="rounded-lg bg-gold px-3 py-1.5 text-xs font-medium text-zinc-950 transition hover:bg-gold/90 disabled:opacity-50"
                            >
                              {isPending ? "Saving…" : "Save"}
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 hover:text-primary"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {course.description && (
                            <p className="mb-3 text-sm text-zinc-500 line-clamp-2">{course.description}</p>
                          )}
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/dashboard/course/${course.id}`}
                              className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 transition hover:text-gold hover:border-gold/30"
                            >
                              View Course
                            </Link>
                            <button
                              onClick={() => setMembersId(showMembers ? null : course.id)}
                              className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 transition hover:text-gold hover:border-gold/30 cursor-pointer"
                            >
                              {showMembers ? "Hide Members" : "Members"}
                            </button>
                            <button
                              onClick={() => startEdit(course)}
                              className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 transition hover:text-gold hover:border-gold/30"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(course.id, course.enrollments.length)}
                              disabled={isPending}
                              className={`rounded-lg border px-3 py-1.5 text-xs transition ${
                                course.enrollments.length > 0
                                  ? "border-zinc-800 text-zinc-700 cursor-not-allowed"
                                  : "border-zinc-700 text-red-500 hover:text-red-400 hover:border-red-800/50"
                              }`}
                              title={course.enrollments.length > 0 ? "Remove all members first" : "Delete course"}
                            >
                              Delete
                            </button>
                          </div>
                        </>
                      )}
                    </div>

                    {showMembers && (
                      <MemberList
                        courseId={course.id}
                        enrollments={course.enrollments}
                        students={students}
                        teachers={teachers}
                        isPending={isPending}
                        onEnroll={handleEnroll}
                        onUnenroll={handleUnenroll}
                        onAssignTeacher={handleAssignTeacher}
                        onUnassignTeacher={handleUnassignTeacher}
                        assignStudentId={assignStudentId}
                        setAssignStudentId={setAssignStudentId}
                        assignTeacherId={assignTeacherId}
                        setAssignTeacherId={setAssignTeacherId}
                      />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
