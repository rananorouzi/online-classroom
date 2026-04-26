"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { BCRYPT_SALT_ROUNDS } from "@/lib/security";

export async function updateProfile(name: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (user?.role === "STUDENT") throw new Error("Students cannot change their name");

  await prisma.user.update({
    where: { id: session.user.id },
    data: { name: name.trim() },
  });

  revalidatePath("/dashboard/settings");
}

export async function changePassword(
  currentPassword: string,
  newPassword: string
) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { hashedPassword: true },
  });

  if (!user?.hashedPassword) throw new Error("No password set");

  const valid = await bcrypt.compare(currentPassword, user.hashedPassword);
  if (!valid) throw new Error("Current password is incorrect");

  if (newPassword.length < 6) throw new Error("Password must be at least 6 characters");

  const hashed = await bcrypt.hash(newPassword, BCRYPT_SALT_ROUNDS);
  await prisma.user.update({
    where: { id: session.user.id },
    data: { hashedPassword: hashed },
  });
}
