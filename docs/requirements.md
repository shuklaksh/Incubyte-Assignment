# Product Requirements Document — Employee Salary Management System

## Goal

Replace Excel-based salary management for 10,000 employees across multiple countries with a
web-based tool. The tool must allow a non-technical HR Manager to view, search, filter, edit,
and export employee salary data without relying on spreadsheets, macros, or manual processes.

---

## User Persona

**HR Manager at ACME org.**

- Non-technical. Comfortable with web apps but not developer tools.
- Uses the tool daily to view, edit, and understand how the org pays people.
- Needs to answer questions like: "Who in Engineering is below L4 salary band?",
  "What is the total compensation impact of giving India a 10% raise?", or
  "When did John Smith last get a raise and why?"
- Has no teammates using this tool simultaneously (single user system).

---

## In Scope Features

### 1. Paginated Employee Table with Salary Data
Display all active employees in a paginated table (50 rows/page). Each row shows employee
code, name, title, department, country, level, employment type, base salary, bonus, total
compensation, and hire date. Pagination is server-side — the DB slices data, not the browser.

### 2. Search by Name and Email
A debounced search input (300ms delay) that queries both `fullName` and `email` fields
using case-insensitive partial match. Search resets the page to 1 on every keypress.

### 3. Filter by Department, Country, Level, Employment Type
Four dropdown filters. Each filter narrows the result set independently. All active
simultaneously (AND logic). Changing any filter resets pagination to page 1.

### 4. Sort by Salary, Name, Hired Date
Clicking a column header toggles sort order (asc → desc → asc). Only one column sorted
at a time. Sort column and direction are preserved in URL params.

### 5. Edit Salary for a Single Employee
An edit modal pre-filled with current base salary and bonus. Requires a reason (min 10,
max 500 chars). Shows a live preview of the change (current → new, Δ amount, Δ percent)
color-coded green/red. Save disabled until form is valid.

### 6. Soft Delete Employee (`isActive = false`)
A delete confirmation modal for single or bulk delete. The employee record is never
removed from the database — `isActive` is set to `false`. Deleted employees disappear
from all default views but their data is preserved.

### 7. Bulk Salary Update (by Percentage or Fixed Amount)
Select multiple employees and apply a single salary adjustment: either a percentage
increase (e.g. +10%) or a fixed amount (e.g. +$5,000). Each employee's history is
recorded individually. Shows live preview of average change and total payroll impact.

### 8. Select All on Current Page + Select All 10,000
Checking the header checkbox selects all rows on the current page. When all page rows
are selected, a banner appears offering "Select all 10,000 employees." Selecting all
sets a `selectAll` flag that the bulk API uses instead of a list of IDs.

### 9. Salary History Tracked on Every Change
Every salary or bonus modification creates an immutable record in `salary_history`
containing: employee ID, old salary, new salary, old bonus, new bonus, reason, timestamp,
and who changed it. This is written in the same DB transaction as the update.

### 10. Employee Detail Drawer (Read-Only, Shows History)
Clicking a table row (not the checkbox or action buttons) opens a 480px right-side
drawer showing all employee details and a chronological salary history list.

### 11. CSV Export of Filtered View
A button in the header triggers download of a CSV file containing the same employees
as the current filtered view (no pagination limit). Response sets the appropriate
`Content-Type: text/csv` and `Content-Disposition` headers.

### 12. Loading Skeletons, Empty States, Error States
- Table shows skeleton rows (not spinners) while loading.
- Empty state shows a message + "Clear Filters" when no results match.
- API errors show a banner with a "Retry" button.
- Modal errors are shown inline without closing the modal.

### 13. All Filters and Page State Synced to URL
Every filter (search, department, country, level, type, salary range), sort column,
sort direction, and current page number are reflected in the URL query string. Refreshing
the browser or sharing the URL restores the exact view.

---

## Deliberately Out of Scope

### Authentication and Login
**Why cut:** Single HR Manager persona assumed — there is only one user. Adding
authentication requires session management, JWT token refresh, password reset flows,
and rate limiting. This is weeks of additional scope with no product value for this
use case. Can be added later via NextAuth.js with minimal API surface changes.

### Payroll Processing and Payslip Generation
**Why cut:** Fundamentally different product domain. Payroll involves tax calculations
specific to each country's jurisdiction, gross-to-net computations, deduction rules,
payment scheduling, and bank integration. Building this correctly would triple the
project scope. This tool is for salary *visibility and editing*, not payroll execution.

### Currency Conversion
**Why cut:** Exchange rates fluctuate daily. Showing converted values without a live
rates API (e.g. Open Exchange Rates) would produce misleading numbers that go stale
within hours. The tradeoff is not worth it. Each employee's salary is shown in their
native currency as recorded in the database.

### Approval Workflows for Salary Changes
**Why cut:** Requires multi-user roles, a notification system, and a state machine for
approval states (PENDING → APPROVED → REJECTED). This fundamentally changes the
architecture and implies multiple concurrent users. The immutable audit log in
`salary_history` provides accountability without the complexity.

### Role-Based Access Control (RBAC)
**Why cut:** There is exactly one user persona: the HR Manager. RBAC adds schema
complexity (roles, permissions, junction tables), middleware checks on every route,
and UI conditional rendering — with no current benefit. Can be layered on later.

### Dashboard and Analytics
**Why cut:** Deliberately deferred to keep scope tight. The table with filters already
lets the HR Manager answer most operational questions about pay distribution. Charts,
histograms, and aggregate analytics are a Phase 2 feature with a dedicated design pass.

### Email Notifications
**Why cut:** Requires an email service integration (SendGrid, Resend, etc.), HTML email
template management, bounce handling, and unsubscribe/opt-out compliance (CAN-SPAM).
No user need for email notifications has been stated in the requirements.

---

## Assumptions

1. **Single user, no authentication needed.** There is exactly one HR Manager using this
   tool. Concurrent access and data conflicts are not a concern.
2. **Salaries shown in native currency, no conversion.** Each employee's salary is stored
   and displayed in the currency of their country record.
3. **Soft delete only.** Employee records and their salary histories are never permanently
   removed from the database. `isActive = false` is the only form of deletion.
4. **"Changed by" is hardcoded to "HR Manager".** The salary history `changedBy` field
   will store the string "HR Manager" for all changes until authentication is added.
5. **Neon Postgres free tier is sufficient.** 10,000 employee records with salary history
   is well within the free tier's storage and compute limits.
6. **Batch sizes of 500 are safe for seeding.** Prisma `createMany` with 500 records per
   batch avoids hitting Neon's connection or query size limits during seed.
7. **All salary arithmetic uses Decimal, not Float.** Financial precision is mandatory.
   Float arithmetic errors (0.1 + 0.2 ≠ 0.3) are unacceptable for payroll data.
