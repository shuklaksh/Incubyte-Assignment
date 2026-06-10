# Employee Salary Management System

A production-grade web tool for HR Managers to view, edit, and audit salaries for 10,000+ employees across multiple countries.

> **Full architecture rationale, tech stack decisions, and database schema are documented in [docs/architecture.md](./docs/architecture.md)**

---

## Prerequisites

- Node 18+
- npm 9+
- Free [Neon](https://neon.tech) account (no credit card required)

---

## Quick Start

```bash
# 1. Clone and install
git clone <repo-url>
cd incubyte
npm install

# 2. Set environment variables
cp .env.example .env
# Edit .env — paste your Neon DATABASE_URL and DIRECT_URL

# 3. Generate Prisma client
npx prisma generate

# 4. Push schema to database
npx prisma db push

# 5. Seed 10,000 employees
npx prisma db seed

# 6. Start development server
npm run dev
# → Open http://localhost:3000
```

---

## Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | Neon pooled connection string (used at runtime in serverless functions) |
| `DIRECT_URL` | Neon direct connection string (used by `prisma migrate` and `prisma db seed`) |

Both URLs come from your Neon dashboard → Connection Details. Use the **pooled** URL for `DATABASE_URL` and the **direct** URL for `DIRECT_URL`.

---

## Commands

```bash
npm run dev          # Start dev server (http://localhost:3000)
npm run build        # Production build
npm run start        # Start production server
npm test             # Run all 114 tests
npm run test:watch   # Watch mode
npm run test:coverage # Coverage report (opens in browser)
npx prisma db seed   # Seed 10,000 employees (idempotent)
npx prisma studio    # Open Prisma Studio GUI
npx prisma db push   # Push schema to DB (no migration file)
npx prisma migrate dev # Create and apply a migration
```

---

## Architecture

A single Next.js 14 (App Router) application deployed on Vercel. The React UI communicates with API Route handlers (serverless functions) that use Prisma ORM to query a Neon Postgres database. All inputs are validated with Zod before any DB call. Server-side pagination keeps response sizes small even with 10,000+ employees. See [docs/architecture.md](./docs/architecture.md) for the full system diagram and tech stack decisions.

---

## Deploy to Vercel

1. Push this repository to GitHub
2. Go to [vercel.com](https://vercel.com) → **New Project** → Import from GitHub
3. Select your repository
4. In **Environment Variables**, add:
   - `DATABASE_URL` — your Neon pooled connection string
   - `DIRECT_URL` — your Neon direct connection string
5. Click **Deploy**
6. Once deployed, run the seed via Vercel CLI:
   ```bash
   npm i -g vercel
   vercel env pull .env.production.local
   npx prisma db seed
   ```
7. Visit your deployment URL — it's live!

> **Note:** Vercel free tier serverless functions have a 10s timeout. The seed script must be run locally or via a build hook, not inside a serverless function.

---

## Test Coverage

| Test File | Tests |
|---|---|
| `__tests__/lib/format.test.ts` | 24 |
| `__tests__/lib/validations.test.ts` | 22 |
| `__tests__/api/employees.test.ts` | 27 |
| `__tests__/api/salary.test.ts` | 17 |
| `__tests__/api/bulk-salary.test.ts` | 12 |
| `__tests__/api/delete.test.ts` | 6 |
| `__tests__/api/export.test.ts` | 6 |
| `__tests__/api/create.test.ts` | 5 |
| `__tests__/api/dashboard.test.ts` | 4 |
| **Total** | **123** |

All API tests use mocked Prisma — no database required to run tests.

---

## TDD Commit Order

This project was built strictly following Red → Green → Refactor TDD:

1. `docs:` requirements + architecture
2. `chore:` Next.js init + dependencies
3. `chore:` Prisma schema
4. `test:` + `feat:` format utilities
5. `test:` + `feat:` validation schemas
6. `test:` + `feat:` GET /api/employees
7. `test:` + `feat:` PUT salary endpoint
8. `test:` + `feat:` bulk salary endpoint
9. `test:` + `feat:` DELETE endpoint
10. `test:` + `feat:` CSV export endpoint
11. `chore:` seed script
12. `feat:` full UI
