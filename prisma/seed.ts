/**
 * Seed script: generates exactly 10,000 employees across 9 departments and 5 countries.
 * - Idempotent: uses upsert, safe to run multiple times
 * - Batches of 500 to avoid Neon connection limits
 * - Completes in under 60 seconds
 *
 * Run with: npx prisma db seed
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ─── Seed Data ────────────────────────────────────────────────────────────────

const DEPARTMENTS = [
  "Engineering",
  "Product",
  "Design",
  "Sales",
  "Marketing",
  "Finance",
  "HR",
  "Legal",
  "Operations",
];

const COUNTRIES = [
  { code: "US", name: "United States", currency: "USD", baseUSD: 100000, weight: 0.30 },
  { code: "IN", name: "India", currency: "INR", baseUSD: 1500000, weight: 0.30 },
  { code: "DE", name: "Germany", currency: "EUR", baseUSD: 70000, weight: 0.15 },
  { code: "GB", name: "United Kingdom", currency: "GBP", baseUSD: 75000, weight: 0.15 },
  { code: "SG", name: "Singapore", currency: "SGD", baseUSD: 90000, weight: 0.10 },
];

const LEVELS = [
  { code: "L1", multiplier: 0.60 },
  { code: "L2", multiplier: 0.75 },
  { code: "L3", multiplier: 0.90 },
  { code: "L4", multiplier: 1.00 },
  { code: "L5", multiplier: 1.30 },
  { code: "L6", multiplier: 1.60 },
  { code: "L7", multiplier: 2.00 },
];

const EMPLOYMENT_TYPES = [
  { type: "FULL_TIME", weight: 0.75 },
  { type: "CONTRACT", weight: 0.15 },
  { type: "PART_TIME", weight: 0.10 },
];

const FIRST_NAMES = [
  "James", "Mary", "John", "Patricia", "Robert", "Jennifer", "Michael", "Linda",
  "William", "Barbara", "David", "Elizabeth", "Richard", "Susan", "Joseph", "Jessica",
  "Thomas", "Sarah", "Charles", "Karen", "Christopher", "Lisa", "Daniel", "Nancy",
  "Matthew", "Betty", "Anthony", "Margaret", "Mark", "Sandra", "Donald", "Ashley",
  "Steven", "Dorothy", "Paul", "Kimberly", "Andrew", "Emily", "Joshua", "Donna",
  "Kenneth", "Michelle", "Kevin", "Carol", "Brian", "Amanda", "George", "Melissa",
  "Timothy", "Deborah", "Ronald", "Stephanie", "Edward", "Rebecca", "Jason", "Sharon",
  "Jeffrey", "Laura", "Ryan", "Cynthia",
];

const LAST_NAMES = [
  "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis",
  "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson",
  "Thomas", "Taylor", "Moore", "Jackson", "Martin", "Lee", "Perez", "Thompson",
  "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson",
  "Walker", "Young", "Allen", "King", "Wright", "Scott", "Torres", "Nguyen",
  "Hill", "Flores", "Green", "Adams", "Nelson", "Baker", "Hall", "Rivera",
  "Campbell", "Mitchell", "Carter", "Roberts", "Patel", "Kumar", "Singh", "Shah",
  "Sharma", "Mehta", "Gupta", "Joshi", "Muller", "Schneider",
];

const JOB_TITLES_BY_DEPT: Record<string, string[]> = {
  Engineering: ["Software Engineer", "Senior Software Engineer", "Staff Engineer", "Engineering Manager", "DevOps Engineer", "QA Engineer"],
  Product: ["Product Manager", "Senior Product Manager", "Product Director", "Product Analyst"],
  Design: ["UX Designer", "UI Designer", "Senior Designer", "Design Lead", "Product Designer"],
  Sales: ["Account Executive", "Sales Manager", "Sales Director", "Business Development Rep", "Enterprise Sales"],
  Marketing: ["Marketing Manager", "Content Strategist", "Growth Marketer", "SEO Specialist", "Brand Manager"],
  Finance: ["Financial Analyst", "Senior Analyst", "Finance Manager", "Controller", "FP&A Manager"],
  HR: ["HR Business Partner", "Recruiter", "HR Manager", "Talent Acquisition", "HR Director"],
  Legal: ["Legal Counsel", "Associate Counsel", "Senior Counsel", "Paralegal", "Compliance Manager"],
  Operations: ["Operations Manager", "Operations Analyst", "Project Manager", "Process Engineer", "COO"],
};

// ─── Utility Functions ─────────────────────────────────────────────────────────

function seededRandom(seed: number): number {
  // Simple LCG pseudo-random for reproducibility
  const a = 1664525;
  const c = 1013904223;
  const m = Math.pow(2, 32);
  seed = (a * seed + c) % m;
  return seed / m;
}

function weightedPick<T>(items: { weight: number; [key: string]: unknown }[], seed: number): T {
  const r = seededRandom(seed);
  let cumulative = 0;
  for (const item of items) {
    cumulative += item.weight;
    if (r < cumulative) return item as unknown as T;
  }
  return items[items.length - 1] as unknown as T;
}

function randomDate(start: Date, end: Date, seed: number): Date {
  const r = seededRandom(seed);
  return new Date(start.getTime() + r * (end.getTime() - start.getTime()));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ─── Main Seed Function ────────────────────────────────────────────────────────

async function main() {
  console.log("🌱 Starting seed...");
  const start = Date.now();

  // 1. Upsert departments
  console.log("  Creating departments...");
  const deptRecords = await Promise.all(
    DEPARTMENTS.map((name) =>
      prisma.department.upsert({
        where: { name },
        update: {},
        create: { name },
      })
    )
  );
  console.log(`  ✓ ${deptRecords.length} departments ready`);

  // 2. Upsert countries
  console.log("  Creating countries...");
  const countryRecords = await Promise.all(
    COUNTRIES.map((c) =>
      prisma.country.upsert({
        where: { code: c.code },
        update: { name: c.name, currency: c.currency },
        create: { code: c.code, name: c.name, currency: c.currency },
      })
    )
  );
  console.log(`  ✓ ${countryRecords.length} countries ready`);

  const deptMap = Object.fromEntries(deptRecords.map((d) => [d.name, d.id]));

  // 3. Generate 10,000 employees
  const TOTAL = 10000;
  const BATCH_SIZE = 500;
  const startDate = new Date("2015-01-01");
  const endDate = new Date("2024-12-31");

  let created = 0;
  const emailSet = new Set<string>();

  for (let batch = 0; batch < TOTAL / BATCH_SIZE; batch++) {
    const employees = [];

    for (let i = 0; i < BATCH_SIZE; i++) {
      const globalIndex = batch * BATCH_SIZE + i;
      const seed = globalIndex * 97 + 13; // deterministic but spread out

      // Pick country based on weight
      const country = weightedPick<typeof COUNTRIES[0]>(COUNTRIES, seed * 3);
      const level = LEVELS[Math.floor(seededRandom(seed * 7) * LEVELS.length)];
      const empType = weightedPick<typeof EMPLOYMENT_TYPES[0]>(EMPLOYMENT_TYPES, seed * 11);
      const dept = DEPARTMENTS[Math.floor(seededRandom(seed * 5) * DEPARTMENTS.length)];

      // Pick random names
      const firstIdx = Math.floor(seededRandom(seed * 17) * FIRST_NAMES.length);
      const lastIdx = Math.floor(seededRandom(seed * 19) * LAST_NAMES.length);
      const firstName = FIRST_NAMES[firstIdx];
      const lastName = LAST_NAMES[lastIdx];
      const fullName = `${firstName} ${lastName}`;

      // Deduplicated email
      let email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@acme.com`;
      let suffix = 1;
      while (emailSet.has(email)) {
        email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${suffix}@acme.com`;
        suffix++;
      }
      emailSet.add(email);

      const employeeCode = `EMP-${String(globalIndex + 1).padStart(5, "0")}`;
      const jobTitles = JOB_TITLES_BY_DEPT[dept] ?? ["Specialist"];
      const jobTitle = jobTitles[Math.floor(seededRandom(seed * 23) * jobTitles.length)];

      // Salary formula: countryBase × levelMultiplier × (0.85 + random × 0.30)
      const variance = 0.85 + seededRandom(seed * 29) * 0.30;
      const baseSalary = round2(country.baseUSD * level.multiplier * variance);
      // Bonus: baseSalary × (0.05 + random × 0.20)
      const bonusRate = 0.05 + seededRandom(seed * 31) * 0.20;
      const bonus = round2(baseSalary * bonusRate);

      const hiredAt = randomDate(startDate, endDate, seed * 37);

      employees.push({
        employeeCode,
        fullName,
        email,
        jobTitle,
        level: level.code,
        employmentType: empType.type,
        departmentId: deptMap[dept],
        countryCode: country.code,
        baseSalary,
        bonus,
        currency: country.currency,
        hiredAt,
        isActive: true,
      });
    }

    // Batch upsert using createMany with skipDuplicates
    await prisma.employee.createMany({
      data: employees,
      skipDuplicates: true,
    });

    created += employees.length;

    if (created % 1000 === 0 || created === TOTAL) {
      const elapsed = ((Date.now() - start) / 1000).toFixed(1);
      console.log(`  ✓ ${created}/${TOTAL} employees seeded (${elapsed}s)`);
    }
  }

  const totalTime = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`\n✅ Seed complete! ${created} employees in ${totalTime}s`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
