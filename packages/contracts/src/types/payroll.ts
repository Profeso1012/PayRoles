export type PayRunStatus =
  | 'draft'
  | 'calculating'
  | 'calculated'
  | 'in_review'
  | 'approved'
  | 'paid'
  | 'posted'
  | 'reversed'
  | 'failed';

export interface PayRun {
  id: string;
  tenantId: string;
  payGroupId: string;
  payGroupName: string;
  period: string;
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
  payGroupName: string;
  elements: PayElement[];
  grossPay: number;
  totalDeductions: number;
  netPay: number;
  currency: string;
  generatedAt: string;
  issuedAt: string;
}
