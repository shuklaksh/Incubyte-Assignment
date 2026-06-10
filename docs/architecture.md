# Architecture Document — Employee Salary Management System

## System Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                           VERCEL                               │
│                                                                │
│  ┌──────────────────────────────┐   ┌─────────────────────┐   │
│  │       Next.js App (React)    │   │     API Routes      │   │
│  │                              │──▶│  (Serverless Fns)   │   │
│  │  Navbar (/)                  │   │                     │   │
│  │  / → EmployeeTable           │   │ GET/POST /api/employees        │   │
│  │  /dashboard → DashboardPage  │   │ PUT /api/employees/[id]/salary │   │
│  │                              │   │ DELETE /api/employees/[id]     │   │
│  │  Components:                 │   │ POST /api/employees/bulk-salary│   │
│  │   EmployeeTable (HTML table) │   │ DELETE /api/employees/bulk-delete│  │
│  │   AddEmployeeModal           │   │ GET /api/export/employees      │   │
│  │   EditSalaryModal            │   │ GET /api/dashboard/stats       │   │
│  │   BulkSalaryModal            │   └───────────┬─────────┘   │
│  │   DeleteModal                │               │              │
│  │   EmployeeDrawer             │               │ Prisma ORM   │
│  │                              │               │              │
│  │  State: React Query (fetch)  │               │              │
│  │  Styling: Inline CSS + CSS   │               │              │
│  │           variables          │               │              │
│  │  Validation: Zod (client)    │               │              │
│  └──────────────────────────────┘               │              │
│                                                 │              │
└─────────────────────────────────────────────────┼──────────────┘
                                                  │
                               ┌──────────────────▼──────────────┐
                               │        Neon Postgres             │
                               │        (Free Tier)               │
                               │                                  │
                               │  employees                       │
                               │  departments                     │
                               │  countries                       │
                               │  salary_history                  │
                               └──────────────────────────────────┘
```

**Request Flow:**
1. User navigates the app via the sticky `Navbar` (Employee Table or Dashboard).
2. React Query fires `fetch` calls to API routes (GET on load, POST/PUT/DELETE on mutations).
3. API routes validate all inputs with **Zod** before any DB call.
4. **Prisma** executes type-safe queries against **Neon Postgres** via the `@prisma/adapter-neon` serverless adapter.
5. Results are returned as JSON (or `text/csv` for export).
6. React Query invalidates the relevant query cache after mutations — the table refetches automatically.

**Build Pipeline (Vercel):**
- `npm install` → triggers `postinstall: prisma generate` (Prisma client types generated)
- `npm run build` → `prisma generate && next build` (safety double-generate + TypeScript compile)

---

## Tech Stack Decisions

### Next.js 14 (App Router)

**What it is:** A React meta-framework that provides file-system routing, server components,
API routes (serverless functions), image optimization, and a zero-config Vercel deployment.

**Why we chose it:** Gives us a React frontend and API routes in a single codebase with a
single deployment. There is no need for a separate Express server or a second Vercel project.
The App Router's server components reduce client-side JavaScript for non-interactive views.

**Considered instead:** Express + Vite React as separate repositories — two deployments,
two sets of CORS config, two CI/CD pipelines, and no shared TypeScript types. Too much
operational overhead for no architectural benefit at this scale.

---

### TypeScript (strict mode)

**What it is:** A statically typed superset of JavaScript that compiles to plain JS.
Strict mode enables `noImplicitAny`, `strictNullChecks`, and all other safety flags.

**Why we chose it:** Catches entire classes of bugs at compile time. Prisma generates
TypeScript types directly from the schema, so DB types flow all the way to the UI without
manual interface definitions. Refactoring (renaming columns, changing response shapes) is
safe because the compiler catches every call site.

**Considered instead:** Plain JavaScript — rejected because there is no type safety on
API responses or DB queries. A column rename in the schema would silently break the UI.

---

### Neon Postgres

**What it is:** A serverless Postgres provider with a free tier, built-in connection pooling
(via pgBouncer), and HTTP-based connections that work in serverless environments.

**Why we chose it:** Free tier requires no credit card. Serverless-compatible (connection
pooling built in — critical for Vercel's short-lived serverless functions). Works perfectly
with Prisma out of the box. The `@neondatabase/serverless` driver handles cold starts gracefully.

**Considered instead:** SQLite (rejected — does not have a persistent filesystem on Vercel
serverless; data would be lost between deployments). PlanetScale (rejected — reduced its free
tier significantly in 2024, no longer viable without payment).

---

### Prisma ORM

**What it is:** A next-generation ORM for Node.js/TypeScript. Defines schema in a `.prisma`
file, generates a fully-typed database client, and manages migrations as versioned SQL files.

**Why we chose it:** Type-safe database client generated from the schema means zero
hand-written SQL for standard operations. Migrations are version-controlled and reproducible.
Prisma's `$transaction` API makes atomic operations (update + insert history) straightforward.
Excellent TypeScript integration — all query results have precise inferred types.

**Considered instead:** Drizzle ORM (newer, less ecosystem maturity, fewer production
references at scale). Raw SQL with `pg` library (no type safety, significant boilerplate for
parameterized queries, manual result mapping).

---

### UI Design System (Inline CSS + CSS Variables)

**What it is:** All UI components use **inline React `CSSProperties`** backed by a set of
CSS custom properties (variables) defined in `app/globals.css`. No utility class strings
in JSX — all styles are type-safe JavaScript objects.

**Why we chose it:** Zero build-time CSS purging concerns. CSS variable tokens (`--primary`,
`--surface`, `--text-primary`, etc.) define the dark-mode design system globally; components
read from them without any class-name coupling. Easy to theme and override. The approach also
avoided version conflicts between Tailwind and third-party component libraries.

**Radix UI / shadcn primitives** are installed as dependencies to provide accessibility
behaviours (ARIA attributes, keyboard navigation, focus traps) for interactive widgets.
`Sonner` is used exclusively for toast notifications.

**Considered instead:** Tailwind utility classes directly in JSX (cluttered, hard to read for
complex layouts). Full shadcn/ui component library (would impose its own class-name design
system and fight with the custom dark-mode variables).

---

### Custom HTML Table (Plain `<table>`)

**What it is:** The employee table is a standard `<table>` element with manually managed
state for sorting, selection, and pagination — all synced to the URL via Next.js router.

**Why we chose it:** Server-side pagination means the browser only ever has 50 rows at a
time. TanStack Table's client-side row model adds no value when all filtering and slicing
happens in Postgres. A plain `<table>` is simpler, easier to test, and has less JavaScript
overhead. All sort/filter/pagination state lives in URL params — shareable and refresh-safe.

**Considered instead:** TanStack Table v8 (installed but not used for the main table — its
client-side row model is designed for data already in the browser, which conflicts with the
server-side-first design). AG Grid (paid license required for row grouping; overkill).

---

### React Query (TanStack Query)

**What it is:** A server state management library for React. Handles fetching, caching,
background refetching, loading states, error states, and cache invalidation.

**Why we chose it:** Eliminates the `useEffect` + `useState` boilerplate that every API call
would otherwise require. Automatic cache invalidation after mutations (edit salary → table
refreshes automatically). Deduplicated requests, stale-while-revalidate semantics, and
optimistic updates for a snappy UI.

**Considered instead:** SWR (fewer features — no mutations, no query invalidation, no
dependent queries). Plain `useEffect` (too much manual state management: loading boolean,
error state, abort controllers — high maintenance cost).

---

### Zod

**What it is:** A TypeScript-first schema validation library. Define a schema once, get both
runtime validation and static TypeScript type inference from the same declaration.

**Why we chose it:** Define the validation schema once; TypeScript infers the type
automatically — no duplication between a `type/interface` and a validation function. Used
on every API route to validate query params and request bodies before the Prisma call.
Excellent error messages for debugging.

**Considered instead:** Yup (worse TypeScript integration, verbose API). Manual validation
functions (error-prone, inconsistent error message format, no centralized schema).

---

### Vitest

**What it is:** A Vite-native test runner that is Jest-compatible (same `describe`, `it`,
`expect`, `vi` APIs). ESM-native, so no transpilation step needed.

**Why we chose it:** Runs in milliseconds because it leverages Vite's ESM transform pipeline
— no Babel compilation overhead. Built-in TypeScript support. Works with Next.js without
complex `jest.config.ts` setup. `vi.mock()` is equivalent to `jest.mock()`.

**Considered instead:** Jest (slower in Next.js projects — requires `jest.config.ts` with
`moduleNameMapper`, `transform`, and ESM config; significantly more setup overhead).

---

## Database Schema

### `employees`

| Column           | Type            | Notes                                   |
|------------------|-----------------|-----------------------------------------|
| `id`             | UUID PK         | Primary key, auto-generated             |
| `employeeCode`   | VARCHAR unique  | Format: `EMP-00001`                     |
| `fullName`       | VARCHAR         | Display name                            |
| `email`          | VARCHAR unique  | Unique company email                    |
| `jobTitle`       | VARCHAR         | e.g. "Senior Software Engineer"         |
| `level`          | VARCHAR         | L1 through L7                           |
| `employmentType` | VARCHAR         | `FULL_TIME`, `PART_TIME`, `CONTRACT`    |
| `departmentId`   | UUID FK         | → `departments.id`                      |
| `countryCode`    | VARCHAR FK      | → `countries.code`                      |
| `baseSalary`     | DECIMAL(12,2)   | Never float — precision is mandatory    |
| `bonus`          | DECIMAL(12,2)   | Annual bonus amount                     |
| `currency`       | VARCHAR         | USD, INR, EUR, GBP, SGD                 |
| `hiredAt`        | DATE            | Employment start date                   |
| `isActive`       | BOOLEAN         | Soft delete flag; `false` = removed     |
| `createdAt`      | TIMESTAMP       | Auto-set on insert                      |
| `updatedAt`      | TIMESTAMP       | Auto-updated by Prisma on every change  |

---

### `departments`

| Column | Type          | Notes                    |
|--------|---------------|--------------------------|
| `id`   | UUID PK       | Primary key              |
| `name` | VARCHAR unique| e.g. "Engineering"       |

---

### `countries`

| Column     | Type    | Notes                                      |
|------------|---------|--------------------------------------------|
| `code`     | VARCHAR PK | ISO country code: US, IN, DE, GB, SG   |
| `name`     | VARCHAR | Full country name                          |
| `currency` | VARCHAR | Default currency for that country          |

---

### `salary_history`

| Column       | Type          | Notes                                     |
|--------------|---------------|-------------------------------------------|
| `id`         | UUID PK       | Primary key                               |
| `employeeId` | UUID FK       | → `employees.id`                          |
| `changedBy`  | VARCHAR       | Hardcoded "HR Manager" until auth added   |
| `oldSalary`  | DECIMAL(12,2) | Salary before this change                 |
| `newSalary`  | DECIMAL(12,2) | Salary after this change                  |
| `oldBonus`   | DECIMAL(12,2) | Bonus before this change                  |
| `newBonus`   | DECIMAL(12,2) | Bonus after this change                   |
| `reason`     | TEXT          | Required justification (min 10 chars)     |
| `changedAt`  | TIMESTAMP     | Auto-set at insert time                   |

---

### Indexes

| Index                        | Purpose                                          |
|------------------------------|--------------------------------------------------|
| `employees.departmentId`     | Fast filter by department                        |
| `employees.countryCode`      | Fast filter by country                           |
| `employees.baseSalary`       | Fast sort and range filter by salary             |
| `employees.isActive`         | Excluded from almost every query; must be fast   |
| `salary_history.employeeId`  | Fast lookup of history for a single employee     |
| `salary_history.changedAt`   | Fast sort by date in history drawer              |

---

## Key Tradeoffs

### Soft Delete vs. Hard Delete

**Decision: Soft delete (`isActive = false`).**

Salary data is sensitive and audit-critical. Hard deleting an employee permanently destroys
their salary history — a compliance risk. `isActive = false` removes the employee from all
default views while preserving all records. The data is never truly gone.

---

### Server-Side vs. Client-Side Pagination

**Decision: Server-side pagination.**

Loading 10,000 rows into the browser requires ~5-10MB of JSON transfer, strains React's
virtual DOM reconciliation, and makes the initial render painfully slow. The database does
the filtering, sorting, and slicing. Only 50 rows travel over the network per page. Sorting
and filtering performance is determined by Postgres indexes, not client memory.

---

### Monorepo (Next.js) vs. Separate Frontend/Backend

**Decision: Monorepo with Next.js App Router.**

Single deployment. Shared TypeScript types between the UI components and the API route
handlers — no `@types` packages or OpenAPI codegen needed. Simpler CI/CD (one pipeline,
one Vercel project). The API routes become serverless functions on Vercel automatically,
with zero additional configuration.

---

### Decimal vs. Float for Salary

**Decision: `Decimal` (Postgres `NUMERIC` type).**

IEEE 754 floating-point arithmetic is inexact: `0.1 + 0.2 = 0.30000000000000004` in
JavaScript. Salary calculations — especially bulk percentage adjustments across 10,000
employees — accumulate these errors. Prisma's `Decimal` type maps to Postgres `NUMERIC`,
which is exact arbitrary-precision arithmetic. Financial data must be exact.
