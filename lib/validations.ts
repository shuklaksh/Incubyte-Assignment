import { z } from "zod";

// ─── UpdateSalarySchema ────────────────────────────────────────────────────────

/**
 * Validates the request body for PUT /api/employees/:id/salary
 * baseSalary must be positive; bonus must be non-negative; reason is required (10–500 chars).
 */
export const UpdateSalarySchema = z.object({
  baseSalary: z
    .number({ error: (issue) => issue.input === undefined ? "baseSalary is required" : undefined })
    .positive("baseSalary must be a positive number"),
  bonus: z
    .number({ error: (issue) => issue.input === undefined ? "bonus is required" : undefined })
    .min(0, "bonus cannot be negative"),
  reason: z
    .string({ error: (issue) => issue.input === undefined ? "reason is required" : undefined })
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
    error: "adjustmentType must be PERCENTAGE or FIXED",
  }),
  adjustmentValue: z
    .number({ error: (issue) => issue.input === undefined ? "adjustmentValue is required" : undefined })
    .positive("adjustmentValue must be a positive number"),
  reason: z
    .string({ error: (issue) => issue.input === undefined ? "reason is required" : undefined })
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

// ─── CreateEmployeeSchema ─────────────────────────────────────────────────────
export const CreateEmployeeSchema = z.object({
  fullName: z
    .string({ error: (issue) => issue.input === undefined ? "fullName is required" : undefined })
    .min(2, "Name must be at least 2 characters"),
  email: z
    .string({ error: (issue) => issue.input === undefined ? "email is required" : undefined })
    .email("Invalid email address"),
  jobTitle: z
    .string({ error: (issue) => issue.input === undefined ? "jobTitle is required" : undefined })
    .min(2, "Job title must be at least 2 characters"),
  level: z.enum(["L1", "L2", "L3", "L4", "L5", "L6", "L7"], {
    error: "level must be L1 to L7",
  }),
  employmentType: z.enum(["FULL_TIME", "PART_TIME", "CONTRACT"], {
    error: "employmentType must be FULL_TIME, PART_TIME, or CONTRACT",
  }),
  departmentId: z
    .string({ error: (issue) => issue.input === undefined ? "departmentId is required" : undefined })
    .uuid("departmentId must be a valid UUID"),
  countryCode: z
    .string({ error: (issue) => issue.input === undefined ? "countryCode is required" : undefined })
    .length(2, "countryCode must be a 2-letter ISO code"),
  baseSalary: z
    .number({ error: (issue) => issue.input === undefined ? "baseSalary is required" : undefined })
    .positive("baseSalary must be a positive number"),
  bonus: z
    .number({ error: (issue) => issue.input === undefined ? "bonus is required" : undefined })
    .min(0, "bonus cannot be negative"),
});

export type CreateEmployeeInput = z.infer<typeof CreateEmployeeSchema>;
