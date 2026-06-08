import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/employees/:id
 * Returns a single active employee with their full salary history (newest first).
 * Returns 404 for nonexistent or soft-deleted employees.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  const employee = await prisma.employee.findUnique({
    where: { id },
    include: {
      department: true,
      country: true,
      salaryHistory: {
        orderBy: { changedAt: "desc" },
      },
    },
  });

  if (!employee || !employee.isActive) {
    return NextResponse.json(
      { error: "Employee not found" },
      { status: 404 }
    );
  }

  return NextResponse.json(employee);
}

/**
 * DELETE /api/employees/:id
 * Soft-deletes an employee by setting isActive = false.
 * The record is never removed from the database.
 * Returns 404 for nonexistent or already-deleted employees.
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  const employee = await prisma.employee.findUnique({ where: { id } });

  if (!employee || !employee.isActive) {
    return NextResponse.json({ error: "Employee not found" }, { status: 404 });
  }

  await prisma.employee.update({
    where: { id },
    data: { isActive: false },
  });

  return NextResponse.json({ success: true, id });
}

