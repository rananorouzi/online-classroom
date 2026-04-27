
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { BCRYPT_SALT_ROUNDS } from "../src/lib/security";

const DEFAULT_LOCAL_DATABASE_URL =
  "postgresql://postgres:postgres@localhost:5432/online_classroom?schema=public";

function getDatabaseUrl() {
  const url = process.env.DATABASE_URL?.trim();
  if (url) {
    return url;
  }
  if (process.env.NODE_ENV !== "production") {
    console.warn(
      "DATABASE_URL is not set. Falling back to local default database URL for development."
    );
    return DEFAULT_LOCAL_DATABASE_URL;
  }
  throw new Error("DATABASE_URL is not set. Configure it before starting the app.");
}

const adapter = new PrismaPg({ connectionString: getDatabaseUrl() });
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
