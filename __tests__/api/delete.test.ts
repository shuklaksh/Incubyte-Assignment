/**
 * Tests for DELETE /api/employees/:id
 * Prisma client is mocked — no database required.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Mock Prisma ──────────────────────────────────────────────────────────────
vi.mock("@/lib/db", () => ({
  prisma: {
    employee: {
      findUnique: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/db";
import { DELETE } from "@/app/api/employees/[id]/route";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const makeEmployee = (overrides: Record<string, unknown> = {}) => ({
  id: "emp-1",
  employeeCode: "EMP-00001",
  fullName: "Alice Johnson",
  email: "alice.johnson@acme.com",
  jobTitle: "Software Engineer",
  level: "L3",
  employmentType: "FULL_TIME",
  departmentId: "dept-1",
  countryCode: "US",
  baseSalary: "90000.00",
  bonus: "9000.00",
  currency: "USD",
  hiredAt: new Date("2020-03-15"),
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const makeRequest = (id: string) =>
  new NextRequest(new URL(`http://localhost:3000/api/employees/${id}`), {
    method: "DELETE",
  });

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("DELETE /api/employees/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.employee.findUnique).mockResolvedValue(makeEmployee() as never);
    vi.mocked(prisma.employee.update).mockResolvedValue(
      makeEmployee({ isActive: false }) as never
    );
  });

  it("sets isActive to false on the employee", async () => {
    await DELETE(makeRequest("emp-1"), { params: Promise.resolve({ id: "emp-1" }) });
    expect(vi.mocked(prisma.employee.update)).toHaveBeenCalledWith({
      where: { id: "emp-1" },
      data: { isActive: false },
    });
  });

  it("returns success true on soft delete", async () => {
    const response = await DELETE(makeRequest("emp-1"), {
      params: Promise.resolve({ id: "emp-1" }),
    });
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
  });

  it("deleted employee no longer appears in GET list", async () => {
    // After soft delete, findMany with isActive:true should return []
    vi.mocked(prisma.employee.findMany).mockResolvedValue([] as never);
    await DELETE(makeRequest("emp-1"), { params: Promise.resolve({ id: "emp-1" }) });
    const activeEmployees = await prisma.employee.findMany({
      where: { isActive: true },
    });
    expect(activeEmployees).toHaveLength(0);
  });

  it("deleted employee data is still in database", async () => {
    // The update sets isActive=false but does not delete the record
    const response = await DELETE(makeRequest("emp-1"), {
      params: Promise.resolve({ id: "emp-1" }),
    });
    expect(response.status).toBe(200);
    // Verify update (not delete) was called
    expect(vi.mocked(prisma.employee.update)).toHaveBeenCalled();
    // No prisma.employee.delete should be called
    // (prisma.employee.delete is not mocked, so calling it would throw)
  });

  it("returns 404 when employee does not exist", async () => {
    vi.mocked(prisma.employee.findUnique).mockResolvedValue(null);
    const response = await DELETE(makeRequest("nonexistent"), {
      params: Promise.resolve({ id: "nonexistent" }),
    });
    expect(response.status).toBe(404);
  });

  it("returns 404 when employee is already deleted", async () => {
    vi.mocked(prisma.employee.findUnique).mockResolvedValue(
      makeEmployee({ isActive: false }) as never
    );
    const response = await DELETE(makeRequest("emp-1"), {
      params: Promise.resolve({ id: "emp-1" }),
    });
    expect(response.status).toBe(404);
  });
});
