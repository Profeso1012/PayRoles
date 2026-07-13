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

// Onboarding
const CompanySetup = lazy(() => import('@/pages/onboarding/CompanySetup'));

// Super admin
const SADashboard = lazy(() => import('@/pages/super-admin/SADashboard'));
const SACompanies = lazy(() => import('@/pages/super-admin/SACompanies'));
const SACompanyDetail = lazy(() => import('@/pages/super-admin/SACompanyDetail'));

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
const EmployeeDetail = lazy(() => import('@/pages/employees/EmployeeDetail'));
const EditEmployee = lazy(() => import('@/pages/employees/EditEmployee'));

// Payroll
const PayElements = lazy(() => import('@/pages/payroll/PayElements'));
const PayRunList = lazy(() => import('@/pages/payroll/PayRunList'));
const PayRunCreate = lazy(() => import('@/pages/payroll/PayRunCreate'));
const PayRunDetail = lazy(() => import('@/pages/payroll/PayRunDetail'));
const PayslipViewer = lazy(() => import('@/pages/payroll/PayslipViewer'));

// Finance & Reports
const PaymentFiles = lazy(() => import('@/pages/payments/PaymentFiles'));
const PayrollRegister = lazy(() => import('@/pages/reports/PayrollRegister'));
const StatutoryReports = lazy(() => import('@/pages/reports/StatutoryReports'));
const CostSummary = lazy(() => import('@/pages/reports/CostSummary'));

// Settings
const CompanyProfile = lazy(() => import('@/pages/settings/CompanyProfile'));
const UsersAndRoles = lazy(() => import('@/pages/settings/UsersAndRoles'));
const BankDetails = lazy(() => import('@/pages/settings/BankDetails'));
const Jurisdictions = lazy(() => import('@/pages/settings/Jurisdictions'));

// Audit & Notifications
const AuditLogs = lazy(() => import('@/pages/audit/AuditLogs'));
const Notifications = lazy(() => import('@/pages/notifications/Notifications'));

// Employee portal
const MyPayslips = lazy(() => import('@/pages/employee-portal/MyPayslips'));
const MyProfile = lazy(() => import('@/pages/employee-portal/MyProfile'));
const MyBankDetails = lazy(() => import('@/pages/employee-portal/MyBankDetails'));

function Unauthorized() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-soft-white gap-4">
      <p className="text-2xl font-semibold text-deep-cash">Access Denied</p>
      <p className="text-cash-green">You do not have permission to view this page.</p>
      <a href={PATHS.DASHBOARD} className="text-fresh-cash underline">Go to dashboard</a>
    </div>
  );
}

function DashboardRouter() {
  const role = useAuthStore((s) => s.user?.role);

  if (role === 'PLATFORM_ADMIN') return <Navigate to={PATHS.ADMIN} replace />;
  if (role === 'employee_self_service') return <Navigate to={PATHS.MY_PAYSLIPS} replace />;
  if (role === 'finance_manager') return w(FinanceDashboard);
  if (role === 'payroll_manager' || role === 'payroll_officer') return w(PayrollDashboard);
  return w(HRDashboard);
}

export const router = createBrowserRouter([
  // Public
  { path: PATHS.HOME, element: <Suspense fallback={<Loading />}><Landing /></Suspense> },
  // Deprecated: /request-access (no backend endpoint for company access requests)
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
    ],
  },

  // Company setup wizard
  {
    path: PATHS.ONBOARDING,
    element: (
      <AuthGuard>
        <RoleGuard allowedRoles={['tenant_admin', 'super_admin']}>
          <Suspense fallback={<Loading />}><CompanySetup /></Suspense>
        </RoleGuard>
      </AuthGuard>
    ),
  },

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
          { path: 'new', element: <OrgGuard requirePayGroups>{w(AddEmployee)}</OrgGuard> },
          { path: ':id', element: w(EmployeeDetail) },
          { path: ':id/edit', element: w(EditEmployee) },
        ],
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
          { path: 'payslips/:id', element: w(PayslipViewer) },
        ],
      },

      // Finance
      { path: 'payments', element: <RoleGuard allowedRoles={['tenant_admin', 'super_admin', 'finance_manager']}>{w(PaymentFiles)}</RoleGuard> },

      // Reports
      {
        path: 'reports',
        element: <RoleGuard allowedRoles={['tenant_admin', 'super_admin', 'hr_manager', 'hr_officer', 'payroll_manager', 'payroll_officer', 'finance_manager']}><Outlet /></RoleGuard>,
        children: [
          { path: 'register', element: w(PayrollRegister) },
          { path: 'statutory', element: w(StatutoryReports) },
          { path: 'cost', element: w(CostSummary) },
        ],
      },

      // Settings
      {
        path: 'settings',
        element: <RoleGuard allowedRoles={['tenant_admin', 'super_admin']}><Outlet /></RoleGuard>,
        children: [
          { path: 'profile', element: w(CompanyProfile) },
          { path: 'users', element: w(UsersAndRoles) },
          { path: 'bank', element: w(BankDetails) },
          { path: 'jurisdictions', element: w(Jurisdictions) },
        ],
      },

      // Audit & Notifications
      { path: 'audit', element: <RoleGuard allowedRoles={['tenant_admin', 'super_admin', 'finance_manager', 'auditor']}>{w(AuditLogs)}</RoleGuard> },
      { path: 'notifications', element: w(Notifications) },

      // Employee self-service
      { path: 'my-payslips', element: <RoleGuard allowedRoles={['employee_self_service']}>{w(MyPayslips)}</RoleGuard> },
      { path: 'my-profile', element: <RoleGuard allowedRoles={['employee_self_service']}>{w(MyProfile)}</RoleGuard> },
      { path: 'my-bank-details', element: <RoleGuard allowedRoles={['employee_self_service']}>{w(MyBankDetails)}</RoleGuard> },
    ],
  },
]);
