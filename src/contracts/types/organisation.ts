import type { CountryCode } from './tenant';

export interface LegalEntity {
  id: string;
  tenantId: string;
  name: string;
  country: CountryCode;
  taxId: string;
  address: string;
  createdAt: string;
}

export interface Department {
  id: string;
  legalEntityId: string;
  name: string;
  headEmployeeId: string | null;
  parentDepartmentId: string | null;
}

export interface Location {
  id: string;
  legalEntityId: string;
  name: string;
  address: string;
  country: CountryCode;
}

export interface PayGroup {
  id: string;
  tenantId: string;
  name: string;
  payFrequency: 'monthly' | 'bi-weekly' | 'weekly';
  payDay: number;
  legalEntityId: string;
  locationIds: string[];
}

export interface JobGrade {
  id: string;
  tenantId: string;
  name: string;
  minSalary: number;
  maxSalary: number;
  currency: string;
}

export interface OrgSetupStatus {
  hasLegalEntities: boolean;
  hasDepartments: boolean;
  hasPayGroups: boolean;
}
