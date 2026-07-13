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

export interface PayElement {
  id: string;
  name: string;
  type: 'earning' | 'deduction' | 'employer_contribution';
  amount: number;
  currency: string;
  isStatutory: boolean;
  formula: string | null;
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
