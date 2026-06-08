import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { UpdateSalarySchema } from "@/lib/validations";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PUT /api/employees/:id/salary
 * Updates base salary and bonus for a single employee.
 * The update and the salary history insert are wrapped in a single Prisma transaction
 * so they either both succeed or both fail (atomicity guarantee).
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  // Parse and validate request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = UpdateSalarySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { baseSalary, bonus, reason } = parsed.data;

  // Fetch the current employee to capture old values for history
  const employee = await prisma.employee.findUnique({ where: { id } });
  if (!employee || !employee.isActive) {
    return NextResponse.json({ error: "Employee not found" }, { status: 404 });
  }

  // Atomic update + history insert
  const updatedEmployee = await prisma.$transaction(async (tx) => {
    // Create history record with old values
    await tx.salaryHistory.create({
      data: {
        employeeId: id,
        changedBy: "HR Manager",
        oldSalary: employee.baseSalary,
        newSalary: baseSalary,
        oldBonus: employee.bonus,
        newBonus: bonus,
        reason,
      },
    });

    // Update the employee
    const updated = await tx.employee.update({
      where: { id },
      data: {
        baseSalary,
        bonus,
        updatedAt: new Date(),
      },
    });

    return updated;
  });

  return NextResponse.json({ employee: updatedEmployee });
}
