import { z } from "zod";

// ─── UpdateSalarySchema ────────────────────────────────────────────────────────

/**
 * Validates the request body for PUT /api/employees/:id/salary
 * baseSalary must be positive; bonus must be non-negative; reason is required (10–500 chars).
 */
export const UpdateSalarySchema = z.object({
  baseSalary: z
    .number({ required_error: "baseSalary is required" })
    .positive("baseSalary must be a positive number"),
  bonus: z
    .number({ required_error: "bonus is required" })
    .min(0, "bonus cannot be negative"),
  reason: z
    .string({ required_error: "reason is required" })
    .min(10, "reason must be at least 10 characters")
    .max(500, "reason cannot exceed 500 characters"),
});

export type UpdateSalaryInput = z.infer<typeof UpdateSalarySchema>;

// ─── BulkSalarySchema ─────────────────────────────────────────────────────────

/**
 * Validates the request body for PUT /api/employees/bulk-salary
 * At least one employee must be selected; adjustmentValue must be positive.
 */
export const BulkSalarySchema = z.object({
  employeeIds: z
    .array(z.string().uuid("each employeeId must be a valid UUID"))
    .min(1, "at least one employee must be selected"),
  adjustmentType: z.enum(["PERCENTAGE", "FIXED"], {
    errorMap: () => ({ message: "adjustmentType must be PERCENTAGE or FIXED" }),
  }),
  adjustmentValue: z
    .number({ required_error: "adjustmentValue is required" })
    .positive("adjustmentValue must be a positive number"),
  reason: z
    .string({ required_error: "reason is required" })
    .min(10, "reason must be at least 10 characters")
    .max(500, "reason cannot exceed 500 characters"),
});

export type BulkSalaryInput = z.infer<typeof BulkSalarySchema>;

// ─── EmployeeQuerySchema ───────────────────────────────────────────────────────

/**
 * Validates and coerces URL query parameters for GET /api/employees
 * page and limit are coerced from strings to integers (URLSearchParams are always strings).
 */
export const EmployeeQuerySchema = z.object({
  page: z.coerce
    .number()
    .int("page must be an integer")
    .positive("page must be at least 1")
    .default(1),
  limit: z.coerce
    .number()
    .int("limit must be an integer")
    .min(1, "limit must be at least 1")
    .max(100, "limit cannot exceed 100")
    .default(50),
  search: z.string().optional(),
  department: z.string().optional(),
  country: z.string().optional(),
  employmentType: z
    .enum(["FULL_TIME", "PART_TIME", "CONTRACT"])
    .optional(),
  level: z
    .enum(["L1", "L2", "L3", "L4", "L5", "L6", "L7"])
    .optional(),
  minSalary: z.coerce.number().positive().optional(),
  maxSalary: z.coerce.number().positive().optional(),
  sortBy: z
    .enum(["baseSalary", "fullName", "hiredAt"])
    .optional(),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
});

export type EmployeeQueryInput = z.infer<typeof EmployeeQuerySchema>;

// ─── DashboardQuerySchema ──────────────────────────────────────────────────────
export const DashboardQuerySchema = z.object({
  country: z.string().optional(),
  department: z.string().optional(),
  level: z.enum(["L1", "L2", "L3", "L4", "L5", "L6", "L7"]).optional(),
  employmentType: z.enum(["FULL_TIME", "PART_TIME", "CONTRACT"]).optional(),
});

export type DashboardQueryInput = z.infer<typeof DashboardQuerySchema>;
