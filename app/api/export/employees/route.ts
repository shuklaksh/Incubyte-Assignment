import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { EmployeeQuerySchema } from "@/lib/validations";
import { Prisma } from "@prisma/client";

const CSV_HEADERS = [
  "Code",
  "Name",
  "Email",
  "Job Title",
  "Level",
  "Employment Type",
  "Department",
  "Country",
  "Currency",
  "Base Salary",
  "Bonus",
  "Total Comp",
  "Hired At",
];

/**
 * Escape a CSV cell value: wrap in quotes if it contains a comma, newline, or quote.
 */
function escapeCsvCell(value: string | number | null | undefined): string {
  const str = value === null || value === undefined ? "" : String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * GET /api/export/employees
 * Returns all employees matching the current filters as a CSV file download.
 * Applies the same filter logic as GET /api/employees but without pagination.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

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
    search,
    department,
    country,
    employmentType,
    level,
    minSalary,
    maxSalary,
  } = parsed.data;

  // Build same where clause as employee list (no pagination)
  const where: Prisma.EmployeeWhereInput = {
    isActive: true,
  };

  if (search) {
    where.OR = [
      { fullName: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  if (department) where.departmentId = department;
  if (country) where.countryCode = country;
  if (employmentType) where.employmentType = employmentType;
  if (level) where.level = level;

  if (minSalary !== undefined || maxSalary !== undefined) {
    where.baseSalary = {};
    if (minSalary !== undefined) {
      (where.baseSalary as Prisma.DecimalFilter).gte = minSalary;
    }
    if (maxSalary !== undefined) {
      (where.baseSalary as Prisma.DecimalFilter).lte = maxSalary;
    }
  }

  const employees = await prisma.employee.findMany({
    where,
    orderBy: { fullName: "asc" },
    include: {
      department: true,
      country: true,
    },
  });

  // Build CSV
  const rows = employees.map((emp) => {
    const baseSalary = parseFloat(emp.baseSalary.toString());
    const bonus = parseFloat(emp.bonus.toString());
    const totalComp = baseSalary + bonus;
    const hiredAt = emp.hiredAt instanceof Date
      ? emp.hiredAt.toISOString().split("T")[0]
      : String(emp.hiredAt);

    return [
      emp.employeeCode,
      emp.fullName,
      emp.email,
      emp.jobTitle,
      emp.level,
      emp.employmentType,
      emp.department.name,
      emp.country.name,
      emp.currency,
      baseSalary,
      bonus,
      totalComp,
      hiredAt,
    ].map(escapeCsvCell).join(",");
  });

  const csvContent = [CSV_HEADERS.join(","), ...rows].join("\n");
  const filename = `employees-export-${new Date().toISOString().split("T")[0]}.csv`;

  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
