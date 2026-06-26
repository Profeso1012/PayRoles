# PayRole — Build Execution Document

> **Master reference for every build session.**
> Claude must re-read the rules block below at the start of every task batch before writing any code.

---

## STANDING RULES (re-read every session)

1. **Brand:** App name is PayRole. Colors: `#0F2E23` (Deep Cash), `#1F6F4E` (Cash Green), `#4FAD72` (Fresh Cash), `#CDEFD7` (Mint Light), `#F2B35E` (Cash Gold), `#F7FAF8` (Soft White). No other colors unless deriving tints/shades from these.
2. **No emojis anywhere.** Use Lucide React icons or inline SVGs only.
3. **No static data for anything dynamic.** All lists, tables, user info, run statuses, etc. must be driven by mock API responses returning JSON. Mock base URL is configured in one place (`src/lib/api.ts`). Swapping to real backend = changing base URL only.
4. **No default browser UI.** Custom selects, modals, and toasts only. Multi-select renders pills with X icons.
5. **Responsive via three tricks only:**
   - Grid: `grid-template-columns: repeat(auto-fit, minmax(MIN, 1fr))`
   - Width: `width: 100%; max-width: Xpx` or `min(100%, Xpx)`
   - Sizing: `clamp(MIN, PREFERRED, MAX)` for fonts and spacing
6. **Assets:** Use `favicon.png`, `payrole-logo.png`, `mockup1.png`, `mockup2.png`, `mockup3.png`, `person1.png`, `person2.png` from `public/assets/`.
7. **No form HTML elements.** Use controlled React inputs with `onClick`/`onChange` handlers. No `<form>` tags.
8. **Effective-date fields** appear on every compensation and assignment form. Never a simple date picker — always "effective from" paired with a read-only "until" that shows "Present" until a new record is added.
9. **Organisation hierarchy must be set up before employees can be added.** Guards and UI flow enforce this.
10. **Role enforcement is backend-enforced, UI-reflected.** Every mock API call checks the role in the mock session and returns 403 for unauthorized actions.

---

## 1. Project Overview

**App:** PayRole — Multi-tenant payroll ERP  
**Frontend:** React 18 + TypeScript + TanStack Query + React Router v6  
**Backend:** NestJS (separate repo — this document covers frontend + mock layer)  
**Styling:** Tailwind CSS (utility-first, clamp/minmax/min for responsive)  
**Icons:** Lucide React only  
**State:** TanStack Query for server state, Zustand for client/UI state  
**Mocking:** MSW (Mock Service Worker) — intercepts fetch calls in browser  
**Package manager:** pnpm (workspaces monorepo)

---

## 2. Monorepo Structure

```
payrole/
├── apps/
│   ├── web/                        # React frontend (this document's primary focus)
│   └── api/                        # NestJS backend (separate build doc)
├── packages/
│   └── contracts/                  # Shared TypeScript types + generated API client
│       ├── src/
│       │   ├── types/              # All shared domain types
│       │   │   ├── auth.ts
│       │   │   ├── tenant.ts
│       │   │   ├── organisation.ts
│       │   │   ├── employee.ts
│       │   │   ├── payroll.ts
│       │   │   └── index.ts
│       │   └── index.ts
│       └── package.json
├── pnpm-workspace.yaml
├── package.json
└── Build-Execution.md              # THIS FILE
```

---

## 3. Frontend App Structure (`apps/web/`)

```
apps/web/
├── public/
│   ├── assets/
│   │   ├── favicon.png
│   │   ├── payrole-logo.png
│   │   ├── mockup1.png
│   │   ├── mockup2.png
│   │   ├── mockup3.png
│   │   ├── person1.png
│   │   └── person2.png
│   └── index.html
├── src/
│   ├── main.tsx                    # Entry point, MSW startup, QueryClient, Router
│   ├── App.tsx                     # Root routes, auth guard wrapper
│   │
│   ├── lib/
│   │   ├── api.ts                  # Base URL config, fetch wrapper, error handler
│   │   ├── queryClient.ts          # TanStack QueryClient instance + defaults
│   │   └── utils.ts                # clsx, formatMoney, formatDate, getInitials
│   │
│   ├── store/
│   │   ├── authStore.ts            # Zustand: current user, token, tenant context
│   │   └── uiStore.ts              # Zustand: sidebar open, active modal, toast queue
│   │
│   ├── mocks/
│   │   ├── browser.ts              # MSW browser setup
│   │   ├── handlers/
│   │   │   ├── auth.handlers.ts
│   │   │   ├── tenant.handlers.ts
│   │   │   ├── organisation.handlers.ts
│   │   │   ├── employee.handlers.ts
│   │   │   ├── payroll.handlers.ts
│   │   │   ├── payrun.handlers.ts
│   │   │   └── index.ts            # Combines all handlers
│   │   └── data/
│   │       ├── auth.data.ts        # Seed users per role
│   │       ├── organisation.data.ts
│   │       ├── employee.data.ts
│   │       └── payroll.data.ts
│   │
│   ├── hooks/
│   │   ├── useAuth.ts              # Login, logout, session check
│   │   ├── useTenant.ts            # Current tenant data
│   │   ├── useOrganisation.ts      # Departments, legal entities, locations, pay groups
│   │   ├── useEmployees.ts         # Employee CRUD
│   │   ├── usePayroll.ts           # Pay elements, runs, payslips
│   │   ├── usePermission.ts        # Check if current user can perform action
│   │   └── useToast.ts             # Trigger toasts from anywhere
│   │
│   ├── components/
│   │   ├── ui/                     # Headless reusable primitives
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Select.tsx          # Custom select, not native
│   │   │   ├── MultiSelect.tsx     # Pill-based multi select with X
│   │   │   ├── Modal.tsx           # Base modal wrapper
│   │   │   ├── Toast.tsx           # Toast system + ToastProvider
│   │   │   ├── Badge.tsx           # Status badges (run state, employee status)
│   │   │   ├── DataTable.tsx       # Sortable/filterable/paginated table
│   │   │   ├── Pagination.tsx
│   │   │   ├── Spinner.tsx
│   │   │   ├── EmptyState.tsx
│   │   │   ├── ErrorState.tsx
│   │   │   ├── Avatar.tsx          # Initials or image avatar
│   │   │   ├── Tabs.tsx
│   │   │   ├── Drawer.tsx          # Side panel for detail views
│   │   │   ├── EffectiveDateField.tsx   # "Effective from" + "Until: Present" pair
│   │   │   ├── MoneyDisplay.tsx    # Formats minor units + currency code
│   │   │   └── ConfirmModal.tsx    # Generic yes/no confirmation
│   │   │
│   │   ├── layout/
│   │   │   ├── AppShell.tsx        # Sidebar + topbar + outlet
│   │   │   ├── Sidebar.tsx         # RBAC-aware nav links
│   │   │   ├── Topbar.tsx          # User menu, notifications, tenant name
│   │   │   ├── PageHeader.tsx      # Title + breadcrumb + action buttons
│   │   │   └── AuthLayout.tsx      # Centered card layout for login/invite screens
│   │   │
│   │   └── shared/
│   │       ├── RoleGuard.tsx       # Renders children only if user has permission
│   │       ├── TenantGuard.tsx     # Blocks access if org setup is incomplete
│   │       ├── OrgSetupBanner.tsx  # Banner shown when org is partially configured
│   │       └── PayslipPreview.tsx  # Payslip renderer (used in employee portal + finance)
│   │
│   ├── pages/
│   │   ├── public/
│   │   │   └── Landing.tsx         # Marketing landing page
│   │   │
│   │   ├── auth/
│   │   │   ├── Login.tsx
│   │   │   ├── ForgotPassword.tsx
│   │   │   ├── ResetPassword.tsx   # Token from URL param
│   │   │   └── AcceptInvite.tsx    # Token from URL param, set password
│   │   │
│   │   ├── onboarding/
│   │   │   └── CompanySetup.tsx    # Multi-step wizard (company profile → jurisdiction → pay groups → bank)
│   │   │
│   │   ├── super-admin/            # Platform owner portal (admin.payrole.com)
│   │   │   ├── SADashboard.tsx
│   │   │   ├── SACompanies.tsx
│   │   │   └── SACompanyDetail.tsx
│   │   │
│   │   ├── dashboard/
│   │   │   ├── HRDashboard.tsx
│   │   │   ├── PayrollDashboard.tsx
│   │   │   ├── FinanceDashboard.tsx
│   │   │   └── EmployeeDashboard.tsx
│   │   │
│   │   ├── organisation/           # HR + Super Admin
│   │   │   ├── OrgOverview.tsx     # Tree/card view of company structure
│   │   │   ├── LegalEntities.tsx   # List + create legal entities
│   │   │   ├── Departments.tsx     # List + create departments (under legal entity)
│   │   │   ├── Locations.tsx       # Office locations
│   │   │   ├── PayGroups.tsx       # Pay frequency groups (e.g. "Lagos Monthly")
│   │   │   └── JobGrades.tsx       # Grade bands used in compensation
│   │   │
│   │   ├── employees/
│   │   │   ├── EmployeeList.tsx    # Searchable, filterable data table
│   │   │   ├── EmployeeDetail.tsx  # Tabs: Profile, Assignments, Compensation, Payslips
│   │   │   ├── AddEmployee.tsx     # Multi-step form wizard
│   │   │   └── EditEmployee.tsx    # Edit personal/employment details
│   │   │
│   │   ├── payroll/
│   │   │   ├── PayElements.tsx     # List + configure pay elements and formulas
│   │   │   ├── PayElementDetail.tsx
│   │   │   ├── PayRunList.tsx      # All runs, all states
│   │   │   ├── PayRunCreate.tsx    # Select pay group + period
│   │   │   ├── PayRunDetail.tsx    # Register table, state-aware actions
│   │   │   └── PayslipViewer.tsx   # Individual payslip detail (finance + employee)
│   │   │
│   │   ├── reports/
│   │   │   ├── PayrollRegister.tsx
│   │   │   ├── StatutoryReports.tsx    # PAYE, Pension, NHF per run
│   │   │   └── CostSummary.tsx         # Monthly/annual payroll cost
│   │   │
│   │   ├── payments/
│   │   │   └── PaymentFiles.tsx        # Download bulk payment files per approved run
│   │   │
│   │   ├── settings/
│   │   │   ├── CompanyProfile.tsx
│   │   │   ├── UsersAndRoles.tsx       # Invite users, assign roles, deactivate
│   │   │   ├── BankDetails.tsx
│   │   │   └── Jurisdictions.tsx       # Active country packs
│   │   │
│   │   └── employee-portal/            # Self-service for regular employees
│   │       ├── MyPayslips.tsx
│   │       ├── MyProfile.tsx
│   │       └── MyBankDetails.tsx
│   │
│   └── router/
│       ├── index.tsx               # All routes, lazy-loaded
│       ├── guards/
│       │   ├── AuthGuard.tsx       # Redirect to /login if no session
│       │   ├── RoleGuard.tsx       # Redirect to /unauthorized if role mismatch
│       │   └── OrgGuard.tsx        # Redirect to /onboarding if org setup incomplete
│       └── paths.ts                # Typed route path constants
│
├── tailwind.config.ts
├── tsconfig.json
├── vite.config.ts
└── package.json
```

---

## 4. Shared Types (`packages/contracts/src/types/`)

### `auth.ts`
```typescript
export type UserRole =
  | 'PLATFORM_ADMIN'
  | 'COMPANY_SUPER_ADMIN'
  | 'HR_MANAGER'
  | 'PAYROLL_MANAGER'
  | 'FINANCE_DIRECTOR'
  | 'EMPLOYEE';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  tenantId: string | null;       // null for PLATFORM_ADMIN
  tenantName: string | null;
  avatarUrl: string | null;
  permissions: Permission[];
}

export type Permission =
  | 'manage:organisation'
  | 'manage:employees'
  | 'run:payroll'
  | 'approve:payroll'
  | 'view:all_payslips'
  | 'view:own_payslips'
  | 'manage:users'
  | 'manage:settings'
  | 'view:reports'
  | 'download:payment_files'
  | 'manage:tenants';            // PLATFORM_ADMIN only

export interface LoginPayload { email: string; password: string; }
export interface AuthResponse { token: string; user: AuthUser; requiresOtp: boolean; }
```

### `tenant.ts`
```typescript
export interface Tenant {
  id: string;
  name: string;
  legalName: string;
  rcNumber: string;
  industry: string;
  status: 'active' | 'suspended' | 'onboarding';
  setupComplete: boolean;
  activeCountryPacks: CountryCode[];
  createdAt: string;
}

export type CountryCode = 'NG' | 'GB' | 'CA' | 'US';

export interface CountryPack {
  code: CountryCode;
  name: string;
  currency: string;
  statutoryDeductions: string[];
}
```

### `organisation.ts`
```typescript
export interface LegalEntity {
  id: string;
  tenantId: string;
  name: string;
  country: CountryCode;
  taxId: string;
  address: string;
  createdAt: string;
}

export interface Department {
  id: string;
  legalEntityId: string;
  name: string;
  headEmployeeId: string | null;
  parentDepartmentId: string | null;  // For nested departments
}

export interface Location {
  id: string;
  legalEntityId: string;
  name: string;
  address: string;
  country: CountryCode;
}

export interface PayGroup {
  id: string;
  tenantId: string;
  name: string;                        // e.g. "Lagos Monthly Staff"
  payFrequency: 'monthly' | 'bi-weekly' | 'weekly';
  payDay: number;                      // Day of month (monthly) or day of week
  legalEntityId: string;
  locationIds: string[];
}

export interface JobGrade {
  id: string;
  tenantId: string;
  name: string;                        // e.g. "Grade 7", "Senior Associate"
  minSalary: number;                   // Minor units
  maxSalary: number;
  currency: string;
}
```

### `employee.ts`
```typescript
export interface Employee {
  id: string;
  tenantId: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  nationalId: string;
  status: 'active' | 'on_leave' | 'exited';
  avatarUrl: string | null;
  bankDetails: BankDetail[];
  createdAt: string;
}

export interface EmployeeAssignment {
  id: string;
  employeeId: string;
  departmentId: string;
  locationId: string;
  jobTitle: string;
  jobGradeId: string | null;
  employmentType: 'full_time' | 'part_time' | 'contract';
  reportingManagerId: string | null;
  effectiveFrom: string;             // ISO date
  effectiveTo: string | null;        // null = "Present"
}

export interface Compensation {
  id: string;
  employeeId: string;
  grossSalary: number;               // Minor units
  currency: string;
  payGroupId: string;
  effectiveFrom: string;
  effectiveTo: string | null;
}

export interface BankDetail {
  id: string;
  employeeId: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  isPrimary: boolean;
}
```

### `payroll.ts`
```typescript
export type PayRunStatus =
  | 'draft'
  | 'calculating'
  | 'calculated'
  | 'in_review'
  | 'approved'
  | 'paid'
  | 'posted'
  | 'reversed'
  | 'failed';

export interface PayRun {
  id: string;
  tenantId: string;
  payGroupId: string;
  payGroupName: string;
  period: string;                    // "2026-07" ISO year-month
  status: PayRunStatus;
  employeeCount: number;
  totalGross: number;
  totalNet: number;
  totalDeductions: number;
  currency: string;
  createdById: string;
  approvedById: string | null;
  createdAt: string;
  approvedAt: string | null;
}

export interface PayRunEmployee {
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
  grossPay: number;
  elements: PayElement[];
  totalDeductions: number;
  netPay: number;
  status: 'calculated' | 'flagged' | 'error';
  flagReason: string | null;
}

export interface PayElement {
  id: string;
  name: string;                      // "Basic Salary", "PAYE Tax", "Pension"
  type: 'earning' | 'deduction' | 'employer_contribution';
  amount: number;
  currency: string;
  isStatutory: boolean;
  formula: string | null;
}

export interface Payslip {
  id: string;
  payRunId: string;
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
  period: string;
  payGroupName: string;
  elements: PayElement[];
  grossPay: number;
  totalDeductions: number;
  netPay: number;
  currency: string;
  generatedAt: string;
  issuedAt: string;
}
```

---

## 5. Key File Specifications

### `src/lib/api.ts`
**Purpose:** Single place where base URL lives. All fetch calls go through here.
```typescript
// Imports: nothing external
// Exports: apiClient (fetch wrapper), BASE_URL constant, ApiError class

const BASE_URL = import.meta.env.VITE_API_URL ?? '/api';
// In development with MSW, /api is intercepted by service worker
// In production, /api points to the real NestJS server
// Changing VITE_API_URL in .env is the only change needed to go live

class ApiError extends Error {
  constructor(public status: number, message: string, public data?: unknown) { ... }
}

async function apiClient<T>(path: string, options?: RequestInit): Promise<T> {
  // Reads auth token from authStore
  // Sets Authorization: Bearer header
  // Sets Content-Type: application/json
  // On 401: clears session, redirects to /login
  // On 403: throws ApiError with status 403
  // On 4xx/5xx: throws ApiError with error body
  // On success: returns parsed JSON as T
}

export { apiClient, ApiError, BASE_URL };
```

### `src/store/authStore.ts`
**Purpose:** Persisted Zustand store for current session.
```typescript
// Imports: zustand, zustand/middleware (persist), AuthUser type
// Persists to: localStorage key 'payrole_auth'
// Exports: useAuthStore hook

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  setSession: (user: AuthUser, token: string) => void;
  clearSession: () => void;
  hasPermission: (permission: Permission) => boolean;
}
// hasPermission checks user.permissions array
```

### `src/mocks/browser.ts`
**Purpose:** MSW setup. Must start before React renders.
```typescript
// Imports: setupWorker from msw/browser, all handlers from handlers/index.ts
// Exports: worker (MSW ServiceWorker instance)
// Called in main.tsx: await worker.start({ onUnhandledRequest: 'bypass' })
```

### `src/mocks/data/employee.data.ts`
**Purpose:** Seed data for mock API responses.
```typescript
// Exports arrays of typed objects:
// mockEmployees: Employee[]          (20+ records across 2 tenants)
// mockAssignments: EmployeeAssignment[]
// mockCompensations: Compensation[]
// Note: always include at least one employee with status 'exited' and
//       one with a missing bank detail to test edge case UI
```

### `src/mocks/handlers/payrun.handlers.ts`
**Purpose:** MSW handlers simulating payroll run lifecycle.
```typescript
// GET  /api/pay-runs              → list with pagination + status filter
// POST /api/pay-runs              → create draft run
// GET  /api/pay-runs/:id          → single run detail
// POST /api/pay-runs/:id/calculate → set status to 'calculating',
//                                    after 3s delay return 'calculated'
//                                    (simulates async Temporal workflow)
// POST /api/pay-runs/:id/submit   → set status to 'in_review'
// POST /api/pay-runs/:id/approve  → check role === FINANCE_DIRECTOR,
//                                    else return 403; set 'approved'
// GET  /api/pay-runs/:id/register → paginated PayRunEmployee[]
// GET  /api/pay-runs/:id/payslips → list of payslips for run
```

### `src/components/ui/DataTable.tsx`
**Purpose:** Reusable table used across every list screen.
```typescript
// Props:
//   columns: ColumnDef<T>[]        (header label, accessor key, render fn, sortable flag)
//   data: T[]
//   isLoading: boolean
//   isError: boolean
//   pagination: { page, pageSize, total }
//   onPageChange: (page: number) => void
//   onSort: (key: string, direction: 'asc' | 'desc') => void
//   onRowClick?: (row: T) => void
//   emptyMessage: string
// Renders:
//   - Spinner (isLoading)
//   - ErrorState (isError)
//   - EmptyState with message (data.length === 0)
//   - Table with sticky header, hover row highlight, sort indicators
//   - Pagination controls below
// No browser defaults. Fully custom styled to PayRole theme.
```

### `src/components/ui/Select.tsx`
**Purpose:** Fully custom dropdown select, no native `<select>`.
```typescript
// Props: label, value, options: {value, label}[], onChange, placeholder, error, disabled
// Renders: custom trigger button + floating dropdown list
// Keyboard: arrow keys navigate, Enter selects, Escape closes
// Closes on outside click
// Matches PayRole theme (Deep Cash border, Fresh Cash on hover, Cash Gold focus ring)
```

### `src/components/ui/MultiSelect.tsx`
**Purpose:** Multi-value select with pill display.
```typescript
// Props: label, values: string[], options: {value, label}[], onChange, placeholder
// Renders: input box showing selected items as pills
// Each pill: label text + X icon (Lucide X) to remove
// Dropdown shows remaining unselected options
// Matches PayRole theme
```

### `src/components/ui/EffectiveDateField.tsx`
**Purpose:** Paired effective-date UI for all compensation and assignment forms.
```typescript
// Props: effectiveFrom: string, effectiveTo: string | null, onChange
// Renders:
//   Left field:  "Effective from" date input (editable)
//   Right field: "Until" — shows formatted effectiveTo date OR "Present" in Cash Gold
// Note: effectiveTo is read-only in this component.
//       It is set by the system when a new record supersedes this one.
```

### `src/pages/organisation/OrgOverview.tsx`
**Purpose:** Visual org structure tree. Entry point for all org management.
```typescript
// Fetches: GET /api/organisation/overview
// Returns: nested structure of legal entities → departments → sub-departments
// Renders:
//   - Card per legal entity at the top
//   - Collapsible department tree beneath each
//   - Quick-action buttons: "Add Department", "Add Location", "Add Pay Group"
//   - "Organisation is empty" empty state with call-to-action if no legal entities exist
//   - OrgSetupBanner if legal entities exist but no departments or pay groups
// Note: EmployeeList, AddEmployee are locked behind OrgGuard that checks
//       at least one pay group exists before allowing access
```

### `src/pages/employees/AddEmployee.tsx`
**Purpose:** Multi-step wizard to add a new employee.
```typescript
// Steps (rendered as progress indicator at top):
//   1. Personal Details   — name, DOB, gender, email, phone, national ID
//   2. Employment Details — department (dropdown populated from org), location,
//                          job title, job grade, employment type, start date,
//                          reporting manager (employee dropdown)
//   3. Compensation       — gross salary, currency, pay group (dropdown),
//                          effective from date (EffectiveDateField)
//   4. Bank Details       — bank name, account number, account name, mark as primary
//   5. Review & Submit    — summary of all entered data, edit buttons per section
// Each step: validates before allowing Next
// On submit: POST /api/employees with full payload
// On success: Toast "Employee added successfully", redirect to employee detail
// Note: Department and PayGroup dropdowns return empty if org not configured.
//       Guard redirects to /organisation with banner if so.
```

### `src/pages/payroll/PayRunDetail.tsx`
**Purpose:** Central screen for payroll manager and finance director during a run.
```typescript
// Fetches:
//   GET /api/pay-runs/:id           → run metadata and status
//   GET /api/pay-runs/:id/register  → paginated employee register (polling every 5s if status = 'calculating')
// Renders different action zones based on run status:
//   draft       → "Calculate" button
//   calculating → Progress indicator, polling register
//   calculated  → Full register table + "Submit for Approval" (PAYROLL_MANAGER only)
//   in_review   → Register (read-only) + "Approve" button (FINANCE_DIRECTOR only)
//                 + "Send Back" button with comment modal
//   approved    → Summary + "Download Payment File" + "View Payslips"
//   paid        → Summary, read-only, all payslips accessible
// Register table columns: Employee, Gross Pay, [element columns dynamic], Deductions, Net Pay, Status, Actions
// Flagged employees shown with amber row highlight + flag icon + tooltip reason
```

### `src/router/guards/OrgGuard.tsx`
**Purpose:** Blocks HR screens if organisation has not been configured.
```typescript
// Reads: GET /api/organisation/setup-status
// Returns: { hasLegalEntities: boolean, hasDepartments: boolean, hasPayGroups: boolean }
// If !hasLegalEntities: redirect to /organisation with toast "Set up your organisation first"
// If hasLegalEntities && !hasPayGroups: allow employees list but block AddEmployee,
//   show OrgSetupBanner at top of page
```

---

## 6. Permission Matrix

| Screen / Action              | PLATFORM_ADMIN | COMPANY_SUPER_ADMIN | HR_MANAGER | PAYROLL_MANAGER | FINANCE_DIRECTOR | EMPLOYEE |
|------------------------------|:-:|:-:|:-:|:-:|:-:|:-:|
| SA Dashboard (tenants list)  | Y | - | - | - | - | - |
| Onboard new tenant           | Y | - | - | - | - | - |
| Company Setup Wizard         | - | Y | - | - | - | - |
| Org Overview                 | - | Y | Y | - | - | - |
| Manage Departments           | - | Y | Y | - | - | - |
| Manage Pay Groups            | - | Y | Y | - | - | - |
| Employee List                | - | Y | Y | - | Y | - |
| Add/Edit Employee            | - | Y | Y | - | - | - |
| View Employee Detail         | - | Y | Y | - | Y | - |
| Configure Pay Elements       | - | Y | - | Y | - | - |
| Create Pay Run               | - | - | - | Y | - | - |
| Calculate Pay Run            | - | - | - | Y | - | - |
| Submit Pay Run for Review    | - | - | - | Y | - | - |
| Approve Pay Run              | - | - | - | - | Y | - |
| Send Back Pay Run            | - | - | - | - | Y | - |
| Download Payment File        | - | Y | - | - | Y | - |
| View All Payslips            | - | Y | Y | Y | Y | - |
| View Own Payslips            | - | - | - | - | - | Y |
| Statutory Reports            | - | Y | - | Y | Y | - |
| Invite Users                 | - | Y | - | - | - | - |
| Manage Settings              | - | Y | - | - | - | - |

---

## 7. Mock API Response Patterns

Every mock handler returns this envelope:

```typescript
// Success
{ success: true, data: T, meta?: { page, pageSize, total } }

// Error
{ success: false, error: { code: string, message: string, fields?: Record<string, string> } }
```

All list endpoints accept query params: `?page=1&pageSize=20&search=&status=&departmentId=`

All mock handlers must check `Authorization` header. If missing → 401. If role lacks permission → 403.

---

## 8. Build Phases and Task Batches

---

### PHASE 0 — Foundation Setup

**Batch 0.1 — Monorepo and tooling**
- [ ] Init pnpm workspace with `apps/web`, `apps/api`, `packages/contracts`
- [ ] Configure `pnpm-workspace.yaml`
- [ ] Set up `packages/contracts` with all types from Section 4
- [ ] Configure `tsconfig.json` with path alias `@contracts/*`

**Batch 0.2 — Vite + Tailwind + base config**
- [ ] Scaffold `apps/web` with Vite + React + TypeScript template
- [ ] Install: `tailwindcss`, `lucide-react`, `@tanstack/react-query`, `react-router-dom`, `zustand`, `msw`, `clsx`
- [ ] Configure `tailwind.config.ts` with PayRole color tokens as named colors:
  ```js
  colors: {
    'deep-cash': '#0F2E23',
    'cash-green': '#1F6F4E',
    'fresh-cash': '#4FAD72',
    'mint-light': '#CDEFD7',
    'cash-gold': '#F2B35E',
    'soft-white': '#F7FAF8',
  }
  ```
- [ ] Configure `clamp`-based font size scale in Tailwind config
- [ ] Set up `src/lib/api.ts`, `src/lib/queryClient.ts`, `src/lib/utils.ts`
- [ ] Set up `src/store/authStore.ts`, `src/store/uiStore.ts`
- [ ] Copy all public assets into `public/assets/`
- [ ] Set favicon in `index.html`

**Batch 0.3 — MSW mock infrastructure**
- [ ] `npx msw init public/` (generates service worker file)
- [ ] Create `src/mocks/browser.ts`
- [ ] Create all seed data files in `src/mocks/data/`
- [ ] Create stub handlers (return empty arrays) for all resource types
- [ ] Wire MSW startup in `src/main.tsx` before React root renders
- [ ] Verify MSW intercepts `/api/*` in browser dev tools

**Batch 0.4 — Router skeleton**
- [ ] Create `src/router/paths.ts` with all route constants
- [ ] Create `src/router/index.tsx` with lazy-loaded route tree
- [ ] Create `AuthGuard`, `RoleGuard`, `OrgGuard` in `src/router/guards/`
- [ ] Create placeholder pages (one `<div>Page name</div>`) for every route
- [ ] Verify navigation works and guards redirect correctly with mock session

---

### PHASE 1 — UI Primitive Components

**Batch 1.1 — Base UI components**
- [ ] `Button.tsx` — variants: primary, secondary, ghost, danger. Sizes: sm, md, lg. Loading state with Spinner.
- [ ] `Input.tsx` — label, error, hint, leading/trailing icon slots
- [ ] `Spinner.tsx` — three sizes, Cash Green color
- [ ] `Avatar.tsx` — image or initials fallback, three sizes
- [ ] `Badge.tsx` — status variants mapped to PayRun states and employee states

**Batch 1.2 — Form UI components**
- [ ] `Select.tsx` — custom dropdown, fully keyboard navigable
- [ ] `MultiSelect.tsx` — pill-based, X to remove
- [ ] `EffectiveDateField.tsx` — from/until pair
- [ ] `MoneyDisplay.tsx` — minor units → formatted string with currency symbol

**Batch 1.3 — Overlay UI components**
- [ ] `Modal.tsx` — base modal with portal, backdrop, close on Escape
- [ ] `ConfirmModal.tsx` — built on Modal, yes/no with variant (danger/default)
- [ ] `Toast.tsx` + `ToastProvider.tsx` — queue-based, top-right, auto-dismiss, variants: success/error/warning/info
- [ ] `useToast.ts` hook — `toast.success()`, `toast.error()`, etc.
- [ ] `Drawer.tsx` — slide-in side panel for detail views

**Batch 1.4 — Data display components**
- [ ] `DataTable.tsx` — sortable columns, row click, loading/empty/error states, sticky header
- [ ] `Pagination.tsx` — prev/next + page numbers, shows "1–20 of 143"
- [ ] `EmptyState.tsx` — icon + title + description + optional CTA button
- [ ] `ErrorState.tsx` — error icon + message + retry button
- [ ] `Tabs.tsx` — underline style, maps to PayRole green active indicator

---

### PHASE 2 — Layout Shell

**Batch 2.1 — Auth layout**
- [ ] `AuthLayout.tsx` — centered card, PayRole logo top, soft white background with subtle mesh/gradient

**Batch 2.2 — App shell**
- [ ] `Sidebar.tsx` — RBAC-aware nav. Links rendered per permission. Collapsible on mobile. PayRole logo at top. Active link highlighted with Fresh Cash background.
- [ ] `Topbar.tsx` — tenant name, notification bell (Lucide Bell), user avatar dropdown (My Profile, Sign Out)
- [ ] `AppShell.tsx` — sidebar + topbar + `<Outlet />` with correct scroll regions
- [ ] `PageHeader.tsx` — title (clamp-sized), breadcrumb trail, right-side action button slot

**Batch 2.3 — Shared components**
- [ ] `RoleGuard.tsx` — wraps JSX, hides if no permission. Does NOT redirect (that is router guard's job).
- [ ] `OrgSetupBanner.tsx` — amber banner with Lucide AlertTriangle icon and link to `/organisation`
- [ ] `PayslipPreview.tsx` — PayRole-branded payslip layout for viewing/printing

---

### PHASE 3 — Public Landing Page

**Batch 3.1 — Landing page**
- [ ] `Landing.tsx` — single page, sections:
  - Hero: PayRole logo, tagline "Payroll. People. Possibilities.", mockup1.png displayed, CTA buttons "Get Started" and "See How It Works"
  - Features: three-column auto-fit grid (icon + title + description per feature)
  - How it works: three-step numbered flow
  - Testimonials: person1.png and person2.png with quote cards
  - Pricing: card grid (Starter, Growth, Enterprise)
  - CTA banner: Cash Gold background, "Ready to simplify payroll?" + button
  - Footer: logo + nav links + copyright
- [ ] All sections use `clamp()` for font sizes, `auto-fit minmax()` for grids
- [ ] No emojis. All icons are Lucide icons as SVG.
- [ ] "Get Started" links to `/login`

---

### PHASE 4 — Authentication Screens

**Batch 4.1 — Auth pages**
- [ ] `Login.tsx`
  - Fields: email, password (toggle visibility with Lucide Eye/EyeOff)
  - "Forgot password?" link
  - Calls: `POST /api/auth/login`
  - On success: stores session in authStore, redirects based on role
  - Role redirect map:
    - `PLATFORM_ADMIN` → `/admin`
    - `COMPANY_SUPER_ADMIN` → if setupComplete → `/dashboard` else → `/onboarding`
    - `HR_MANAGER` → `/dashboard`
    - `PAYROLL_MANAGER` → `/dashboard`
    - `FINANCE_DIRECTOR` → `/dashboard`
    - `EMPLOYEE` → `/my-payslips`
  - On error: toast "Invalid email or password"
  - OTP modal appears if `requiresOtp: true` in response
- [ ] `ForgotPassword.tsx` — email field, submit sends `POST /api/auth/forgot-password`, success shows "Check your email" state
- [ ] `ResetPassword.tsx` — reads `?token=` from URL, new password + confirm fields, `POST /api/auth/reset-password`
- [ ] `AcceptInvite.tsx` — reads `?token=` from URL, decodes (mock: parse base64), shows company name + role, full name + password fields, `POST /api/auth/accept-invite`
- [ ] Mock handlers for all auth endpoints in `auth.handlers.ts`
- [ ] Seed users in `auth.data.ts`: one per role, each with distinct email and password `"password123"`

---

### PHASE 5 — Platform Super Admin

**Batch 5.1 — SA portal**
- [ ] `SADashboard.tsx` — stats cards (total tenants, active, onboarding, suspended), recent tenant table
- [ ] `SACompanies.tsx` — searchable DataTable of all tenants, status badge, "Onboard New" button
- [ ] `SACompanyDetail.tsx` — company info, user count, subscription, suspend/activate toggle
- [ ] Onboard modal: company name, country, subscription plan, super admin email → `POST /api/admin/tenants` → triggers mock invite email log
- [ ] Mock handlers: `GET /api/admin/tenants`, `POST /api/admin/tenants`, `GET /api/admin/tenants/:id`, `PATCH /api/admin/tenants/:id/status`

---

### PHASE 6 — Company Onboarding Wizard

**Batch 6.1 — Setup wizard**
- [ ] `CompanySetup.tsx` — four-step wizard with progress bar
  - Step 1: Company Profile — full legal name, RC number, industry (custom select), address
  - Step 2: Jurisdictions — MultiSelect of country packs (NG, GB, CA, US). Each selection shows description of what statutory rules it activates.
  - Step 3: Pay Groups — dynamic list, "Add Pay Group" button opens inline form: name, frequency (custom select), pay day, legal entity
  - Step 4: Bank Details — bank name, account number, account name
  - Final submit: `POST /api/tenants/setup` with full payload
  - On success: sets `setupComplete = true` in authStore, redirects to HR Dashboard
- [ ] Mock handlers for setup endpoint

---

### PHASE 7 — Organisation Management

> This phase must be complete before Batch 8 (employees) begins, as employees depend on org data.

**Batch 7.1 — Legal entities**
- [ ] `LegalEntities.tsx` — list with "Add Legal Entity" button
- [ ] Add Legal Entity modal: name, country, tax ID, address
- [ ] Mock: `GET /api/organisation/legal-entities`, `POST /api/organisation/legal-entities`

**Batch 7.2 — Departments**
- [ ] `Departments.tsx` — tree view grouped by legal entity. Parent/child departments supported.
- [ ] Add Department modal: name, parent department (custom select, optional), legal entity
- [ ] Edit, deactivate in-row actions
- [ ] Mock: `GET /api/organisation/departments`, `POST`, `PATCH`, `DELETE`

**Batch 7.3 — Locations**
- [ ] `Locations.tsx` — card grid per legal entity
- [ ] Add Location modal: name, address, country
- [ ] Mock: `GET /api/organisation/locations`, `POST`, `PATCH`, `DELETE`

**Batch 7.4 — Pay groups**
- [ ] `PayGroups.tsx` — list with member count badge
- [ ] Add Pay Group modal: name, frequency, pay day, legal entity, locations MultiSelect
- [ ] Mock: `GET /api/organisation/pay-groups`, `POST`, `PATCH`, `DELETE`

**Batch 7.5 — Job grades**
- [ ] `JobGrades.tsx` — table with salary band min/max displayed via MoneyDisplay
- [ ] Add Job Grade modal: name, min salary, max salary, currency
- [ ] Mock: `GET /api/organisation/job-grades`, `POST`, `PATCH`, `DELETE`

**Batch 7.6 — Org overview**
- [ ] `OrgOverview.tsx` — collapsible tree (legal entity → departments), quick-action buttons per node
- [ ] Setup status check: if no legal entities, show full-page EmptyState with "Add Legal Entity" CTA
- [ ] OrgSetupBanner logic for partial setup

---

### PHASE 8 — Employee Management

**Batch 8.1 — Employee list**
- [ ] `EmployeeList.tsx`
  - DataTable: name + avatar, employee number, department, job title, pay group, status badge, "View" action
  - Filters: department (custom select), status, employment type, location
  - Search by name or employee number
  - "Add Employee" button (RoleGuard: HR_MANAGER + COMPANY_SUPER_ADMIN only)
  - OrgGuard check: if no pay groups, show banner and disable "Add Employee"
- [ ] Mock: `GET /api/employees` with query params for filter + pagination

**Batch 8.2 — Add employee wizard**
- [ ] `AddEmployee.tsx` — full 5-step wizard as specified in Section 5
- [ ] Step 2 dropdowns fetch from organisation mock endpoints (departments, locations, job grades, employees for manager)
- [ ] Step 3 pay group dropdown fetches from pay groups mock endpoint
- [ ] Progress indicator at top shows step names, completed steps in green
- [ ] Validation per step before Next allowed
- [ ] Mock: `POST /api/employees`

**Batch 8.3 — Employee detail**
- [ ] `EmployeeDetail.tsx` — four tabs:
  - **Profile tab:** personal info cards (read-only). Edit button opens `EditEmployee.tsx` drawer.
  - **Assignments tab:** timeline of EmployeeAssignment records with EffectiveDateField display. "Add Assignment" button opens modal (effective-date form).
  - **Compensation tab:** timeline of Compensation records with EffectiveDateField display. "Add Compensation" button opens modal with gross salary + effective from.
  - **Payslips tab:** list of payslips (read-only), download button per payslip.
- [ ] Each timeline entry: shows "Present" in Cash Gold for current record, greyed for historical
- [ ] Mock: `GET /api/employees/:id`, `GET /api/employees/:id/assignments`, `GET /api/employees/:id/compensations`, `GET /api/employees/:id/payslips`

**Batch 8.4 — Edit employee**
- [ ] `EditEmployee.tsx` — drawer with personal details form (pre-populated)
- [ ] Mock: `PATCH /api/employees/:id`

---

### PHASE 9 — Payroll Engine UI

**Batch 9.1 — Pay elements**
- [ ] `PayElements.tsx` — DataTable of elements with type badge (Earning/Deduction/Employer Contribution), formula preview, taxable/pensionable flags
- [ ] "Add Element" button opens modal: name, type (custom select), formula (textarea with syntax hint), taxable toggle, pensionable toggle
- [ ] If formula has DAG error (returned by mock), show inline error banner with Lucide AlertCircle
- [ ] Mock: `GET /api/pay-elements`, `POST /api/pay-elements`, `PATCH /api/pay-elements/:id`, `DELETE /api/pay-elements/:id`

**Batch 9.2 — Pay run list**
- [ ] `PayRunList.tsx` — DataTable: period, pay group, employee count, total net (MoneyDisplay), status badge, "View" action
- [ ] Status badges use specific colors:
  - draft → gray
  - calculating → blue (animated pulse)
  - calculated → teal
  - in_review → amber
  - approved → fresh-cash green
  - paid → deep-cash
  - failed/reversed → red
- [ ] "New Pay Run" button (RoleGuard: PAYROLL_MANAGER only)
- [ ] Mock: `GET /api/pay-runs`

**Batch 9.3 — Create pay run**
- [ ] `PayRunCreate.tsx` — two-field form: Pay Group (custom select) + Period (month picker)
- [ ] Shows preview: "This will include X employees from [Pay Group Name]"
- [ ] Mock: `GET /api/pay-groups` for dropdown, `POST /api/pay-runs`
- [ ] On success: redirect to `PayRunDetail`

**Batch 9.4 — Pay run detail (core screen)**
- [ ] `PayRunDetail.tsx` — full implementation as specified in Section 5
- [ ] Polling: `useQuery` with `refetchInterval: 5000` when status is `calculating`
- [ ] Register table: sticky columns, horizontal scroll for many elements, flagged rows in amber
- [ ] Approve confirm modal: shows total net, "This will lock the payroll permanently. Confirm?"
- [ ] Send-back modal: text area for reason
- [ ] Mock handlers for all state transitions

**Batch 9.5 — Payslip viewer**
- [ ] `PayslipViewer.tsx` — full PayRole-branded payslip using `PayslipPreview.tsx` component
- [ ] Download as PDF button (uses browser print API targeting payslip element)
- [ ] Mock: `GET /api/payslips/:id`

---

### PHASE 10 — Finance and Reports

**Batch 10.1 — Payment files**
- [ ] `PaymentFiles.tsx` — list of approved runs, "Download Payment File" button per run
- [ ] Download generates a mock CSV/Excel file (client-side, using run register data)
- [ ] Mock: `GET /api/pay-runs?status=approved`

**Batch 10.2 — Reports**
- [ ] `PayrollRegister.tsx` — select run, display full register as DataTable, export to Excel button (client-side)
- [ ] `StatutoryReports.tsx` — tabs per statutory type (PAYE, Pension, NHF). Select run. Display breakdown table.
- [ ] `CostSummary.tsx` — monthly chart (recharts BarChart), year selector, cost by department breakdown

---

### PHASE 11 — Settings

**Batch 11.1 — Settings screens**
- [ ] `CompanyProfile.tsx` — editable company info, save triggers `PATCH /api/tenants/profile`
- [ ] `UsersAndRoles.tsx` — DataTable of users: name, email, role badge, status, "Deactivate" action. "Invite User" button → modal with email + role select.
- [ ] `BankDetails.tsx` — company bank account details, editable
- [ ] `Jurisdictions.tsx` — active country packs as cards with toggle to enable/disable (with confirmation modal warning about implications)

---

### PHASE 12 — Employee Self-Service Portal

**Batch 12.1 — Employee portal pages**
- [ ] `MyPayslips.tsx` — list of own payslips, PayslipViewer on click, download button
- [ ] `MyProfile.tsx` — personal details (read-only for most fields, editable for contact info and next of kin)
- [ ] `MyBankDetails.tsx` — view/edit own bank account (some tenants lock this — check mock flag `tenant.allowEmployeeBankEdit`)

---

### PHASE 13 — Dashboards

**Batch 13.1 — Role-specific dashboards**
- [ ] `HRDashboard.tsx`
  - Stat cards: Total Employees, New This Month, On Leave, Incomplete Records
  - Table: recent hires
  - Alert list: employees with missing bank details, expiring contracts
- [ ] `PayrollDashboard.tsx`
  - Stat cards: Runs This Month, Pending Approval, Next Pay Date
  - Current run status cards per pay group
  - Quick action: "Start New Run"
- [ ] `FinanceDashboard.tsx`
  - Stat cards: Awaiting Approval, Total Payroll Cost (month), Cost vs Budget
  - Approvals queue (runs in `in_review` state)
  - Upcoming statutory filing deadlines
- [ ] `EmployeeDashboard.tsx`
  - Welcome banner with employee name
  - Latest payslip summary card
  - "Download Latest Payslip" button
  - Next pay date countdown

All dashboard stat cards: fetch from dedicated summary endpoints, show Spinner while loading, show last updated timestamp.

---

### PHASE 14 — Polish and Cross-Cutting

**Batch 14.1 — Responsive audit**
- [ ] Verify every grid uses `auto-fit minmax()` — no hardcoded breakpoints on grids
- [ ] Verify every font size uses `clamp()` — no fixed `text-xl` on headings that need scaling
- [ ] Verify every container uses `width: 100%; max-width` pattern
- [ ] Test all screens at 375px (mobile), 768px (tablet), 1440px (desktop)

**Batch 14.2 — Empty and error states**
- [ ] Verify every DataTable has proper EmptyState with contextual message
- [ ] Verify every page has ErrorState with retry
- [ ] Verify all forms show field-level errors from mock API `fields` object

**Batch 14.3 — Loading states**
- [ ] Every page that fetches shows Spinner or skeleton while loading
- [ ] No screen renders stale data without a loading indicator on refetch
- [ ] Pay run register shows skeleton rows while calculating

**Batch 14.4 — Auth edge cases**
- [ ] Test invite token expired → show "This invite has expired. Contact your administrator."
- [ ] Test reset token expired → same pattern
- [ ] Test 401 mid-session → auto redirect to login with toast "Session expired. Please sign in again."
- [ ] Test 403 → show inline "You do not have permission for this action." toast

**Batch 14.5 — No-emoji audit**
- [ ] Global search for emoji characters and replace with Lucide icons
- [ ] Verify toast messages use no emoji
- [ ] Verify empty states use Lucide icons not emoji

---

## 9. Environment Variables

```env
# apps/web/.env.development
VITE_API_URL=/api                   # MSW intercepts this
VITE_APP_NAME=PayRole
VITE_APP_ENV=development

# apps/web/.env.production
VITE_API_URL=https://api.payrole.com
VITE_APP_NAME=PayRole
VITE_APP_ENV=production
```

---

## 10. Dependencies Reference

```json
{
  "dependencies": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "react-router-dom": "^6.26.0",
    "@tanstack/react-query": "^5.56.0",
    "zustand": "^4.5.0",
    "lucide-react": "^0.447.0",
    "clsx": "^2.1.1",
    "recharts": "^2.12.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "typescript": "^5.5.0",
    "vite": "^5.4.0",
    "@vitejs/plugin-react": "^4.3.0",
    "tailwindcss": "^3.4.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "msw": "^2.4.0"
  }
}
```

---

## 11. Prompt Chaining Guide

Use this section to structure your Claude Code sessions. Each batch is one prompt session. Always paste the STANDING RULES block at the top of each session prompt.

**Session prompt template:**
```
[STANDING RULES — paste Section 2 of Build-Execution.md]

Context: We are building PayRole payroll ERP.
Current batch: [BATCH NUMBER AND NAME]
Dependencies already built: [LIST PREVIOUS BATCHES]

Task: Build the following files exactly as specified in Build-Execution.md:
- [file 1]
- [file 2]

Reference the specifications in Section 5 and the mock data patterns in Section 7.
Do not deviate from the brand colors, icon rules, or responsive rules.
```

**Recommended session order:**
1. Batch 0.1 → 0.2 (monorepo + tooling, do together)
2. Batch 0.3 → 0.4 (MSW + router, do together)
3. Batches 1.1 → 1.4 (all UI primitives before any page)
4. Batches 2.1 → 2.3 (layout shell)
5. Batch 3.1 (landing page — standalone, unblocked)
6. Batch 4.1 (auth screens — unblocked after shell)
7. Batch 5.1 (SA portal — unblocked after auth)
8. Batch 6.1 (onboarding wizard — needs auth)
9. Batches 7.1 → 7.6 (organisation — must complete before employees)
10. Batches 8.1 → 8.4 (employees — needs org)
11. Batches 9.1 → 9.5 (payroll — needs employees and org)
12. Batches 10.1 → 10.2 (finance/reports — needs payroll)
13. Batch 11.1 (settings — needs auth and org)
14. Batch 12.1 (employee portal — needs employees and payslips)
15. Batch 13.1 (dashboards — needs all data layers)
16. Batches 14.1 → 14.5 (polish — last)

---

*End of Build-Execution.md*
*Version 1.0 — PayRole Frontend Build Plan*
