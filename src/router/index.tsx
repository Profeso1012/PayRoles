import { createBrowserRouter, Outlet, Navigate, useNavigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { AuthGuard } from './guards/AuthGuard';
import { RoleGuard } from './guards/RoleGuard';
import { OrgGuard } from './guards/OrgGuard';
import { useAuthStore } from '@/store/authStore';
import { PATHS } from './paths';

function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-soft-white">
      <div className="w-8 h-8 border-2 border-fresh-cash border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function w(Component: React.LazyExoticComponent<React.ComponentType<Record<string, never>>>) {
  return (
    <Suspense fallback={<Loading />}>
      <Component />
    </Suspense>
  );
}

// Public pages
const Landing = lazy(() => import('@/pages/public/Landing'));
// Deprecated: RequestAccess (backend has no company-requests endpoint at all)
// const RequestAccess = lazy(() => import('@/pages/public/RequestAccess'));
const FeaturesOverview = lazy(() => import('@/pages/public/features/FeaturesOverview'));
const FeaturesTeam = lazy(() => import('@/pages/public/features/FeaturesTeam'));
const FeaturesPaySetup = lazy(() => import('@/pages/public/features/FeaturesPaySetup'));
const FeaturesPayroll = lazy(() => import('@/pages/public/features/FeaturesPayroll'));
const FeaturesPayments = lazy(() => import('@/pages/public/features/FeaturesPayments'));
const Login = lazy(() => import('@/pages/auth/Login'));
const PlatformLogin = lazy(() => import('@/pages/auth/PlatformLogin'));
// Deprecated: ForgotPassword, ResetPassword, AcceptInvite - the real
// auth.controller.ts only exposes login/refresh/logout/me, no
// forgot-password/reset-password/accept-invite routes exist on the backend.
// const ForgotPassword = lazy(() => import('@/pages/auth/ForgotPassword'));
// const ResetPassword = lazy(() => import('@/pages/auth/ResetPassword'));
// const AcceptInvite = lazy(() => import('@/pages/auth/AcceptInvite'));

// Layout shells
const AppShell = lazy(() => import('@/components/layout/AppShell'));
const AuthLayout = lazy(() => import('@/components/layout/AuthLayout'));

// Deprecated: onboarding/CompanySetup (no backend self-service tenant setup endpoint)

// Super admin
const SADashboard = lazy(() => import('@/pages/super-admin/SADashboard'));
const SACompanies = lazy(() => import('@/pages/super-admin/SACompanies'));
const SACompanyDetail = lazy(() => import('@/pages/super-admin/SACompanyDetail'));
const SATaxManagement = lazy(() => import('@/pages/super-admin/SATaxManagement'));
const SAUsers = lazy(() => import('@/pages/super-admin/SAUsers'));

// Dashboards
const HRDashboard = lazy(() => import('@/pages/dashboard/HRDashboard'));
const PayrollDashboard = lazy(() => import('@/pages/dashboard/PayrollDashboard'));
const FinanceDashboard = lazy(() => import('@/pages/dashboard/FinanceDashboard'));
const EmployeeDashboard = lazy(() => import('@/pages/dashboard/EmployeeDashboard'));

// Organisation
const OrgOverview = lazy(() => import('@/pages/organisation/OrgOverview'));
const LegalEntities = lazy(() => import('@/pages/organisation/LegalEntities'));
// Deprecated: Departments, Locations, PayGroups, JobGrades (not in backend)
// const Departments = lazy(() => import('@/pages/organisation/Departments'));
// const Locations = lazy(() => import('@/pages/organisation/Locations'));
// const PayGroups = lazy(() => import('@/pages/organisation/PayGroups'));
// const JobGrades = lazy(() => import('@/pages/organisation/JobGrades'));

// Employees
const EmployeeList = lazy(() => import('@/pages/employees/EmployeeList'));
const AddEmployee = lazy(() => import('@/pages/employees/AddEmployee'));
const ImportEmployees = lazy(() => import('@/pages/employees/ImportEmployees'));
const EmployeeDetail = lazy(() => import('@/pages/employees/EmployeeDetail'));
const EditEmployee = lazy(() => import('@/pages/employees/EditEmployee'));

// Payroll
const PayElements = lazy(() => import('@/pages/payroll/PayElements'));
const PayRunList = lazy(() => import('@/pages/payroll/PayRunList'));
const PayRunCreate = lazy(() => import('@/pages/payroll/PayRunCreate'));
const PayRunDetail = lazy(() => import('@/pages/payroll/PayRunDetail'));
const PayslipViewer = lazy(() => import('@/pages/payroll/PayslipViewer'));

// Finance
const PaymentFiles = lazy(() => import('@/pages/payments/PaymentFiles'));
const Exports = lazy(() => import('@/pages/exports/Exports'));
// Deprecated: PayrollRegister, StatutoryReports, CostSummary (100% hardcoded
// mock data - there is no backend /reports module of any kind to back these)

// Settings
const CompanyProfile = lazy(() => import('@/pages/settings/CompanyProfile'));
const UsersAndRoles = lazy(() => import('@/pages/settings/UsersAndRoles'));
// Deprecated: BankDetails (no tenant-level bank account endpoint - bank details
// are per-worker only, see Employees > EmployeeDetail)
const Jurisdictions = lazy(() => import('@/pages/settings/Jurisdictions'));

// Audit & Notifications
const AuditLogs = lazy(() => import('@/pages/audit/AuditLogs'));
const Notifications = lazy(() => import('@/pages/notifications/Notifications'));

// Employee portal
const MyPayslips = lazy(() => import('@/pages/employee-portal/MyPayslips'));
const MyProfile = lazy(() => import('@/pages/employee-portal/MyProfile'));
// Deprecated: MyBankDetails - the employee_self_service role only holds
// payslip:read/payslip:download permissions on the real backend, with no
// worker:read/worker:write grant at all, so there is no reachable endpoint
// for a self-service user to view or edit their own bank details.

function Unauthorized() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-soft-white gap-4">
      <p className="text-2xl font-semibold text-deep-cash">Access Denied</p>
      <p className="text-cash-green">You do not have permission to view this page.</p>
      <a href={PATHS.DASHBOARD} className="text-fresh-cash underline">Go to dashboard</a>
    </div>
  );
}

function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-soft-white gap-4">
      <p className="text-3xl font-bold text-deep-cash">Page Not Found</p>
      <p className="text-cash-green">The page you're looking for doesn't exist.</p>
      <a href={PATHS.HOME} className="text-fresh-cash underline">Go to homepage</a>
    </div>
  );
}

function DashboardRouter() {
  const role = useAuthStore((s) => s.user?.role);

  if (role === 'PLATFORM_ADMIN') return <Navigate to={PATHS.ADMIN} replace />;
  if (role === 'employee_self_service') return w(EmployeeDashboard);
  if (role === 'finance_manager') return w(FinanceDashboard);
  if (role === 'payroll_manager' || role === 'payroll_officer') return w(PayrollDashboard);
  return w(HRDashboard);
}

export const router = createBrowserRouter([
  // Public
  { path: PATHS.HOME, element: <Suspense fallback={<Loading />}><Landing /></Suspense> },
  // Deprecated: /request-access (no backend endpoint for company access requests)
  { path: PATHS.FEATURES, element: w(FeaturesOverview) },
  { path: PATHS.FEATURES_TEAM, element: w(FeaturesTeam) },
  { path: PATHS.FEATURES_PAY_SETUP, element: w(FeaturesPaySetup) },
  { path: PATHS.FEATURES_PAYROLL, element: w(FeaturesPayroll) },
  { path: PATHS.FEATURES_PAYMENTS, element: w(FeaturesPayments) },
  { path: PATHS.UNAUTHORIZED, element: <Unauthorized /> },

  // Auth screens (AuthLayout wrapper)
  {
    element: <Suspense fallback={<Loading />}><AuthLayout /></Suspense>,
    children: [
      { path: PATHS.LOGIN, element: w(Login) },
      { path: '/platform-login', element: w(PlatformLogin) },
      // Deprecated: forgot-password, reset-password, accept-invite (no backend routes)
    ],
  },

  // Platform Admin portal
  {
    path: PATHS.ADMIN,
    element: (
      <AuthGuard>
        <RoleGuard allowedRoles={['PLATFORM_ADMIN']}>
          <Suspense fallback={<Loading />}><AppShell /></Suspense>
        </RoleGuard>
      </AuthGuard>
    ),
    children: [
      { index: true, element: w(SADashboard) },
      { path: 'companies', element: w(SACompanies) },
      { path: 'companies/:id', element: w(SACompanyDetail) },
      { path: 'tax', element: w(SATaxManagement) },
      { path: 'users', element: w(SAUsers) },
    ],
  },

  // Deprecated: /onboarding company setup wizard - the backend has no
  // self-service tenant setup endpoint (no /tenants/setup route, no
  // pay-group/company-bank-account concept). Tenants are provisioned by a
  // platform admin via POST /platform/tenants + POST /platform/tenants/:id/users.

  // Main app shell — all tenant users
  {
    element: (
      <AuthGuard>
        <Suspense fallback={<Loading />}><AppShell /></Suspense>
      </AuthGuard>
    ),
    children: [
      { path: PATHS.DASHBOARD, element: <DashboardRouter /> },

      // Organisation
      {
        path: 'organisation',
        element: <RoleGuard allowedRoles={['tenant_admin', 'super_admin', 'hr_manager', 'hr_officer']}><Outlet /></RoleGuard>,
        children: [
          { index: true, element: w(OrgOverview) },
          { path: 'legal-entities', element: w(LegalEntities) },
          // Deprecated routes (not in backend):
          // { path: 'departments', element: w(Departments) },
          // { path: 'locations', element: w(Locations) },
          // { path: 'pay-groups', element: w(PayGroups) },
          // { path: 'job-grades', element: w(JobGrades) },
        ],
      },

      // Employees
      {
        path: 'employees',
        element: <RoleGuard allowedRoles={['tenant_admin', 'super_admin', 'hr_manager', 'hr_officer', 'finance_manager']}><Outlet /></RoleGuard>,
        children: [
          { index: true, element: w(EmployeeList) },
          { path: 'new', element: <OrgGuard>{w(AddEmployee)}</OrgGuard> },
          { path: ':id', element: w(EmployeeDetail) },
          { path: ':id/edit', element: w(EditEmployee) },
        ],
      },
      // Bulk import also needs payroll_manager/payroll_officer, which the
      // employees RoleGuard above doesn't grant - standalone route with its
      // own broader role set (matches backend IMPORT_CREATE/IMPORT_READ).
      {
        path: 'employees/import',
        element: (
          <RoleGuard allowedRoles={['tenant_admin', 'super_admin', 'payroll_manager', 'payroll_officer', 'hr_manager', 'hr_officer']}>
            {w(ImportEmployees)}
          </RoleGuard>
        ),
      },

      // Payroll
      {
        path: 'payroll',
        element: <RoleGuard allowedRoles={['tenant_admin', 'super_admin', 'payroll_manager', 'payroll_officer', 'finance_manager']}><Outlet /></RoleGuard>,
        children: [
          { path: 'pay-elements', element: w(PayElements) },
          { path: 'runs', element: w(PayRunList) },
          { path: 'runs/new', element: w(PayRunCreate) },
          { path: 'runs/:id', element: w(PayRunDetail) },
          { path: 'runs/:runId/payslips/:payslipId', element: w(PayslipViewer) },
        ],
      },

      // Finance
      { path: 'payments', element: <RoleGuard allowedRoles={['tenant_admin', 'super_admin', 'finance_manager']}>{w(PaymentFiles)}</RoleGuard> },
      {
        path: 'exports',
        element: (
          <RoleGuard allowedRoles={['tenant_admin', 'super_admin', 'payroll_manager', 'payroll_officer', 'hr_manager', 'hr_officer', 'finance_manager', 'auditor']}>
            {w(Exports)}
          </RoleGuard>
        ),
      },

      // Deprecated: /reports/* (PayrollRegister, StatutoryReports, CostSummary) -
      // no backend /reports module exists at all; these were 100% mock data.

      // Settings - profile/users stay tenant_admin/super_admin only, but
      // jurisdictions needs its own wider guard below (backend grants
      // tax_rule:read to payroll_officer/finance_manager/auditor/read_only
      // too - Jurisdictions.tsx already has working read-only-banner logic
      // for them that could never run while this blocked them first).
      {
        path: 'settings',
        element: <RoleGuard allowedRoles={['tenant_admin', 'super_admin']}><Outlet /></RoleGuard>,
        children: [
          { path: 'profile', element: w(CompanyProfile) },
          { path: 'users', element: w(UsersAndRoles) },
        ],
      },
      {
        path: 'settings/jurisdictions',
        element: (
          <RoleGuard allowedRoles={['tenant_admin', 'super_admin', 'payroll_officer', 'finance_manager', 'auditor', 'read_only']}>
            {w(Jurisdictions)}
          </RoleGuard>
        ),
      },

      // Audit & Notifications
      { path: 'audit', element: <RoleGuard allowedRoles={['tenant_admin', 'super_admin', 'finance_manager', 'auditor']}>{w(AuditLogs)}</RoleGuard> },
      { path: 'notifications', element: w(Notifications) },

      // Employee self-service
      { path: 'my-payslips', element: <RoleGuard allowedRoles={['employee_self_service']}>{w(MyPayslips)}</RoleGuard> },
      // Every authenticated role reaches this - MyProfile.tsx itself branches
      // on tenant vs PLATFORM_ADMIN session and hits the matching self-service
      // /users/me or /platform/users/me endpoints. No RoleGuard here.
      { path: 'my-profile', element: w(MyProfile) },
    ],
  },

  // Catch-all - must stay last. Without this, react-router's own default
  // "Unexpected Application Error! 404 Not Found" fallback renders instead.
  { path: '*', element: <NotFound /> },
]);
