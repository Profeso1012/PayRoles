// Matches the real backend PayrollRunStatus enum 1:1, plus the frontend's
// friendlier 'in_review'/'paid' aliases (see lib/api/transforms.ts mapPayrollStatus).
// There is no 'posted' state on the backend.
export type PayRunStatus =
  | 'draft'
  | 'calculating'
  | 'calculated'
  | 'in_review'
  | 'pending_approval'
  | 'approved'
  | 'processing'
  | 'paid'
  | 'completed'
  | 'rejected'
  | 'cancelled'
  | 'reversed'
  | 'failed';

export interface PayRun {
  id: string;
  tenantId: string;
  // The backend has no pay-group concept - runs are scoped directly to a
  // legal entity (legalEntityId) with a free-text `name`. payGroupId/payGroupName
  // are kept as optional UI-display fallbacks (pages often mirror `name` into
  // payGroupName since there is no separate pay group to show).
  legalEntityId?: string;
  name?: string;
  payGroupId?: string;
  payGroupName?: string;
  period: string;
  periodStart?: string;
  periodEnd?: string;
  payDate?: string;
  status: PayRunStatus;
  employeeCount: number;
  totalGross: number;
  totalNet: number;
  totalDeductions: number;
  currency: string;
  createdById: string;
  approvedById: string | null;
  createdAt: string;
  approvedAt: string | null;
}

export interface PayRunEmployee {
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
  grossPay: number;
  elements: PayElement[];
  totalDeductions: number;
  netPay: number;
  status: 'calculated' | 'flagged' | 'error';
  flagReason: string | null;
}

// A computed line item on a payroll register row / payslip (has an `amount`).
// NOT the same as a pay element *definition* - see PayElementDefinition below.
export interface PayElement {
  id: string;
  name: string;
  type: 'earning' | 'deduction' | 'employer_contribution';
  amount: number;
  currency: string;
  isStatutory: boolean;
  formula: string | null;
}

// A configured pay element template (GET/POST /pay-elements) - matches the
// real backend PayElement entity/CreatePayElementDto. This has no `amount`;
// amounts only exist once an element is calculated onto a payslip (PayElement above).
export interface PayElementDefinition {
  id: string;
  code: string; // UPPER_SNAKE_CASE, immutable identifier referenced by formulas
  name: string;
  type: 'earning' | 'deduction' | 'employer_contribution' | 'tax' | 'benefit';
  formula: string | null;
  taxRuleCode: string | null; // Only meaningful when type === 'tax'
  // Only meaningful when type === 'tax'. true: applies to every active
  // worker automatically (e.g. PAYE). false: only workers with an explicit
  // WorkerPayElement assignment. Required (no safe default) on create when
  // type is 'tax' - see CreatePayElementRequest in lib/api/types.ts.
  autoApply: boolean;
  isActive: boolean;
  isTaxable: boolean;
  isStatutory: boolean;
  sortOrder: number;
  description: string | null;
}

export interface Payslip {
  id: string;
  payRunId: string;
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
  period: string;
  name?: string;
  payGroupName?: string;
  elements: PayElement[];
  grossPay: number;
  totalDeductions: number;
  netPay: number;
  currency: string;
  createdAt?: string;
  generatedAt?: string;
  issuedAt?: string;
}
