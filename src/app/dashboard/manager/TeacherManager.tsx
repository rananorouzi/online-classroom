"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Avatar from "@/components/ui/Avatar";
import AlertBanner from "@/components/ui/AlertBanner";
import {
  addTeacher,
  archiveAndUnassignTeacher,
  archiveTeacher,
  editTeacher,
  unarchiveTeacher,
} from "@/app/actions/manager";

interface Teacher {
  id: string;
  name: string | null;
  email: string;
  isArchived: boolean;
  createdAt: Date | string;
  coursesCount: number;
  studentsCount: number;
}

interface Props {
  teachers: Teacher[];
}

export default function TeacherManager({ teachers }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [showAdd, setShowAdd] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");

  const activeTeachers = teachers.filter((teacher) => !teacher.isArchived);
  const archivedTeachers = teachers.filter((teacher) => teacher.isArchived);

  function clearMessages() {
    setError(null);
    setSuccess(null);
  }

  function wrap(action: () => Promise<void>, message: string) {
    clearMessages();
    startTransition(async () => {
      try {
        await action();
        setSuccess(message);
        router.refresh();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : String(e));
      }
    });
  }

  function handleAddTeacher() {
    if (!newName.trim() || !newEmail.trim() || newPassword.length < 6) return;

    wrap(async () => {
      await addTeacher(newName, newEmail, newPassword);
      setNewName("");
      setNewEmail("");
      setNewPassword("");
      setShowAdd(false);
    }, "Teacher added successfully");
  }

  function startEdit(teacher: Teacher) {
    setEditingId(teacher.id);
    setEditName(teacher.name || "");
    setEditEmail(teacher.email);
    clearMessages();
  }

  function handleEditTeacher(teacherId: string) {
    if (!editName.trim() || !editEmail.trim()) return;

    wrap(async () => {
      await editTeacher(teacherId, editName, editEmail);
      setEditingId(null);
    }, "Teacher updated");
  }

  function handleArchiveAndUnassignTeacher(teacher: Teacher) {
    if (teacher.studentsCount > 0) return;

    if (
      !confirm(
        `Archive ${teacher.name || teacher.email}? They will be unassigned from courses and can be restored later.`
      )
    ) {
      return;
    }

    wrap(async () => {
      await archiveAndUnassignTeacher(teacher.id);
    }, "Teacher archived and unassigned");
  }

  function TeacherRow({
    teacher,
    archived,
  }: {
    teacher: Teacher;
    archived: boolean;
  }) {
    const isEditing = editingId === teacher.id;
    const canRemove = teacher.studentsCount === 0;

    return (
      <div
        className={`rounded-xl border bg-zinc-950 p-5 ${
          archived ? "border-zinc-800/50 opacity-60" : "border-zinc-800"
        }`}
      >
        {isEditing ? (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                type="text"
                value={editName}
                onChange={(event) => setEditName(event.target.value)}
                placeholder="Name"
                className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-primary focus:border-gold/50 focus:outline-none"
                onKeyDown={(event) => {
                  if (event.key === "Enter") handleEditTeacher(teacher.id);
                }}
              />
              <input
                type="email"
                value={editEmail}
                onChange={(event) => setEditEmail(event.target.value)}
                placeholder="Email"
                className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-primary focus:border-gold/50 focus:outline-none"
                onKeyDown={(event) => {
                  if (event.key === "Enter") handleEditTeacher(teacher.id);
                }}
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => handleEditTeacher(teacher.id)}
                disabled={isPending || !editName.trim() || !editEmail.trim()}
                className="rounded-lg bg-gold px-3 py-1.5 text-xs font-medium text-zinc-950 transition hover:bg-gold/90 disabled:opacity-50"
              >
                {isPending ? "Saving..." : "Save"}
              </button>
              <button
                onClick={() => setEditingId(null)}
                className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 transition hover:text-primary"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <Avatar name={teacher.name} email={teacher.email} size="md" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-primary">
                  {teacher.name || "Unnamed Teacher"}
                </p>
                <p className="truncate text-xs text-zinc-500">{teacher.email}</p>
                <p className="text-[10px] text-zinc-600">
                  {teacher.coursesCount} course{teacher.coursesCount !== 1 ? "s" : ""} · {teacher.studentsCount} active student{teacher.studentsCount !== 1 ? "s" : ""} · Joined {new Date(teacher.createdAt).toLocaleDateString("en-GB")}
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {!archived && (
                <>
                  <button
                    onClick={() => startEdit(teacher)}
                    className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 transition hover:border-gold/30 hover:text-gold"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => wrap(() => archiveTeacher(teacher.id), "Teacher archived")}
                    disabled={isPending}
                    className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-amber-500 transition hover:border-amber-800/50 hover:text-amber-400 disabled:opacity-50"
                  >
                    Archive
                  </button>
                </>
              )}

              {archived && (
                <button
                  onClick={() => wrap(() => unarchiveTeacher(teacher.id), "Teacher restored")}
                  disabled={isPending}
                  className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-emerald-500 transition hover:border-emerald-800/50 hover:text-emerald-400 disabled:opacity-50"
                >
                  Restore
                </button>
              )}

              <button
                onClick={() => handleArchiveAndUnassignTeacher(teacher)}
                disabled={isPending || !canRemove}
                title={canRemove ? "Archive and unassign teacher" : "Teacher can be archived only when they have no active students"}
                className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-red-400 transition hover:border-red-900/50 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Archive & Unassign
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      {error && (
        <AlertBanner
          message={error}
          variant="error"
          onDismiss={() => setError(null)}
        />
      )}
      {success && (
        <AlertBanner
          message={success}
          variant="success"
          onDismiss={() => setSuccess(null)}
        />
      )}

      {!showAdd ? (
        <button
          onClick={() => {
            setShowAdd(true);
            clearMessages();
          }}
          className="mb-8 inline-flex items-center gap-2 rounded-lg bg-gold px-4 py-2 text-sm font-medium text-zinc-950 transition hover:bg-gold/90"
        >
          <span className="text-lg leading-none">+</span> Add Teacher
        </button>
      ) : (
        <div className="mb-8 rounded-xl border border-gold/30 bg-zinc-950 p-6">
          <h3 className="mb-4 text-sm font-semibold text-gold">Add New Teacher</h3>
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <input
                type="text"
                placeholder="Name"
                value={newName}
                onChange={(event) => setNewName(event.target.value)}
                className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-primary placeholder:text-zinc-600 focus:border-gold/50 focus:outline-none"
              />
              <input
                type="email"
                placeholder="Email"
                value={newEmail}
                onChange={(event) => setNewEmail(event.target.value)}
                className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-primary placeholder:text-zinc-600 focus:border-gold/50 focus:outline-none"
              />
              <input
                type="password"
                placeholder="Password (min 6 chars)"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-primary placeholder:text-zinc-600 focus:border-gold/50 focus:outline-none"
                onKeyDown={(event) => {
                  if (event.key === "Enter") handleAddTeacher();
                }}
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleAddTeacher}
                disabled={isPending || !newName.trim() || !newEmail.trim() || newPassword.length < 6}
                className="rounded-lg bg-gold px-4 py-2 text-sm font-medium text-zinc-950 transition hover:bg-gold/90 disabled:opacity-50"
              >
                {isPending ? "Adding..." : "Add Teacher"}
              </button>
              <button
                onClick={() => {
                  setShowAdd(false);
                  setNewName("");
                  setNewEmail("");
                  setNewPassword("");
                }}
                className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-400 transition hover:text-primary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
        Active Teachers ({activeTeachers.length})
      </div>

      {activeTeachers.length === 0 ? (
        <div className="mb-8 rounded-xl border border-zinc-800 bg-zinc-950 p-12 text-center">
          <p className="text-zinc-400">No active teachers. Add one above.</p>
        </div>
      ) : (
        <div className="mb-8 space-y-3">
          {activeTeachers.map((teacher) => (
            <TeacherRow
              key={teacher.id}
              teacher={teacher}
              archived={false}
            />
          ))}
        </div>
      )}

      {archivedTeachers.length > 0 && (
        <div>
          <button
            onClick={() => setShowArchived((value) => !value)}
            className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-600 transition hover:text-zinc-400"
          >
            {showArchived ? "▼" : "▶"} Archived Teachers ({archivedTeachers.length})
          </button>

          {showArchived && (
            <div className="space-y-3">
              {archivedTeachers.map((teacher) => (
                <TeacherRow key={teacher.id} teacher={teacher} archived />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}