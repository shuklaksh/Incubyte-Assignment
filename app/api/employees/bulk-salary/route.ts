import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { BulkSalarySchema } from "@/lib/validations";


/**
 * PUT /api/employees/bulk-salary
 * Applies a percentage or fixed salary adjustment to a list of employees.
 * All updates and history records are created in a single atomic transaction.
 *
 * Salary formulas:
 *   PERCENTAGE: newSalary = oldSalary * (1 + adjustmentValue / 100)
 *   FIXED:      newSalary = oldSalary + adjustmentValue
 */
export async function PUT(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = BulkSalarySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { employeeIds, adjustmentType, adjustmentValue, reason } = parsed.data;

  // Fetch all targeted employees
  const employees = await prisma.employee.findMany({
    where: {
      id: { in: employeeIds },
      isActive: true,
    },
  });

  if (employees.length === 0) {
    return NextResponse.json({ error: "No active employees found for given IDs" }, { status: 404 });
  }

  // Calculate new salaries for all employees
  const updates = employees.map((emp) => {
    const oldSalary = parseFloat(emp.baseSalary.toString());
    const oldBonus = parseFloat(emp.bonus.toString());

    let newSalary: number;
    let newBonus: number;

    if (adjustmentType === "PERCENTAGE") {
      const multiplier = 1 + adjustmentValue / 100;
      newSalary = Math.round(oldSalary * multiplier * 100) / 100;
      newBonus = Math.round(oldBonus * multiplier * 100) / 100;
    } else {
      // FIXED — adjustment applies to base salary only
      newSalary = Math.round((oldSalary + adjustmentValue) * 100) / 100;
      newBonus = oldBonus;
    }

    return {
      employeeId: emp.id,
      oldSalary,
      newSalary,
      oldBonus,
      newBonus,
    };
  });


  // Execute all updates atomically
  await prisma.$transaction(async (tx) => {
    // Bulk insert history records
    await tx.salaryHistory.createMany({
      data: updates.map((u) => ({
        employeeId: u.employeeId,
        changedBy: "HR Manager",
        oldSalary: u.oldSalary,
        newSalary: u.newSalary,
        oldBonus: u.oldBonus,
        newBonus: u.newBonus,
        reason,
      })),
    });

    // Update each employee's salary
    await Promise.all(
      updates.map((u) =>
        tx.employee.update({
          where: { id: u.employeeId },
          data: {
            baseSalary: u.newSalary,
            bonus: u.newBonus,
            updatedAt: new Date(),
          },
        })
      )
    );
  });

  return NextResponse.json({
    success: true,
    updatedCount: employees.length,
    adjustmentType,
    adjustmentValue,
  });
}
