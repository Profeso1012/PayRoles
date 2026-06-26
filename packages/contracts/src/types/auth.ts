export type UserRole =
  | 'PLATFORM_ADMIN'
  | 'COMPANY_SUPER_ADMIN'
  | 'HR_MANAGER'
  | 'PAYROLL_MANAGER'
  | 'FINANCE_DIRECTOR'
  | 'EMPLOYEE';

export type Permission =
  | 'manage:organisation'
  | 'manage:employees'
  | 'run:payroll'
  | 'approve:payroll'
  | 'view:all_payslips'
  | 'view:own_payslips'
  | 'manage:users'
  | 'manage:settings'
  | 'view:reports'
  | 'download:payment_files'
  | 'manage:tenants';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  tenantId: string | null;
  tenantName: string | null;
  avatarUrl: string | null;
  permissions: Permission[];
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
  requiresOtp: boolean;
}
