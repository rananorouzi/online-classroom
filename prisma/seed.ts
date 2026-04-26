import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { BCRYPT_SALT_ROUNDS } from "../src/lib/security";

const prisma = new PrismaClient();

async function main() {
  // Create manager (admin)
  await prisma.user.upsert({
    where: { email: "manager@musicacademy.pro" },
    update: { role: "ADMIN", isArchived: false },
    create: {
      email: "manager@musicacademy.pro",
      name: "Studio Manager",
      hashedPassword: await bcrypt.hash("manager123", BCRYPT_SALT_ROUNDS),
      role: "ADMIN",
      isArchived: false,
    },
  });

  console.log("Seed complete!");
  console.log(`Manager: manager@musicacademy.pro / manager123`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
