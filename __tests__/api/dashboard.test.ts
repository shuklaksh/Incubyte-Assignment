import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock Prisma client
vi.mock("@/lib/db", () => ({
  prisma: {
    employee: {
      aggregate: vi.fn(),
      groupBy: vi.fn(),
    },
    country: {
      findMany: vi.fn(),
    },
    department: {
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/db";
import { GET } from "@/app/api/dashboard/stats/route";

const makeRequest = (params: Record<string, string> = {}) => {
  const url = new URL("http://localhost:3000/api/dashboard/stats");
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return new NextRequest(url);
};

describe("GET /api/dashboard/stats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.country.findMany).mockResolvedValue([
      { code: "US", name: "United States", currency: "USD" },
      { code: "SG", name: "Singapore", currency: "SGD" },
    ] as never);
    vi.mocked(prisma.department.findMany).mockResolvedValue([
      { id: "dept-1", name: "Engineering" },
      { id: "dept-2", name: "Sales" },
    ] as never);
    // Setup default fallback for groupBy
    vi.mocked(prisma.employee.groupBy).mockResolvedValue([] as never);
  });

  it("returns aggregated stats with no filters", async () => {
    vi.mocked(prisma.employee.aggregate).mockResolvedValue({
      _sum: {
        baseSalary: 100000.00,
        bonus: 10000.00,
      },
      _avg: {
        baseSalary: 50000.00,
      },
      _count: {
        _all: 2,
      },
    } as never);

    vi.mocked(prisma.employee.groupBy).mockImplementation(async (args: any) => {
      if (args.by.includes("level")) {
        return [
          {
            level: "L3",
            _count: { _all: 2 },
            _avg: { baseSalary: 50000.00 },
            _min: { baseSalary: 45000.00 },
            _max: { baseSalary: 55000.00 },
          }
        ];
      }
      if (args.by.includes("departmentId")) {
        return [
          {
            departmentId: "dept-1",
            _count: { _all: 2 },
            _sum: { baseSalary: 100000.00, bonus: 10000.00 },
          }
        ];
      }
      return [];
    });

    const response = await GET(makeRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.stats.totalPayroll).toBe(110000.00);
    expect(body.stats.activeEmployees).toBe(2);
    expect(body.stats.avgBaseSalary).toBe(50000.00);
    expect(body.countries).toHaveLength(2);
    expect(body.countries[0].code).toBe("US");

    // Verify Level distribution is present
    expect(body.levels).toHaveLength(1);
    expect(body.levels[0].level).toBe("L3");
    expect(body.levels[0].count).toBe(2);

    // Verify Department budget allocation is present
    expect(body.departments).toHaveLength(2);
    expect(body.departments[0].id).toBe("dept-1");
    expect(body.departments[0].name).toBe("Engineering");
    expect(body.departments[0].count).toBe(2);
    expect(body.departments[0].budget).toBe(110000.00);
    expect(body.departments[1].name).toBe("Sales");
    expect(body.departments[1].budget).toBe(0);

    // Verify Prisma aggregate call structure
    const aggCall = vi.mocked(prisma.employee.aggregate).mock.calls[0][0];
    expect(aggCall.where?.isActive).toBe(true);
    expect(aggCall.where?.countryCode).toBeUndefined();
  });

  it("filters stats by country query parameter", async () => {
    vi.mocked(prisma.employee.aggregate).mockResolvedValue({
      _sum: {
        baseSalary: 60000.00,
        bonus: 5000.00,
      },
      _avg: {
        baseSalary: 60000.00,
      },
      _count: {
        _all: 1,
      },
    } as never);

    vi.mocked(prisma.employee.groupBy).mockImplementation(async (args: any) => {
      if (args.by.includes("level")) {
        return [
          {
            level: "L3",
            _count: { _all: 1 },
            _avg: { baseSalary: 60000.00 },
            _min: { baseSalary: 60000.00 },
            _max: { baseSalary: 60000.00 },
          }
        ];
      }
      if (args.by.includes("departmentId")) {
        return [
          {
            departmentId: "dept-1",
            _count: { _all: 1 },
            _sum: { baseSalary: 60000.00, bonus: 5000.00 },
          }
        ];
      }
      return [];
    });

    const response = await GET(makeRequest({ country: "US" }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.stats.totalPayroll).toBe(65000.00);
    expect(body.stats.activeEmployees).toBe(1);
    expect(body.levels[0].count).toBe(1);
    expect(body.departments[0].budget).toBe(65000.00);

    const aggCall = vi.mocked(prisma.employee.aggregate).mock.calls[0][0];
    expect(aggCall.where?.countryCode).toBe("US");

    const groupCalls = vi.mocked(prisma.employee.groupBy).mock.calls;
    const hasCountryFilter = groupCalls.every(call => call[0].where?.countryCode === "US");
    expect(hasCountryFilter).toBe(true);
  });

  it("returns zero metrics when there are no matching employees", async () => {
    vi.mocked(prisma.employee.aggregate).mockResolvedValue({
      _sum: {
        baseSalary: null,
        bonus: null,
      },
      _avg: {
        baseSalary: null,
      },
      _count: {
        _all: 0,
      },
    } as never);

    const response = await GET(makeRequest({ country: "NONEXISTENT" }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.stats.totalPayroll).toBe(0);
    expect(body.stats.activeEmployees).toBe(0);
    expect(body.stats.avgBaseSalary).toBe(0);
    expect(body.levels).toEqual([]);
    expect(body.departments).toHaveLength(2);
    expect(body.departments[0].budget).toBe(0);
  });

  it("returns 400 when query parameter validation fails", async () => {
    const response = await GET(makeRequest({ employmentType: "INVALID_TYPE" }));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Invalid query parameters");
  });
});
