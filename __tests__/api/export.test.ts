/**
 * Tests for GET /api/export/employees
 * Prisma client is mocked — no database required.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Mock Prisma ──────────────────────────────────────────────────────────────
vi.mock("@/lib/db", () => ({
  prisma: {
    employee: {
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/db";
import { GET } from "@/app/api/export/employees/route";

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
  department: { id: "dept-1", name: "Engineering" },
  country: { code: "US", name: "United States", currency: "USD" },
  ...overrides,
});

const makeRequest = (params: Record<string, string> = {}) => {
  const url = new URL("http://localhost:3000/api/export/employees");
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return new NextRequest(url);
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("GET /api/export/employees", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.employee.findMany).mockResolvedValue([makeEmployee()] as never);
  });

  it("returns content-type text/csv header", async () => {
    const response = await GET(makeRequest());
    expect(response.headers.get("Content-Type")).toContain("text/csv");
  });

  it("returns content-disposition attachment header", async () => {
    const response = await GET(makeRequest());
    const disposition = response.headers.get("Content-Disposition");
    expect(disposition).toContain("attachment");
    expect(disposition).toContain(".csv");
  });

  it("first row is the correct headers row", async () => {
    const response = await GET(makeRequest());
    const text = await response.text();
    const firstLine = text.split("\n")[0];
    expect(firstLine).toContain("Code");
    expect(firstLine).toContain("Name");
    expect(firstLine).toContain("Email");
    expect(firstLine).toContain("Salary");
  });

  it("number of data rows matches filtered employee count", async () => {
    vi.mocked(prisma.employee.findMany).mockResolvedValue([
      makeEmployee(),
      makeEmployee({ id: "emp-2", employeeCode: "EMP-00002", email: "bob@acme.com", fullName: "Bob Smith" }),
    ] as never);
    const response = await GET(makeRequest());
    const text = await response.text();
    const lines = text.split("\n").filter((l) => l.trim() !== "");
    // header + 2 data rows
    expect(lines.length).toBe(3);
  });

  it("applies same filters as employee list endpoint", async () => {
    await GET(makeRequest({ department: "dept-1", country: "US" }));
    const call = vi.mocked(prisma.employee.findMany).mock.calls[0][0];
    const callStr = JSON.stringify(call);
    expect(callStr).toContain("dept-1");
    expect(callStr).toContain("US");
  });

  it("salary values are plain numbers not formatted strings", async () => {
    const response = await GET(makeRequest());
    const text = await response.text();
    const dataLine = text.split("\n")[1];
    // Should contain raw number 90000 not $90,000
    expect(dataLine).toContain("90000");
    expect(dataLine).not.toContain("$");
  });
});
