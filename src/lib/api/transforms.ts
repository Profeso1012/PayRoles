/**
 * API Response Transformation Utilities
 * 
 * Handles differences between mock and real backend response structures,
 * including pagination, monetary amounts, and field mappings.
 */

import { USE_REAL_API } from './adapter';

// ============================================================================
// Pagination Transformations
// ============================================================================

export interface MockPaginationResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface BackendPaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Transform backend pagination response to match mock structure
 * Backend: { data: [...], meta: { total, page, limit } }
 * Mock: { data: [...], total, page, pageSize }
 */
export function transformPaginatedResponse<T>(
  data: T[] | { items?: T[]; data?: T[] },
  meta?: BackendPaginationMeta
): MockPaginationResponse<T> {
  if (USE_REAL_API && meta) {
    // Backend response
    const items = Array.isArray(data) ? data : (data.items || data.data || []);
    return {
      data: items,
      total: meta.total,
      page: meta.page,
      pageSize: meta.limit,
    };
  }
  
  // Mock response (already in correct format)
  if (Array.isArray(data)) {
    return {
      data,
      total: data.length,
      page: 1,
      pageSize: data.length,
    };
  }
  
  return data as MockPaginationResponse<T>;
}

// ============================================================================
// Monetary Amount Transformations
// ============================================================================

/**
 * Convert backend minor units (kobo) to major units (naira)
 * Backend stores as bigint string: "50000000" = 500,000.00 NGN
 */
export function minorToMajor(minorUnits: string | number, currency: string = 'NGN'): number {
  if (typeof minorUnits === 'number') {
    return minorUnits / 100;
  }
  
  const minor = BigInt(minorUnits || '0');
  return Number(minor) / 100;
}

/**
 * Convert major units (naira) to minor units (kobo) for backend
 */
export function majorToMinor(majorUnits: number): string {
  const minor = Math.round(majorUnits * 100);
  return minor.toString();
}

/**
 * Format amount for display
 */
export function formatCurrency(amount: number, currency: string = 'NGN'): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

// ============================================================================
// Status Mappings
// ============================================================================

/**
 * Payroll Run Status Mapping
 *
 * Backend enum (e_payroll/src/common/enums/common.enum.ts PayrollRunStatus) is
 * lowercase snake_case: 'draft' | 'calculating' | 'calculated' |
 * 'pending_approval' | 'approved' | 'processing' | 'completed' | 'failed' |
 * 'rejected' | 'cancelled' | 'reversed'.
 *
 * The frontend keeps two friendlier aliases for display/filtering
 * ('in_review' for 'pending_approval', 'paid' for 'completed') and otherwise
 * uses the real backend values 1:1. Previous versions of this map sent
 * UPPERCASE values ('DRAFT', 'PENDING_APPROVAL', ...) which do not exist on
 * the backend's enum and were rejected with a 400 by @IsEnum(PayrollRunStatus).
 */
export const PAYROLL_STATUS_MAP = {
  // Frontend → Backend
  toBackend: {
    'draft': 'draft',
    'calculating': 'calculating',
    'calculated': 'calculated',
    'in_review': 'pending_approval',
    'pending_approval': 'pending_approval',
    'approved': 'approved',
    'processing': 'processing',
    'paid': 'completed',
    'completed': 'completed',
    'rejected': 'rejected',
    'cancelled': 'cancelled',
    'reversed': 'reversed',
    'failed': 'failed',
  } as Record<string, string>,

  // Backend → Frontend (for display)
  toFrontend: {
    'draft': 'draft',
    'calculating': 'calculating',
    'calculated': 'calculated',
    'pending_approval': 'in_review',
    'approved': 'approved',
    'processing': 'processing',
    'completed': 'paid',
    'rejected': 'rejected',
    'cancelled': 'cancelled',
    'reversed': 'reversed',
    'failed': 'failed',
  } as Record<string, string>,
};

export function mapPayrollStatus(status: string, direction: 'toBackend' | 'toFrontend'): string {
  if (!USE_REAL_API) return status;
  return PAYROLL_STATUS_MAP[direction][status] || status;
}

/**
 * Worker/Employee Status Mapping
 *
 * Backend enum (common.enum.ts Status) is lowercase: 'active' | 'inactive' |
 * 'suspended' | 'archived'. There is no 'on_leave' or 'terminated' value on
 * the backend — PATCH /workers/:id/terminate just sets status to 'inactive'
 * (see worker.service.ts#terminate) and populates terminationDate. Treat
 * "terminated" as a frontend-only derived label (status === 'inactive' with a
 * terminationDate set), not a distinct wire value.
 */
export const WORKER_STATUS_MAP = {
  toBackend: {
    'active': 'active',
    'inactive': 'inactive',
    'suspended': 'suspended',
    'archived': 'archived',
  } as Record<string, string>,

  toFrontend: {
    'active': 'active',
    'inactive': 'inactive',
    'suspended': 'suspended',
    'archived': 'archived',
  } as Record<string, string>,
};

export function mapWorkerStatus(status: string, direction: 'toBackend' | 'toFrontend'): string {
  if (!USE_REAL_API) return status;
  return WORKER_STATUS_MAP[direction][status] || status;
}

// ============================================================================
// Date Transformations
// ============================================================================

/**
 * Format date for API (ISO date string)
 */
export function formatDateForAPI(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().split('T')[0];
}

/**
 * Parse date from API
 */
export function parseDateFromAPI(dateString: string | null): Date | null {
  if (!dateString) return null;
  return new Date(dateString);
}

// ============================================================================
// Field Mapping Utilities
// ============================================================================

/**
 * Map worker field names between frontend and backend
 */
export function mapWorkerFields<T extends Record<string, any>>(
  data: T,
  direction: 'toBackend' | 'toFrontend'
): any {
  if (!USE_REAL_API) return data;

  if (direction === 'toBackend') {
    // Frontend → Backend: CreateWorkerDto/UpdateWorkerDto declare plain
    // `nationalId`/`bankAccount` fields (the backend encrypts them at rest
    // internally as nationalIdEncrypted/bankAccountEncrypted columns, but
    // that is NOT the request field name). Do NOT rename these before
    // sending - the previous version renamed nationalId -> nationalIdEncrypted
    // here, which the DTO's `forbidNonWhitelisted: true` validation rejects
    // as an unknown field while silently dropping the real value.
    return { ...data };
  } else {
    // Backend → Frontend
    const mapped: any = { ...data };
    
    // Backend won't return decrypted values, but we can keep field names consistent
    if (mapped.nationalIdEncrypted !== undefined) {
      mapped.nationalId = '****';  // Masked
      delete mapped.nationalIdEncrypted;
    }
    
    if (mapped.bankAccountEncrypted !== undefined) {
      mapped.bankAccount = '****';  // Masked
      delete mapped.bankAccountEncrypted;
    }
    
    return mapped;
  }
}

/**
 * Map payroll run fields between frontend and backend
 */
export function mapPayrollRunFields<T extends Record<string, any>>(
  data: T,
  direction: 'toBackend' | 'toFrontend'
): any {
  if (!USE_REAL_API) return data;
  
  if (direction === 'toBackend') {
    // Frontend → Backend
    const mapped: any = { ...data };
    
    // Convert amounts to minor units
    if (mapped.totalGross !== undefined) {
      mapped.totalGrossMinor = majorToMinor(mapped.totalGross);
      delete mapped.totalGross;
    }
    
    if (mapped.totalDeductions !== undefined) {
      mapped.totalDeductionsMinor = majorToMinor(mapped.totalDeductions);
      delete mapped.totalDeductions;
    }
    
    if (mapped.totalNet !== undefined) {
      mapped.totalNetMinor = majorToMinor(mapped.totalNet);
      delete mapped.totalNet;
    }
    
    // Map status
    if (mapped.status) {
      mapped.status = mapPayrollStatus(mapped.status, 'toBackend');
    }
    
    return mapped;
  } else {
    // Backend → Frontend
    const mapped: any = { ...data };
    
    // Convert amounts from minor units
    if (mapped.totalGrossMinor !== undefined) {
      mapped.totalGross = minorToMajor(mapped.totalGrossMinor, mapped.currency);
      delete mapped.totalGrossMinor;
    }
    
    if (mapped.totalDeductionsMinor !== undefined) {
      mapped.totalDeductions = minorToMajor(mapped.totalDeductionsMinor, mapped.currency);
      delete mapped.totalDeductionsMinor;
    }
    
    if (mapped.totalNetMinor !== undefined) {
      mapped.totalNet = minorToMajor(mapped.totalNetMinor, mapped.currency);
      delete mapped.totalNetMinor;
    }
    
    // Map status
    if (mapped.status) {
      mapped.status = mapPayrollStatus(mapped.status, 'toFrontend');
    }
    
    return mapped;
  }
}

// ============================================================================
// Token Expiry Parsing
// ============================================================================

/**
 * Parse JWT expiresIn string to milliseconds
 * Examples: "15m" → 900000, "7d" → 604800000
 */
export function parseTokenExpiry(expiresIn: string): number {
  const match = expiresIn.match(/^(\d+)([smhd])$/);
  if (!match) return 15 * 60 * 1000; // Default 15 minutes
  
  const [, value, unit] = match;
  const num = parseInt(value, 10);
  
  switch (unit) {
    case 's': return num * 1000;
    case 'm': return num * 60 * 1000;
    case 'h': return num * 60 * 60 * 1000;
    case 'd': return num * 24 * 60 * 60 * 1000;
    default: return 15 * 60 * 1000;
  }
}

// ============================================================================
// Response Envelope Handling
// ============================================================================

/**
 * Extract data from backend response envelope
 * Backend: { success, data, meta, traceId, correlationId }
 * Mock: { success, data }
 */
export function extractResponseData<T>(response: any): {
  data: T;
  meta?: BackendPaginationMeta;
  traceId?: string;
  correlationId?: string;
} {
  if (USE_REAL_API) {
    return {
      data: response.data || response,
      meta: response.meta,
      traceId: response.traceId,
      correlationId: response.correlationId,
    };
  }
  
  return {
    data: response.data || response,
  };
}
