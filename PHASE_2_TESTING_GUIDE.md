# Phase 2 Testing Guide

## Quick Setup

### 1. Start Backend (Required for Real API Testing)

```bash
cd c:\Users\win11\Documents\PayRole-dev\e_payroll

# Start infrastructure
docker-compose up -d

# Install dependencies (if not done)
npm install

# Run migrations
npx typeorm-ts-node-commonjs migration:run -d src/database/data-source.ts

# Seed platform admin (run once)
npm run seed:platform-admin -- admin@platform.internal "PlatformPass123!"

# Start backend
npm run start:dev
```

Backend will be available at: `http://localhost:3000`  
API Docs: `http://localhost:3000/api/docs`

### 2. Configure Frontend for Real API

```bash
cd c:\Users\win11\Documents\PayRole-dev\PayRoles\apps\web

# Create or edit .env.local
echo VITE_USE_REAL_API=true > .env.local
echo VITE_API_URL=http://localhost:3000/api >> .env.local
echo VITE_APP_ENV=production >> .env.local

# Install dependencies (if not done)
cd ../.. && npm install

# Start frontend
npm run dev
```

Frontend will be available at: `http://localhost:5173`

---

## Test Scenarios

### Scenario 1: First-Time Tenant Creation & Login

**Goal**: Create a tenant and user, then login

#### Step 1.1: Create Tenant (via Platform Admin)

1. Navigate to: `http://localhost:5173/platform-login`
2. Login with:
   - Email: `admin@platform.internal`
   - Password: `PlatformPass123!`
3. Navigate to Platform Admin dashboard
4. Create new tenant:
   ```json
   {
     "name": "Test Company Ltd",
     "slug": "test-company",
     "contactEmail": "admin@testcompany.com",
     "timezone": "Africa/Lagos",
     "currency": "NGN"
   }
   ```
5. Note the tenant ID returned

#### Step 1.2: Create Tenant Admin User

Option A: Via Backend Seed Script
```bash
cd e_payroll
npm run seed:super-admin -- admin@testcompany.com "TestPass123!"
```

Option B: Via API (requires platform admin token or existing tenant admin)
```bash
POST http://localhost:3000/api/v1/users
Authorization: Bearer <token>
Content-Type: application/json

{
  "email": "admin@testcompany.com",
  "password": "TestPass123!",
  "firstName": "Test",
  "lastName": "Admin",
  "role": "TENANT_ADMIN",
  "targetTenantId": "<tenant-id-from-step-1>"
}
```

#### Step 1.3: Test Tenant Login

1. Navigate to: `http://localhost:5173/login`
2. Enter email: `admin@testcompany.com` → **Next**
3. Enter company code: `test-company` → **Next**
4. Enter password: `TestPass123!` → **Sign in**

**Expected Result**:
- ✅ Redirected to `/dashboard`
- ✅ See HR Dashboard (or appropriate role-based dashboard)
- ✅ User profile in top-right corner
- ✅ No console errors

**Verify in DevTools**:
```javascript
// Check localStorage
const auth = JSON.parse(localStorage.getItem('payrole_auth'));
console.log('Access Token:', auth.state.accessToken);
console.log('Refresh Token:', auth.state.refreshToken);
console.log('User:', auth.state.user);

// Should see:
// - accessToken: "eyJhbGc..."
// - refreshToken: "eyJhbGc..."
// - user: { id, email, role, tenantId, ... }
```

---

### Scenario 2: Platform Admin Login

**Goal**: Login as platform administrator

1. Navigate to: `http://localhost:5173/platform-login`
2. Verify warning banner shows (distinguishing from regular login)
3. Enter email: `admin@platform.internal` → **Next**
4. Enter password: `PlatformPass123!` → **Sign in**

**Expected Result**:
- ✅ Redirected to `/admin`
- ✅ See Platform Admin dashboard
- ✅ Can view tenants list
- ✅ Cannot access tenant routes (e.g., `/dashboard` should redirect or show error)

**Verify in DevTools**:
```javascript
const auth = JSON.parse(localStorage.getItem('payrole_auth'));
console.log('User Role:', auth.state.user.role); // Should be 'PLATFORM_ADMIN'
console.log('Tenant ID:', auth.state.user.tenantId); // Should be null
```

---

### Scenario 3: Error Handling

#### Test 3.1: Invalid Email
1. Navigate to `/login`
2. Enter invalid email: `notanemail` → **Next**
3. **Expected**: Error message "Please enter your email"

#### Test 3.2: Invalid Company Code
1. Navigate to `/login`
2. Enter email → Next
3. Enter non-existent company code: `fake-company-xyz` → **Next**
4. Enter password → **Sign in**
5. **Expected**: Error message from backend about invalid tenant

#### Test 3.3: Invalid Password
1. Navigate to `/login`
2. Enter email → Next
3. Enter company code → Next
4. Enter wrong password: `wrongpassword` → **Sign in**
5. **Expected**: Error message "Invalid credentials or company code"

#### Test 3.4: Backend Offline
1. Stop backend: `Ctrl+C` in e_payroll terminal
2. Try to login
3. **Expected**: Error message (network error or timeout)
4. Restart backend and verify login works again

---

### Scenario 4: Token Refresh (from Phase 1)

**Goal**: Verify automatic token refresh on 401

#### Setup: Manually Expire Token
```javascript
// In browser console after logging in
const auth = JSON.parse(localStorage.getItem('payrole_auth'));
auth.state.tokenExpiresAt = Date.now() - 1000; // Expired 1 second ago
localStorage.setItem('payrole_auth', JSON.stringify(auth));
```

#### Test:
1. Make any API call (e.g., navigate to /employees)
2. **Expected**: 
   - Request fails with 401
   - Frontend automatically calls `/auth/refresh`
   - Gets new access token
   - Retries original request
   - Page loads successfully
3. **Check Network Tab**: Should see:
   - First request: 401
   - `/auth/refresh`: 200
   - Retry original request: 200

---

### Scenario 5: Session Persistence

**Goal**: Verify login persists across page reloads

1. Login successfully (any user)
2. Hard refresh page (`Ctrl+F5`)
3. **Expected**: Still logged in, no redirect to login
4. Close browser tab
5. Open new tab to `http://localhost:5173/dashboard`
6. **Expected**: Still logged in
7. Logout
8. **Expected**: Redirected to `/login`, localStorage cleared

---

### Scenario 6: Multi-Step Navigation

**Goal**: Verify back buttons work correctly

#### Test 6.1: Edit Email
1. Navigate to `/login`
2. Enter email → **Next**
3. Click back arrow
4. **Expected**: Return to email step, email value preserved
5. Edit email
6. **Expected**: Can proceed to company code step again

#### Test 6.2: Edit Company Code
1. Enter email → Next
2. Enter company code → **Next**
3. Click back arrow
4. **Expected**: Return to company code step, value preserved
5. Edit company code
6. **Expected**: Can proceed to password step again

---

### Scenario 7: Role-Based Routing

**Goal**: Verify users route to correct dashboard

#### Test Different Roles:

**HR Manager**:
- Login as HR Manager
- **Expected**: Redirect to `/dashboard` showing HR Dashboard

**Payroll Manager**:
- Login as Payroll Manager
- **Expected**: Redirect to `/dashboard` showing Payroll Dashboard

**Finance Director**:
- Login as Finance Director
- **Expected**: Redirect to `/dashboard` showing Finance Dashboard

**Employee**:
- Login as Employee
- **Expected**: Redirect to `/my-payslips`

**Platform Admin**:
- Login as Platform Admin
- **Expected**: Redirect to `/admin`

---

## Mock API Testing (Optional)

If you want to test with mock data (not real backend):

### Configure for Mock API

```bash
# Edit .env.local
VITE_USE_REAL_API=false
VITE_API_URL=/api
VITE_APP_ENV=development
```

### Update Mock Handlers

The mock handlers need to be updated to support tenant slug:

**File**: `apps/web/src/mocks/handlers/auth.handlers.ts`

```typescript
// Update login handler to require tenantSlug
http.post('/api/auth/login', async ({ request }) => {
  const body = await request.json() as { 
    email: string; 
    password: string;
    tenantSlug: string;  // Add this
  };
  
  // Validate tenant slug
  if (!body.tenantSlug) {
    return HttpResponse.json(
      { success: false, error: { message: 'Company code is required' } },
      { status: 400 }
    );
  }
  
  // Rest of existing logic...
}),
```

### Test with Mock Data

Use these credentials (from mock data):

**Platform Admin**:
- Email: `admin@payrole.com`
- Company Code: N/A (use platform login)
- Password: `password123`

**Company Super Admin**:
- Email: `admin@dangote.com`
- Company Code: `dangote` (any slug will work with mocks)
- Password: `password123`

**HR Manager**:
- Email: `hr@dangote.com`
- Company Code: `dangote`
- Password: `password123`

**Payroll Manager**:
- Email: `payroll@dangote.com`
- Company Code: `dangote`
- Password: `password123`

**Employee**:
- Email: `emp001@dangote.com`
- Company Code: `dangote`
- Password: `password123`

---

## Common Issues & Solutions

### Issue: CORS Error

```
Access to fetch at 'http://localhost:3000/api/v1/auth/login' from origin 'http://localhost:5173' 
has been blocked by CORS policy
```

**Solution**:
1. Check backend CORS configuration in `e_payroll/src/main.ts`:
```typescript
app.enableCors({
  origin: ['http://localhost:5173'],  // Add frontend URL
  credentials: true,
});
```
2. Restart backend

### Issue: 404 on Login

```
POST http://localhost:3000/api/v1/auth/login 404 (Not Found)
```

**Solution**:
1. Verify backend is running
2. Check API docs: `http://localhost:3000/api/docs`
3. Verify endpoint exists in Swagger
4. Check backend logs for errors

### Issue: Token Not Stored

Login succeeds but page doesn't redirect, or immediately logs out.

**Solution**:
1. Check browser console for errors
2. Verify `setSession` is being called:
```javascript
// In Login.tsx, add console.log
setSession({ accessToken, refreshToken, expiresIn });
console.log('Session set:', useAuthStore.getState());
```
3. Check localStorage is not blocked (private browsing mode)
4. Verify Zustand persist is working

### Issue: Infinite Token Refresh Loop

Continuously sees `/auth/refresh` calls in network tab.

**Solution**:
1. Check token expiry parsing is correct
2. Verify `tokenExpiresAt` is set properly
3. Check for race conditions in refresh logic
4. Add logging to `apiClient` refresh logic

### Issue: Platform Admin Can Access Tenant Routes

Platform admin token should not work on tenant routes.

**Solution**:
1. Verify backend has JWT guard that checks for `isPlatform` flag
2. Check platform token structure in JWT debugger (`jwt.io`)
3. Verify `RoleGuard` component checks role correctly

---

## Performance Testing

### Load Time Metrics

**Expected Performance**:
- Login page load: < 1s
- Login API call: < 500ms
- `/auth/me` call: < 300ms
- Token refresh: < 200ms
- Total login flow: < 2s

**How to Measure**:
1. Open browser DevTools → Network tab
2. Clear cache and hard reload
3. Perform login flow
4. Check timing for each request

### Token Refresh Performance

Token refresh should be **transparent** to the user:
- No UI flickering
- No failed requests visible to user
- Original request completes successfully

---

## Checklist: Phase 2 Complete

Use this checklist to verify Phase 2 is fully working:

### Basic Functionality
- [ ] Can access login page at `/login`
- [ ] Can access platform login at `/platform-login`
- [ ] Email step validates input
- [ ] Company code step validates input (tenant login only)
- [ ] Password step shows/hides password
- [ ] Back buttons work on all steps

### Authentication
- [ ] Tenant login works with valid credentials
- [ ] Platform admin login works
- [ ] Login stores `accessToken` and `refreshToken`
- [ ] Login fetches user profile from `/auth/me`
- [ ] User object stored in auth store
- [ ] Session persists across page reloads

### Error Handling
- [ ] Shows error for invalid email
- [ ] Shows error for invalid company code
- [ ] Shows error for invalid password
- [ ] Shows error when backend is offline
- [ ] Errors are user-friendly

### Token Management
- [ ] Access token used in all API calls
- [ ] Token refresh works on 401
- [ ] Failed refresh redirects to login
- [ ] Token expiry tracked correctly

### Routing
- [ ] HR Manager → HR Dashboard
- [ ] Payroll Manager → Payroll Dashboard
- [ ] Finance Director → Finance Dashboard
- [ ] Employee → My Payslips
- [ ] Platform Admin → Platform Admin Dashboard

### Security
- [ ] Platform tokens don't work on tenant APIs
- [ ] Tenant tokens don't work on platform APIs
- [ ] Logout clears all tokens
- [ ] Tokens not visible in URL

---

## Next Steps

Once all tests pass:

1. **Document any issues found** - Create bug reports for Phase 2 issues
2. **Proceed to Phase 3** - Workers/Employees module integration
3. **Update team** - Share test results and migration notes

---

**Testing Status**: Ready for QA  
**Phase 2 Status**: ✅ Complete  
**Next Phase**: Phase 3 - Workers/Employees Module
