import { createBrowserRouter, Outlet, Navigate, useNavigate } from 'react-router-dom';
import { Suspense } from 'react';
// Reloads once for the new build when a page's code file is gone after a deploy.
import { lazyWithReload as lazy } from '@/lib/reloadOnStaleBuild';
import { AuthGuard } from './guards/AuthGuard';
import { GuestGuard } from './guards/GuestGuard';
import { RoleGuard } from './guards/RoleGuard';
import { OrgGuard } from './guards/OrgGuard';
import { useAuthStore } from '@/store/authStore';
import { PATHS } from './paths';
import {
  WORKER_IMPORT_ROLES,
  COMPENSATION_IMPORT_ROLES,
  PAY_ELEMENT_IMPORT_ROLES,
  ASSIGNMENT_IMPORT_ROLES,
  LEGAL_ENTITY_IMPORT_ROLES,
  IMPORTS_HUB_ROLES,
} from '@/pages/imports/importTypes';
import type { UserRole } from '@contracts/types/auth';

// Roles holding WORKER_READ (backend roles.enum.ts) - employee list/detail.
const EMPLOYEE_READ_ROLES: UserRole[] = ['tenant_admin', 'super_admin', 'hr_manager', 'hr_officer', 'payroll_manager', 'payroll_officer', 'read_only', 'auditor'];
// Roles holding WORKER_WRITE - only these may reach the create/edit screens;
// payroll_manager/payroll_officer/read_only/auditor would just get a 403 on save.
const EMPLOYEE_WRITE_ROLES: UserRole[] = ['tenant_admin', 'super_admin', 'hr_manager', 'hr_officer'];
// Roles that reach /payroll/runs/new and /payroll/pay-elements - unchanged
// from the original /payroll guard (auditor holds PAYROLL_READ but neither
// PAYROLL_CREATE nor PAY_ELEMENT_READ).
const PAYROLL_NON_AUDITOR_ROLES: UserRole[] = ['tenant_admin', 'super_admin', 'payroll_manager', 'payroll_officer', 'finance_manager', 'read_only'];

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
const RequestAccess = lazy(() => import('@/pages/public/RequestAccess'));
const FeaturesOverview = lazy(() => import('@/pages/public/features/FeaturesOverview'));
const FeaturesTeam = lazy(() => import('@/pages/public/features/FeaturesTeam'));
const FeaturesPaySetup = lazy(() => import('@/pages/public/features/FeaturesPaySetup'));
const FeaturesPayroll = lazy(() => import('@/pages/public/features/FeaturesPayroll'));
const FeaturesPayments = lazy(() => import('@/pages/public/features/FeaturesPayments'));
const Login = lazy(() => import('@/pages/auth/Login'));
const PlatformLogin = lazy(() => import('@/pages/auth/PlatformLogin'));
const VerifyEmail = lazy(() => import('@/pages/auth/VerifyEmail'));
const ForgotPassword = lazy(() => import('@/pages/auth/ForgotPassword'));
// Deprecated: ResetPassword, AcceptInvite - the backend has no reset-link or
// invite routes (forgot-password emails a temporary password instead).
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
const SAWalletProviders = lazy(() => import('@/pages/super-admin/SAWalletProviders'));

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

// Bulk CSV imports
const ImportsHub = lazy(() => import('@/pages/imports/ImportsHub'));
const CompensationImport = lazy(() => import('@/pages/imports/CsvImportPage').then((m) => ({ default: m.CompensationImport })));
const PayElementsImport = lazy(() => import('@/pages/imports/CsvImportPage').then((m) => ({ default: m.PayElementsImport })));
const AssignmentsImport = lazy(() => import('@/pages/imports/CsvImportPage').then((m) => ({ default: m.AssignmentsImport })));
const LegalEntitiesImport = lazy(() => import('@/pages/imports/CsvImportPage').then((m) => ({ default: m.LegalEntitiesImport })));

// Payroll
const PayElements = lazy(() => import('@/pages/payroll/PayElements'));
const FormulaGuide = lazy(() => import('@/pages/payroll/FormulaGuide'));
const PayRunList = lazy(() => import('@/pages/payroll/PayRunList'));
const PayRunCreate = lazy(() => import('@/pages/payroll/PayRunCreate'));
const PayRunDetail = lazy(() => import('@/pages/payroll/PayRunDetail'));
const PayslipViewer = lazy(() => import('@/pages/payroll/PayslipViewer'));

// Finance
const PaymentFiles = lazy(() => import('@/pages/payments/PaymentFiles'));
const DisbursementBatchDetail = lazy(() => import('@/pages/payments/DisbursementBatchDetail'));
const Wallet = lazy(() => import('@/pages/payments/Wallet'));
const WalletTopupComplete = lazy(() => import('@/pages/payments/WalletTopupComplete'));
const DisbursementSettings = lazy(() => import('@/pages/payments/DisbursementSettings'));
const DisbursementDashboard = lazy(() => import('@/pages/payments/DisbursementDashboard'));
const DisbursementReports = lazy(() => import('@/pages/payments/DisbursementReports'));
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
// MyBankDetails reads/writes the signed-in user's own worker record via
// GET/PATCH /workers/:id, which needs WORKER_READ + WORKER_WRITE - so it's only
// routed for EMPLOYEE_WRITE_ROLES. employee_self_service has neither.
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
  { path: PATHS.REQUEST_ACCESS, element: w(RequestAccess) },
  { path: PATHS.VERIFY_EMAIL, element: w(VerifyEmail) },
  { path: PATHS.FEATURES, element: w(FeaturesOverview) },
  { path: PATHS.FEATURES_TEAM, element: w(FeaturesTeam) },
  { path: PATHS.FEATURES_PAY_SETUP, element: w(FeaturesPaySetup) },
  { path: PATHS.FEATURES_PAYROLL, element: w(FeaturesPayroll) },
  { path: PATHS.FEATURES_PAYMENTS, element: w(FeaturesPayments) },
  { path: PATHS.UNAUTHORIZED, element: <Unauthorized /> },

  // Auth screens (AuthLayout wrapper) - GuestGuard bounces an already
  // logged-in user (typed URL, or browser back button after signing in)
  // straight to their dashboard instead of showing them the login form again.
  {
    element: <GuestGuard><Suspense fallback={<Loading />}><AuthLayout /></Suspense></GuestGuard>,
    children: [
      { path: PATHS.LOGIN, element: w(Login) },
      { path: '/platform-login', element: w(PlatformLogin) },
      { path: PATHS.FORGOT_PASSWORD, element: w(ForgotPassword) },
      // Deprecated: reset-password, accept-invite (no backend routes)
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
      { path: 'wallet-providers', element: w(SAWalletProviders) },
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
        // read_only, payroll_manager and payroll_officer all hold WORKER_READ
        // on the real backend (roles.enum.ts) but were missing here.
        // finance_manager, conversely, holds NO worker:* permission at all
        // (its own permission block has no WORKER_READ) - it was listed here
        // and linked from Sidebar.tsx's FINANCE_NAV, but GET /workers 403s for
        // it every time, making that nav entry a permanent dead end. Removed.
        // auditor holds WORKER_READ too - read-only list/detail only.
        element: <RoleGuard allowedRoles={EMPLOYEE_READ_ROLES}><Outlet /></RoleGuard>,
        children: [
          { index: true, element: w(EmployeeList) },
          { path: 'new', element: <RoleGuard allowedRoles={EMPLOYEE_WRITE_ROLES}><OrgGuard>{w(AddEmployee)}</OrgGuard></RoleGuard> },
          { path: ':id', element: w(EmployeeDetail) },
          { path: ':id/edit', element: <RoleGuard allowedRoles={EMPLOYEE_WRITE_ROLES}>{w(EditEmployee)}</RoleGuard> },
        ],
      },
      // Its own route (not nested under /employees) - reached from
      // EmployeeList.tsx's Add Employee popup and the /imports hub. Backend
      // POST /imports/workers/upload needs IMPORT_CREATE + WORKER_WRITE, so
      // payroll_manager/payroll_officer (IMPORT_CREATE only) are excluded -
      // every upload they tried 403'd.
      {
        path: 'employees/import',
        element: (
          <RoleGuard allowedRoles={WORKER_IMPORT_ROLES}>
            {w(ImportEmployees)}
          </RoleGuard>
        ),
      },

      // Bulk CSV imports - each guard is IMPORT_CREATE ∩ the type's write
      // permission (see pages/imports/importTypes.ts).
      { path: 'imports', element: <RoleGuard allowedRoles={IMPORTS_HUB_ROLES}>{w(ImportsHub)}</RoleGuard> },
      { path: 'imports/compensation', element: <RoleGuard allowedRoles={COMPENSATION_IMPORT_ROLES}>{w(CompensationImport)}</RoleGuard> },
      { path: 'imports/pay-elements', element: <RoleGuard allowedRoles={PAY_ELEMENT_IMPORT_ROLES}>{w(PayElementsImport)}</RoleGuard> },
      { path: 'imports/assignments', element: <RoleGuard allowedRoles={ASSIGNMENT_IMPORT_ROLES}>{w(AssignmentsImport)}</RoleGuard> },
      { path: 'imports/legal-entities', element: <RoleGuard allowedRoles={LEGAL_ENTITY_IMPORT_ROLES}>{w(LegalEntitiesImport)}</RoleGuard> },

      // Payroll
      {
        path: 'payroll',
        // read_only holds PAYROLL_READ on the real backend (roles.enum.ts) but
        // was missing here - its own sidebar nav (Sidebar.tsx READ_ONLY_NAV)
        // links to /payroll/runs, so it was a dead link to Unauthorized.
        // auditor holds PAYROLL_READ - read-only runs list/detail only.
        element: <RoleGuard allowedRoles={[...PAYROLL_NON_AUDITOR_ROLES, 'auditor']}><Outlet /></RoleGuard>,
        children: [
          { path: 'pay-elements', element: <RoleGuard allowedRoles={PAYROLL_NON_AUDITOR_ROLES}>{w(PayElements)}</RoleGuard> },
          { path: 'runs', element: w(PayRunList) },
          { path: 'runs/new', element: <RoleGuard allowedRoles={PAYROLL_NON_AUDITOR_ROLES}>{w(PayRunCreate)}</RoleGuard> },
          { path: 'runs/:id', element: w(PayRunDetail) },
        ],
      },
      // Payslip viewer needs its own broader role set (hr_manager/hr_officer
      // hold PAYSLIP_READ on the real backend but not PAYROLL_READ) - standalone
      // route outside the /payroll guard above, same pattern as employees/import.
      // employee_self_service reaches this from My Payslips/dashboard "View" -
      // note the backend's getPayslip()/generatePayslipPdf() (payroll.service.ts)
      // don't yet verify the payslip belongs to the caller the way
      // getWorkerPayslips() already does, so this is open ahead of that
      // backend fix landing (tracked separately, not blocking this route).
      {
        path: 'payroll/runs/:runId/payslips/:payslipId',
        element: (
          <RoleGuard allowedRoles={['tenant_admin', 'super_admin', 'payroll_manager', 'payroll_officer', 'finance_manager', 'hr_manager', 'hr_officer', 'auditor', 'employee_self_service']}>
            {w(PayslipViewer)}
          </RoleGuard>
        ),
      },
      // Formula guide - public to all authenticated users (no role guard)
      { path: 'formula-guide', element: w(FormulaGuide) },

      // Disbursement access matches the backend's actual permission grants
      // exactly (roles.enum.ts): DISBURSEMENT_READ/DISBURSEMENT_MANAGE are
      // held by tenant_admin/super_admin/finance_manager/payroll_manager only
      // - payroll_officer holds neither and must not reach any of these
      // routes (it would load a page whose every API call 403s). Settings is
      // narrower still: DISBURSEMENT_CONFIGURE is tenant_admin/super_admin
      // only, so finance_manager/payroll_manager can approve/execute batches
      // but cannot configure providers or general settings.
      { path: 'payments', element: <RoleGuard allowedRoles={['tenant_admin', 'super_admin', 'finance_manager', 'payroll_manager']}>{w(PaymentFiles)}</RoleGuard> },
      { path: 'payments/disbursements/:runId', element: <RoleGuard allowedRoles={['tenant_admin', 'super_admin', 'finance_manager', 'payroll_manager']}>{w(DisbursementBatchDetail)}</RoleGuard> },
      { path: 'payments/wallet', element: <RoleGuard allowedRoles={['tenant_admin', 'super_admin', 'finance_manager', 'payroll_manager']}>{w(Wallet)}</RoleGuard> },
      // Fixed path, not under /payments - matches the backend's hardcoded
      // checkout redirect exactly (see PATHS.WALLET_TOPUP_COMPLETE).
      { path: 'wallet/topup/complete', element: <RoleGuard allowedRoles={['tenant_admin', 'super_admin', 'finance_manager', 'payroll_manager']}>{w(WalletTopupComplete)}</RoleGuard> },
      { path: 'payments/settings', element: <RoleGuard allowedRoles={['tenant_admin', 'super_admin']}>{w(DisbursementSettings)}</RoleGuard> },
      { path: 'payments/overview', element: <RoleGuard allowedRoles={['tenant_admin', 'super_admin', 'finance_manager', 'payroll_manager']}>{w(DisbursementDashboard)}</RoleGuard> },
      { path: 'payments/reports', element: <RoleGuard allowedRoles={['tenant_admin', 'super_admin', 'finance_manager', 'payroll_manager']}>{w(DisbursementReports)}</RoleGuard> },
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
      { path: 'my-bank-details', element: <RoleGuard allowedRoles={EMPLOYEE_WRITE_ROLES}>{w(MyBankDetails)}</RoleGuard> },
    ],
  },

  // Catch-all - must stay last. Without this, react-router's own default
  // "Unexpected Application Error! 404 Not Found" fallback renders instead.
  { path: '*', element: <NotFound /> },
]);
