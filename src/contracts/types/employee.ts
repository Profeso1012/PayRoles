export interface Employee {
  id: string;
  tenantId: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  // The real backend Worker entity has no `gender` field at all - optional here,
  // never sent to/received from the real API.
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  nationalId: string;
  // Real backend Status enum (common.enum.ts): active | inactive | suspended | archived.
  // There is no dedicated "terminated" status - PATCH /workers/:id/terminate sets
  // status to 'inactive' and populates terminationDate; treat "terminated" as a
  // derived label (status === 'inactive' && terminationDate is set), not a status value.
  status: 'active' | 'inactive' | 'suspended' | 'archived';
  terminationDate: string | null;
  avatarUrl: string | null;
  // Real Worker entity keeps bank fields flat (not a sub-array) - see BackendWorker
  // in lib/api/types.ts. `bankDetails` is kept only for pages not yet migrated off it.
  bankName?: string | null;
  bankAccount?: string | null;
  bankRoutingCode?: string | null;
  bankDetails: BankDetail[];
  createdAt: string;
}

export interface EmployeeAssignment {
  id: string;
  employeeId: string;
  departmentId: string;
  locationId: string;
  jobTitle: string;
  jobGradeId: string | null;
  employmentType: 'full_time' | 'part_time' | 'contract';
  reportingManagerId: string | null;
  effectiveFrom: string;
  effectiveTo: string | null;
}

// Matches the real backend Compensation entity/CreateCompensationDto shape -
// there is no payGroupId (no pay-group concept on the backend at all).
export interface Compensation {
  id: string;
  employeeId: string; // Mapped from backend's workerId
  grossSalary: number; // Already converted to major units for display
  currency: string;
  salaryType?: 'fixed' | 'hourly' | 'commission';
  payFrequency?: string;
  effectiveFrom: string; // Mapped from backend's effectiveDate
  effectiveTo: string | null; // Mapped from backend's expiryDate
}

export interface BankDetail {
  id: string;
  employeeId: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  isPrimary: boolean;
}
