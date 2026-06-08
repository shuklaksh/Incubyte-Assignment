import { describe, it, expect } from "vitest";
import {
  UpdateSalarySchema,
  BulkSalarySchema,
  EmployeeQuerySchema,
} from "@/lib/validations";

// ─── UpdateSalarySchema ────────────────────────────────────────────────────────

describe("UpdateSalarySchema", () => {
  it("passes with valid baseSalary, bonus, and reason", () => {
    const result = UpdateSalarySchema.safeParse({
      baseSalary: 120000,
      bonus: 10000,
      reason: "Annual performance review cycle completed",
    });
    expect(result.success).toBe(true);
  });

  it("fails when baseSalary is zero", () => {
    const result = UpdateSalarySchema.safeParse({
      baseSalary: 0,
      bonus: 10000,
      reason: "Annual performance review",
    });
    expect(result.success).toBe(false);
  });

  it("fails when baseSalary is negative", () => {
    const result = UpdateSalarySchema.safeParse({
      baseSalary: -1000,
      bonus: 0,
      reason: "Annual performance review",
    });
    expect(result.success).toBe(false);
  });

  it("fails when bonus is negative", () => {
    const result = UpdateSalarySchema.safeParse({
      baseSalary: 100000,
      bonus: -500,
      reason: "Annual performance review",
    });
    expect(result.success).toBe(false);
  });

  it("fails when reason is missing", () => {
    const result = UpdateSalarySchema.safeParse({
      baseSalary: 100000,
      bonus: 10000,
    });
    expect(result.success).toBe(false);
  });

  it("fails when reason is 9 characters (boundary)", () => {
    const result = UpdateSalarySchema.safeParse({
      baseSalary: 100000,
      bonus: 0,
      reason: "123456789", // exactly 9 chars
    });
    expect(result.success).toBe(false);
  });

  it("passes when reason is exactly 10 characters (boundary)", () => {
    const result = UpdateSalarySchema.safeParse({
      baseSalary: 100000,
      bonus: 0,
      reason: "1234567890", // exactly 10 chars
    });
    expect(result.success).toBe(true);
  });

  it("fails when reason exceeds 500 characters", () => {
    const result = UpdateSalarySchema.safeParse({
      baseSalary: 100000,
      bonus: 0,
      reason: "a".repeat(501),
    });
    expect(result.success).toBe(false);
  });
});

// ─── BulkSalarySchema ─────────────────────────────────────────────────────────

describe("BulkSalarySchema", () => {
  it("passes with valid employeeIds and PERCENTAGE type", () => {
    const result = BulkSalarySchema.safeParse({
      employeeIds: ["550e8400-e29b-41d4-a716-446655440000"],
      adjustmentType: "PERCENTAGE",
      adjustmentValue: 10,
      reason: "Annual raise for all staff",
    });
    expect(result.success).toBe(true);
  });

  it("passes with valid employeeIds and FIXED type", () => {
    const result = BulkSalarySchema.safeParse({
      employeeIds: ["550e8400-e29b-41d4-a716-446655440000"],
      adjustmentType: "FIXED",
      adjustmentValue: 5000,
      reason: "Cost of living adjustment",
    });
    expect(result.success).toBe(true);
  });

  it("fails when employeeIds is empty array", () => {
    const result = BulkSalarySchema.safeParse({
      employeeIds: [],
      adjustmentType: "PERCENTAGE",
      adjustmentValue: 10,
      reason: "Annual raise for all staff",
    });
    expect(result.success).toBe(false);
  });

  it("fails when adjustmentValue is zero", () => {
    const result = BulkSalarySchema.safeParse({
      employeeIds: ["550e8400-e29b-41d4-a716-446655440000"],
      adjustmentType: "PERCENTAGE",
      adjustmentValue: 0,
      reason: "Annual raise for all staff",
    });
    expect(result.success).toBe(false);
  });

  it("fails when adjustmentValue is negative", () => {
    const result = BulkSalarySchema.safeParse({
      employeeIds: ["550e8400-e29b-41d4-a716-446655440000"],
      adjustmentType: "PERCENTAGE",
      adjustmentValue: -5,
      reason: "Annual raise for all staff",
    });
    expect(result.success).toBe(false);
  });

  it("fails when adjustmentType is not PERCENTAGE or FIXED", () => {
    const result = BulkSalarySchema.safeParse({
      employeeIds: ["550e8400-e29b-41d4-a716-446655440000"],
      adjustmentType: "MULTIPLY",
      adjustmentValue: 10,
      reason: "Annual raise for all staff",
    });
    expect(result.success).toBe(false);
  });

  it("fails when reason is less than 10 chars", () => {
    const result = BulkSalarySchema.safeParse({
      employeeIds: ["550e8400-e29b-41d4-a716-446655440000"],
      adjustmentType: "PERCENTAGE",
      adjustmentValue: 10,
      reason: "Short",
    });
    expect(result.success).toBe(false);
  });
});

// ─── EmployeeQuerySchema ───────────────────────────────────────────────────────

describe("EmployeeQuerySchema", () => {
  it("returns defaults when no params provided", () => {
    const result = EmployeeQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(50);
      expect(result.data.sortOrder).toBe("asc");
    }
  });

  it("fails when limit exceeds 100", () => {
    const result = EmployeeQuerySchema.safeParse({ limit: 101 });
    expect(result.success).toBe(false);
  });

  it("fails when page is zero", () => {
    const result = EmployeeQuerySchema.safeParse({ page: 0 });
    expect(result.success).toBe(false);
  });

  it("coerces string numbers to integers for page and limit", () => {
    const result = EmployeeQuerySchema.safeParse({ page: "2", limit: "25" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(2);
      expect(result.data.limit).toBe(25);
    }
  });

  it("fails when level is not a valid enum value", () => {
    const result = EmployeeQuerySchema.safeParse({ level: "L8" });
    expect(result.success).toBe(false);
  });

  it("fails when sortOrder is not asc or desc", () => {
    const result = EmployeeQuerySchema.safeParse({ sortOrder: "random" });
    expect(result.success).toBe(false);
  });

  it("accepts valid optional filters", () => {
    const result = EmployeeQuerySchema.safeParse({
      search: "John",
      department: "Engineering",
      country: "US",
      employmentType: "FULL_TIME",
      level: "L3",
      minSalary: "50000",
      maxSalary: "150000",
      sortBy: "baseSalary",
      sortOrder: "desc",
    });
    expect(result.success).toBe(true);
  });
});
