# API Integration Layer

This directory contains the API client infrastructure for connecting to the e_payroll NestJS backend.

## Overview

The PayRoles frontend connects exclusively to the real e_payroll NestJS backend API. This layer provides:

1. **Endpoint Management**: Centralized API endpoint definitions
2. **Data Transformation**: Convert between backend and frontend data formats
3. **Token Management**: Handle JWT access/refresh token flow
4. **Type Safety**: TypeScript types for all API contracts

## Files

### `adapter.ts`
Central configuration and endpoint definitions.

**Key Exports**:
- `API_BASE`: Base API URL (from `VITE_API_URL` env var)
- `API_VERSION`: Version prefix (`/v1` for tenant endpoints)
- `PLATFORM_PREFIX`: Platform admin prefix (`/platform`)
- `ENDPOINTS`: Object with all API endpoints

**Usage**:
```typescript
import { ENDPOINTS } from '@/lib/api/adapter';

const workers = await apiClient(ENDPOINTS.WORKERS.LIST);
```

### `transforms.ts`
Data transformation utilities for request/response mapping.

**Key Functions**:

#### Pagination
```typescript
transformPaginatedResponse<T>(data, meta): MockPaginationResponse<T>
```
Converts backend pagination (array + meta) to frontend format.

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

Maps between frontend and backend status values:
- Frontend: `'in_review'` ↔ Backend: `'pending_approval'`
- Frontend: `'paid'` ↔ Backend: `'completed'`

#### Field Mapping
```typescript
mapWorkerFields<T>(data: T, direction: 'toBackend' | 'toFrontend'): any
mapPayrollRunFields<T>(data: T, direction: 'toBackend' | 'toFrontend'): any
```

Handles field name differences:
- `totalGross` ↔ `totalGrossMinor`
- Encrypted fields handling

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

### Development (`.env` or `.env.development`)
```env
# Backend API URL
VITE_API_URL=http://localhost:3000/api
```

### Production (`.env.production`)
```env
VITE_API_URL=https://api.payrole.com/api
```

## Backend API Structure

### Pagination

**Backend Response**:
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

**Backend Login**:
```typescript
POST /api/v1/auth/login
{ email, password, tenantSlug }
→ { accessToken, refreshToken, expiresIn, tokenType }

// User profile requires separate call
GET /api/v1/auth/me
→ { user }
```

### Workers/Employees

**Endpoint**: `/api/v1/workers`

**Query Params**:
```
?page=1&limit=20&legalEntityId=uuid&sortBy=createdAt&sortDir=desc
```

### Payroll Runs

**Endpoint**: `/api/v1/payroll/runs`

**Status Values** (lowercase snake_case):
- `'draft'`, `'calculating'`, `'calculated'`
- `'pending_approval'`, `'approved'`
- `'processing'`, `'completed'`
- `'rejected'`, `'cancelled'`, `'reversed'`, `'failed'`

**Amount Format**:
- Backend: `totalGrossMinor: "50000000"` (string, minor units - kobo)
- Frontend: `totalGross: 500000` (number - naira)

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
- Backend uses minor units (kobo): divide by 100 to get naira
- Use `minorToMajor()` when displaying
- Use `majorToMinor()` when sending to backend

### 404 errors
- Check endpoint paths in `adapter.ts`
- Verify API_VERSION is correct (`/v1` for tenant endpoints, `/platform` for platform admin)
- Ensure backend is running on correct port
- Check `VITE_API_URL` in your `.env` file

### Type errors
- Update imports to use adapter types
- Check that response structure matches expectations
- Use `extractResponseData()` for proper envelope handling

## Support

For questions or issues:
1. Backend API docs: `http://localhost:3000/api/docs` (Swagger)
2. Check backend logs for detailed error messages
3. Verify environment variables are set correctly
