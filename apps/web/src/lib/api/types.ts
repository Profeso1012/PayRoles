/**
 * Backend API Type Definitions
 * 
 * Types that match the real backend API contracts.
 * These will gradually replace the mock types as we migrate.
 */

// ============================================================================
// Authentication Types
// ============================================================================

export interface LoginRequest {
  email: string;
  password: string;
  tenantSlug: string;  // Required by backend, not in mock
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
  tokenType: 'Bearer';
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface PlatformLoginRequest {
  email: string;
  password: string;
  // No tenantSlug for platform admin
}

// ============================================================================
// Worker Types (backend calls them "workers", not "employees")
// ============================================================================

export interface BackendWorker {
  id: string;
  tenantId: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  middleName: string | null;
  email: string | null;
  phone: string | null;
  dateOfBirth: string | null;
  hireDate: string;
  terminationDate: string | null;
  employmentType: 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERN';
  status: 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE' | 'TERMINATED';
  legalEntityId: string | null;
  position: string | null;
  department: string | null;  // String field, not related entity
  managerId: string | null;
  // Encrypted fields - backend won't return decrypted values
  nationalIdEncrypted: string | null;
  bankAccountEncrypted: string | null;
  bankName: string | null;
  bankRoutingCode: string | null;
  metadata: Record<string, any> | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWorkerRequest {
  employeeNumber: string;
  firstName: string;
  lastName: string;
  middleName?: string | null;
  email?: string | null;
  phone?: string | null;
  dateOfBirth?: string | null;
  hireDate: string;
  employmentType: 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERN';
  legalEntityId?: string | null;
  position?: string | null;
  department?: string | null;
  managerId?: string | null;
  nationalIdEncrypted?: string;  // Send plain, backend encrypts
  bankAccountEncrypted?: string;  // Send plain, backend encrypts
  bankName?: string | null;
  bankRoutingCode?: string | null;
}

export interface UpdateWorkerRequest extends Partial<CreateWorkerRequest> {}

export interface TerminateWorkerRequest {
  terminationDate: string;
  reason?: string;
}

// ============================================================================
// Payroll Run Types
// ============================================================================

export type PayrollRunStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'REJECTED';

export type PayrollDisbursementStatus =
  | 'NOT_STARTED'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'PROCESSING'
  | 'PAID'
  | 'FAILED';

export interface BackendPayrollRun {
  id: string;
  tenantId: string;
  legalEntityId: string;
  name: string;
  periodStart: string;  // ISO date
  periodEnd: string;    // ISO date
  payDate: string;      // ISO date
  status: PayrollRunStatus;
  totalGrossMinor: string;      // Bigint as string (kobo)
  totalDeductionsMinor: string; // Bigint as string (kobo)
  totalNetMinor: string;        // Bigint as string (kobo)
  currency: string;
  processedAt: string | null;
  approvedAt: string | null;
  approvedBy: string | null;
  notes: string | null;
  workflowId: string | null;
  disbursementStatus: PayrollDisbursementStatus;
  disbursementStartedAt: string | null;
  disbursementCompletedAt: string | null;
  monnifyBatchReference: string | null;
  metadata: Record<string, any> | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePayrollRunRequest {
  name: string;
  legalEntityId: string;
  periodStart: string;  // ISO date string
  periodEnd: string;    // ISO date string
  payDate: string;      // ISO date string
  currency?: string;
  notes?: string;
}

export interface ApprovePayrollRunRequest {
  notes?: string;
}

export interface RejectPayrollRunRequest {
  reason: string;
}

// ============================================================================
// Payslip Types
// ============================================================================

export interface BackendPayslip {
  id: string;
  tenantId: string;
  payrollRunId: string;
  workerId: string;
  grossPayMinor: string;      // Bigint as string
  deductionsMinor: string;    // Bigint as string
  netPayMinor: string;        // Bigint as string
  currency: string;
  elements: PayslipElement[];
  pdfUrl: string | null;
  metadata: Record<string, any> | null;
  createdAt: string;
  updatedAt: string;
}

export interface PayslipElement {
  id: string;
  name: string;
  type: 'EARNING' | 'DEDUCTION' | 'EMPLOYER_CONTRIBUTION';
  amountMinor: string;  // Bigint as string
  isStatutory: boolean;
  formula: string | null;
}

// ============================================================================
// Legal Entity Types
// ============================================================================

export interface BackendLegalEntity {
  id: string;
  tenantId: string;
  name: string;
  registrationNumber: string | null;
  taxId: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string;
  currency: string;
  status: 'ACTIVE' | 'INACTIVE';
  metadata: Record<string, any> | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLegalEntityRequest {
  name: string;
  registrationNumber?: string | null;
  taxId?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country: string;
  currency?: string;
}

// ============================================================================
// Compensation Types
// ============================================================================

export interface BackendCompensation {
  id: string;
  tenantId: string;
  workerId: string;
  effectiveFrom: string;  // ISO date
  effectiveTo: string | null;  // ISO date
  baseSalaryMinor: string;  // Bigint as string
  currency: string;
  payFrequency: 'MONTHLY' | 'BI_WEEKLY' | 'WEEKLY' | 'DAILY';
  metadata: Record<string, any> | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCompensationRequest {
  workerId: string;
  effectiveFrom: string;
  effectiveTo?: string | null;
  baseSalaryMinor: string;
  currency: string;
  payFrequency: 'MONTHLY' | 'BI_WEEKLY' | 'WEEKLY' | 'DAILY';
}

// ============================================================================
// Pay Element Types
// ============================================================================

export interface BackendPayElement {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  type: 'EARNING' | 'DEDUCTION' | 'EMPLOYER_CONTRIBUTION';
  category: string;
  isStatutory: boolean;
  isTaxable: boolean;
  isPensionable: boolean;
  formula: string | null;
  metadata: Record<string, any> | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePayElementRequest {
  name: string;
  code: string;
  type: 'EARNING' | 'DEDUCTION' | 'EMPLOYER_CONTRIBUTION';
  category: string;
  isStatutory?: boolean;
  isTaxable?: boolean;
  isPensionable?: boolean;
  formula?: string | null;
}

// ============================================================================
// User Types
// ============================================================================

export interface BackendUser {
  id: string;
  tenantId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  permissions: string[];
  status: 'ACTIVE' | 'INACTIVE';
  workerId: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: string;
  workerId?: string | null;
  targetTenantId?: string;  // For SUPER_ADMIN creating users in other tenants
}

// ============================================================================
// Tenant Types
// ============================================================================

export interface BackendTenant {
  id: string;
  name: string;
  slug: string;
  contactEmail: string;
  timezone: string;
  currency: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'TRIAL';
  metadata: Record<string, any> | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTenantRequest {
  name: string;
  slug: string;
  contactEmail: string;
  timezone?: string;
  currency?: string;
}

// ============================================================================
// Tax Engine Types (NEW - Phase 10)
// ============================================================================

export interface TaxJurisdiction {
  id: string;
  code: string;  // e.g., 'NG', 'KE'
  name: string;  // e.g., 'Nigeria', 'Kenya'
  currency: string;  // e.g., 'NGN', 'KES'
  createdAt: string;
  updatedAt: string;
}

export interface TaxRule {
  id: string;
  code: string;  // e.g., 'NIGERIA_PIT', 'NIGERIA_PENSION'
  name: string;  // e.g., 'Nigeria Personal Income Tax'
  jurisdictionId: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaxVersion {
  id: string;
  code: string;  // e.g., 'NIGERIA_PIT_2026'
  taxRuleId: string;
  name: string;
  effectiveDate: string;  // ISO date
  endDate: string | null;  // ISO date
  basis: 'annual' | 'monthly';
  isActive: boolean;
  notes: string | null;
  bands?: TaxBand[];  // Populated when fetching detail
  reliefs?: TaxRelief[];  // Populated when fetching detail
  createdAt: string;
  updatedAt: string;
}

export interface TaxBand {
  id: string;
  taxVersionId: string;
  sequence: number;
  lowerBoundMinor: string;  // Bigint as string (minor units)
  upperBoundMinor: string | null;  // Bigint as string, null = infinity
  ratePercent: number;  // e.g., 7.5, 11, 15
  createdAt: string;
  updatedAt: string;
}

export interface TaxRelief {
  id: string;
  taxVersionId: string;
  code: string;  // e.g., 'RENT_RELIEF', 'CRA'
  name: string;  // e.g., 'Rent Relief'
  type: 'fixed' | 'percentage' | 'percentage_of_gross_capped' | 'formula';
  value: number;  // Amount (if fixed) or percentage (if percentage-based)
  capMinor: string | null;  // Bigint as string, cap amount in minor units
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaxVersionRequest {
  code: string;
  taxRuleCode: string;  // e.g., 'NIGERIA_PIT'
  name: string;
  effectiveDate: string;  // ISO date
  endDate?: string | null;
  basis?: 'annual' | 'monthly';
  notes?: string | null;
  bands: Array<{
    sequence: number;
    lowerBoundMinor: string;
    upperBoundMinor: string | null;
    ratePercent: number;
  }>;
  reliefs: Array<{
    code: string;
    name: string;
    type: 'fixed' | 'percentage' | 'percentage_of_gross_capped' | 'formula';
    value: number;
    capMinor?: string | null;
    isActive?: boolean;
  }>;
}

// ============================================================================
// Worker Pay Elements Types (NEW - Phase 10)
// ============================================================================

export interface WorkerPayElement {
  id: string;
  tenantId: string;
  workerId: string;
  payElementId: string;
  calculationMethod: 'fixed' | 'percentage' | 'formula';
  amountMinor: string | null;  // Bigint as string, for fixed amounts
  percentage: number | null;  // For percentage-based
  formulaOverride: string | null;  // Custom formula for this worker
  effectiveDate: string;  // ISO date
  endDate: string | null;  // ISO date
  status: 'active' | 'inactive' | 'pending' | 'ended';
  remarks: string | null;
  createdAt: string;
  updatedAt: string;
  // Populated relations (when included)
  payElement?: BackendPayElement;
  worker?: BackendWorker;
}

export interface CreateWorkerPayElementRequest {
  payElementId: string;
  calculationMethod: 'fixed' | 'percentage' | 'formula';
  amountMinor?: string | null;  // Required if fixed
  percentage?: number | null;  // Required if percentage
  formulaOverride?: string | null;  // Required if formula
  effectiveDate: string;  // ISO date
  endDate?: string | null;
  remarks?: string | null;
}

export interface UpdateWorkerPayElementRequest {
  calculationMethod?: 'fixed' | 'percentage' | 'formula';
  amountMinor?: string | null;
  percentage?: number | null;
  formulaOverride?: string | null;
  effectiveDate?: string;
  endDate?: string | null;
  status?: 'active' | 'inactive';
  remarks?: string | null;
}

// ============================================================================
// Pagination Types
// ============================================================================

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortDir?: 'ASC' | 'DESC';
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

// ============================================================================
// API Response Envelope
// ============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: PaginationMeta;
  traceId: string;
  correlationId: string;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    fieldErrors?: Array<{
      field: string;
      message: string;
    }>;
  };
  traceId: string;
  correlationId: string;
}
