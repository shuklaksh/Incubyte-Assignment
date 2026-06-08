/**
 * Format utilities for the Employee Salary Management System.
 * All monetary values use Intl.NumberFormat for locale-aware formatting.
 */

const LOCALE_MAP: Record<string, string> = {
  USD: "en-US",
  INR: "en-IN",
  EUR: "de-DE",
  GBP: "en-GB",
  SGD: "en-SG",
};

/**
 * Format a numeric amount as a currency string with the correct symbol and separators.
 * Uses Intl.NumberFormat for locale-aware, spec-compliant formatting.
 */
export function formatCurrency(
  amount: number,
  currency: string,
  locale?: string
): string {
  const resolvedLocale = locale ?? LOCALE_MAP[currency] ?? "en-US";
  return new Intl.NumberFormat(resolvedLocale, {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format a Date object to a human-readable date string.
 * Example: "Jan 15, 2020"
 */
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

type EmploymentType = "FULL_TIME" | "PART_TIME" | "CONTRACT";

const EMPLOYMENT_TYPE_LABELS: Record<EmploymentType, string> = {
  FULL_TIME: "Full Time",
  PART_TIME: "Part Time",
  CONTRACT: "Contract",
};

/**
 * Convert an employment type enum value to a human-readable label.
 */
export function formatEmploymentType(type: string): string {
  return EMPLOYMENT_TYPE_LABELS[type as EmploymentType] ?? type;
}

/**
 * Format a level string (L1–L7). This is a passthrough but tested explicitly
 * so a future format change is caught immediately.
 */
export function formatLevel(level: string): string {
  return level;
}

/**
 * Calculate total compensation as the sum of base salary and bonus.
 */
export function calcTotalComp(base: number, bonus: number): number {
  // Use standard JS arithmetic — inputs are already plain numbers, not Decimal
  return Math.round((base + bonus) * 100) / 100;
}

export type DeltaDirection = "UP" | "DOWN" | "NONE";

export interface SalaryDelta {
  amount: number;
  percent: number;
  direction: DeltaDirection;
}

/**
 * Calculate the absolute and percentage change between two salary values.
 * Returns direction UP, DOWN, or NONE, and rounds percent to 1 decimal place.
 */
export function calcDelta(oldVal: number, newVal: number): SalaryDelta {
  const amount = newVal - oldVal;

  let percent: number;
  if (oldVal === 0) {
    // Avoid division by zero; treat as infinite increase or decrease
    percent = newVal > 0 ? 100 : 0;
  } else {
    percent = Math.round(((newVal - oldVal) / oldVal) * 1000) / 10;
  }

  let direction: DeltaDirection;
  if (amount > 0) {
    direction = "UP";
  } else if (amount < 0) {
    direction = "DOWN";
  } else {
    direction = "NONE";
  }

  return { amount, percent, direction };
}
