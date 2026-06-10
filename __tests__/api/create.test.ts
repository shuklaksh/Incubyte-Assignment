/**
 * Tests for POST /api/employees
 * Prisma client is mocked — no database required.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Mock Prisma ──────────────────────────────────────────────────────────────
vi.mock("@/lib/db", () => ({
  prisma: {
    employee: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    department: {
      findUnique: vi.fn(),
    },
    country: {
      findUnique: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/db";
import { POST } from "@/app/api/employees/route";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const makeDepartment = () => ({
  id: "7946fb4b-7fe8-44bd-9c04-e59345b5cc36",
  name: "Engineering",
});

const makeCountry = () => ({
  code: "US",
  name: "United States",
  currency: "USD",
});

const makeEmployee = () => ({
  id: "emp-2",
  employeeCode: "EMP-00002",
  fullName: "Bob Smith",
  email: "bob.smith@acme.com",
  jobTitle: "Product Designer",
  level: "L3",
  employmentType: "FULL_TIME",
  departmentId: "7946fb4b-7fe8-44bd-9c04-e59345b5cc36",
  countryCode: "US",
  baseSalary: "85000.00",
  bonus: "5000.00",
  currency: "USD",
  hiredAt: "2026-06-10T19:18:33.013Z",
  isActive: true,
});

const makeRequest = (body: Record<string, unknown>) =>
  new NextRequest(new URL("http://localhost:3000/api/employees"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("POST /api/employees", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should successfully create a new employee and auto-generate the employeeCode", async () => {
    // 1. Setup mock resolves
    vi.mocked(prisma.employee.findUnique).mockResolvedValue(null); // No existing email
    vi.mocked(prisma.department.findUnique).mockResolvedValue(makeDepartment());
    vi.mocked(prisma.country.findUnique).mockResolvedValue(makeCountry());
    
    // Mock last employee having code EMP-00001
    vi.mocked(prisma.employee.findFirst).mockResolvedValue({
      employeeCode: "EMP-00001",
    } as any);

    const createdEmp = makeEmployee();
    vi.mocked(prisma.employee.create).mockResolvedValue({
      ...createdEmp,
      hiredAt: new Date(createdEmp.hiredAt),
    } as any);

    // 2. Perform request
    const req = makeRequest({
      fullName: "Bob Smith",
      email: "bob.smith@acme.com",
      jobTitle: "Product Designer",
      level: "L3",
      employmentType: "FULL_TIME",
      departmentId: "7946fb4b-7fe8-44bd-9c04-e59345b5cc36",
      countryCode: "US",
      baseSalary: 85000,
      bonus: 5000,
    });

    const response = await POST(req);
    expect(response.status).toBe(201);

    const json = await response.json();
    expect(json).toEqual(createdEmp);

    // Verify auto-generation logic used the next code
    expect(prisma.employee.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          employeeCode: "EMP-00002",
          fullName: "Bob Smith",
          currency: "USD",
        }),
      })
    );
  });

  it("should return 400 validation error if email is invalid", async () => {
    const req = makeRequest({
      fullName: "Bob Smith",
      email: "invalid-email",
      jobTitle: "Product Designer",
      level: "L3",
      employmentType: "FULL_TIME",
      departmentId: "7946fb4b-7fe8-44bd-9c04-e59345b5cc36",
      countryCode: "US",
      baseSalary: 85000,
      bonus: 5000,
    });

    const response = await POST(req);
    expect(response.status).toBe(400);

    const json = await response.json();
    expect(json.error).toBe("Validation failed");
    expect(json.details.fieldErrors.email).toBeDefined();
  });

  it("should return 409 conflict if email is already taken", async () => {
    vi.mocked(prisma.employee.findUnique).mockResolvedValue({ id: "existing-id" } as any);

    const req = makeRequest({
      fullName: "Bob Smith",
      email: "bob.smith@acme.com",
      jobTitle: "Product Designer",
      level: "L3",
      employmentType: "FULL_TIME",
      departmentId: "7946fb4b-7fe8-44bd-9c04-e59345b5cc36",
      countryCode: "US",
      baseSalary: 85000,
      bonus: 5000,
    });

    const response = await POST(req);
    expect(response.status).toBe(409);

    const json = await response.json();
    expect(json.error).toBe("An employee with this email already exists");
  });

  it("should return 404 if department is not found", async () => {
    vi.mocked(prisma.employee.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.department.findUnique).mockResolvedValue(null);

    const req = makeRequest({
      fullName: "Bob Smith",
      email: "bob.smith@acme.com",
      jobTitle: "Product Designer",
      level: "L3",
      employmentType: "FULL_TIME",
      departmentId: "d949b29e-2dc3-4a69-8f69-d9ff85c602b9",
      countryCode: "US",
      baseSalary: 85000,
      bonus: 5000,
    });

    const response = await POST(req);
    expect(response.status).toBe(404);

    const json = await response.json();
    expect(json.error).toBe("Department not found");
  });

  it("should return 404 if country is not found", async () => {
    vi.mocked(prisma.employee.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.department.findUnique).mockResolvedValue(makeDepartment());
    vi.mocked(prisma.country.findUnique).mockResolvedValue(null);

    const req = makeRequest({
      fullName: "Bob Smith",
      email: "bob.smith@acme.com",
      jobTitle: "Product Designer",
      level: "L3",
      employmentType: "FULL_TIME",
      departmentId: "7946fb4b-7fe8-44bd-9c04-e59345b5cc36",
      countryCode: "XX",
      baseSalary: 85000,
      bonus: 5000,
    });

    const response = await POST(req);
    expect(response.status).toBe(404);

    const json = await response.json();
    expect(json.error).toBe("Country not found");
  });
});
