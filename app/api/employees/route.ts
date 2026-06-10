import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { EmployeeQuerySchema, CreateEmployeeSchema } from "@/lib/validations";
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

/**
 * POST /api/employees
 * Creates a new active employee.
 * Validates request body with Zod and checks database constraints.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = CreateEmployeeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const {
      fullName,
      email,
      jobTitle,
      level,
      employmentType,
      departmentId,
      countryCode,
      baseSalary,
      bonus,
    } = parsed.data;

    // Check if email already exists
    const existing = await prisma.employee.findUnique({
      where: { email },
    });
    if (existing) {
      return NextResponse.json(
        { error: "An employee with this email already exists" },
        { status: 409 }
      );
    }

    // Check if department exists
    const department = await prisma.department.findUnique({
      where: { id: departmentId },
    });
    if (!department) {
      return NextResponse.json(
        { error: "Department not found" },
        { status: 404 }
      );
    }

    // Check if country exists
    const country = await prisma.country.findUnique({
      where: { code: countryCode },
    });
    if (!country) {
      return NextResponse.json(
        { error: "Country not found" },
        { status: 404 }
      );
    }

    // Find next sequential employee code
    const lastEmployee = await prisma.employee.findFirst({
      orderBy: { employeeCode: "desc" },
    });
    let nextNum = 1;
    if (lastEmployee) {
      const match = lastEmployee.employeeCode.match(/EMP-(\d+)/);
      if (match) {
        nextNum = parseInt(match[1]) + 1;
      }
    }
    const employeeCode = `EMP-${String(nextNum).padStart(5, "0")}`;

    // Create employee
    const employee = await prisma.employee.create({
      data: {
        employeeCode,
        fullName,
        email,
        jobTitle,
        level,
        employmentType,
        departmentId,
        countryCode,
        baseSalary: new Prisma.Decimal(baseSalary),
        bonus: new Prisma.Decimal(bonus),
        currency: country.currency,
        hiredAt: new Date(),
        isActive: true,
      },
      include: {
        department: true,
        country: true,
      },
    });

    return NextResponse.json(employee, { status: 201 });
  } catch (error) {
    console.error("Error creating employee:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
