# Backend Design Constraints & Missing Frontend Features

This document clarifies intentional backend design choices vs missing frontend implementations.

---

## 1. PLATFORM USER MANAGEMENT

### What the Backend Provides

**Available Endpoints:**
```
GET    /api/platform/users              - List all platform users
GET    /api/platform/users/:id          - Get one platform user
GET    /api/platform/users/me           - Get current user profile
POST   /api/platform/users              - Create platform user
PATCH  /api/platform/users/:id          - Update platform user (name, role)
PATCH  /api/platform/users/me/password  - Change own password
PATCH  /api/platform/users/:id/disable  - Disable user (super_admin only)
PATCH  /api/platform/users/:id/enable   - Re-enable user (super_admin only)
```

**What Can Be Updated:**
```typescript
// UpdatePlatformUserDto allows changing:
{
  firstName?: string;      // ✅ Can edit
  lastName?: string;       // ✅ Can edit  
  platformRole?: PlatformRole;  // ✅ Can edit (change role!)
}
```

### Current Frontend Status

✅ **Implemented:**
- List platform users (`/admin/users`)
- Create platform user (with role selection)
- Disable/Enable users
- View user details
- Change own password (`/my-profile`)

❌ **Missing (but backend supports it):**
- **Edit platform user** button/modal
  - Currently no way to change firstName, lastName, or platformRole via UI
  - Backend supports: `PATCH /api/platform/users/:id`
  - Should show an "Edit" button on each user row (except disabled users)
  - Allow changing: Name, Role (super_admin ↔ platform_admin ↔ support_engineer, etc.)

❌ **Intentionally Not Supported (backend design):**
- **DELETE platform user** - No delete endpoint exists
  - Design choice: Use `disable` instead of delete for audit trail
  - Disabled users cannot log in but remain in the system

---

## 2. TAX RULES & JURISDICTIONS

### What the Backend Provides

**Jurisdiction Endpoints:**
```
GET /api/platform/tax/jurisdictions  - List all jurisdictions
```

**NO CREATE/UPDATE/DELETE for jurisdictions** - They are hardcoded seed data.

**Tax Rule Endpoints:**
```
GET  /api/platform/tax/rules                - List all rules
GET  /api/platform/tax/rules/:code/versions - List versions for a rule
POST /api/platform/tax/rules                - Create new rule under existing jurisdiction
```

**NO UPDATE/DELETE for tax rules** - Once created, they're immutable.

**Tax Version Endpoints:**
```
GET   /api/platform/tax/versions                  - List all versions
GET   /api/platform/tax/versions/:code            - Get version detail
POST  /api/platform/tax/versions                  - Create new version
PATCH /api/platform/tax/versions/:code/activate   - Activate version
PATCH /api/platform/tax/versions/:code/deactivate - Deactivate version
```

**NO UPDATE/DELETE for tax versions** - Immutable by design.

### Current Frontend Status

✅ **Implemented:**
- List jurisdictions, rules, versions (`/admin/tax`)
- Create new tax rule
- Create new tax version
- Activate/Deactivate tax versions

❌ **Intentionally Not Supported (backend design):**
- **CREATE/EDIT/DELETE jurisdictions** - Not exposed by backend
  - Jurisdictions (Nigeria, UK, US, etc.) are **platform-level seed data**
  - Only one jurisdiction seeded: **Nigeria (NG)** with currency **NGN**
  - Adding new jurisdictions requires database migration, not UI
  
- **EDIT/DELETE tax rules** - Immutable by design
  - Once a tax rule is created (e.g., `NIGERIA_PIT`), it cannot be modified or deleted
  - To "change" a rule, create a new tax version with different bands/rates
  
- **EDIT/DELETE tax versions** - Immutable by design
  - Tax versions are immutable once created (audit/compliance requirement)
  - To "fix" a version, deactivate it and create a new one
  - Cannot delete versions - only deactivate

### Why Only Nigeria Shows Up

**By Design:** The backend migration seeds only ONE jurisdiction:

```sql
-- From migration 1783700000000-PayrollSnapshotAndTaxEngine.ts
INSERT INTO tax_jurisdictions (id, code, name, currency)
VALUES (uuid_generate_v4(), 'NG', 'Nigeria', 'NGN')
ON CONFLICT (code) DO NOTHING
```

**To add more jurisdictions, you need to:**
1. Create a new database migration
2. Insert jurisdiction records: `INSERT INTO tax_jurisdictions (code, name, currency) VALUES ('GB', 'United Kingdom', 'GBP');`
3. Run the migration
4. Then use the UI to create tax rules for that jurisdiction

**There is NO API endpoint** to create jurisdictions from the UI - it's infrastructure/platform config, not user-managed data.

---

## 3. TENANT USER MANAGEMENT

### What the Backend Provides

**Available Endpoints:**
```
GET    /api/v1/users                       - List tenant users
POST   /api/v1/users                       - Create user
PATCH  /api/v1/users/:id                   - Update user
PATCH  /api/v1/users/:id/disable           - Disable user
PATCH  /api/v1/users/:id/enable            - Enable user
PATCH  /api/v1/users/:id/reset-password    - Admin resets user password
PATCH  /api/v1/users/me/password           - User changes own password
```

**What Can Be Updated:**
```typescript
// UpdateUserDto allows changing:
{
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: Role;  // ✅ Can change role!
  phone?: string;
}
```

### Current Frontend Status

✅ **Implemented:**
- List users (`/settings/users`)
- Create user (with role selection)
- Disable/Enable users
- Reset user password (admin action)
- Change own password (`/my-profile`)

❌ **Missing (but backend supports it):**
- **Edit tenant user** button/modal
  - Currently no way to edit firstName, lastName, email, role, phone via UI
  - Backend fully supports: `PATCH /api/v1/users/:id`
  - Should show "Edit" button on each user row

❌ **Intentionally Not Supported (backend design):**
- **DELETE user** - No delete endpoint
  - Use `disable` instead for audit trail

---

## 4. OTHER ENTITIES WITH IMMUTABILITY

### Legal Entities
```
✅ CREATE - POST /api/v1/legal-entities
✅ UPDATE - PATCH /api/v1/legal-entities/:id
✅ DEACTIVATE - PATCH /api/v1/legal-entities/:id/deactivate
❌ DELETE - Not supported (use deactivate)
```
**Frontend status:** Fully implemented ✅

### Workers (Employees)
```
✅ CREATE - POST /api/v1/workers
✅ UPDATE - PATCH /api/v1/workers/:id
✅ TERMINATE - PATCH /api/v1/workers/:id/terminate
❌ DELETE - Not supported (use terminate)
```
**Frontend status:** Fully implemented ✅

### Pay Elements
```
✅ CREATE - POST /api/v1/pay-elements
✅ UPDATE - PATCH /api/v1/pay-elements/:id
❌ DELETE - Not supported (deactivate via status field)
```
**Frontend status:** Likely missing edit UI ⚠️

### Payroll Runs
```
✅ CREATE - POST /api/v1/payroll/runs
✅ CANCEL - PATCH /api/v1/payroll/runs/:id/cancel (draft/calculated only)
✅ REVERSE - PATCH /api/v1/payroll/runs/:id/reverse (approved runs)
❌ DELETE - Not supported
❌ EDIT - Not supported (immutable once calculated)
```
**Frontend status:** Fully implemented ✅

---

## 5. SUMMARY: INTENTIONAL GAPS VS MISSING FEATURES

### Intentional Backend Design (Don't Implement)

| Feature | Why Not Available |
|---|---|
| Delete platform users | Use disable for audit trail |
| Delete tenant users | Use disable for audit trail |
| Delete workers | Use terminate for audit trail |
| Create/Edit/Delete jurisdictions | Infrastructure config, not user data |
| Edit/Delete tax rules | Immutable for compliance |
| Edit/Delete tax versions | Immutable for compliance |
| Edit payroll runs | Immutable once calculated |
| Delete payroll runs | Use cancel/reverse, keep history |

### Missing Frontend Features (Should Implement)

| Feature | Backend Support | Frontend Status |
|---|---|---|
| Edit platform user (name, role) | ✅ `PATCH /platform/users/:id` | ❌ Missing |
| Edit tenant user (name, email, role, phone) | ✅ `PATCH /v1/users/:id` | ❌ Missing |
| Edit pay elements | ✅ `PATCH /v1/pay-elements/:id` | ⚠️ Needs verification |

---

## 6. RECOMMENDED FRONTEND ENHANCEMENTS

### High Priority

1. **Add "Edit" Button to Platform Users Page** (`/admin/users`)
   - Modal with: First Name, Last Name, Platform Role dropdown
   - API: `PATCH /api/platform/users/:id`
   - Guard: Only super_admin and platform_admin can edit

2. **Add "Edit" Button to Tenant Users Page** (`/settings/users`)
   - Modal with: First Name, Last Name, Email, Role dropdown, Phone
   - API: `PATCH /api/v1/users/:id`
   - Guard: Only tenant_admin and super_admin can edit
   - **Include workerId selector** when role is `employee_self_service` (fixes payslips issue!)

3. **Add "Edit" Button to Pay Elements Page** (`/payroll/pay-elements`)
   - Modal with: Name, Type, Formula/Tax Rule Code
   - API: `PATCH /api/v1/pay-elements/:id`
   - Note: Cannot edit `code` (immutable identifier)

### Low Priority (Nice to Have)

4. **Add Jurisdiction Info Banner on Tax Page**
   - "Jurisdictions are platform-level configuration. Only Nigeria (NG) is currently active. Contact DevOps to add new jurisdictions."
   
5. **Add Tooltips/Help Text**
   - Tax versions: "Tax versions are immutable. To change rates, deactivate this version and create a new one."
   - Users: "Users cannot be deleted. Disable a user to prevent login while preserving audit history."

---

## 7. WHY ONLY NIGERIA?

**Answer:** The backend was built with Nigeria as the **initial/pilot jurisdiction**. The tax engine is **designed to be multi-jurisdictional**, but only one jurisdiction was seeded in the migration.

**Evidence from migration:**
```typescript
// Only Nigeria is seeded
INSERT INTO tax_jurisdictions (id, code, name, currency)
VALUES (uuid_generate_v4(), 'NG', 'Nigeria', 'NGN')

// With one tax rule
INSERT INTO tax_rules (code, name, "jurisdictionId")
VALUES ('NIGERIA_PIT', 'Nigeria Personal Income Tax (PAYE)', ...)

// And one tax version
INSERT INTO tax_versions (code, "taxRuleId", name, effectiveDate)
VALUES ('NIGERIA_PIT_2026', ..., 'Nigeria PAYE — Nigeria Tax Act 2025', '2026-01-01')
```

**To add more jurisdictions:**
1. Create database migration:
```sql
INSERT INTO tax_jurisdictions (code, name, currency) 
VALUES 
  ('GB', 'United Kingdom', 'GBP'),
  ('US', 'United States', 'USD'),
  ('CA', 'Canada', 'CAD');
```

2. Then use the existing UI to create tax rules/versions for those jurisdictions

**This is NOT a frontend bug** - it's the current state of the platform database.
