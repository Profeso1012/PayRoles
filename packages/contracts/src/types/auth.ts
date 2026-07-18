/**
 * Tenant-scoped roles - matches the backend's Role enum exactly
 * (e_payroll/src/common/enums/roles.enum.ts). Do not rename these values;
 * they are sent to and received from the real API as-is.
 *
 * 'PLATFORM_ADMIN' is a frontend-only sentinel for sessions authenticated via
 * the separate /platform-login flow. Platform admin auth is a completely
 * separate system on the backend (own JWT secret, own guards, own
 * PlatformRole enum) - GET /auth/me (tenant) never returns 'PLATFORM_ADMIN',
 * and a platform token cannot be used against tenant routes or vice versa.
 */
export type UserRole =
  | 'super_admin'
  | 'tenant_admin'
  | 'payroll_manager'
  | 'payroll_officer'
  | 'hr_manager'
  | 'hr_officer'
  | 'finance_manager'
  | 'auditor'
  | 'employee_self_service'
  | 'read_only'
  | 'PLATFORM_ADMIN';

/**
 * Real permission enforcement is entirely server-side, via backend Permission
 * strings ("resource:action", e.g. 'worker:read', 'payroll:approve' - see
 * roles.enum.ts). The frontend does not replicate that full matrix: UI guards
 * are coarse, role-based approximations of what a route actually requires,
 * used only to hide/redirect at the navigation level. A 403 response from the
 * API is the real authorization gate, not any check in this app - always
 * surface 403s as a toast rather than assuming a role-based guard is
 * sufficient.
 */
export interface AuthUser {
  id: string;
  email: string;
  /** Derived client-side from GET /users/me (firstName + " " + lastName) - not a single backend field. */
  fullName: string;
  role: UserRole;
  tenantId: string | null;
  tenantName: string | null;
  avatarUrl: string | null;
  /** Worker record this user is linked to, if any. Present on IAuthUser for employee_self_service users. */
  workerId: string | null;
  /**
   * The real backend PlatformRole ('super_admin'|'platform_admin'|'support_engineer'
   * |'auditor'|'devops'), only present when role === 'PLATFORM_ADMIN'. That field
   * itself is a frontend sentinel collapsing all platform roles into one - this
   * carries the actual granular role from GET /platform/users/me for screens that
   * need to distinguish them (e.g. only super_admin holds PlatformPermission.
   * TAX_RULE_WRITE; support_engineer/auditor are read-only, devops has neither).
   */
  platformRole: string | null;
}

export interface LoginPayload {
  email: string;
  password: string;
  tenantSlug: string;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
  requiresOtp: boolean;
}
