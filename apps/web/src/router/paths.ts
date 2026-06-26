export const PATHS = {
  // Public
  HOME: '/',
  REQUEST_ACCESS: '/request-access',
  LOGIN: '/login',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  ACCEPT_INVITE: '/accept-invite',

  // Platform Admin
  ADMIN: '/admin',
  ADMIN_COMPANIES: '/admin/companies',
  ADMIN_COMPANY_DETAIL: (id = ':id') => `/admin/companies/${id}`,

  // Onboarding
  ONBOARDING: '/onboarding',

  // App (tenant users)
  DASHBOARD: '/dashboard',

  // Organisation
  ORGANISATION: '/organisation',
  LEGAL_ENTITIES: '/organisation/legal-entities',
  DEPARTMENTS: '/organisation/departments',
  LOCATIONS: '/organisation/locations',
  PAY_GROUPS: '/organisation/pay-groups',
  JOB_GRADES: '/organisation/job-grades',

  // Employees
  EMPLOYEES: '/employees',
  EMPLOYEE_ADD: '/employees/new',
  EMPLOYEE_DETAIL: (id = ':id') => `/employees/${id}`,
  EMPLOYEE_EDIT: (id = ':id') => `/employees/${id}/edit`,

  // Payroll
  PAY_ELEMENTS: '/payroll/pay-elements',
  PAY_RUNS: '/payroll/runs',
  PAY_RUN_CREATE: '/payroll/runs/new',
  PAY_RUN_DETAIL: (id = ':id') => `/payroll/runs/${id}`,
  PAYSLIP_VIEWER: (id = ':id') => `/payroll/payslips/${id}`,

  // Finance
  PAYMENTS: '/payments',
  REPORTS_REGISTER: '/reports/register',
  REPORTS_STATUTORY: '/reports/statutory',
  REPORTS_COST: '/reports/cost',

  // Settings
  SETTINGS_PROFILE: '/settings/profile',
  SETTINGS_USERS: '/settings/users',
  SETTINGS_BANK: '/settings/bank',
  SETTINGS_JURISDICTIONS: '/settings/jurisdictions',

  // Employee portal
  MY_PAYSLIPS: '/my-payslips',
  MY_PROFILE: '/my-profile',
  MY_BANK_DETAILS: '/my-bank-details',

  UNAUTHORIZED: '/unauthorized',
} as const;
