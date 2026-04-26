import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import bcrypt from "bcryptjs";
import path from "path";
import { BCRYPT_SALT_ROUNDS } from "../src/lib/security";

const dbPath = path.resolve(__dirname, "dev.db");
const adapter = new PrismaBetterSqlite3({ url: dbPath });

const prisma = new PrismaClient({ adapter });

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
