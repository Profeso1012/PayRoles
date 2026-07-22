import type { LegalEntity, Department, Location, PayGroup, JobGrade } from '@contracts/types/organisation';

export const mockLegalEntities: LegalEntity[] = [
  {
    id: 'le-1',
    tenantId: 'tenant-1',
    name: 'Dangote Cement Plc — Nigeria',
    country: 'NG',
    taxId: 'RC-0001234',
    address: '3 Osborne Road, Ikoyi, Lagos',
    createdAt: '2026-01-15T09:00:00Z',
  },
  {
    id: 'le-2',
    tenantId: 'tenant-1',
    name: 'Dangote Cement — UK Division',
    country: 'GB',
    taxId: 'GB-987654321',
    address: '10 Downing Street, London, UK',
    createdAt: '2026-02-01T09:00:00Z',
  },
];

export const mockDepartments: Department[] = [
  { id: 'dept-1', legalEntityId: 'le-1', name: 'Human Resources', headEmployeeId: 'emp-1', parentDepartmentId: null },
  { id: 'dept-2', legalEntityId: 'le-1', name: 'Finance & Accounts', headEmployeeId: 'emp-5', parentDepartmentId: null },
  { id: 'dept-3', legalEntityId: 'le-1', name: 'Operations', headEmployeeId: null, parentDepartmentId: null },
  { id: 'dept-4', legalEntityId: 'le-1', name: 'HR — Recruitment', headEmployeeId: null, parentDepartmentId: 'dept-1' },
  { id: 'dept-5', legalEntityId: 'le-1', name: 'IT & Systems', headEmployeeId: null, parentDepartmentId: null },
  { id: 'dept-6', legalEntityId: 'le-2', name: 'UK Finance', headEmployeeId: null, parentDepartmentId: null },
];

export const mockLocations: Location[] = [
  { id: 'loc-1', legalEntityId: 'le-1', name: 'Lagos Head Office', address: '3 Osborne Road, Ikoyi, Lagos', country: 'NG' },
  { id: 'loc-2', legalEntityId: 'le-1', name: 'Abuja Branch', address: 'Plot 1234 Central Business District, Abuja', country: 'NG' },
  { id: 'loc-3', legalEntityId: 'le-2', name: 'London Office', address: '10 Downing Street, London', country: 'GB' },
];

export const mockPayGroups: PayGroup[] = [
  {
    id: 'pg-1',
    tenantId: 'tenant-1',
    name: 'Lagos Monthly Staff',
    payFrequency: 'monthly',
    payDay: 28,
    legalEntityId: 'le-1',
    locationIds: ['loc-1'],
  },
  {
    id: 'pg-2',
    tenantId: 'tenant-1',
    name: 'Abuja Monthly Staff',
    payFrequency: 'monthly',
    payDay: 28,
    legalEntityId: 'le-1',
    locationIds: ['loc-2'],
  },
  {
    id: 'pg-3',
    tenantId: 'tenant-1',
    name: 'UK Monthly Payroll',
    payFrequency: 'monthly',
    payDay: 25,
    legalEntityId: 'le-2',
    locationIds: ['loc-3'],
  },
];

export const mockJobGrades: JobGrade[] = [
  { id: 'jg-1', tenantId: 'tenant-1', name: 'Junior Associate', minSalary: 8000000, maxSalary: 15000000, currency: 'NGN' },
  { id: 'jg-2', tenantId: 'tenant-1', name: 'Associate', minSalary: 15000000, maxSalary: 30000000, currency: 'NGN' },
  { id: 'jg-3', tenantId: 'tenant-1', name: 'Senior Associate', minSalary: 30000000, maxSalary: 60000000, currency: 'NGN' },
  { id: 'jg-4', tenantId: 'tenant-1', name: 'Manager', minSalary: 60000000, maxSalary: 120000000, currency: 'NGN' },
  { id: 'jg-5', tenantId: 'tenant-1', name: 'Director', minSalary: 120000000, maxSalary: 250000000, currency: 'NGN' },
];
