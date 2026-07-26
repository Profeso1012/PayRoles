# End-to-End Testing Checklist for PayRole Frontend
**Last Updated:** January 2026

This checklist ensures all API endpoints are correctly wired and displaying exact backend error/success messages.

---

## PRE-TESTING SETUP

### Backend Setup
- [ ] Backend running on `http://localhost:3000`
- [ ] Database seeded with platform admin (email: `admin@payrolles.com`, password: `Admin@123`)
- [ ] Verify platform admin has `platformRole = 'super_admin'` (lowercase)

### Frontend Setup
- [ ] Frontend running on `http://localhost:5173`
- [ ] Environment variables configured (`.env` file with correct `VITE_API_BASE_URL`)
- [ ] Browser console open to watch for API calls and errors
- [ ] Network tab open to verify request/response payloads

---

## PART 1: PLATFORM ADMIN FLOWS

### 1.1 Platform Login (`/platform-login`)
- [ ] Navigate to `/platform-login` (use footer link if direct URL gives 404)
- [ ] **Test invalid email:** Enter `invalid@example.com` → password → click Login
  - [ ] Verify error toast shows **exact backend message**
  - [ ] Expected: `"Invalid credentials"` or similar from backend
- [ ] **Test invalid password:** Enter `admin@payrolles.com` → `WrongPass123` → Login
  - [ ] Verify error toast shows backend message
- [ ] **Test valid login:** Enter `admin@payrolles.com` → `Admin@123` → Login
  - [ ] Network tab shows: `POST /api/platform/auth/login` → 200 OK
  - [ ] Response contains `{ success: true, data: { accessToken, ... } }`
  - [ ] Redirects to `/admin` (Platform Overview dashboard)
  - [ ] Sidebar shows "Platform Admin" user name from `GET /api/platform/users/me`
  - [ ] Success toast appears with backend message

### 1.2 Platform Overview (`/admin`)
- [ ] Dashboard loads with stat cards: Total/Active/Inactive/Suspended companies
- [ ] Network tab shows: `GET /api/platform/tenants` → 200 OK
- [ ] Recent companies table displays (if any tenants exist)
- [ ] Verify all counts match backend data

### 1.3 Companies Management (`/admin/companies`)
- [ ] Click "Companies" in sidebar → navigates to `/admin/companies`
- [ ] Network tab shows: `GET /api/platform/tenants` → 200 OK
- [ ] Table displays all tenants with: name, contact email, status, member since
- [ ] "Onboard New Company" button visible

#### 1.3.1 Onboard New Company
- [ ] Click "Onboard New Company" button → modal opens
- [ ] **Test validation:**
  - [ ] Submit empty form → frontend validation errors appear
  - [ ] Enter invalid email format → validation error
  - [ ] Enter slug with spaces/special chars → validation error
- [ ] **Test successful onboarding:**
  - [ ] Company Name: `Zenith Logistics Ltd`
  - [ ] Slug: `zenith-logistics` (auto-suggested, editable)
  - [ ] Contact Email: `admin@zenithlogistics.com`
  - [ ] Country: `Nigeria (NG)`
  - [ ] Currency: `NGN`
  - [ ] First Admin - First Name: `Chidi`
  - [ ] First Admin - Last Name: `Nwosu`
  - [ ] First Admin - Password: (auto-generated, note it down for later)
  - [ ] Click "Create Company"
  - [ ] Network tab shows TWO sequential calls:
    1. `POST /api/platform/tenants` → returns `{ id: "..." }`
    2. `POST /api/platform/tenants/:id/users` → creates first admin
  - [ ] Success toast shows **exact backend message**
  - [ ] Modal closes, table refreshes with new company
  - [ ] **Note down:** tenant slug, admin email, admin password for Part 2

#### 1.3.2 Company Detail Page
- [ ] Click any company row → navigates to `/admin/companies/:id`
- [ ] Network tab shows: `GET /api/platform/tenants/:id` → 200 OK
- [ ] Page displays: name, contact email, country, currency, member since
- [ ] "Add User" and "Suspend"/"Reactivate" buttons visible

#### 1.3.3 Add User to Existing Company
- [ ] On company detail page, click "Add User" → modal opens
- [ ] **Test validation:**
  - [ ] Submit empty form → validation errors
  - [ ] Enter existing email → should show backend error on submit
- [ ] **Test successful add:**
  - [ ] Email: `operations@zenithlogistics.com`
  - [ ] First Name: `Amaka`, Last Name: `Eze`
  - [ ] Role: `tenant_admin`
  - [ ] Password: (auto-generated, note it)
  - [ ] Click "Add User"
  - [ ] Network tab: `POST /api/platform/tenants/:id/users` → 200 OK
  - [ ] Success toast shows backend message
  - [ ] Modal closes

#### 1.3.4 Suspend/Reactivate Company
- [ ] On company detail page, click "Suspend" button
- [ ] Confirmation dialog appears
- [ ] Click "Confirm"
- [ ] Network tab: `PATCH /api/platform/tenants/:id/suspend` → 200 OK
- [ ] Success toast shows backend message
- [ ] Button changes to "Reactivate"
- [ ] Status badge updates to "Suspended"
- [ ] **Test login lockout:** Try logging in as tenant admin (Part 2) → should fail
- [ ] Click "Reactivate" → confirmation → network call → success
- [ ] **Verify reactivation:** Tenant admin can log in again

### 1.4 Platform Users Management (`/admin/users`)
- [ ] Click "Platform Users" in sidebar → navigates to `/admin/users`
- [ ] Network tab: `GET /api/platform/users` → 200 OK
- [ ] Table displays all platform users with: name, email, platform role, active/disabled, last login
- [ ] "Add Platform User" button visible (super_admin/platform_admin only)

#### 1.4.1 Add Platform User
- [ ] Click "Add Platform User" → modal opens
- [ ] **Test validation:**
  - [ ] Submit empty form → validation errors
  - [ ] Invalid email format → validation error
- [ ] **Test successful add:**
  - [ ] Email: `support@payrolles.com`
  - [ ] First Name: `Tunde`, Last Name: `Bello`
  - [ ] Platform Role: `support_engineer`
  - [ ] Password: (auto-generated, note it)
  - [ ] Click "Add User"
  - [ ] Network tab: `POST /api/platform/users` → 200 OK
  - [ ] Success toast shows backend message
  - [ ] Table refreshes with new user

#### 1.4.2 Disable/Enable Platform User
- [ ] On any user row (not yourself), click "Disable" button
- [ ] Confirmation appears
- [ ] Network tab: `PATCH /api/platform/users/:id/disable` → 200 OK
  - [ ] Success toast shows backend message
  - [ ] Button changes to "Enable"
  - [ ] Status badge updates to "Disabled"
  - [ ] **Test login lockout:** Try logging in as that user → should fail
  - [ ] Click "Enable" → network call → success
- [ ] Verify you **cannot** disable yourself (button hidden on own row)

### 1.5 Tax Rules Management (`/admin/tax`)
- [ ] Click "Tax Rules" in sidebar → navigates to `/admin/tax`
- [ ] Network tab shows:
  - `GET /api/platform/tax/jurisdictions` → 200 OK
  - `GET /api/platform/tax/rules` → 200 OK
  - `GET /api/platform/tax/versions?isActive=true` → 200 OK (or similar)
- [ ] Jurisdictions list displays (Nigeria, UK, etc.)
- [ ] Each jurisdiction shows its tax rules
- [ ] Each rule shows its versions with Active/Inactive badges

#### 1.5.1 Create Tax Rule
- [ ] Click "Create Rule" button → modal opens
- [ ] **Test validation:**
  - [ ] Submit empty form → validation errors
- [ ] **Test successful create:**
  - [ ] Jurisdiction: `Nigeria`
  - [ ] Code: `NIGERIA_PIT` (auto-uppercased)
  - [ ] Name: `Nigeria Personal Income Tax`
  - [ ] Click "Create"
  - [ ] Network tab: `POST /api/platform/tax/rules` → 200 OK
  - [ ] Success toast shows backend message
  - [ ] Modal closes, new rule appears in jurisdiction tree

#### 1.5.2 Create Tax Version
- [ ] Click "Create Version" on any rule → modal opens
- [ ] **Test successful create:**
  - [ ] Version Code: `NIGERIA_PIT_2027`
  - [ ] Name: `Nigeria PIT 2027`
  - [ ] Effective Date: `2027-01-01`
  - [ ] Basis: `annual`
  - [ ] Add tax bands (e.g., 0-300,000 @ 7%, 300,001+ @ 11%)
  - [ ] Add reliefs (e.g., CRA @ 20%)
  - [ ] Click "Create"
  - [ ] Network tab: `POST /api/platform/tax/versions` → 200 OK
  - [ ] Success toast shows backend message
  - [ ] New version appears under rule with "Inactive" badge

#### 1.5.3 Activate/Deactivate Tax Version
- [ ] Click "Activate" toggle on an inactive version
- [ ] Confirmation appears
- [ ] Network tab: `PATCH /api/platform/tax/versions/:code/activate` → 200 OK
  - [ ] Success toast shows backend message
  - [ ] Badge changes to "Active"
  - [ ] Click "Deactivate" → network call → badge changes back

### 1.6 My Profile (Platform Admin)
- [ ] Click topbar dropdown → "My Profile" → navigates to `/my-profile`
- [ ] Network tab: `GET /api/platform/users/me` → 200 OK
- [ ] Page shows: email, first name, last name
- [ ] "Change Password" form visible

#### 1.6.1 Change Password
- [ ] **Test validation:**
  - [ ] Submit empty form → validation errors
  - [ ] Enter wrong current password → backend error on submit
  - [ ] Enter weak new password → validation error
- [ ] **Test successful change:**
  - [ ] Current Password: `Admin@123`
  - [ ] New Password: `Admin@456` (strong)
  - [ ] Confirm New Password: `Admin@456`
  - [ ] Click "Change Password"
  - [ ] Network tab: `PATCH /api/platform/users/me/password` → 200 OK
  - [ ] Success toast shows backend message
  - [ ] Form resets
  - [ ] **Test new password:** Log out → log back in with new password

---

## PART 2: TENANT ADMIN FLOWS

### 2.1 Tenant Login (`/login`)
- [ ] Navigate to `/login` (or click "Sign In" from landing page)
- [ ] Three-step form: email → company code → password
- [ ] **Test invalid email:** `wrong@example.com` → continue → error
- [ ] **Test invalid company code:** Valid email → `wrong-slug` → error
- [ ] **Test invalid password:** Valid email → valid slug → wrong password → error
- [ ] **Test valid login:**
  - [ ] Email: `admin@zenithlogistics.com`
  - [ ] Company code: `zenith-logistics`
  - [ ] Password: (from Part 1.3.1)
  - [ ] Network tab:
    1. `POST /api/v1/auth/login` → 200 OK with `{ accessToken, ... }`
    2. `GET /api/v1/auth/me` → user details
    3. `GET /api/v1/users/me` → firstName, lastName
  - [ ] Redirects to `/dashboard`
  - [ ] Sidebar shows user name
  - [ ] Success toast appears

### 2.2 Dashboard (`/dashboard`)
- [ ] Dashboard loads (tenant_admin sees general HR dashboard)
- [ ] Stat cards show: Total employees, Active/Suspended/Inactive counts
- [ ] Recent hires table displays (empty if no employees yet)
- [ ] Quick action cards visible (Add Employee, Run Payroll, etc.)

### 2.3 Legal Entities (`/organisation/legal-entities`)
**THIS MUST BE DONE FIRST** before adding employees or creating pay runs.

- [ ] Click "Organisation" → "Legal Entities" in sidebar
- [ ] Network tab: `GET /api/v1/legal-entities` → 200 OK
- [ ] "Add Legal Entity" button visible

#### 2.3.1 Add Legal Entity
- [ ] Click "Add Legal Entity" → modal opens
- [ ] **Test validation:**
  - [ ] Submit empty form → validation errors
- [ ] **Test successful add:**
  - [ ] Name: `Zenith Logistics Nigeria`
  - [ ] Country: `Nigeria (NG)`
  - [ ] Tax ID: `RC-445566`
  - [ ] Address: `12 Marina, Lagos`
  - [ ] Click "Create"
  - [ ] Network tab: `POST /api/v1/legal-entities` → 200 OK
  - [ ] Success toast shows backend message
  - [ ] Table refreshes with new entity
  - [ ] **Note down:** legal entity ID for later

#### 2.3.2 View/Edit Legal Entity
- [ ] Click any legal entity row → detail view opens
- [ ] Edit fields, click "Save"
- [ ] Network tab: `PATCH /api/v1/legal-entities/:id` → 200 OK
- [ ] Success toast shows backend message

#### 2.3.3 Deactivate Legal Entity
- [ ] Click "Deactivate" button on any entity
- [ ] Confirmation appears
- [ ] Network tab: `PATCH /api/v1/legal-entities/:id/deactivate` → 200 OK
- [ ] Success toast, status updates to "Inactive"

### 2.4 Users & Roles (`/settings/users`)
- [ ] Click "Settings" → "Users & Roles" in sidebar
- [ ] Network tab: `GET /api/v1/users` → 200 OK
- [ ] Table displays all tenant users
- [ ] "Add User" button visible

#### 2.4.1 Add Users (Different Roles)
Create one user for each role to test later. For each:

**HR Manager:**
- [ ] Click "Add User" → modal opens
- [ ] Email: `amaka@zenithlogistics.com`
- [ ] First Name: `Amaka`, Last Name: `Eze`
- [ ] Role: `hr_manager`
- [ ] Password: (auto-generated, note it)
- [ ] Network tab: `POST /api/v1/users` → 200 OK
- [ ] Success toast shows backend message

**Payroll Manager:**
- [ ] Email: `bola@zenithlogistics.com`
- [ ] Name: `Bola Okafor`
- [ ] Role: `payroll_manager`
- [ ] Note password

**Finance Manager:**
- [ ] Email: `chioma@zenithlogistics.com`
- [ ] Name: `Chioma Adeyemi`
- [ ] Role: `finance_manager`
- [ ] Note password

**Employee (for self-service testing):**
- [ ] Email: `employee@zenithlogistics.com`
- [ ] Name: `Tunde Ibrahim`
- [ ] Role: `employee_self_service`
- [ ] Note password

#### 2.4.2 Reset User Password
- [ ] On any user row (not yourself), click "Reset Password" button
- [ ] Confirmation dialog appears
- [ ] Click "Confirm"
- [ ] Network tab: `PATCH /api/v1/users/:id/reset-password` → 200 OK
- [ ] Success toast shows backend message with **temporary password** (displayed once)
- [ ] Note down the temp password
- [ ] **Test login with new temp password:** Log out, log in as that user
- [ ] After successful login, user should be able to change password

#### 2.4.3 Disable/Enable User
- [ ] Click "Disable" on any user (not yourself)
- [ ] Confirmation → network call → success toast
- [ ] Button changes to "Enable"
- [ ] **Test login lockout:** Try logging in as disabled user → should fail
- [ ] Click "Enable" → network call → user can log in again

### 2.5 Jurisdictions (Read-Only for Tenant Admin)
- [ ] Click "Settings" → "Jurisdictions" in sidebar → `/settings/jurisdictions`
- [ ] Network tab:
  - `GET /api/v1/tax/jurisdictions` → 200 OK
  - `GET /api/v1/tax/rules` → 200 OK
  - `GET /api/v1/tax/rules/:code/versions` → 200 OK (per rule)
- [ ] Page shows jurisdictions tree with rules and versions
- [ ] Banner states: "This is shared reference data. Contact PayRole support for changes."
- [ ] **No** Create/Edit/Activate buttons visible (read-only for tenant users)

---

## PART 3: HR MANAGER FLOWS

### 3.1 HR Manager Login
- [ ] Log out tenant_admin
- [ ] Log in as HR Manager (credentials from Part 2.4.1)
- [ ] Should land on `/dashboard` (HR Dashboard)
- [ ] Sidebar shows HR-specific navigation

### 3.2 Add Employee (`/employees/new`)
**Prerequisites:** Must have at least one Legal Entity created.

- [ ] Click "Employees" in sidebar → `/employees`
- [ ] If no legal entities, should redirect to Organisation with warning
- [ ] Click "Add Employee" → 5-step wizard opens

#### Step 1: Personal Information
- [ ] Fill in:
  - [ ] Employee Number: `ZL-0001`
  - [ ] First Name: `Chidi`
  - [ ] Last Name: `Okeke`
  - [ ] Email: `chidi@zenithlogistics.com`
  - [ ] Phone: `+2348012345678`
  - [ ] Date of Birth: `1992-04-15`
  - [ ] National ID: `NIN-1234567890`
- [ ] Click "Next"

#### Step 2: Employment Details
- [ ] Fill in:
  - [ ] Position: `Software Engineer`
  - [ ] Department: `Engineering`
  - [ ] Legal Entity: (select from Part 2.3.1)
  - [ ] Employment Type: `full_time`
  - [ ] Hire Date: `2026-07-01`
- [ ] Click "Next"

#### Step 3: Compensation
- [ ] Amount: `500,000` (will be converted to minor units: 50000000)
- [ ] Currency: `NGN` (auto-filled from tenant)
- [ ] Effective Date: `2026-07-01`
- [ ] Click "Next"

#### Step 4: Bank Details
- [ ] Bank Name: `GTBank`
- [ ] Account Number: `0123456789`
- [ ] Click "Next"

#### Step 5: Review
- [ ] Review all entered data
- [ ] Click "Submit"
- [ ] Network tab shows TWO sequential calls:
  1. `POST /api/v1/workers` → 200 OK (returns worker ID)
  2. `POST /api/v1/compensation` → 200 OK
- [ ] Success toast shows backend message
- [ ] Redirects to `/employees` or employee detail page
- [ ] **Note down:** worker ID for later tests

**Repeat for at least 2 more employees** to have enough data for payroll testing.

### 3.3 Employee Detail Page (`/employees/:id`)
- [ ] Click any employee row → navigates to `/employees/:id`
- [ ] Network tab:
  - `GET /api/v1/workers/:id` → 200 OK
  - `GET /api/v1/compensation/worker/:id` → 200 OK
  - `GET /api/v1/workers/:id/payslips` → 200 OK (may be empty)
  - `GET /api/v1/workers/:id/pay-elements` → 200 OK

#### Four Tabs Visible:
1. **Profile Tab:**
   - [ ] Shows personal info, employment details
   - [ ] Bank details show as "Protected" (encrypted, never returns decrypted)
   - [ ] National ID shows as "Protected"
   - [ ] "Edit" button (top right) visible

2. **Assignments Tab:**
   - [ ] Shows empty state (no assignments endpoint exists in backend)
   - [ ] This is expected, not a bug

3. **Compensation Tab:**
   - [ ] Shows compensation history (read-only)
  - [ ] "Add Compensation" button visible
   - [ ] Each record shows: amount, currency, effective date, end date (if superseded)

4. **Payslips Tab:**
   - [ ] Shows payslips for this employee (may be empty until payroll run)

### 3.4 Edit Employee (`/employees/:id/edit`)
- [ ] From employee detail page, click "Edit" button (top right)
- [ ] Navigates to `/employees/:id/edit`
- [ ] Form pre-filled with current data
- [ ] Change: Phone to `+2348098765432`
- [ ] Click "Save Changes"
- [ ] Network tab: `PATCH /api/v1/workers/:id` → 200 OK
- [ ] Success toast shows backend message
- [ ] Redirects back to employee detail page
- [ ] Verify phone number updated

### 3.5 Add Compensation (Give a Raise)
- [ ] On employee detail page → Compensation tab
- [ ] Click "Add Compensation" button → modal opens
- [ ] Amount: `600,000` (new salary)
- [ ] Currency: `NGN`
- [ ] Effective Date: `2026-08-01`
- [ ] Click "Save"
- [ ] Network tab: `POST /api/v1/compensation` → 200 OK
- [ ] Success toast shows backend message
- [ ] Modal closes
- [ ] Compensation history updates: old record shows end date, new record shows as current

### 3.6 Assign Pay Element to Employee
**Prerequisites:** Pay elements must be created first (see Part 4.2).

- [ ] On employee detail page → Pay Elements tab
- [ ] Click "Assign Pay Element" button → modal opens
- [ ] Select Pay Element: `TRANSPORT_ALLOWANCE`
- [ ] Calculation Method: `fixed`
- [ ] Amount: `50,000` (will be converted to minor units)
- [ ] Effective Date: `2026-07-01`
- [ ] Click "Assign"
- [ ] Network tab: `POST /api/v1/workers/:workerId/pay-elements` → 200 OK
- [ ] Success toast shows backend message
- [ ] Table updates with new assignment

#### 3.6.1 Edit Pay Element Assignment
- [ ] Click "Edit" on any assigned pay element
- [ ] Change amount to `75,000`
- [ ] Click "Save"
- [ ] Network tab: `PATCH /api/v1/workers/:workerId/pay-elements/:id` → 200 OK
- [ ] Success toast, table updates

#### 3.6.2 Unassign Pay Element
- [ ] Click "Unassign" on any assigned pay element
- [ ] Confirmation appears
- [ ] Network tab: `PATCH /api/v1/workers/:workerId/pay-elements/:id/unassign` → 200 OK
- [ ] Success toast
- [ ] Element soft-removed (stops applying but stays in history)

### 3.7 Terminate Employee
- [ ] On employee detail page, click "Terminate" button (top right, next to Edit)
- [ ] Modal opens asking for termination date and optional reason
- [ ] **Test validation:**
  - [ ] Submit without date → validation error
  - [ ] Submit with past date → should show backend error or validation
- [ ] **Test successful termination:**
  - [ ] Termination Date: `2026-08-31`
  - [ ] Reason: `Resigned`
  - [ ] Click "Terminate"
  - [ ] Network tab: `PATCH /api/v1/workers/:id/terminate` → 200 OK
  - [ ] Success toast shows backend message
  - [ ] Employee status changes to "Inactive"
  - [ ] "Terminate" button disappears (already terminated)

---

## PART 4: PAYROLL MANAGER FLOWS

### 4.1 Payroll Manager Login
- [ ] Log out HR Manager
- [ ] Log in as Payroll Manager (credentials from Part 2.4.1)
- [ ] Should land on `/dashboard` (Payroll Dashboard)

### 4.2 Pay Elements (`/payroll/pay-elements`)
- [ ] Click "Payroll" → "Pay Elements" in sidebar
- [ ] Network tab: `GET /api/v1/pay-elements` → 200 OK
- [ ] Table displays existing pay elements
- [ ] "Add Element" button visible

#### 4.2.1 Create Pay Elements
Create multiple elements for testing. For each:

**Transport Allowance (Earning):**
- [ ] Click "Add Element" → modal opens
- [ ] Code: `TRANSPORT_ALLOWANCE` (auto-uppercased)
- [ ] Name: `Transport Allowance`
- [ ] Type: `earning`
- [ ] Formula: `GROSS * 0.15`
- [ ] Click "Create"
- [ ] Network tab: `POST /api/v1/pay-elements` → 200 OK
- [ ] Success toast shows backend message

**Housing Allowance (Earning):**
- [ ] Code: `HOUSING_ALLOWANCE`
- [ ] Name: `Housing Allowance`
- [ ] Type: `earning`
- [ ] Formula: `BASIC * 0.20`
- [ ] Click "Create"

**Pension Deduction:**
- [ ] Code: `PENSION`
- [ ] Name: `Pension Contribution`
- [ ] Type: `deduction`
- [ ] Formula: `GROSS * 0.08`

**Create 2-3 more pay elements for testing.**

### 4.3 Create Pay Run (`/payroll/runs/new`)
**Prerequisites:** Must have Legal Entity and Active Employees.

- [ ] Click "Payroll" → "Pay Runs" in sidebar → `/payroll/runs`
- [ ] Click "New Run" button → navigates to `/payroll/runs/new`

#### Fill form:
- [ ] Legal Entity: (select from dropdown)
- [ ] Pay Run Name: `July 2026 Payroll`
- [ ] Period Start: `2026-07-01`
- [ ] Period End: `2026-07-31`
- [ ] Pay Date: `2026-07-31`
- [ ] Click "Create Pay Run"
- [ ] Network tab: `POST /api/v1/payroll/runs` → 200 OK
- [ ] Success toast shows backend message
- [ ] Redirects to `/payroll/runs/:id` in **draft** status

### 4.4 Pay Run Detail (`/payroll/runs/:id`)
- [ ] Page shows: run name, legal entity, period, pay date, status
- [ ] **Calculate Payroll** button visible (draft state)
- [ ] Click "Calculate Payroll"
- [ ] Network tab: `PATCH /api/v1/payroll/runs/:id/calculate` → 202 Accepted
- [ ] Status changes to "Calculating"
- [ ] Page polls every 2 seconds: `GET /api/v1/payroll/runs/:id`
- [ ] Once status changes to "Calculated":
  - [ ] Employee register table appears
  - [ ] Shows: employee name, gross pay, deductions, net pay
  - [ ] Network tab: `GET /api/v1/payroll/runs/:id/payslips` → 200 OK
  - [ ] **Submit for Review** button appears

### 4.5 Submit Pay Run for Approval
- [ ] Click "Submit for Review" button
- [ ] Confirmation dialog appears
- [ ] Network tab: `PATCH /api/v1/payroll/runs/:id/submit` → 200 OK
- [ ] Success toast shows backend message
- [ ] Status changes to "In Review" (backend: `pending_approval`)
- [ ] **Submit** button disappears
- [ ] **Approve/Reject** buttons appear (for payroll_manager only)

### 4.6 Approve Pay Run (payroll_manager only)
- [ ] **Important:** Finance Manager CANNOT approve (see Part 1 gotcha)
- [ ] Still logged in as Payroll Manager
- [ ] Click "Approve Pay Run" button
- [ ] Confirmation dialog appears
- [ ] Click "Confirm"
- [ ] Network tab: `PATCH /api/v1/payroll/runs/:id/approve` → 200 OK
- [ ] Success toast shows backend message
- [ ] Status changes to "Approved"
- [ ] **Reverse Pay Run** button appears (tenant_admin/super_admin only)

#### 4.6.1 Reject Pay Run (Alternative Flow)
- [ ] Create another pay run, calculate, submit for review
- [ ] Click "Reject" button (labeled plainly now)
- [ ] Modal opens asking for reason
- [ ] Reason: `Missing overtime hours for Lagos branch`
- [ ] Click "Reject"
- [ ] Network tab: `PATCH /api/v1/payroll/runs/:id/reject` → 200 OK
- [ ] Success toast shows backend message (with reason)
- [ ] Status changes to "Rejected"
- [ ] Run can be recalculated and resubmitted

---

## PART 5: FINANCE MANAGER FLOWS

### 5.1 Finance Manager Login
- [ ] Log out Payroll Manager
- [ ] Log in as Finance Manager (credentials from Part 2.4.1)
- [ ] Should land on `/dashboard` (Finance Dashboard)

### 5.2 View Approved Pay Run (Read-Only)
- [ ] Click "Payroll" → "Pay Runs" in sidebar
- [ ] Table shows all pay runs
- [ ] Click any approved run → navigates to `/payroll/runs/:id`
- [ ] **Verify Read-Only:** No Approve/Reject/Reverse buttons visible
- [ ] Banner shows: "Submitted for approval. Awaiting review."
- [ ] Employee register is visible (read-only)

### 5.3 Disbursement (Payments) (`/payments`)
- [ ] Click "Payments" in sidebar → `/payments`
- [ ] Network tab: Multiple `GET /api/v1/payroll/runs/:id/disbursement` calls (one per approved run)
- [ ] Table shows all approved runs with disbursement status

#### 5.3.1 Initiate Disbursement
- [ ] Find an approved run with "Not started" disbursement
- [ ] Click "Initiate" button
- [ ] Confirmation dialog appears
- [ ] Network tab: `POST /api/v1/payroll/runs/:runId/disbursement` → 200 OK
  - Body: `{ "executionPolicy": "manual" }`
- [ ] Success toast shows backend message
- [ ] Disbursement batch created
- [ ] Status updates to show batch state

#### 5.3.2 Approve Disbursement (if workflow requires it)
- [ ] If tenant settings require approval, "Approve" button appears
- [ ] Click "Approve"
- [ ] Network tab: `POST /api/v1/payroll/runs/:runId/disbursement/:batchId/approve` → 200 OK
- [ ] Success toast

#### 5.3.3 Execute Disbursement
- [ ] Click "Execute" button
- [ ] Confirmation dialog
- [ ] Network tab: `POST /api/v1/payroll/runs/:runId/disbursement/:batchId/execute` → 200 OK
- [ ] Success toast shows backend message
- [ ] Transactions are created and processed

#### 5.3.4 Download Bulk File
- [ ] Once transactions exist, "Download Bulk File" button appears
- [ ] Click button
- [ ] Network tab: `GET /api/v1/payroll/runs/:runId/disbursement/:batchId/bulk-file?format=csv` → file download
- [ ] CSV file downloads with bank payment details

#### 5.3.5 Retry Failed Transactions
- [ ] If any transactions failed, "Retry" button appears
- [ ] Click "Retry"
- [ ] Network tab: `POST /api/v1/payroll/runs/:runId/disbursement/:batchId/retry` → 200 OK
- [ ] Only failed transactions are retried

---

## PART 6: EMPLOYEE SELF-SERVICE FLOWS

### 6.1 Creating Employee Self-Service User
**CRITICAL:** The `employee_self_service` role requires linking a User to a Worker record.

#### Method 1: Direct Database Update (Temporary Workaround)

1. Create a worker first (Part 3.2)
2. Create a user with `employee_self_service` role (Part 2.4.1)
3. **Update the user's `workerId` in database:**
   ```sql
   UPDATE users
   SET "workerId" = '<worker-id-from-step-1>'
   WHERE email = 'employee@zenithlogistics.com';
   ```

#### Method 2: API Enhancement Needed
The backend should accept `workerId` in `POST /api/v1/users` body for employee creation.
This would allow proper linking during user creation without database access.

**For Testing:** Use Method 1 above to link an existing worker to the employee user.

### 6.2 Employee Login
- [ ] Log out Finance Manager
- [ ] Navigate to `/login`
- [ ] Email: `employee@zenithlogistics.com` (or the worker's email from Part 3.2)
- [ ] Company code: `zenith-logistics`
- [ ] Password: (from Part 2.4.1 or Method 1 above)
- [ ] Network tab:
  - `POST /api/v1/auth/login` → 200 OK
  - `GET /api/v1/auth/me` → should include `"workerId": "..."`
  - `GET /api/v1/users/me` → firstName, lastName
- [ ] **Should redirect to `/my-payslips`** (not `/dashboard`)

### 6.3 My Payslips (`/my-payslips`)
- [ ] Page loads successfully (if workerId is properly linked)
- [ ] Network tab: `GET /api/v1/workers/:workerId/payslips` → 200 OK
- [ ] Summary cards show: Latest Net Pay, Total Payslips count
- [ ] Payslip history table displays
- [ ] If no payslips yet (worker not included in any completed pay run): "No payslips found" message

#### If Page Shows "Something went wrong":
**Diagnosis:**
- [ ] Open browser console → check error message
- [ ] Network tab → check if API call failed
- [ ] Most likely issue: `workerId` is `null` in auth store
- [ ] Error message: `"No worker record linked to this account"`

**Fix:**
- [ ] Verify `workerId` in JWT: Decode the JWT token (use jwt.io)
- [ ] If `workerId` is missing, the user record in database needs updating (see Part 6.1)
- [ ] After database update, **log out and log in again** to get new JWT with `workerId`

#### View Payslip Detail
- [ ] Click "View" on any payslip row
- [ ] Navigates to `/payroll/runs/:runId/payslips/:payslipId`
- [ ] Network tab: `GET /api/v1/payroll/runs/:runId/payslips/:payslipId` → 200 OK
- [ ] Page shows detailed breakdown: earnings, deductions, tax, net pay

#### Download Payslip PDF
- [ ] Click "Download PDF" button
- [ ] Network tab: `POST /api/v1/payroll/runs/:runId/payslips/:payslipId/pdf` → 200 OK
- [ ] Response: `{ "pdfUrl": "..." }`
- [ ] PDF file opens/downloads
- [ ] **Print** button (browser print dialog) also available for quick view

### 6.4 My Profile (`/my-profile`)
- [ ] Click topbar dropdown → "My Profile"
- [ ] Network tab: `GET /api/v1/users/me` → 200 OK
- [ ] Page shows: email, first name, last name
- [ ] "Change Password" form visible
- [ ] **No bank details section** (employee cannot view/edit worker records)

#### 6.4.1 Change Password
- [ ] Current Password: (the temp password)
- [ ] New Password: `Employee@456`
- [ ] Confirm New Password: `Employee@456`
- [ ] Click "Change Password"
- [ ] Network tab: `PATCH /api/v1/users/me/password` → 200 OK
- [ ] Success toast shows backend message
- [ ] **Test new password:** Log out → log in with new password

---

## PART 7: ADDITIONAL FEATURES & EDGE CASES

### 7.1 Notifications (`/notifications`)
- [ ] Bell icon in topbar shows unread count
- [ ] Click bell → navigates to `/notifications`
- [ ] Network tab: `GET /api/v1/notifications` → 200 OK
- [ ] List shows notifications with read/unread status
- [ ] "Mark all as read" button visible
- [ ] Click "Mark all as read"
- [ ] Network tab: `PATCH /api/v1/notifications/read-all` → 200 OK
- [ ] All notifications marked as read
- [ ] Click any notification card
- [ ] Network tab: `PATCH /api/v1/notifications/:id/read` → 200 OK
- [ ] That notification marked as read

### 7.2 Audit Logs (`/audit`) 
**Accessible by:** tenant_admin, finance_manager, auditor

- [ ] Log in as one of the above roles
- [ ] Click "Audit" in sidebar → `/audit`
- [ ] Network tab: `GET /api/v1/audit-logs` → 200 OK
- [ ] Table shows: timestamp, user, action, entity type, entity ID, metadata
- [ ] Filters available: date range, action type, user
- [ ] Apply filters → network call with query params

### 7.3 Reverse Pay Run (tenant_admin/super_admin only)
- [ ] Log in as tenant_admin
- [ ] Navigate to an approved pay run → `/payroll/runs/:id`
- [ ] **Reverse Pay Run** button visible (not visible to payroll_manager or finance_manager)
- [ ] Click "Reverse"
- [ ] Modal asks for reason
- [ ] Reason: `Incorrect tax calculations`
- [ ] Click "Reverse"
- [ ] Network tab: `PATCH /api/v1/payroll/runs/:id/reverse` → 200 OK
- [ ] Success toast shows backend message
- [ ] Run status changes to "Reversed"
- [ ] Historical records kept, corrections require new run

### 7.4 Cancel Pay Run (draft/calculated states)
- [ ] Create a new pay run (draft state)
- [ ] Click "Cancel Run" button
- [ ] Confirmation dialog
- [ ] Network tab: `PATCH /api/v1/payroll/runs/:id/cancel` → 200 OK
- [ ] Success toast
- [ ] Run status changes to "Cancelled"

### 7.5 Error Toast Messages
**Throughout all testing, verify:**
- [ ] Success toasts show **exact backend message**, not frontend-generated messages
- [ ] Error toasts show **exact backend error message**
- [ ] Example backend error response: `{ "success": false, "error": { "code": "USER_001", "message": "Email already exists" } }`
- [ ] Toast should display: `"Email already exists"` (not "Failed to create user")
- [ ] Field errors from backend appear on respective form fields

### 7.6 Permission Boundary Testing
For each role, try accessing routes/actions they shouldn't have:

**HR Officer trying to approve payroll:**
- [ ] Log in as hr_officer
- [ ] Navigate to pay run detail → no Approve/Reject buttons

**Finance Manager trying to approve payroll:**
- [ ] Log in as finance_manager
- [ ] Navigate to pay run in "In Review" status → no Approve/Reject buttons
- [ ] This is correct behavior (see Part 1 gotcha)

**Payroll Officer trying to approve:**
- [ ] Log in as payroll_officer
- [ ] Navigate to pay run in "In Review" status → no Approve/Reject buttons
- [ ] Only payroll_manager can approve

**Employee trying to access /employees:**
- [ ] Log in as employee_self_service
- [ ] Try to navigate to `/employees` (manually type URL)
- [ ] Should redirect or show "Access Denied"

**Read-only user trying to create:**
- [ ] Log in as `read_only` role user
- [ ] All "Add"/"Create"/"Edit" buttons hidden
- [ ] Trying to POST via browser console should return 403

---

## PART 8: CROSS-ROLE FEATURES

### 8.1 My Profile (All Roles)
**Test with each role:**
- [ ] Platform Admin → `/my-profile` calls `GET/PATCH /api/platform/users/me`
- [ ] Tenant Admin → `/my-profile` calls `GET/PATCH /api/v1/users/me`
- [ ] HR Manager → same as tenant admin
- [ ] Payroll Manager → same as tenant admin
- [ ] Finance Manager → same as tenant admin
- [ ] Employee → same as tenant admin
- [ ] All roles can change their own password
- [ ] All roles see their own name/email

### 8.2 Logout (All Roles)
- [ ] Click topbar dropdown → "Logout"
- [ ] Network tab: `POST /api/v1/auth/logout` OR `POST /api/platform/auth/logout`
- [ ] Redirects to login page (tenant) or platform-login (platform admin)
- [ ] Session cleared from localStorage
- [ ] Cannot access protected routes without logging in again

---

## FINAL CHECKLIST: API ENDPOINT COVERAGE

Go through this list and mark each endpoint that was actually called during testing:

### Platform Admin Endpoints
- [ ] `POST /api/platform/auth/login`
- [ ] `GET /api/platform/users/me`
- [ ] `PATCH /api/platform/users/me/password`
- [ ] `GET /api/platform/tenants`
- [ ] `GET /api/platform/tenants/:id`
- [ ] `POST /api/platform/tenants`
- [ ] `PATCH /api/platform/tenants/:id/suspend`
- [ ] `PATCH /api/platform/tenants/:id/activate`
- [ ] `POST /api/platform/tenants/:id/users`
- [ ] `GET /api/platform/users`
- [ ] `POST /api/platform/users`
- [ ] `PATCH /api/platform/users/:id/disable`
- [ ] `PATCH /api/platform/users/:id/enable`
- [ ] `GET /api/platform/tax/jurisdictions`
- [ ] `GET /api/platform/tax/rules`
- [ ] `GET /api/platform/tax/versions`
- [ ] `GET /api/platform/tax/rules/:code/versions`
- [ ] `POST /api/platform/tax/rules`
- [ ] `POST /api/platform/tax/versions`
- [ ] `PATCH /api/platform/tax/versions/:code/activate`
- [ ] `PATCH /api/platform/tax/versions/:code/deactivate`

### Tenant Auth Endpoints
- [ ] `POST /api/v1/auth/login`
- [ ] `GET /api/v1/auth/me`
- [ ] `POST /api/v1/auth/logout`
- [ ] `POST /api/v1/auth/refresh`

### User Management Endpoints
- [ ] `GET /api/v1/users`
- [ ] `GET /api/v1/users/me`
- [ ] `POST /api/v1/users`
- [ ] `PATCH /api/v1/users/:id`
- [ ] `PATCH /api/v1/users/:id/disable`
- [ ] `PATCH /api/v1/users/:id/enable`
- [ ] `PATCH /api/v1/users/:id/reset-password`
- [ ] `PATCH /api/v1/users/me/password`

### Legal Entity Endpoints
- [ ] `GET /api/v1/legal-entities`
- [ ] `GET /api/v1/legal-entities/:id`
- [ ] `POST /api/v1/legal-entities`
- [ ] `PATCH /api/v1/legal-entities/:id`
- [ ] `PATCH /api/v1/legal-entities/:id/deactivate`

### Worker Endpoints
- [ ] `GET /api/v1/workers`
- [ ] `GET /api/v1/workers/:id`
- [ ] `POST /api/v1/workers`
- [ ] `PATCH /api/v1/workers/:id`
- [ ] `PATCH /api/v1/workers/:id/terminate`
- [ ] `GET /api/v1/workers/:id/payslips`

### Compensation Endpoints
- [ ] `GET /api/v1/compensation/worker/:workerId`
- [ ] `GET /api/v1/compensation/worker/:workerId/active`
- [ ] `POST /api/v1/compensation`
- [ ] `GET /api/v1/compensation/:id`

### Pay Element Endpoints
- [ ] `GET /api/v1/pay-elements`
- [ ] `POST /api/v1/pay-elements`
- [ ] `PATCH /api/v1/pay-elements/:id`
- [ ] `GET /api/v1/workers/:workerId/pay-elements`
- [ ] `POST /api/v1/workers/:workerId/pay-elements`
- [ ] `PATCH /api/v1/workers/:workerId/pay-elements/:id`
- [ ] `PATCH /api/v1/workers/:workerId/pay-elements/:id/unassign`

### Payroll Run Endpoints
- [ ] `GET /api/v1/payroll/runs`
- [ ] `GET /api/v1/payroll/runs/:id`
- [ ] `POST /api/v1/payroll/runs`
- [ ] `PATCH /api/v1/payroll/runs/:id/calculate`
- [ ] `PATCH /api/v1/payroll/runs/:id/submit`
- [ ] `PATCH /api/v1/payroll/runs/:id/approve`
- [ ] `PATCH /api/v1/payroll/runs/:id/reject`
- [ ] `PATCH /api/v1/payroll/runs/:id/cancel`
- [ ] `PATCH /api/v1/payroll/runs/:id/reverse`
- [ ] `GET /api/v1/payroll/runs/:id/payslips`
- [ ] `GET /api/v1/payroll/runs/:runId/payslips/:payslipId`
- [ ] `POST /api/v1/payroll/runs/:runId/payslips/:payslipId/pdf`

### Disbursement Endpoints
- [ ] `GET /api/v1/payroll/runs/:runId/disbursement`
- [ ] `POST /api/v1/payroll/runs/:runId/disbursement`
- [ ] `POST /api/v1/payroll/runs/:runId/disbursement/:batchId/approve`
- [ ] `POST /api/v1/payroll/runs/:runId/disbursement/:batchId/reject`
- [ ] `POST /api/v1/payroll/runs/:runId/disbursement/:batchId/execute`
- [ ] `POST /api/v1/payroll/runs/:runId/disbursement/:batchId/retry`
- [ ] `POST /api/v1/payroll/runs/:runId/disbursement/:batchId/cancel`
- [ ] `GET /api/v1/payroll/runs/:runId/disbursement/:batchId/bulk-file?format=csv`

### Tax Endpoints (Tenant - Read Only)
- [ ] `GET /api/v1/tax/jurisdictions`
- [ ] `GET /api/v1/tax/rules`
- [ ] `GET /api/v1/tax/rules/:code/versions`
- [ ] `GET /api/v1/tax/versions/:code`

### Notification Endpoints
- [ ] `GET /api/v1/notifications`
- [ ] `PATCH /api/v1/notifications/:id/read`
- [ ] `PATCH /api/v1/notifications/read-all`

### Audit Endpoints
- [ ] `GET /api/v1/audit-logs`

---

## SUMMARY


After completing this checklist, you should have:
1. ✅ Verified all platform admin functions work end-to-end
2. ✅ Verified all tenant admin functions work end-to-end
3. ✅ Verified HR, Payroll, and Finance manager flows
4. ✅ Verified employee self-service portal (with workerId linking fix)
5. ✅ Confirmed all API endpoints return exact backend messages in toasts
6. ✅ Confirmed role-based access control is working correctly
7. ✅ Identified any gaps or missing functionality

**Known Issues to Track:**
- [ ] Employee self-service users need manual `workerId` linking in database
- [ ] No admin-issued password reset for platform users (only self-service)
- [ ] Assignments tab is permanently empty (no backend support)
- [ ] Finance Manager cannot approve payroll (by design, but commonly misunderstood)

**Suggested Backend Enhancement:**
Allow `workerId` in `POST /api/v1/users` request body to link employee_self_service users to workers during creation, eliminating the need for manual database updates.
