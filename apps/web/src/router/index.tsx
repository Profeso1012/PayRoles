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
const Login = lazy(() => import('@/pages/auth/Login'));
const Register = lazy(() => import('@/pages/auth/Register'));
const ForgotPassword = lazy(() => import('@/pages/auth/ForgotPassword'));
const ResetPassword = lazy(() => import('@/pages/auth/ResetPassword'));
const AcceptInvite = lazy(() => import('@/pages/auth/AcceptInvite'));

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
const Departments = lazy(() => import('@/pages/organisation/Departments'));
const Locations = lazy(() => import('@/pages/organisation/Locations'));
const PayGroups = lazy(() => import('@/pages/organisation/PayGroups'));
const JobGrades = lazy(() => import('@/pages/organisation/JobGrades'));

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
  if (role === 'EMPLOYEE') return <Navigate to={PATHS.MY_PAYSLIPS} replace />;
  if (role === 'FINANCE_DIRECTOR') return w(FinanceDashboard);
  if (role === 'PAYROLL_MANAGER') return w(PayrollDashboard);
  return w(HRDashboard);
}

export const router = createBrowserRouter([
  // Public
  { path: PATHS.HOME, element: <Suspense fallback={<Loading />}><Landing /></Suspense> },
  { path: PATHS.UNAUTHORIZED, element: <Unauthorized /> },

  // Auth screens (AuthLayout wrapper)
  {
    element: <Suspense fallback={<Loading />}><AuthLayout /></Suspense>,
    children: [
      { path: PATHS.LOGIN, element: w(Login) },
      { path: PATHS.REGISTER, element: w(Register) },
      { path: PATHS.FORGOT_PASSWORD, element: w(ForgotPassword) },
      { path: PATHS.RESET_PASSWORD, element: w(ResetPassword) },
      { path: PATHS.ACCEPT_INVITE, element: w(AcceptInvite) },
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
        <RoleGuard allowedRoles={['COMPANY_SUPER_ADMIN']}>
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
        element: <RoleGuard allowedRoles={['COMPANY_SUPER_ADMIN', 'HR_MANAGER']}><Outlet /></RoleGuard>,
        children: [
          { index: true, element: w(OrgOverview) },
          { path: 'legal-entities', element: w(LegalEntities) },
          { path: 'departments', element: w(Departments) },
          { path: 'locations', element: w(Locations) },
          { path: 'pay-groups', element: w(PayGroups) },
          { path: 'job-grades', element: w(JobGrades) },
        ],
      },

      // Employees
      {
        path: 'employees',
        element: <RoleGuard allowedRoles={['COMPANY_SUPER_ADMIN', 'HR_MANAGER', 'FINANCE_DIRECTOR']}><Outlet /></RoleGuard>,
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
        element: <RoleGuard allowedRoles={['COMPANY_SUPER_ADMIN', 'PAYROLL_MANAGER', 'FINANCE_DIRECTOR']}><Outlet /></RoleGuard>,
        children: [
          { path: 'pay-elements', element: w(PayElements) },
          { path: 'runs', element: w(PayRunList) },
          { path: 'runs/new', element: w(PayRunCreate) },
          { path: 'runs/:id', element: w(PayRunDetail) },
          { path: 'payslips/:id', element: w(PayslipViewer) },
        ],
      },

      // Finance
      { path: 'payments', element: <RoleGuard allowedRoles={['COMPANY_SUPER_ADMIN', 'FINANCE_DIRECTOR']}>{w(PaymentFiles)}</RoleGuard> },

      // Reports
      {
        path: 'reports',
        element: <RoleGuard allowedRoles={['COMPANY_SUPER_ADMIN', 'HR_MANAGER', 'PAYROLL_MANAGER', 'FINANCE_DIRECTOR']}><Outlet /></RoleGuard>,
        children: [
          { path: 'register', element: w(PayrollRegister) },
          { path: 'statutory', element: w(StatutoryReports) },
          { path: 'cost', element: w(CostSummary) },
        ],
      },

      // Settings
      {
        path: 'settings',
        element: <RoleGuard allowedRoles={['COMPANY_SUPER_ADMIN']}><Outlet /></RoleGuard>,
        children: [
          { path: 'profile', element: w(CompanyProfile) },
          { path: 'users', element: w(UsersAndRoles) },
          { path: 'bank', element: w(BankDetails) },
          { path: 'jurisdictions', element: w(Jurisdictions) },
        ],
      },

      // Employee self-service
      { path: 'my-payslips', element: <RoleGuard allowedRoles={['EMPLOYEE']}>{w(MyPayslips)}</RoleGuard> },
      { path: 'my-profile', element: <RoleGuard allowedRoles={['EMPLOYEE']}>{w(MyProfile)}</RoleGuard> },
      { path: 'my-bank-details', element: <RoleGuard allowedRoles={['EMPLOYEE']}>{w(MyBankDetails)}</RoleGuard> },
    ],
  },
]);
