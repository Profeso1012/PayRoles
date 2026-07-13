# API Integration Layer

This directory contains the API client infrastructure that enables seamless switching between mock (MSW) and real backend APIs.

## Overview

The PayRoles frontend was initially built with Mock Service Worker (MSW) handlers that simulate backend responses. As we integrate with the real e_payroll NestJS backend, this layer provides:

1. **Endpoint Management**: Centralized API endpoint definitions
2. **Data Transformation**: Convert between mock and backend data formats
3. **Token Management**: Handle JWT access/refresh token flow
4. **Type Safety**: TypeScript types for all API contracts

## Files

### `adapter.ts`
Central configuration and endpoint definitions.

**Key Exports**:
- `USE_REAL_API`: Boolean flag (from env var)
- `API_BASE`: Base API URL
- `API_VERSION`: Version prefix (`/v1` for backend, empty for mock)
- `ENDPOINTS`: Object with all API endpoints

**Usage**:
```typescript
import { ENDPOINTS } from '@/lib/api/adapter';

// Automatically uses correct endpoint based on USE_REAL_API
const workers = await apiClient(ENDPOINTS.WORKERS.LIST);
```

### `transforms.ts`
Data transformation utilities for request/response mapping.

**Key Functions**:

#### Pagination
```typescript
transformPaginatedResponse<T>(data, meta): MockPaginationResponse<T>
```
Converts backend pagination (array + meta) to mock format (nested object).

#### Monetary Amounts
```typescript
minorToMajor(minorUnits: string, currency?: string): number
majorToMinor(majorUnits: number): string
```
Convert between backend minor units (kobo) and display amounts (naira).

Example:
- Backend: `"50000000"` (string) = ₦500,000.00
- Frontend: `500000` (number)

#### Status Mapping
```typescript
mapPayrollStatus(status: string, direction: 'toBackend' | 'toFrontend'): string
mapWorkerStatus(status: string, direction: 'toBackend' | 'toFrontend'): string
```

Maps between mock and backend status values:
- Mock: `'in_review'` ↔ Backend: `'PENDING_APPROVAL'`
- Mock: `'paid'` ↔ Backend: `'COMPLETED'`

#### Field Mapping
```typescript
mapWorkerFields<T>(data: T, direction: 'toBackend' | 'toFrontend'): any
mapPayrollRunFields<T>(data: T, direction: 'toBackend' | 'toFrontend'): any
```

Handles field name differences:
- `nationalId` ↔ `nationalIdEncrypted`
- `totalGross` ↔ `totalGrossMinor`

### `../api.ts`
Core API client with authentication and error handling.

**Key Features**:

1. **Automatic Token Refresh**
   - Detects 401 responses
   - Attempts token refresh
   - Retries original request
   - Falls back to logout if refresh fails

2. **Response Envelope Extraction**
   - Backend: `{ success, data, meta, traceId, correlationId }`
   - Returns only `data` to caller

3. **Error Handling**
   - Throws `ApiError` with status code and message
   - Extracts error from backend format

**Usage**:
```typescript
import { apiClient } from '@/lib/api';

// GET request
const user = await apiClient<AuthUser>('/auth/me');

// POST request
const worker = await apiClient<Worker>('/workers', {
  method: 'POST',
  body: JSON.stringify({ firstName: 'John', lastName: 'Doe' }),
});
```

## Environment Variables

### Development (`.env.development`)
```env
# Use mock API (MSW)
VITE_USE_REAL_API=false
VITE_API_URL=/api

# OR use real backend
VITE_USE_REAL_API=true
VITE_API_URL=http://localhost:3000/api
```

### Production (`.env.production`)
```env
VITE_USE_REAL_API=true
VITE_API_URL=https://api.payrole.com/api
```

## Migration Guide

### Phase 1: Enable Real API (Current)
```env
VITE_USE_REAL_API=true
VITE_API_URL=http://localhost:3000/api
```

MSW will be disabled, all requests go to real backend.

### Phase 2: Update Components
As you update each page/component:

1. **Import from adapter**:
   ```typescript
   import { ENDPOINTS } from '@/lib/api/adapter';
   ```

2. **Use typed endpoints**:
   ```typescript
   // OLD
   const url = '/employees';
   
   // NEW
   const url = ENDPOINTS.WORKERS.LIST;
   ```

3. **Handle response transformations**:
   ```typescript
   import { transformPaginatedResponse, mapPayrollRunFields } from '@/lib/api/transforms';
   
   const response = await apiClient(ENDPOINTS.PAYROLL.RUNS.LIST);
   const transformed = transformPaginatedResponse(response.data, response.meta);
   ```

### Phase 3: Update Auth Flow
See Phase 2 implementation docs for detailed auth updates.

## API Differences

### Pagination

**Mock**:
```json
{
  "success": true,
  "data": {
    "employees": [...],
    "total": 100,
    "page": 1,
    "pageSize": 20
  }
}
```

**Backend**:
```json
{
  "success": true,
  "data": [...],
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "totalPages": 5
  },
  "traceId": "uuid",
  "correlationId": "uuid"
}
```

### Authentication

**Mock Login**:
```typescript
POST /api/auth/login
{ email, password }
→ { token, user }
```

**Backend Login**:
```typescript
POST /api/v1/auth/login
{ email, password, tenantSlug }  // ← NEW required field
→ { accessToken, refreshToken, expiresIn, tokenType }

// User profile requires separate call
GET /api/v1/auth/me
→ { user }
```

### Workers/Employees

**Resource Name Change**:
- Mock: `/api/employees`
- Backend: `/api/v1/workers`

**Query Params**:
- Mock: `?page=1&pageSize=20&departmentId=uuid`
- Backend: `?page=1&limit=20&legalEntityId=uuid&sortBy=createdAt&sortDir=DESC`

### Payroll Runs

**Path Change**:
- Mock: `/api/pay-runs`
- Backend: `/api/v1/payroll/runs`

**Status Values**:
- Mock: `'draft'`, `'in_review'`, `'paid'`
- Backend: `'DRAFT'`, `'PENDING_APPROVAL'`, `'COMPLETED'`

**Amount Format**:
- Mock: `totalGross: 500000` (number)
- Backend: `totalGrossMinor: "50000000"` (string, minor units)

## Token Refresh Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. Request with expired token                                   │
│    GET /api/v1/workers                                          │
│    Authorization: Bearer <expired_token>                        │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. Backend returns 401 Unauthorized                             │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. Frontend detects 401, calls refresh endpoint                 │
│    POST /api/v1/auth/refresh                                    │
│    { refreshToken }                                             │
└────────────────────────┬────────────────────────────────────────┘
                         │
                    ┌────┴─────┐
                    │          │
                    ▼          ▼
         ┌──────────────┐  ┌──────────────┐
         │  Success     │  │  Failure     │
         └──────┬───────┘  └──────┬───────┘
                │                  │
                ▼                  ▼
    ┌──────────────────────┐  ┌──────────────────────┐
    │ 4a. Update tokens in │  │ 4b. Clear session    │
    │     store            │  │     Redirect /login  │
    └──────┬───────────────┘  └──────────────────────┘
           │
           ▼
    ┌──────────────────────────────────────────────────────────┐
    │ 5. Retry original request with new token                 │
    │    GET /api/v1/workers                                   │
    │    Authorization: Bearer <new_token>                     │
    └──────────────────────────────────────────────────────────┘
```

## Testing

### Unit Tests
```typescript
import { minorToMajor, majorToMinor, mapPayrollStatus } from './transforms';

describe('Amount Conversion', () => {
  it('converts minor to major units', () => {
    expect(minorToMajor('50000000')).toBe(500000);
  });
  
  it('converts major to minor units', () => {
    expect(majorToMinor(500000)).toBe('50000000');
  });
});
```

### Integration Tests
```typescript
import { apiClient } from '@/lib/api';
import { ENDPOINTS } from '@/lib/api/adapter';

describe('API Client', () => {
  it('handles token refresh on 401', async () => {
    // Mock 401 response, then successful refresh, then successful retry
    const result = await apiClient(ENDPOINTS.WORKERS.LIST);
    expect(result).toBeDefined();
  });
});
```

## Troubleshooting

### "Session expired" immediately after login
- Check that `expiresIn` is being parsed correctly
- Verify token is being stored: `localStorage.getItem('payrole_auth')`
- Ensure backend is returning proper token format

### Amounts showing incorrect values
- Backend uses minor units (kobo): multiply by 100 to get naira
- Use `minorToMajor()` when displaying
- Use `majorToMinor()` when sending to backend

### 404 errors after enabling real API
- Check endpoint paths in `adapter.ts`
- Verify API_VERSION is correct (`/v1`)
- Ensure backend is running on correct port

### Type errors after migration
- Update imports to use adapter types
- Check that response structure matches expectations
- Use `extractResponseData()` for proper envelope handling

## Support

For questions or issues:
1. Check `FRONTEND_BACKEND_INTEGRATION_AUDIT.md`
2. Review `INTEGRATION_IMPLEMENTATION_PLAN.md`
3. Backend API docs: `http://localhost:3000/api/docs` (Swagger)
