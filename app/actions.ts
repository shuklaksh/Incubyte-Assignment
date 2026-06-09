// app/actions.ts
"use server";

import { prisma } from "@/lib/db";

/**
 * Example server action — fetch the first 10 active employees.
 * Use this pattern for any server-side data access.
 * The `prisma` singleton already uses @prisma/adapter-neon under the hood,
 * so there is no need to import `neon` or `@neondatabase/serverless` directly.
 */
export async function getData() {
  const data = await prisma.employee.findMany({
    take: 10,
    where: { isActive: true },
    include: { department: true, country: true },
    orderBy: { fullName: "asc" },
  });
  return data;
}