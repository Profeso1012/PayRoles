/**
 * Backend API Type Definitions
 *
 * Types that match the real e_payroll backend API contracts exactly (entity
 * columns, DTO fields, enum string values). Verified directly against
 * e_payroll/src - do not "improve" these speculatively; if the backend
 * changes, re-verify against the actual entity/DTO file before editing.
 */

// ============================================================================
// Authentication Types
// ============================================================================

export interface LoginRequest {
  email: string;
  password: string;
  tenantSlug: string; // Required by backend, not in mock
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

/** Real backend Status enum (common.enum.ts) - lowercase, no on_leave/terminated. */
export type BackendStatus = 'active' | 'inactive' | 'suspended' | 'archived';

/** Real backend EmploymentType enum (common.enum.ts) - lowercase snake_case. */
export type BackendEmploymentType = 'full_time' | 'part_time' | 'contract' | 'temporary' | 'intern';

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
  employmentType: BackendEmploymentType;
  status: BackendStatus;
  legalEntityId: string | null;
  position: string | null;
  department: string | null; // Plain string field, not a related entity
  managerId: string | null;
  // Encrypted at rest - the backend never returns decrypted values.
  nationalIdEncrypted: string | null;
  bankAccountEncrypted: string | null;
  bankName: string | null;
  bankRoutingCode: string | null;
  metadata: Record<string, any> | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * POST /workers body (CreateWorkerDto). Note: nationalId/bankAccount are sent
 * PLAIN here - there is no `*Encrypted` request field; the backend encrypts
 * them server-side into the entity's nationalIdEncrypted/bankAccountEncrypted
 * columns. Sending `nationalIdEncrypted`/`bankAccountEncrypted` in the request
 * body is rejected (ValidationPipe has forbidNonWhitelisted: true).
 */
export interface CreateWorkerRequest {
  employeeNumber: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string;
  hireDate: string;
  employmentType?: BackendEmploymentType;
  legalEntityId?: string;
  position?: string;
  department?: string;
  managerId?: string;
  nationalId?: string;
  bankAccount?: string;
  bankName?: string;
  bankRoutingCode?: string;
}

export interface UpdateWorkerRequest extends Partial<CreateWorkerRequest> {}

export interface TerminateWorkerRequest {
  terminationDate: string;
  reason?: string;
}

// ============================================================================
// Payroll Run Types
// ============================================================================

/** Real backend PayrollRunStatus enum (common.enum.ts) - lowercase snake_case. */
export type PayrollRunStatus =
  | 'draft'
  | 'calculating'
  | 'calculated'
  | 'pending_approval'
  | 'approved'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'rejected'
  | 'cancelled'
  | 'reversed';

/** Real backend PayrollDisbursementStatus enum (common.enum.ts). */
export type PayrollDisbursementStatus =
  | 'not_started'
  | 'in_progress'
  | 'completed'
  | 'partially_completed'
  | 'failed';

export interface BackendPayrollRun {
  id: string;
  tenantId: string;
  legalEntityId: string;
  name: string;
  periodStart: string; // ISO date
  periodEnd: string; // ISO date
  payDate: string; // ISO date
  status: PayrollRunStatus;
  totalGrossMinor: string; // Bigint as string (kobo)
  totalDeductionsMinor: string; // Bigint as string (kobo)
  totalNetMinor: string; // Bigint as string (kobo)
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
  periodStart: string; // ISO date string
  periodEnd: string; // ISO date string
  payDate: string; // ISO date string
  currency?: string;
  notes?: string;
}

export interface ApprovePayrollRunRequest {
  notes?: string;
}

export interface RejectPayrollRunRequest {
  reason: string;
}

export interface CancelPayrollRunRequest {
  reason?: string;
}

export interface ReversePayrollRunRequest {
  reason: string;
}

/**
 * Immutable per-worker snapshot row for a payroll run
 * (GET /payroll/runs/:id/workers - payroll-worker.entity.ts). There is NO
 * worker name/employee number on this row - join against a fetched
 * BackendWorker[] by workerId if you need to display names.
 */
export type PayrollWorkerPaymentStatus = 'pending' | 'paid' | 'failed' | 'held';

export interface BackendPayrollWorker {
  id: string;
  tenantId: string;
  payrollRunId: string;
  workerId: string;
  grossPayMinor: string;
  taxableIncomeMinor: string;
  totalEarningsMinor: string;
  totalDeductionsMinor: string;
  employerContributionsMinor: string;
  employeeContributionsMinor: string;
  netPayMinor: string;
  currency: string;
  paymentStatus: PayrollWorkerPaymentStatus;
  remarks: string | null;
  createdAt: string;
  updatedAt: string;
}

/** GET /payroll/runs/:id/workers/:payrollWorkerId/items - payroll-item.entity.ts */
export interface BackendPayrollItem {
  id: string;
  tenantId: string;
  payrollWorkerId: string;
  payElementId: string;
  payElementCode: string;
  payElementName: string;
  type: BackendPayElementType;
  amount: string; // Bigint as string, final applied amount (minor units)
  calculatedAmount: string;
  originalAmount: string; // Decimal string, pre-rounding
  formulaUsed: string | null;
  sequence: number;
  calculationLog: Record<string, any> | null;
  taxable: boolean;
  statutory: boolean;
}

// ============================================================================
// Payslip Types
// ============================================================================

/** Real backend DisbursementStatus enum (common.enum.ts), used on Payslip. */
export type PayslipDisbursementStatus =
  | 'pending'
  | 'in_progress'
  | 'paid'
  | 'failed'
  | 'manual'
  | 'skipped';

export interface BackendPayslip {
  id: string;
  tenantId: string;
  payrollRunId: string;
  workerId: string;
  payrollWorkerId: string | null;
  grossPayMinor: string; // Bigint as string
  deductionsMinor: string; // Bigint as string
  netPayMinor: string; // Bigint as string
  currency: string;
  payElements: PayslipElement[];
  pdfStorageKey: string | null;
  pdfUrl: string | null;
  disbursementStatus: PayslipDisbursementStatus;
  disbursementMethod: string | null;
  transactionReference: string | null;
  paidAt: string | null;
  disbursementFailureReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PayslipElement {
  code: string;
  name: string;
  type: string;
  amountMinor: number;
}

// ============================================================================
// Legal Entity Types
// ============================================================================

/** Real backend LegalEntityType enum (legal-entity.entity.ts). */
export type BackendLegalEntityType = 'company' | 'branch' | 'subsidiary' | 'department';

export interface BackendLegalEntity {
  id: string;
  tenantId: string;
  name: string;
  type: BackendLegalEntityType;
  registrationNumber: string | null;
  taxIdEncrypted: string | null;
  currency: string | null;
  country: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  status: BackendStatus;
  metadata: Record<string, any> | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLegalEntityRequest {
  name: string;
  type?: BackendLegalEntityType;
  registrationNumber?: string;
  taxId?: string; // Sent plain, encrypted server-side into taxIdEncrypted
  currency?: string;
  country?: string;
  address?: string;
  phone?: string;
  email?: string;
}

// ============================================================================
// Compensation Types
// ============================================================================

/** Real backend SalaryType enum (compensation.entity.ts). */
export type BackendSalaryType = 'fixed' | 'hourly' | 'commission';

/** Real backend PayFrequency enum (common.enum.ts). */
export type BackendPayFrequency =
  | 'weekly'
  | 'biweekly'
  | 'semimonthly'
  | 'monthly'
  | 'quarterly'
  | 'annual';

export interface BackendCompensation {
  id: string;
  tenantId: string;
  workerId: string;
  salaryType: BackendSalaryType;
  amountMinor: string; // Bigint as string on the entity/response
  currency: string;
  payFrequency: BackendPayFrequency;
  effectiveDate: string; // ISO date
  expiryDate: string | null; // ISO date
  isActive: boolean;
  breakdown: Record<string, any> | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

/** POST /compensation body (CreateCompensationDto) - amountMinor is a `number` here, not a string. */
export interface CreateCompensationRequest {
  workerId: string;
  salaryType?: BackendSalaryType;
  amountMinor: number;
  currency: string;
  payFrequency?: BackendPayFrequency;
  effectiveDate: string;
  expiryDate?: string;
  breakdown?: Record<string, any>;
  notes?: string;
}

// ============================================================================
// Pay Element Types
// ============================================================================

/** Real backend PayElementType enum (common.enum.ts). */
export type BackendPayElementType = 'earning' | 'deduction' | 'employer_contribution' | 'tax' | 'benefit';

export interface BackendPayElement {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  type: BackendPayElementType;
  formula: string | null;
  taxRuleCode: string | null; // Only meaningful when type = 'tax'
  isActive: boolean;
  isTaxable: boolean;
  isStatutory: boolean;
  sortOrder: number;
  description: string | null;
  metadata: Record<string, any> | null;
  createdAt: string;
  updatedAt: string;
}

/** POST /pay-elements body (CreatePayElementDto). There is no `category` or `isPensionable` field. */
export interface CreatePayElementRequest {
  code: string; // UPPER_SNAKE_CASE, e.g. 'BASIC_SALARY'
  name: string;
  type: BackendPayElementType;
  formula?: string;
  taxRuleCode?: string;
  isActive?: boolean;
  isTaxable?: boolean;
  isStatutory?: boolean;
  sortOrder?: number;
  description?: string;
}

// ============================================================================
// Worker Pay Elements Types
// ============================================================================

/** Real backend CalculationMethod enum (common.enum.ts). */
export type BackendCalculationMethod = 'fixed' | 'percentage_of_basic' | 'percentage_of_gross' | 'formula';

/** Real backend WorkerPayElementStatus enum (common.enum.ts). */
export type BackendWorkerPayElementStatus = 'active' | 'inactive' | 'expired';

export interface BackendWorkerPayElement {
  id: string;
  tenantId: string;
  workerId: string;
  payElementId: string;
  calculationMethod: BackendCalculationMethod;
  amountMinor: string | null; // Bigint as string, used when calculationMethod = fixed
  percentage: string | null; // Decimal string, used when calculationMethod = percentage_of_*
  formulaOverride: string | null;
  effectiveDate: string;
  endDate: string | null;
  status: BackendWorkerPayElementStatus;
  remarks: string | null;
  createdAt: string;
  updatedAt: string;
  payElement?: BackendPayElement;
  worker?: BackendWorker;
}

/** POST /workers/:workerId/pay-elements body (CreateWorkerPayElementDto). */
export interface CreateWorkerPayElementRequest {
  payElementId: string;
  calculationMethod?: BackendCalculationMethod;
  amountMinor?: number; // Required when calculationMethod = fixed
  percentage?: number; // 0-1000, required when calculationMethod = percentage_of_*
  formulaOverride?: string; // Required when calculationMethod = formula
  effectiveDate: string;
  endDate?: string;
  remarks?: string;
}

export interface UpdateWorkerPayElementRequest extends Partial<CreateWorkerPayElementRequest> {}

// ============================================================================
// Import Types
// ============================================================================

/** Real backend ImportStatus enum (common.enum.ts). */
export type BackendImportStatus =
  | 'pending'
  | 'validating'
  | 'preview'
  | 'awaiting_approval'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'partially_completed';

/** Real backend ImportEntityType enum (common.enum.ts). */
export type BackendImportEntityType =
  | 'workers'
  | 'compensation'
  | 'assignments'
  | 'pay_elements'
  | 'legal_entities';

export interface BackendImportJob {
  id: string;
  tenantId: string;
  entityType: BackendImportEntityType;
  originalFilename: string;
  uploadedBy: string | null;
  status: BackendImportStatus;
  totalRows: number;
  successfulRows: number;
  failedRows: number;
  startedAt: string | null;
  completedAt: string | null;
  duration: number | null;
  // { reason: string } on failure, or { errors: [{row, error}] } (max 50) on partial completion, else null
  errorSummary: { reason?: string; errors?: Array<{ row: number; error: string }> } | null;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Export Types
// ============================================================================

/** Real backend ExportStatus enum (common.enum.ts). */
export type BackendExportStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'expired';

/** Real backend ExportEntityType enum (common.enum.ts). */
export type BackendExportEntityType =
  | 'workers'
  | 'payroll_register'
  | 'payslips'
  | 'audit_logs'
  | 'gl_journals';

/** Real backend ExportFormat enum (common.enum.ts). */
export type BackendExportFormat = 'csv' | 'xlsx' | 'pdf' | 'json';

export interface BackendExportJob {
  id: string;
  tenantId: string;
  entityType: BackendExportEntityType;
  format: BackendExportFormat;
  generatedBy: string | null;
  status: BackendExportStatus;
  downloadUrl: string | null;
  storageKey: string | null;
  expiresAt: string;
  completedAt: string | null;
  errorSummary: Record<string, any> | null;
  createdAt: string;
  updatedAt: string;
}

/** POST /exports body (CreateExportJobDto). */
export interface CreateExportJobRequest {
  entityType: BackendExportEntityType;
  format: BackendExportFormat;
}

// ============================================================================
// User Types
// ============================================================================

/** Real backend Role enum (roles.enum.ts) - see @contracts/types/auth for the frontend UserRole union. */
export type BackendRole =
  | 'super_admin'
  | 'tenant_admin'
  | 'payroll_manager'
  | 'payroll_officer'
  | 'hr_manager'
  | 'hr_officer'
  | 'finance_manager'
  | 'auditor'
  | 'employee_self_service'
  | 'read_only';

export interface BackendUser {
  id: string;
  tenantId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: BackendRole;
  status: BackendStatus;
  phone: string | null;
  avatarUrl: string | null;
  lastLoginAt: string | null;
  workerId: string | null;
  createdAt: string;
  updatedAt: string;
}

/** POST /users body (CreateUserDto) - password is required (this creates the account directly, there is no separate invite-token flow on the backend). */
export interface CreateUserRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: BackendRole; // Defaults to READ_ONLY if omitted
  phone?: string;
  workerId?: string;
  targetTenantId?: string; // SUPER_ADMIN only - create a user in another tenant
}

export interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  role?: BackendRole;
  phone?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

// ============================================================================
// Tenant Types
// ============================================================================

export interface BackendTenant {
  id: string;
  name: string;
  slug: string;
  status: BackendStatus;
  domain: string | null;
  logoUrl: string | null;
  contactEmail: string;
  contactPhone: string | null;
  country: string | null;
  timezone: string | null;
  currency: string | null;
  settings: Record<string, any> | null;
  createdAt: string;
  updatedAt: string;
}

/** POST /tenants or /platform/tenants body (CreateTenantDto). No `plan`/`adminEmail`/`setupComplete` field exists. */
export interface CreateTenantRequest {
  name: string;
  slug: string; // lowercase, alphanumeric + hyphens only
  contactEmail: string;
  contactPhone?: string;
  country?: string;
  timezone?: string;
  currency?: string;
}

// ============================================================================
// Tax Engine Types
// ============================================================================

export interface TaxJurisdiction {
  id: string;
  code: string; // e.g. 'NG', 'KE'
  name: string;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaxRule {
  id: string;
  code: string; // e.g. 'NIGERIA_PIT'
  name: string;
  jurisdictionId: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export type BackendTaxCalculationBasis = 'annual' | 'monthly';

// Plain shape returned by list endpoints (GET /tax/rules/:code/versions) -
// never carries bands/reliefs. GET /tax/versions/:code (VERSION_DETAIL)
// returns a different, wrapped shape - see TaxVersionDetail below.
export interface TaxVersion {
  id: string;
  code: string; // e.g. 'NIGERIA_PIT_2026'
  taxRuleId: string;
  name: string;
  effectiveDate: string;
  endDate: string | null;
  basis: BackendTaxCalculationBasis;
  isActive: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

/** GET /tax/versions/:code (ENDPOINTS.TAX.VERSION_DETAIL) response shape - a
 * wrapper object, not a flat TaxVersion. Not consumed anywhere yet; use this
 * type (not TaxVersion) whenever a "view/create tax version" UI is built. */
export interface TaxVersionDetail {
  version: TaxVersion;
  bands: TaxBand[];
  reliefs: TaxRelief[];
}

export interface TaxBand {
  id: string;
  taxVersionId: string;
  sequence: number;
  lowerBoundMinor: string;
  upperBoundMinor: string | null;
  ratePercent: number;
  createdAt: string;
  updatedAt: string;
}

/** Real backend TaxReliefType enum (common.enum.ts). */
export type BackendTaxReliefType =
  | 'fixed_amount'
  | 'percentage_of_gross'
  | 'percentage_of_gross_capped'
  | 'greater_of_fixed_or_percentage';

export interface TaxRelief {
  id: string;
  taxVersionId: string;
  code: string;
  name: string;
  type: BackendTaxReliefType;
  value: number;
  capMinor: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaxVersionRequest {
  code: string;
  taxRuleCode: string;
  name: string;
  effectiveDate: string;
  endDate?: string;
  basis?: BackendTaxCalculationBasis;
  notes?: string;
  bands: Array<{
    sequence: number;
    lowerBoundMinor: number;
    upperBoundMinor?: number;
    ratePercent: number;
  }>;
  reliefs?: Array<{
    code: string;
    name: string;
    type: BackendTaxReliefType;
    value: number;
    capMinor?: number;
    isActive?: boolean;
  }>;
}

// ============================================================================
// Disbursement Types
// ============================================================================

/** Real backend BatchStatus enum (disbursement/domain/enums/batch-status.enum.ts). */
export type BackendBatchStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'awaiting_schedule'
  | 'queued'
  | 'processing'
  | 'partially_paid'
  | 'paid'
  | 'reconciling'
  | 'reconciled'
  | 'completed'
  | 'cancelled'
  | 'failed'
  | 'expired'
  | 'retrying'
  | 'reversed'
  | 'awaiting_confirmation';

export type BackendProviderType = 'manual_bank_file' | 'monnify' | 'paystack' | 'flutterwave' | 'remita';

export interface BackendDisbursementBatch {
  id: string;
  tenantId: string;
  payrollRunId: string;
  providerType: BackendProviderType;
  status: BackendBatchStatus;
  executionPolicy: 'manual' | 'scheduled' | 'immediate';
  reference: string;
  providerBatchReference: string | null;
  currency: string;
  totalAmountMinor: string; // bigint - may serialize as number or string depending on driver, treat as string-coercible
  totalCount: number;
  successfulCount: number;
  failedCount: number;
  skippedCount: number;
  retryCount: number;
  processingFeeMinor: string | null;
  fileKey: string | null;
  fileUrl: string | null;
  scheduledAt: string | null;
  approvedAt: string | null;
  executionStartedAt: string | null;
  completedAt: string | null;
  reconciledAt: string | null;
  expiresAt: string | null;
  createdBy: string | null;
  executedBy: string | null;
  confirmedBy: string | null;
  failureReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export type BackendTransactionStatus =
  | 'pending'
  | 'scheduled'
  | 'queued'
  | 'processing'
  | 'successful'
  | 'failed'
  | 'retried'
  | 'cancelled'
  | 'reversed'
  | 'manual'
  | 'skipped';

export interface BackendDisbursementTransaction {
  id: string;
  tenantId: string;
  batchId: string;
  payrollRunId: string;
  payslipId: string;
  workerId: string;
  workerName: string;
  accountNumber: string;
  bankCode: string;
  bankName: string | null;
  accountName: string | null;
  amountMinor: string;
  currency: string;
  status: BackendTransactionStatus;
  disbursementMethod: string | null;
  providerReference: string | null;
  narration: string | null;
  retryCount: number;
  failureReason: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Pagination Types
// ============================================================================

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
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
    fieldErrors?: Record<string, string[]>;
  };
  traceId: string;
  correlationId: string;
}
