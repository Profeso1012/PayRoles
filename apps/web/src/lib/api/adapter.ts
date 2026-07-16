/**
 * API Adapter Layer
 * 
 * Centralizes all API endpoint definitions and provides utilities for
 * seamless switching between mock and real backend APIs.
 */

// ============================================================================
// Configuration
// ============================================================================

export const USE_REAL_API = import.meta.env.VITE_USE_REAL_API === 'true';
export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Version prefix for tenant APIs (real backend uses /v1, mock uses none)
export const API_VERSION = USE_REAL_API ? '/v1' : '';

// Platform admin prefix (real: /platform, mock: /admin)
export const PLATFORM_PREFIX = USE_REAL_API ? '/platform' : '/admin';

// ============================================================================
// Endpoint Definitions
// ============================================================================

export const ENDPOINTS = {
  // ---------------------------------------------------------------------------
  // Authentication - Tenant
  // ---------------------------------------------------------------------------
  AUTH: {
    LOGIN: `${API_VERSION}/auth/login`,
    LOGOUT: `${API_VERSION}/auth/logout`,
    ME: `${API_VERSION}/auth/me`,
    REFRESH: `${API_VERSION}/auth/refresh`,
    FORGOT_PASSWORD: `${API_VERSION}/auth/forgot-password`,
    RESET_PASSWORD: `${API_VERSION}/auth/reset-password`,
    ACCEPT_INVITE: `${API_VERSION}/auth/accept-invite`,
  },

  // ---------------------------------------------------------------------------
  // Authentication - Platform Admin
  // ---------------------------------------------------------------------------
  PLATFORM_AUTH: {
    LOGIN: `${PLATFORM_PREFIX}/auth/login`,
    LOGOUT: `${PLATFORM_PREFIX}/auth/logout`,
    REFRESH: `${PLATFORM_PREFIX}/auth/refresh`,
  },

  // ---------------------------------------------------------------------------
  // Workers (formerly Employees)
  // ---------------------------------------------------------------------------
  WORKERS: {
    LIST: `${API_VERSION}/workers`,
    DETAIL: (id: string) => `${API_VERSION}/workers/${id}`,
    CREATE: `${API_VERSION}/workers`,
    UPDATE: (id: string) => `${API_VERSION}/workers/${id}`,
    TERMINATE: (id: string) => `${API_VERSION}/workers/${id}/terminate`,
    PAYSLIPS: (id: string) => `${API_VERSION}/payroll/workers/${id}/payslips`,
  },

  // ---------------------------------------------------------------------------
  // Payroll
  // ---------------------------------------------------------------------------
  PAYROLL: {
    RUNS: {
      LIST: `${API_VERSION}/payroll/runs`,
      DETAIL: (id: string) => `${API_VERSION}/payroll/runs/${id}`,
      CREATE: `${API_VERSION}/payroll/runs`,
      CALCULATE: (id: string) => `${API_VERSION}/payroll/runs/${id}/calculate`,
      SUBMIT: (id: string) => `${API_VERSION}/payroll/runs/${id}/submit`,
      APPROVE: (id: string) => `${API_VERSION}/payroll/runs/${id}/approve`,
      REJECT: (id: string) => `${API_VERSION}/payroll/runs/${id}/reject`,
      CANCEL: (id: string) => `${API_VERSION}/payroll/runs/${id}/cancel`,
      REVERSE: (id: string) => `${API_VERSION}/payroll/runs/${id}/reverse`,
      WORKERS: (id: string) => `${API_VERSION}/payroll/runs/${id}/workers`,
      WORKER_DETAIL: (id: string, payrollWorkerId: string) =>
        `${API_VERSION}/payroll/runs/${id}/workers/${payrollWorkerId}`,
      WORKER_ITEMS: (id: string, payrollWorkerId: string) =>
        `${API_VERSION}/payroll/runs/${id}/workers/${payrollWorkerId}/items`,
      PAYSLIPS: (id: string) => `${API_VERSION}/payroll/runs/${id}/payslips`,
    },
    PAYSLIPS: {
      DETAIL: (runId: string, payslipId: string) =>
        `${API_VERSION}/payroll/runs/${runId}/payslips/${payslipId}`,
      PDF: (runId: string, payslipId: string) =>
        `${API_VERSION}/payroll/runs/${runId}/payslips/${payslipId}/pdf`,
    },
  },

  // ---------------------------------------------------------------------------
  // Pay Elements
  // ---------------------------------------------------------------------------
  PAY_ELEMENTS: {
    LIST: `${API_VERSION}/pay-elements`,
    DETAIL: (id: string) => `${API_VERSION}/pay-elements/${id}`,
    CREATE: `${API_VERSION}/pay-elements`,
    UPDATE: (id: string) => `${API_VERSION}/pay-elements/${id}`,
    // Backend has no DELETE route at all (pay-element.controller.ts) - only
    // a soft PATCH .../deactivate. The old DELETE entry here 404'd every time
    // PayElements.tsx's "Delete" button was clicked.
    DEACTIVATE: (id: string) => `${API_VERSION}/pay-elements/${id}/deactivate`,
  },

  // ---------------------------------------------------------------------------
  // Legal Entities (formerly part of Organisation)
  // ---------------------------------------------------------------------------
  LEGAL_ENTITIES: {
    LIST: `${API_VERSION}/legal-entities`,
    DETAIL: (id: string) => `${API_VERSION}/legal-entities/${id}`,
    CREATE: `${API_VERSION}/legal-entities`,
    UPDATE: (id: string) => `${API_VERSION}/legal-entities/${id}`,
    DEACTIVATE: (id: string) => `${API_VERSION}/legal-entities/${id}/deactivate`,
  },

  // ---------------------------------------------------------------------------
  // Compensation
  // ---------------------------------------------------------------------------
  COMPENSATION: {
    // Real route is singular "worker" (compensation.controller.ts) - was
    // "workers" here, which silently 404'd (EmployeeDetail's fetch swallows
    // the error and falls back to an empty array), so every employee's
    // Compensation tab showed "No records" even when compensation existed.
    LIST: (workerId: string) => `${API_VERSION}/compensation/worker/${workerId}`,
    ACTIVE: (workerId: string) => `${API_VERSION}/compensation/worker/${workerId}/active`,
    DETAIL: (id: string) => `${API_VERSION}/compensation/${id}`,
    CREATE: `${API_VERSION}/compensation`,
    UPDATE: (id: string) => `${API_VERSION}/compensation/${id}`,
  },

  // ---------------------------------------------------------------------------
  // Users
  // ---------------------------------------------------------------------------
  USERS: {
    LIST: `${API_VERSION}/users`,
    ME: `${API_VERSION}/users/me`,
    DETAIL: (id: string) => `${API_VERSION}/users/${id}`,
    CREATE: `${API_VERSION}/users`,
    UPDATE: (id: string) => `${API_VERSION}/users/${id}`,
    CHANGE_PASSWORD: `${API_VERSION}/users/me/password`,
    DISABLE: (id: string) => `${API_VERSION}/users/${id}/disable`,
  },

  // ---------------------------------------------------------------------------
  // Tenants - there is no self-service /tenants/profile route on the backend.
  // GET /tenants/:id is readable by SUPER_ADMIN or TENANT_ADMIN; PATCH /tenants/:id
  // is SUPER_ADMIN only (tenant-scoped Role.SUPER_ADMIN, which bypasses RolesGuard
  // entirely - TENANT_ADMIN cannot edit the company profile via this backend).
  // There is also no /tenants/setup endpoint - tenants are provisioned by a
  // platform admin via PLATFORM_TENANTS.CREATE, not self-service.
  // ---------------------------------------------------------------------------
  TENANTS: {
    DETAIL: (id: string) => `${API_VERSION}/tenants/${id}`,
    UPDATE: (id: string) => `${API_VERSION}/tenants/${id}`,
  },

  // ---------------------------------------------------------------------------
  // Platform Admin - Tenants
  // ---------------------------------------------------------------------------
  PLATFORM_TENANTS: {
    LIST: `${PLATFORM_PREFIX}/tenants`,
    DETAIL: (id: string) => `${PLATFORM_PREFIX}/tenants/${id}`,
    CREATE: `${PLATFORM_PREFIX}/tenants`,
    UPDATE: (id: string) => `${PLATFORM_PREFIX}/tenants/${id}`,
    SUSPEND: (id: string) => `${PLATFORM_PREFIX}/tenants/${id}/suspend`,
    ACTIVATE: (id: string) => `${PLATFORM_PREFIX}/tenants/${id}/activate`,
    CREATE_USER: (id: string) => `${PLATFORM_PREFIX}/tenants/${id}/users`,
  },

  // ---------------------------------------------------------------------------
  // Platform Admin - Users
  // ---------------------------------------------------------------------------
  PLATFORM_USERS: {
    LIST: `${PLATFORM_PREFIX}/users`,
    ME: `${PLATFORM_PREFIX}/users/me`,
    DETAIL: (id: string) => `${PLATFORM_PREFIX}/users/${id}`,
    CREATE: `${PLATFORM_PREFIX}/users`,
    UPDATE: (id: string) => `${PLATFORM_PREFIX}/users/${id}`,
    DISABLE: (id: string) => `${PLATFORM_PREFIX}/users/${id}/disable`,
    ENABLE: (id: string) => `${PLATFORM_PREFIX}/users/${id}/enable`,
  },

  // ---------------------------------------------------------------------------
  // Disbursement (New in backend)
  // ---------------------------------------------------------------------------
  DISBURSEMENT: {
    // Scoped to a payroll run - GET/POST both resolve the run's single batch
    INITIATE: (runId: string) => `${API_VERSION}/payroll/runs/${runId}/disbursement`,
    FOR_RUN: (runId: string) => `${API_VERSION}/payroll/runs/${runId}/disbursement`,
    TRANSACTIONS: (runId: string, batchId: string) =>
      `${API_VERSION}/payroll/runs/${runId}/disbursement/${batchId}/transactions`,
    APPROVE: (runId: string, batchId: string) =>
      `${API_VERSION}/payroll/runs/${runId}/disbursement/${batchId}/approve`,
    REJECT: (runId: string, batchId: string) =>
      `${API_VERSION}/payroll/runs/${runId}/disbursement/${batchId}/reject`,
    EXECUTE: (runId: string, batchId: string) =>
      `${API_VERSION}/payroll/runs/${runId}/disbursement/${batchId}/execute`,
    CONFIRM: (runId: string, batchId: string) =>
      `${API_VERSION}/payroll/runs/${runId}/disbursement/${batchId}/confirm`,
    RETRY: (runId: string, batchId: string) =>
      `${API_VERSION}/payroll/runs/${runId}/disbursement/${batchId}/retry`,
    CANCEL: (runId: string, batchId: string) =>
      `${API_VERSION}/payroll/runs/${runId}/disbursement/${batchId}`,
    BULK_FILE: (runId: string, batchId: string, format: 'csv' | 'excel' | 'nibss' = 'csv') =>
      `${API_VERSION}/payroll/runs/${runId}/disbursement/${batchId}/bulk-file?format=${format}`,
    MARK_TRANSACTION_PAID: (runId: string, batchId: string, transactionId: string) =>
      `${API_VERSION}/payroll/runs/${runId}/disbursement/${batchId}/transactions/${transactionId}/mark-paid`,
    SETTINGS: `${API_VERSION}/disbursement/settings`,
    PROVIDERS: `${API_VERSION}/disbursement/settings/providers`,
    DASHBOARD: {
      SUMMARY: `${API_VERSION}/disbursement/dashboard/summary`,
      BATCHES: `${API_VERSION}/disbursement/dashboard/batches`,
      PENDING_APPROVAL: `${API_VERSION}/disbursement/dashboard/pending-approval`,
      RETRY_QUEUE: `${API_VERSION}/disbursement/dashboard/retry-queue`,
    },
    REPORTS: {
      BATCH: (batchId: string, format: 'csv' | 'excel' | 'pdf' = 'csv') =>
        `${API_VERSION}/disbursement/reports/batches/${batchId}?format=${format}`,
      SUMMARY: (format: 'csv' | 'excel' | 'pdf' = 'csv') =>
        `${API_VERSION}/disbursement/reports/summary?format=${format}`,
    },
  },

  // ---------------------------------------------------------------------------
  // Import/Export (New in backend)
  // ---------------------------------------------------------------------------
  IMPORTS: {
    LIST: `${API_VERSION}/imports`,
    WORKERS_UPLOAD: `${API_VERSION}/imports/workers/upload`,
    STATUS: (id: string) => `${API_VERSION}/imports/${id}`,
  },

  EXPORTS: {
    LIST: `${API_VERSION}/exports`,
    CREATE: `${API_VERSION}/exports`,
    STATUS: (id: string) => `${API_VERSION}/exports/${id}`,
    DOWNLOAD: (id: string) => `${API_VERSION}/exports/${id}/download`,
  },

  // ---------------------------------------------------------------------------
  // Notifications (New in backend)
  // ---------------------------------------------------------------------------
  // notification.controller.ts only exposes GET - there is no mark-as-read
  // or mark-all-read route on the backend at all (the entity has an unused
  // readAt column, but nothing sets it yet). MARK_READ/MARK_ALL_READ used to
  // be defined here and called from Notifications.tsx, 404ing every time -
  // removed until the backend actually adds those routes.
  NOTIFICATIONS: {
    LIST: `${API_VERSION}/notifications`,
  },

  // ---------------------------------------------------------------------------
  // Audit Logs (New in backend)
  // ---------------------------------------------------------------------------
  AUDIT: {
    LIST: `${API_VERSION}/audit-logs`,
  },

  // ---------------------------------------------------------------------------
  // Tax Engine (NEW - Phase 10)
  // ---------------------------------------------------------------------------
  TAX: {
    JURISDICTIONS: `${API_VERSION}/tax/jurisdictions`,
    RULES: `${API_VERSION}/tax/rules`,
    RULE_VERSIONS: (code: string) => `${API_VERSION}/tax/rules/${code}/versions`,
    VERSION_DETAIL: (code: string) => `${API_VERSION}/tax/versions/${code}`,
    CREATE_VERSION: `${API_VERSION}/tax/versions`,
    ACTIVATE: (code: string) => `${API_VERSION}/tax/versions/${code}/activate`,
    DEACTIVATE: (code: string) => `${API_VERSION}/tax/versions/${code}/deactivate`,
  },

  // ---------------------------------------------------------------------------
  // Worker Pay Elements (NEW - Phase 10)
  // ---------------------------------------------------------------------------
  WORKER_PAY_ELEMENTS: {
    ASSIGN: (workerId: string) => `${API_VERSION}/workers/${workerId}/pay-elements`,
    LIST: (workerId: string) => `${API_VERSION}/workers/${workerId}/pay-elements`,
    DETAIL: (workerId: string, id: string) => `${API_VERSION}/workers/${workerId}/pay-elements/${id}`,
    UPDATE: (workerId: string, id: string) => `${API_VERSION}/workers/${workerId}/pay-elements/${id}`,
    UNASSIGN: (workerId: string, id: string) => `${API_VERSION}/workers/${workerId}/pay-elements/${id}/unassign`,
  },

  // ---------------------------------------------------------------------------
  // Dashboard (Mock only - needs aggregation)
  // ---------------------------------------------------------------------------
  DASHBOARD: {
    HR: `/dashboard/hr`,
    PAYROLL: `/dashboard/payroll`,
    FINANCE: `/dashboard/finance`,
    EMPLOYEE: `/dashboard/employee`,
  },

  // ---------------------------------------------------------------------------
  // Organisation (Mock only - simplified in backend)
  // ---------------------------------------------------------------------------
  ORGANISATION: {
    SETUP_STATUS: `/organisation/setup-status`,
    OVERVIEW: `/organisation/overview`,
    DEPARTMENTS: `/organisation/departments`,
    LOCATIONS: `/organisation/locations`,
    PAY_GROUPS: `/organisation/pay-groups`,
    JOB_GRADES: `/organisation/job-grades`,
  },

  // ---------------------------------------------------------------------------
  // Settings
  // ---------------------------------------------------------------------------
  SETTINGS: {
    BANK: `/settings/bank`,
    JURISDICTIONS: `/settings/jurisdictions`,
  },
};

// ============================================================================
// Query Parameter Utilities
// ============================================================================

/**
 * Build query string from pagination params
 * Mock uses: page, pageSize
 * Backend uses: page, limit, sortBy, sortDir
 */
export function buildPaginationParams(params: {
  page?: number;
  pageSize?: number;
  limit?: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}): URLSearchParams {
  const searchParams = new URLSearchParams();

  const page = params.page || 1;
  const limit = USE_REAL_API ? (params.limit || params.pageSize || 20) : (params.pageSize || 20);

  searchParams.set('page', page.toString());
  searchParams.set(USE_REAL_API ? 'limit' : 'pageSize', limit.toString());

  // Backend's SortDir enum is lowercase ('asc'|'desc') and rejects any other casing.
  if (USE_REAL_API && params.sortBy) {
    searchParams.set('sortBy', params.sortBy);
    searchParams.set('sortDir', (params.sortDir || 'desc').toLowerCase());
  }

  return searchParams;
}

/**
 * Add filter params to search params
 */
export function addFilterParams(
  searchParams: URLSearchParams,
  filters: Record<string, string | number | boolean | undefined>
): URLSearchParams {
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.set(key, String(value));
    }
  });
  return searchParams;
}
