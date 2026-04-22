"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function getComments(sessionId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  return prisma.comment.findMany({
    where: { sessionId },
    orderBy: { timestamp: "asc" },
    include: {
      user: { select: { id: true, name: true, role: true } },
    },
  });
}

export async function addComment(
  sessionId: string,
  text: string,
  timestamp: number
) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  if (!text.trim()) throw new Error("Comment cannot be empty");
  if (timestamp < 0) throw new Error("Invalid timestamp");

  const comment = await prisma.comment.create({
    data: {
      sessionId,
      userId: session.user.id,
      text: text.trim(),
      timestamp,
    },
    include: {
      user: { select: { id: true, name: true, role: true } },
    },
  });

  revalidatePath("/dashboard");
  return comment;
}

export async function deleteComment(commentId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const comment = await prisma.comment.findUnique({ where: { id: commentId } });
  if (!comment) throw new Error("Comment not found");

  // Only author or teacher can delete
  const role = (session.user as { role?: string }).role;
  if (comment.userId !== session.user.id && role !== "TEACHER") {
    throw new Error("Not authorized to delete this comment");
  }

  await prisma.comment.delete({ where: { id: commentId } });
  revalidatePath("/dashboard");
}
