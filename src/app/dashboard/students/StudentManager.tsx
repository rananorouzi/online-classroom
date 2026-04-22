"use client";

import { useState, useTransition } from "react";
import {
  addStudent,
  editStudent,
  archiveStudent,
  unarchiveStudent,
  resetStudentPassword,
} from "@/app/actions/teacher";
import { useRouter } from "next/navigation";
import AlertBanner from "@/components/ui/AlertBanner";
import Avatar from "@/components/ui/Avatar";

interface Student {
  id: string;
  name: string | null;
  email: string;
  isArchived: boolean;
  createdAt: Date | string;
  _count: { enrollments: number };
}

interface Props {
  students: Student[];
}

export default function StudentManager({ students }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [resetPwId, setResetPwId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [resetPassword, setResetPassword] = useState("");

  const activeStudents = students.filter((s) => !s.isArchived);
  const archivedStudents = students.filter((s) => s.isArchived);

  function clear() { setError(null); setSuccess(null); }

  function wrap(fn: () => Promise<void>, msg: string) {
    clear();
    startTransition(async () => {
      try {
        await fn();
        setSuccess(msg);
        router.refresh();
      } catch (e: unknown) {
        setError((e as Error).message);
      }
    });
  }

  function handleAdd() {
    if (!newName.trim() || !newEmail.trim() || !newPassword) return;
    wrap(async () => {
      await addStudent(newName, newEmail, newPassword);
      setNewName(""); setNewEmail(""); setNewPassword(""); setShowAdd(false);
    }, "Student added successfully");
  }

  function startEdit(s: Student) {
    setEditingId(s.id); setEditName(s.name || ""); setEditEmail(s.email); clear();
  }

  function handleEdit(id: string) {
    if (!editName.trim() || !editEmail.trim()) return;
    wrap(async () => {
      await editStudent(id, editName, editEmail);
      setEditingId(null);
    }, "Student updated");
  }

  function handleResetPassword(id: string) {
    if (!resetPassword || resetPassword.length < 6) {
      setError("Password must be at least 6 characters"); return;
    }
    clear();
    startTransition(async () => {
      try {
        await resetStudentPassword(id, resetPassword);
        setResetPwId(null); setResetPassword(""); setSuccess("Password reset successfully");
      } catch (e: unknown) { setError((e as Error).message); }
    });
  }

  function StudentRow({ student, isArchived }: { student: Student; isArchived: boolean }) {
    const isEditing = editingId === student.id;
    const isResetting = resetPwId === student.id;

    return (
      <div className={`rounded-xl border bg-zinc-950 p-5 ${isArchived ? "border-zinc-800/50 opacity-60" : "border-zinc-800"}`}>
        {isEditing ? (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Name"
                className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-primary focus:border-gold/50 focus:outline-none"
                onKeyDown={(e) => e.key === "Enter" && handleEdit(student.id)} />
              <input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} placeholder="Email"
                className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-primary focus:border-gold/50 focus:outline-none"
                onKeyDown={(e) => e.key === "Enter" && handleEdit(student.id)} />
            </div>
            <div className="flex gap-2">
              <button onClick={() => handleEdit(student.id)} disabled={isPending || !editName.trim() || !editEmail.trim()}
                className="rounded-lg bg-gold px-3 py-1.5 text-xs font-medium text-zinc-950 transition hover:bg-gold/90 disabled:opacity-50">
                {isPending ? "Saving…" : "Save"}
              </button>
              <button onClick={() => setEditingId(null)}
                className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 hover:text-primary">Cancel</button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <Avatar name={student.name} email={student.email} size="md" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-primary truncate">{student.name || "Unnamed"}</p>
                <p className="text-xs text-zinc-500 truncate">{student.email}</p>
                <p className="text-[10px] text-zinc-600">
                  {student._count.enrollments} course{student._count.enrollments !== 1 ? "s" : ""} · Joined {new Date(student.createdAt).toLocaleDateString("en-GB")}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {!isArchived && (
                <>
                  <button onClick={() => startEdit(student)}
                    className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 transition hover:text-gold hover:border-gold/30">Edit</button>
                  <button onClick={() => { setResetPwId(resetPwId === student.id ? null : student.id); setResetPassword(""); clear(); }}
                    className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 transition hover:text-gold hover:border-gold/30">Password</button>
                  <button onClick={() => wrap(() => archiveStudent(student.id), "Student archived")} disabled={isPending}
                    className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-amber-500 transition hover:text-amber-400 hover:border-amber-800/50 disabled:opacity-50">Archive</button>
                </>
              )}
              {isArchived && (
                <button onClick={() => wrap(() => unarchiveStudent(student.id), "Student restored")} disabled={isPending}
                  className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-emerald-500 transition hover:text-emerald-400 hover:border-emerald-800/50 disabled:opacity-50">Restore</button>
              )}
            </div>
          </div>
        )}

        {isResetting && !isEditing && (
          <div className="mt-3 flex items-center gap-2 border-t border-zinc-800 pt-3">
            <input type="password" value={resetPassword} onChange={(e) => setResetPassword(e.target.value)}
              placeholder="New password (min 6 chars)"
              className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-primary focus:border-gold/50 focus:outline-none"
              onKeyDown={(e) => e.key === "Enter" && handleResetPassword(student.id)} />
            <button onClick={() => handleResetPassword(student.id)} disabled={isPending || resetPassword.length < 6}
              className="rounded-lg bg-gold px-3 py-1.5 text-xs font-medium text-zinc-950 transition hover:bg-gold/90 disabled:opacity-50">Reset</button>
            <button onClick={() => { setResetPwId(null); setResetPassword(""); }}
              className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 hover:text-primary">Cancel</button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      {error && <AlertBanner message={error} variant="error" onDismiss={() => setError(null)} />}
      {success && <AlertBanner message={success} variant="success" onDismiss={() => setSuccess(null)} />}

      {!showAdd ? (
        <button onClick={() => { setShowAdd(true); clear(); }}
          className="mb-8 inline-flex items-center gap-2 rounded-lg bg-gold px-4 py-2 text-sm font-medium text-zinc-950 transition hover:bg-gold/90">
          <span className="text-lg leading-none">+</span> Add Student
        </button>
      ) : (
        <div className="mb-8 rounded-xl border border-gold/30 bg-zinc-950 p-6">
          <h3 className="mb-4 text-sm font-semibold text-gold">Add New Student</h3>
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <input type="text" placeholder="Name" value={newName} onChange={(e) => setNewName(e.target.value)}
                className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-primary placeholder:text-zinc-600 focus:border-gold/50 focus:outline-none" />
              <input type="email" placeholder="Email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)}
                className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-primary placeholder:text-zinc-600 focus:border-gold/50 focus:outline-none" />
              <input type="password" placeholder="Password (min 6 chars)" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-primary placeholder:text-zinc-600 focus:border-gold/50 focus:outline-none"
                onKeyDown={(e) => e.key === "Enter" && handleAdd()} />
            </div>
            <div className="flex gap-2">
              <button onClick={handleAdd} disabled={isPending || !newName.trim() || !newEmail.trim() || newPassword.length < 6}
                className="rounded-lg bg-gold px-4 py-2 text-sm font-medium text-zinc-950 transition hover:bg-gold/90 disabled:opacity-50">
                {isPending ? "Adding…" : "Add Student"}
              </button>
              <button onClick={() => { setShowAdd(false); setNewName(""); setNewEmail(""); setNewPassword(""); }}
                className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-400 transition hover:text-primary">Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">Active Students ({activeStudents.length})</div>
      {activeStudents.length === 0 ? (
        <div className="mb-8 rounded-xl border border-zinc-800 bg-zinc-950 p-12 text-center">
          <p className="text-zinc-400">No active students. Add one above.</p>
        </div>
      ) : (
        <div className="mb-8 space-y-3">
          {activeStudents.map((s) => <StudentRow key={s.id} student={s} isArchived={false} />)}
        </div>
      )}

      {archivedStudents.length > 0 && (
        <div>
          <button onClick={() => setShowArchived(!showArchived)}
            className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-600 hover:text-zinc-400 transition">
            {showArchived ? "▼" : "▶"} Archived Students ({archivedStudents.length})
          </button>
          {showArchived && (
            <div className="space-y-3">
              {archivedStudents.map((s) => <StudentRow key={s.id} student={s} isArchived />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
