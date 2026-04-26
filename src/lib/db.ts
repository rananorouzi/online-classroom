import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

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

function createPrismaClient() {
  const adapter = new PrismaPg({ connectionString: getDatabaseUrl() });
  return new PrismaClient({
    adapter,
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
