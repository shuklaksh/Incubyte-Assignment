/**
 * Shared TypeScript types for API responses and domain objects.
 * These types mirror the Prisma models but are safe to import on the client.
 */

export interface Department {
  id: string;
  name: string;
}

export interface Country {
  code: string;
  name: string;
  currency: string;
}

export interface SalaryHistoryEntry {
  id: string;
  employeeId: string;
  changedBy: string;
  oldSalary: string;
  newSalary: string;
  oldBonus: string;
  newBonus: string;
  reason: string;
  changedAt: string;
}

export interface Employee {
  id: string;
  employeeCode: string;
  fullName: string;
  email: string;
  jobTitle: string;
  level: string;
  employmentType: string;
  departmentId: string;
  countryCode: string;
  baseSalary: string;
  bonus: string;
  currency: string;
  hiredAt: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  department: Department;
  country: Country;
  salaryHistory?: SalaryHistoryEntry[];
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface EmployeeListResponse {
  data: Employee[];
  pagination: PaginationMeta;
  meta: {
    departments: Department[];
    countries: Country[];
  };
}

export interface EmployeeFilters {
  page?: number;
  limit?: number;
  search?: string;
  department?: string;
  country?: string;
  employmentType?: string;
  level?: string;
  minSalary?: number;
  maxSalary?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export const COUNTRY_FLAGS: Record<string, string> = {
  US: "🇺🇸",
  IN: "🇮🇳",
  DE: "🇩🇪",
  GB: "🇬🇧",
  SG: "🇸🇬",
};
