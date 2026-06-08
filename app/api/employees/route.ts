import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { EmployeeQuerySchema } from "@/lib/validations";
import { Prisma } from "@prisma/client";

/**
 * GET /api/employees
 * Returns a paginated, filtered, and sorted list of active employees.
 * Query params are validated with Zod before any DB call.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  // Convert URLSearchParams to a plain object for Zod parsing
  const rawParams: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    rawParams[key] = value;
  });

  const parsed = EmployeeQuerySchema.safeParse(rawParams);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query parameters", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const {
    page,
    limit,
    search,
    department,
    country,
    employmentType,
    level,
    minSalary,
    maxSalary,
    sortBy,
    sortOrder,
  } = parsed.data;

  // Build Prisma where clause
  const where: Prisma.EmployeeWhereInput = {
    isActive: true,
  };

  if (search) {
    where.OR = [
      { fullName: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  if (department) {
    where.departmentId = department;
  }

  if (country) {
    where.countryCode = country;
  }

  if (employmentType) {
    where.employmentType = employmentType;
  }

  if (level) {
    where.level = level;
  }

  if (minSalary !== undefined || maxSalary !== undefined) {
    where.baseSalary = {};
    if (minSalary !== undefined) {
      (where.baseSalary as Prisma.DecimalFilter).gte = minSalary;
    }
    if (maxSalary !== undefined) {
      (where.baseSalary as Prisma.DecimalFilter).lte = maxSalary;
    }
  }

  // Build orderBy
  const orderBy: Prisma.EmployeeOrderByWithRelationInput = sortBy
    ? { [sortBy]: sortOrder }
    : { fullName: sortOrder };

  const skip = (page - 1) * limit;

  // Run count and data queries in parallel
  const [total, employees, departments, countries] = await Promise.all([
    prisma.employee.count({ where }),
    prisma.employee.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      include: {
        department: true,
        country: true,
      },
    }),
    prisma.department.findMany({ orderBy: { name: "asc" } }),
    prisma.country.findMany({ orderBy: { name: "asc" } }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return NextResponse.json({
    data: employees,
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
    meta: {
      departments,
      countries,
    },
  });
}
