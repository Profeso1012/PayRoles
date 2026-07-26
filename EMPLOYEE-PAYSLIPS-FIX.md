# Employee Self-Service Payslips Issue & Solution

## Problem Description

When logging in as an `employee_self_service` user and navigating to `/my-payslips`, the page shows:
**"Something went wrong. Try again."**

## Root Cause

The `/my-payslips` page requires a `workerId` to fetch payslips:

```typescript
// From MyPayslips.tsx line 29
const workerId = useAuthStore((s) => s.user?.workerId);

// From MyPayslips.tsx line 32-42
const { data: payslips, isLoading, isError, refetch } = useQuery<MyPayslip[]>({
  queryKey: ['my-payslips', workerId],
  queryFn: async () => {
    if (!workerId) throw new Error('No worker record linked to this account');
    // ... fetch payslips using workerId
  },
  enabled: !!workerId,
});
```

**The issue:** When a User is created with role `employee_self_service` via `POST /api/v1/users`, the `workerId` field in the database is `NULL` by default, unless explicitly provided during creation.

## Why This Happens

1. The backend's `User` entity has an optional `workerId` column
2. The `POST /api/v1/users` endpoint accepts a `workerId` in the request body (see `CreateUserDto`)
3. **However**, the frontend's "Add User" form doesn't include a `workerId` field
4. When a User is created without `workerId`, it defaults to `NULL` in the database
5. During login, the JWT payload includes `workerId` from the User record (which is `NULL`)
6. The frontend receives `workerId: null` in `/auth/me` response
7. The MyPayslips page cannot fetch payslips without a valid `workerId`

## Current Workaround (Manual Database Update)

### Step 1: Create a Worker First
```bash
POST /api/v1/workers
{
  "employeeNumber": "ZL-0001",
  "firstName": "Chidi",
  "lastName": "Okeke",
  "email": "chidi@zenithlogistics.com",
  ...
}
# Response includes: { "id": "550e8400-e29b-41d4-a716-446655440000", ... }
```

### Step 2: Create the Employee User
```bash
POST /api/v1/users
{
  "email": "chidi@zenithlogistics.com",
  "password": "TempPass@123",
  "firstName": "Chidi",
  "lastName": "Okeke",
  "role": "employee_self_service"
}
```

### Step 3: Link User to Worker (Database)
```sql
UPDATE users
SET "workerId" = '550e8400-e29b-41d4-a716-446655440000'
WHERE email = 'chidi@zenithlogistics.com';
```

### Step 4: Verify
1. Log in as the employee user
2. Decode the JWT token (use jwt.io) - should now contain `"workerId": "550e8400..."`
3. Navigate to `/my-payslips` - should work without errors

## Proper Solution (Frontend Enhancement)

### Option A: Modify "Add User" Form for Employee Role

When adding a user with `employee_self_service` role, show an additional field to select the Worker:

```typescript
// In UsersAndRoles.tsx modal
{selectedRole === 'employee_self_service' && (
  <div>
    <label>Link to Worker</label>
    <select name="workerId" required>
      <option value="">Select worker...</option>
      {workers.map(w => (
        <option key={w.id} value={w.id}>
          {w.firstName} {w.lastName} ({w.employeeNumber})
        </option>
      ))}
    </select>
    <p className="text-xs text-gray-500">
      This user will be able to view payslips for the selected worker.
    </p>
  </div>
)}
```

Then include `workerId` in the POST body:
```typescript
const body = {
  email,
  password,
  firstName,
  lastName,
  role,
  ...(role === 'employee_self_service' && workerId ? { workerId } : {})
};
```

### Option B: Auto-Link by Email Match

When creating an `employee_self_service` user, automatically find a Worker with matching email and link them:

**Backend Enhancement:**
```typescript
// In user.service.ts
async createUser(tenantId: string, dto: CreateUserDto) {
  // If employee_self_service and no workerId provided, try to find matching worker
  if (dto.role === Role.EMPLOYEE_SELF_SERVICE && !dto.workerId) {
    const worker = await this.workerRepository.findOne({
      where: { tenantId, email: dto.email, status: Status.ACTIVE }
    });
    if (worker) {
      dto.workerId = worker.id;
    }
  }
  
  // Continue with user creation...
}
```

### Option C: Just-in-Time Linking

Allow the system to find and link the worker when the employee first accesses `/my-payslips`:

**Frontend Enhancement:**
```typescript
// In MyPayslips.tsx
const { data: payslips, isLoading, isError, refetch } = useQuery({
  queryKey: ['my-payslips', workerId, userEmail],
  queryFn: async () => {
    let actualWorkerId = workerId;
    
    // If no workerId, try to find by email match
    if (!actualWorkerId) {
      const { data: workers } = await apiClient('/workers?email=' + userEmail);
      if (workers.length > 0) {
        actualWorkerId = workers[0].id;
        // Optionally: call backend to persist this link
      }
    }
    
    if (!actualWorkerId) {
      throw new Error('No worker record found for your account. Please contact HR.');
    }
    
    // Fetch payslips...
  }
});
```

## Recommended Approach

**Option A** is the most explicit and prevents mismatches. It requires:
1. Workers to be created first (which they should be anyway - HR workflow)
2. Explicit linking during user creation (clear intent, no surprises)
3. Minimal backend changes (endpoint already supports `workerId` in body)

**Implementation Steps:**
1. Add `workerId` dropdown to the "Add User" form (only visible for `employee_self_service` role)
2. Fetch available workers: `GET /api/v1/workers?status=active`
3. Include `workerId` in `POST /api/v1/users` body
4. Show validation error if employee role is selected but no worker is linked

## Testing the Fix

After implementing the fix:

1. **Create a Worker** (via HR flow)
2. **Create an Employee User** and link to that Worker
3. **Log in as the employee**
4. Check browser DevTools → Application → LocalStorage → verify JWT contains `workerId`
5. Navigate to `/my-payslips` → should load without errors
6. If worker has no payslips yet, should show "No payslips found" (not an error)
7. After a pay run is completed with that worker, payslips should appear

## Related Files

- **Frontend:**
  - `src/pages/employee-portal/MyPayslips.tsx` - The failing page
  - `src/pages/settings/UsersAndRoles.tsx` - Where users are created
  - `src/pages/auth/Login.tsx` - Where `workerId` is extracted from `/auth/me`
  - `src/store/authStore.ts` - Where user session is stored

- **Backend:**
  - `src/modules/users/dto/create-user.dto.ts` - Accepts `workerId` (optional)
  - `src/modules/users/entities/user.entity.ts` - Has `workerId` column (nullable)
  - `src/modules/auth/interfaces/auth-user.interface.ts` - JWT payload includes `workerId`
  - `src/modules/auth/auth.service.ts` - Generates JWT with `workerId` from User entity
