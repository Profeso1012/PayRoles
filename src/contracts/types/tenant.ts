export type CountryCode = 'NG' | 'GB' | 'CA' | 'US';

export interface Tenant {
  id: string;
  name: string;
  legalName: string;
  rcNumber: string;
  industry: string;
  status: 'active' | 'suspended' | 'onboarding';
  setupComplete: boolean;
  activeCountryPacks: CountryCode[];
  allowEmployeeBankEdit: boolean;
  createdAt: string;
}

export interface CountryPack {
  code: CountryCode;
  name: string;
  currency: string;
  statutoryDeductions: string[];
}
