import { ENDPOINTS } from '@/lib/api/adapter';
import type { UserRole } from '@contracts/types/auth';

/**
 * Role sets derived from the backend's ROLE_PERMISSIONS
 * (e_payroll src/common/enums/roles.enum.ts). Every upload route needs
 * IMPORT_CREATE plus the write permission of the entity it bulk-writes
 * (import.controller.ts), so each set below is that intersection.
 */
// IMPORT_CREATE ∩ WORKER_WRITE
export const WORKER_IMPORT_ROLES: UserRole[] = ['tenant_admin', 'super_admin', 'hr_manager', 'hr_officer'];
// IMPORT_CREATE ∩ COMPENSATION_WRITE
export const COMPENSATION_IMPORT_ROLES: UserRole[] = ['tenant_admin', 'super_admin', 'hr_manager'];
// IMPORT_CREATE ∩ PAY_ELEMENT_WRITE
export const PAY_ELEMENT_IMPORT_ROLES: UserRole[] = ['tenant_admin', 'super_admin'];
// IMPORT_CREATE ∩ WORKER_PAY_ELEMENT_WRITE
export const ASSIGNMENT_IMPORT_ROLES: UserRole[] = ['tenant_admin', 'super_admin', 'hr_manager'];
// IMPORT_CREATE ∩ LEGAL_ENTITY_WRITE
export const LEGAL_ENTITY_IMPORT_ROLES: UserRole[] = ['tenant_admin', 'super_admin'];
// Union of the above - anyone who can run at least one import type.
export const IMPORTS_HUB_ROLES: UserRole[] = ['tenant_admin', 'super_admin', 'hr_manager', 'hr_officer'];
// IMPORT_APPROVE - required by POST /imports/:id/cancel.
export const IMPORT_CANCEL_ROLES: UserRole[] = ['tenant_admin', 'super_admin', 'payroll_manager', 'hr_manager'];

export type CsvImportKind = 'compensation' | 'pay-elements' | 'assignments' | 'legal-entities';

export interface ImportColumn {
  name: string;
  required?: boolean;
  description: string;
}

export interface CsvImportConfig {
  kind: CsvImportKind;
  title: string;
  /** One-line summary for the hub card. */
  summary: string;
  uploadEndpoint: string;
  roles: UserRole[];
  templateFilename: string;
  columns: ImportColumn[];
  exampleRow: Record<string, string>;
  /** What re-uploading a file does (create vs update vs skip), per the backend importer. */
  reuploadBehaviour: string;
  notes?: string[];
}

export const CSV_IMPORTS: Record<CsvImportKind, CsvImportConfig> = {
  compensation: {
    kind: 'compensation',
    title: 'Import Compensation',
    summary: 'Bulk salary changes - each row becomes a new compensation record for an employee.',
    uploadEndpoint: ENDPOINTS.IMPORTS.COMPENSATION_UPLOAD,
    roles: COMPENSATION_IMPORT_ROLES,
    templateFilename: 'compensation-import-template.csv',
    columns: [
      { name: 'employeeNumber', required: true, description: 'Existing employee number' },
      { name: 'amount', required: true, description: 'Salary amount in naira, e.g. 500000' },
      { name: 'effectiveDate', required: true, description: 'YYYY-MM-DD' },
      { name: 'currency', description: 'Defaults to NGN' },
      { name: 'salaryType', description: 'fixed, hourly or commission' },
      { name: 'payFrequency', description: 'weekly, biweekly, semimonthly, monthly, quarterly or annual' },
      { name: 'expiryDate', description: 'YYYY-MM-DD' },
      { name: 'notes', description: 'Free text' },
    ],
    exampleRow: {
      employeeNumber: 'EMP-0001',
      amount: '550000',
      effectiveDate: '2026-01-01',
      currency: 'NGN',
      salaryType: 'fixed',
      payFrequency: 'monthly',
      expiryDate: '',
      notes: 'Annual salary review',
    },
    reuploadBehaviour:
      "Every row creates a new compensation record that supersedes the employee's current one (like a salary review) - " +
      'rows are never edited in place. Re-uploading the same file is safe: a row whose effective date and amount already match ' +
      "the employee's active record is skipped. Backdating into closed salary history is rejected.",
  },
  'pay-elements': {
    kind: 'pay-elements',
    title: 'Import Pay Elements',
    summary: 'Create or update earnings, deductions and other pay elements, matched on code.',
    uploadEndpoint: ENDPOINTS.IMPORTS.PAY_ELEMENTS_UPLOAD,
    roles: PAY_ELEMENT_IMPORT_ROLES,
    templateFilename: 'pay-elements-import-template.csv',
    columns: [
      { name: 'code', required: true, description: 'Unique code, e.g. HOUSING_ALLOWANCE (upper-cased automatically)' },
      { name: 'name', required: true, description: 'Display name' },
      { name: 'type', required: true, description: 'earning, deduction, employer_contribution, tax or benefit' },
      { name: 'formula', description: 'Optional formula, e.g. round(basicSalary * 0.2)' },
      { name: 'taxRuleCode', description: 'Tax rule code for tax elements' },
      { name: 'isActive', description: 'true/false (also yes/no, 1/0)' },
      { name: 'isTaxable', description: 'true/false' },
      { name: 'isStatutory', description: 'true/false' },
      { name: 'autoApply', description: 'true/false - apply to every employee automatically' },
      { name: 'sortOrder', description: 'Number - display order on payslips' },
      { name: 'description', description: 'Free text' },
    ],
    exampleRow: {
      code: 'HOUSING_ALLOWANCE',
      name: 'Housing Allowance',
      type: 'earning',
      formula: 'round(basicSalary * 0.2)',
      taxRuleCode: '',
      isActive: 'true',
      isTaxable: 'true',
      isStatutory: 'false',
      autoApply: 'false',
      sortOrder: '10',
      description: 'Monthly housing allowance',
    },
    reuploadBehaviour:
      'Rows are matched on code: a code that already exists is updated with the values in the file (blank cells leave the ' +
      'current value unchanged), and a new code is created. Formulas are validated either way. Rows run top to bottom, so a ' +
      'formula can reference a code defined on an earlier row of the same file.',
  },
  assignments: {
    kind: 'assignments',
    title: 'Import Pay Element Assignments',
    summary: "Assign allowances, deductions and other pay elements to employees' pay packages.",
    uploadEndpoint: ENDPOINTS.IMPORTS.ASSIGNMENTS_UPLOAD,
    roles: ASSIGNMENT_IMPORT_ROLES,
    templateFilename: 'pay-element-assignments-import-template.csv',
    columns: [
      { name: 'employeeNumber', required: true, description: 'Existing employee number' },
      { name: 'payElementCode', required: true, description: 'Existing pay element code' },
      { name: 'effectiveDate', required: true, description: 'YYYY-MM-DD' },
      { name: 'calculationMethod', description: 'fixed (default), percentage_of_basic, percentage_of_gross or formula' },
      { name: 'amount', description: 'Naira amount - for fixed' },
      { name: 'percentage', description: 'e.g. 10 for 10% - for percentage methods' },
      { name: 'formulaOverride', description: 'Formula - for the formula method' },
      { name: 'endDate', description: 'YYYY-MM-DD' },
      { name: 'remarks', description: 'Free text' },
    ],
    exampleRow: {
      employeeNumber: 'EMP-0001',
      payElementCode: 'HOUSING_ALLOWANCE',
      effectiveDate: '2026-01-01',
      calculationMethod: 'fixed',
      amount: '100000',
      percentage: '',
      formulaOverride: '',
      endDate: '',
      remarks: 'Approved by HR',
    },
    reuploadBehaviour:
      'Rows are matched on employee number + pay element code + effective date: an active assignment starting on that date ' +
      'is updated in place (this is how you do a bulk rate change for the same period), otherwise a new assignment is ' +
      'created. A row that overlaps a different existing assignment for the same element is rejected, never silently truncated.',
  },
  'legal-entities': {
    kind: 'legal-entities',
    title: 'Import Legal Entities',
    summary: 'Create or update companies, branches and subsidiaries, matched on registration number.',
    uploadEndpoint: ENDPOINTS.IMPORTS.LEGAL_ENTITIES_UPLOAD,
    roles: LEGAL_ENTITY_IMPORT_ROLES,
    templateFilename: 'legal-entities-import-template.csv',
    columns: [
      { name: 'name', required: true, description: 'Entity name' },
      { name: 'registrationNumber', required: true, description: 'CAC/RC number - unique per company' },
      { name: 'type', description: 'company, branch, subsidiary or department' },
      { name: 'taxId', description: 'Tax identification number' },
      { name: 'currency', description: 'e.g. NGN' },
      { name: 'country', description: 'e.g. NG' },
      { name: 'address', description: 'Postal address' },
      { name: 'phone', description: 'Phone number' },
      { name: 'email', description: 'Contact email' },
    ],
    exampleRow: {
      name: 'Acme Nigeria Ltd',
      registrationNumber: 'RC123456',
      type: 'company',
      taxId: '12345678-0001',
      currency: 'NGN',
      country: 'NG',
      address: '1 Broad Street, Lagos',
      phone: '+2348000000000',
      email: 'payroll@acme.example',
    },
    reuploadBehaviour:
      'Rows are matched on registration number: an existing entity is updated with the values in the file (blank cells ' +
      'leave the current value unchanged), and a new registration number creates a new entity. Re-uploading never creates ' +
      'duplicates.',
  },
};
