/**
 * Tests for GET /api/employees and GET /api/employees/:id
 * Prisma client is mocked — no database required.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Mock Prisma ──────────────────────────────────────────────────────────────
vi.mock("@/lib/db", () => ({
  prisma: {
    employee: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
    },
    department: {
      findMany: vi.fn(),
    },
    country: {
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/db";
import { GET } from "@/app/api/employees/route";
import { GET as GET_BY_ID } from "@/app/api/employees/[id]/route";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockDepartment = { id: "dept-1", name: "Engineering" };
const mockCountry = { code: "US", name: "United States", currency: "USD" };

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
  department: mockDepartment,
  country: mockCountry,
  salaryHistory: [],
  ...overrides,
});

const makeRequest = (params: Record<string, string> = {}) => {
  const url = new URL("http://localhost:3000/api/employees");
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return new NextRequest(url);
};

// ─── GET /api/employees tests ─────────────────────────────────────────────────

describe("GET /api/employees", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.employee.findMany).mockResolvedValue([makeEmployee()] as never);
    vi.mocked(prisma.employee.count).mockResolvedValue(1);
    vi.mocked(prisma.department.findMany).mockResolvedValue([mockDepartment] as never);
    vi.mocked(prisma.country.findMany).mockResolvedValue([mockCountry] as never);
  });

  it("returns paginated list with default page 1 limit 50", async () => {
    const response = await GET(makeRequest());
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body).toHaveProperty("data");
    expect(body).toHaveProperty("pagination");
    expect(body.pagination.page).toBe(1);
    expect(body.pagination.limit).toBe(50);
  });

  it("returns correct totalPages in pagination metadata", async () => {
    vi.mocked(prisma.employee.count).mockResolvedValue(100);
    const response = await GET(makeRequest({ limit: "50" }));
    const body = await response.json();
    expect(body.pagination.totalPages).toBe(2);
  });

  it("returns correct total count in pagination metadata", async () => {
    vi.mocked(prisma.employee.count).mockResolvedValue(10000);
    const response = await GET(makeRequest());
    const body = await response.json();
    expect(body.pagination.total).toBe(10000);
  });

  it("filters by department id", async () => {
    await GET(makeRequest({ department: "dept-1" }));
    const call = vi.mocked(prisma.employee.findMany).mock.calls[0][0];
    expect(JSON.stringify(call)).toContain("dept-1");
  });

  it("filters by country code", async () => {
    await GET(makeRequest({ country: "US" }));
    const call = vi.mocked(prisma.employee.findMany).mock.calls[0][0];
    expect(JSON.stringify(call)).toContain("US");
  });

  it("filters by employmentType FULL_TIME", async () => {
    await GET(makeRequest({ employmentType: "FULL_TIME" }));
    const call = vi.mocked(prisma.employee.findMany).mock.calls[0][0];
    expect(JSON.stringify(call)).toContain("FULL_TIME");
  });

  it("filters by level L3", async () => {
    await GET(makeRequest({ level: "L3" }));
    const call = vi.mocked(prisma.employee.findMany).mock.calls[0][0];
    expect(JSON.stringify(call)).toContain("L3");
  });

  it("filters by minSalary only", async () => {
    await GET(makeRequest({ minSalary: "50000" }));
    const call = vi.mocked(prisma.employee.findMany).mock.calls[0][0];
    expect(JSON.stringify(call)).toContain("gte");
  });

  it("filters by maxSalary only", async () => {
    await GET(makeRequest({ maxSalary: "150000" }));
    const call = vi.mocked(prisma.employee.findMany).mock.calls[0][0];
    expect(JSON.stringify(call)).toContain("lte");
  });

  it("filters by minSalary and maxSalary range", async () => {
    await GET(makeRequest({ minSalary: "50000", maxSalary: "150000" }));
    const callStr = JSON.stringify(vi.mocked(prisma.employee.findMany).mock.calls[0][0]);
    expect(callStr).toContain("gte");
    expect(callStr).toContain("lte");
  });

  it("search matches on fullName case insensitive", async () => {
    await GET(makeRequest({ search: "alice" }));
    const callStr = JSON.stringify(vi.mocked(prisma.employee.findMany).mock.calls[0][0]);
    expect(callStr.toLowerCase()).toContain("fullname");
  });

  it("search matches on email case insensitive", async () => {
    await GET(makeRequest({ search: "alice" }));
    const callStr = JSON.stringify(vi.mocked(prisma.employee.findMany).mock.calls[0][0]);
    expect(callStr.toLowerCase()).toContain("email");
  });

  it("search returns empty array when no match", async () => {
    vi.mocked(prisma.employee.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.employee.count).mockResolvedValue(0);
    const response = await GET(makeRequest({ search: "zzznomatch" }));
    const body = await response.json();
    expect(body.data).toEqual([]);
  });

  it("sorts by baseSalary ascending", async () => {
    await GET(makeRequest({ sortBy: "baseSalary", sortOrder: "asc" }));
    const callStr = JSON.stringify(vi.mocked(prisma.employee.findMany).mock.calls[0][0]);
    expect(callStr).toContain("baseSalary");
    expect(callStr).toContain("asc");
  });

  it("sorts by baseSalary descending", async () => {
    await GET(makeRequest({ sortBy: "baseSalary", sortOrder: "desc" }));
    const callStr = JSON.stringify(vi.mocked(prisma.employee.findMany).mock.calls[0][0]);
    expect(callStr).toContain("baseSalary");
    expect(callStr).toContain("desc");
  });

  it("sorts by fullName alphabetically", async () => {
    await GET(makeRequest({ sortBy: "fullName" }));
    const callStr = JSON.stringify(vi.mocked(prisma.employee.findMany).mock.calls[0][0]);
    expect(callStr).toContain("fullName");
  });

  it("returns 400 when limit is 101", async () => {
    const response = await GET(makeRequest({ limit: "101" }));
    expect(response.status).toBe(400);
  });

  it("returns 400 when page is 0", async () => {
    const response = await GET(makeRequest({ page: "0" }));
    expect(response.status).toBe(400);
  });

  it("only returns isActive true employees by default", async () => {
    await GET(makeRequest());
    const callStr = JSON.stringify(vi.mocked(prisma.employee.findMany).mock.calls[0][0]);
    expect(callStr).toContain("isActive");
    expect(callStr).toContain("true");
  });

  it("includes department and country in each row", async () => {
    const response = await GET(makeRequest());
    const body = await response.json();
    expect(body.data[0]).toHaveProperty("department");
    expect(body.data[0]).toHaveProperty("country");
  });

  it("response includes meta.departments array for dropdowns", async () => {
    const response = await GET(makeRequest());
    const body = await response.json();
    expect(body.meta).toHaveProperty("departments");
    expect(Array.isArray(body.meta.departments)).toBe(true);
  });

  it("response includes meta.countries array for dropdowns", async () => {
    const response = await GET(makeRequest());
    const body = await response.json();
    expect(body.meta).toHaveProperty("countries");
    expect(Array.isArray(body.meta.countries)).toBe(true);
  });
});

// ─── GET /api/employees/:id tests ─────────────────────────────────────────────

describe("GET /api/employees/:id", () => {
  const makeIdRequest = (id: string) =>
    new NextRequest(new URL(`http://localhost:3000/api/employees/${id}`));

  it("returns full employee with department and country", async () => {
    vi.mocked(prisma.employee.findUnique).mockResolvedValue(makeEmployee() as never);
    const response = await GET_BY_ID(makeIdRequest("emp-1"), {
      params: Promise.resolve({ id: "emp-1" }),
    });
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body).toHaveProperty("department");
    expect(body).toHaveProperty("country");
  });

  it("returns salaryHistory array sorted newest first", async () => {
    const history = [
      { id: "h-1", changedAt: new Date("2024-01-01"), oldSalary: "80000", newSalary: "90000", oldBonus: "8000", newBonus: "9000", reason: "Promotion", changedBy: "HR Manager" },
      { id: "h-2", changedAt: new Date("2023-01-01"), oldSalary: "70000", newSalary: "80000", oldBonus: "7000", newBonus: "8000", reason: "Annual review", changedBy: "HR Manager" },
    ];
    vi.mocked(prisma.employee.findUnique).mockResolvedValue(
      makeEmployee({ salaryHistory: history }) as never
    );
    const response = await GET_BY_ID(makeIdRequest("emp-1"), {
      params: Promise.resolve({ id: "emp-1" }),
    });
    const body = await response.json();
    expect(body.salaryHistory[0].id).toBe("h-1");
  });

  it("returns empty salaryHistory array when no changes yet", async () => {
    vi.mocked(prisma.employee.findUnique).mockResolvedValue(
      makeEmployee({ salaryHistory: [] }) as never
    );
    const response = await GET_BY_ID(makeIdRequest("emp-1"), {
      params: Promise.resolve({ id: "emp-1" }),
    });
    const body = await response.json();
    expect(body.salaryHistory).toEqual([]);
  });

  it("returns 404 when employee id does not exist", async () => {
    vi.mocked(prisma.employee.findUnique).mockResolvedValue(null);
    const response = await GET_BY_ID(makeIdRequest("nonexistent"), {
      params: Promise.resolve({ id: "nonexistent" }),
    });
    expect(response.status).toBe(404);
  });

  it("returns 404 when employee is soft deleted", async () => {
    vi.mocked(prisma.employee.findUnique).mockResolvedValue(
      makeEmployee({ isActive: false }) as never
    );
    const response = await GET_BY_ID(makeIdRequest("emp-1"), {
      params: Promise.resolve({ id: "emp-1" }),
    });
    expect(response.status).toBe(404);
  });
});
