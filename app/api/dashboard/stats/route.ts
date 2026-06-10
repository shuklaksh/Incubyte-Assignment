import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { DashboardQuerySchema } from "@/lib/validations";
import { Prisma } from "@prisma/client";

/**
 * GET /api/dashboard/stats
 * Aggregates payroll metrics and active count for dashboard tiles.
 * Supports filters: country, department, level, employmentType.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const rawParams: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    rawParams[key] = value;
  });

  const parsed = DashboardQuerySchema.safeParse(rawParams);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query parameters", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { country, department, level, employmentType } = parsed.data;

  // Build where clause
  const where: Prisma.EmployeeWhereInput = {
    isActive: true,
  };

  if (country) {
    where.countryCode = country;
  }

  if (department) {
    where.departmentId = department;
  }

  if (level) {
    where.level = level;
  }

  if (employmentType) {
    where.employmentType = employmentType;
  }

  // Execute database aggregation, level distribution, department budgets, and query lists in parallel
  const [stats, levelGroups, departmentGroups, activeDepartments, countries] = await Promise.all([
    prisma.employee.aggregate({
      where,
      _sum: {
        baseSalary: true,
        bonus: true,
      },
      _avg: {
        baseSalary: true,
      },
      _count: {
        _all: true,
      },
    }),
    prisma.employee.groupBy({
      by: ["level"],
      where,
      _count: {
        _all: true,
      },
      _avg: {
        baseSalary: true,
      },
      _min: {
        baseSalary: true,
      },
      _max: {
        baseSalary: true,
      },
      orderBy: {
        level: "asc",
      },
    }),
    prisma.employee.groupBy({
      by: ["departmentId"],
      where,
      _count: {
        _all: true,
      },
      _sum: {
        baseSalary: true,
        bonus: true,
      },
    }),
    prisma.department.findMany({
      orderBy: {
        name: "asc",
      },
    }),
    prisma.country.findMany({
      orderBy: {
        name: "asc",
      },
    }),
  ]);

  const totalPayroll =
    (stats._sum.baseSalary ? Number(stats._sum.baseSalary) : 0) +
    (stats._sum.bonus ? Number(stats._sum.bonus) : 0);

  const activeEmployees = stats._count._all ?? 0;
  const avgBaseSalary = stats._avg.baseSalary ? Number(stats._avg.baseSalary) : 0;

  const levels = levelGroups.map((g) => ({
    level: g.level,
    count: g._count?._all ?? 0,
    avgSalary: g._avg?.baseSalary ? Number(g._avg.baseSalary) : 0,
    minSalary: g._min?.baseSalary ? Number(g._min.baseSalary) : 0,
    maxSalary: g._max?.baseSalary ? Number(g._max.baseSalary) : 0,
  }));

  const departments = activeDepartments.map((d) => {
    const match = departmentGroups.find((g) => g.departmentId === d.id);
    const budget =
      (match?._sum?.baseSalary ? Number(match._sum.baseSalary) : 0) +
      (match?._sum?.bonus ? Number(match._sum.bonus) : 0);
    return {
      id: d.id,
      name: d.name,
      count: match?._count?._all ?? 0,
      budget,
    };
  });

  return NextResponse.json({
    stats: {
      totalPayroll,
      activeEmployees,
      avgBaseSalary,
    },
    countries,
    levels,
    departments,
  });
}
