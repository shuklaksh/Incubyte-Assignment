/**
 * Tests for PUT /api/employees/:id/salary
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
    },
    salaryHistory: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import { prisma } from "@/lib/db";
import { PUT } from "@/app/api/employees/[id]/salary/route";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockEmployee = {
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
};

const makeRequest = (id: string, body: unknown) =>
  new NextRequest(
    new URL(`http://localhost:3000/api/employees/${id}/salary`),
    {
      method: "PUT",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    }
  );

const validBody = {
  baseSalary: 100000,
  bonus: 10000,
  reason: "Annual performance review completed",
};

const updatedEmployee = {
  ...mockEmployee,
  baseSalary: "100000.00",
  bonus: "10000.00",
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("PUT /api/employees/:id/salary", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock $transaction to execute the callback immediately
    vi.mocked(prisma.$transaction).mockImplementation(async (fn) => {
      if (typeof fn === "function") {
        return fn(prisma as never);
      }
      return fn;
    });

    vi.mocked(prisma.employee.findUnique).mockResolvedValue(mockEmployee as never);
    vi.mocked(prisma.employee.update).mockResolvedValue(updatedEmployee as never);
    vi.mocked(prisma.salaryHistory.create).mockResolvedValue({
      id: "hist-1",
      employeeId: "emp-1",
      changedBy: "HR Manager",
      oldSalary: "90000.00",
      newSalary: "100000.00",
      oldBonus: "9000.00",
      newBonus: "10000.00",
      reason: "Annual performance review completed",
      changedAt: new Date(),
    } as never);
  });

  it("updates baseSalary and returns updated employee", async () => {
    const response = await PUT(makeRequest("emp-1", validBody), {
      params: Promise.resolve({ id: "emp-1" }),
    });
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.employee).toBeDefined();
  });

  it("updates bonus and returns updated employee", async () => {
    const response = await PUT(makeRequest("emp-1", { ...validBody, bonus: 15000 }), {
      params: Promise.resolve({ id: "emp-1" }),
    });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.employee).toBeDefined();
  });

  it("creates exactly one salary history record per update", async () => {
    await PUT(makeRequest("emp-1", validBody), {
      params: Promise.resolve({ id: "emp-1" }),
    });
    expect(vi.mocked(prisma.salaryHistory.create)).toHaveBeenCalledTimes(1);
  });

  it("history record stores correct oldSalary value", async () => {
    await PUT(makeRequest("emp-1", validBody), {
      params: Promise.resolve({ id: "emp-1" }),
    });
    const createCall = vi.mocked(prisma.salaryHistory.create).mock.calls[0][0];
    expect(createCall.data.oldSalary).toBe(mockEmployee.baseSalary);
  });

  it("history record stores correct newSalary value", async () => {
    await PUT(makeRequest("emp-1", validBody), {
      params: Promise.resolve({ id: "emp-1" }),
    });
    const createCall = vi.mocked(prisma.salaryHistory.create).mock.calls[0][0];
    expect(createCall.data.newSalary).toBe(validBody.baseSalary);
  });

  it("history record stores correct oldBonus value", async () => {
    await PUT(makeRequest("emp-1", validBody), {
      params: Promise.resolve({ id: "emp-1" }),
    });
    const createCall = vi.mocked(prisma.salaryHistory.create).mock.calls[0][0];
    expect(createCall.data.oldBonus).toBe(mockEmployee.bonus);
  });

  it("history record stores correct newBonus value", async () => {
    await PUT(makeRequest("emp-1", validBody), {
      params: Promise.resolve({ id: "emp-1" }),
    });
    const createCall = vi.mocked(prisma.salaryHistory.create).mock.calls[0][0];
    expect(createCall.data.newBonus).toBe(validBody.bonus);
  });

  it("history record stores the reason", async () => {
    await PUT(makeRequest("emp-1", validBody), {
      params: Promise.resolve({ id: "emp-1" }),
    });
    const createCall = vi.mocked(prisma.salaryHistory.create).mock.calls[0][0];
    expect(createCall.data.reason).toBe(validBody.reason);
  });

  it("returns 400 when baseSalary is 0", async () => {
    const response = await PUT(makeRequest("emp-1", { ...validBody, baseSalary: 0 }), {
      params: Promise.resolve({ id: "emp-1" }),
    });
    expect(response.status).toBe(400);
  });

  it("returns 400 when baseSalary is negative", async () => {
    const response = await PUT(makeRequest("emp-1", { ...validBody, baseSalary: -1000 }), {
      params: Promise.resolve({ id: "emp-1" }),
    });
    expect(response.status).toBe(400);
  });

  it("returns 400 when bonus is negative", async () => {
    const response = await PUT(makeRequest("emp-1", { ...validBody, bonus: -500 }), {
      params: Promise.resolve({ id: "emp-1" }),
    });
    expect(response.status).toBe(400);
  });

  it("returns 400 when reason is missing", async () => {
    const { reason: _r, ...bodyWithoutReason } = validBody;
    const response = await PUT(makeRequest("emp-1", bodyWithoutReason), {
      params: Promise.resolve({ id: "emp-1" }),
    });
    expect(response.status).toBe(400);
  });

  it("returns 400 when reason is 9 chars", async () => {
    const response = await PUT(makeRequest("emp-1", { ...validBody, reason: "123456789" }), {
      params: Promise.resolve({ id: "emp-1" }),
    });
    expect(response.status).toBe(400);
  });

  it("passes when reason is exactly 10 chars", async () => {
    const response = await PUT(makeRequest("emp-1", { ...validBody, reason: "1234567890" }), {
      params: Promise.resolve({ id: "emp-1" }),
    });
    expect(response.status).toBe(200);
  });

  it("returns 404 when employee does not exist", async () => {
    vi.mocked(prisma.employee.findUnique).mockResolvedValue(null);
    const response = await PUT(makeRequest("nonexistent", validBody), {
      params: Promise.resolve({ id: "nonexistent" }),
    });
    expect(response.status).toBe(404);
  });

  it("does not create history record when validation fails", async () => {
    await PUT(makeRequest("emp-1", { ...validBody, baseSalary: 0 }), {
      params: Promise.resolve({ id: "emp-1" }),
    });
    expect(vi.mocked(prisma.salaryHistory.create)).not.toHaveBeenCalled();
  });

  it("salary update and history creation are atomic", async () => {
    await PUT(makeRequest("emp-1", validBody), {
      params: Promise.resolve({ id: "emp-1" }),
    });
    expect(vi.mocked(prisma.$transaction)).toHaveBeenCalledTimes(1);
  });
});
