export interface Employee {
  id: string;
  tenantId: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  nationalId: string;
  status: 'active' | 'on_leave' | 'exited';
  avatarUrl: string | null;
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

export interface Compensation {
  id: string;
  employeeId: string;
  grossSalary: number;
  currency: string;
  payGroupId: string;
  effectiveFrom: string;
  effectiveTo: string | null;
}

export interface BankDetail {
  id: string;
  employeeId: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  isPrimary: boolean;
}
