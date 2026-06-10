import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

let prismaInstance: PrismaClient | undefined;

function getPrisma(): PrismaClient {
  const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
  };

  if (process.env.NODE_ENV !== "production") {
    if (globalForPrisma.prisma) return globalForPrisma.prisma;
  }

  if (prismaInstance) return prismaInstance;

  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    // Return a dummy client during builds to prevent crashing if DATABASE_URL is missing
    if (process.env.NEXT_PHASE === "phase-production-build") {
      prismaInstance = new PrismaClient();
      return prismaInstance;
    }
    throw new Error("DATABASE_URL is not set in environment variables");
  }

  const adapter = new PrismaNeon({ connectionString });
  prismaInstance = new PrismaClient({ adapter });

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prismaInstance;
  }

  return prismaInstance;
}

// Proxy client that intercepts property access to lazily instantiate PrismaClient
export const prisma = new Proxy({} as PrismaClient, {
  get(target, prop, receiver) {
    const client = getPrisma();
    const value = Reflect.get(client, prop, receiver);
    if (typeof value === "function") {
      return value.bind(client);
    }
    return value;
  },
});

