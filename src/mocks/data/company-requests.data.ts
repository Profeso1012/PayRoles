export interface CompanyRequest {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  companySize: string;
  country: string;
  message: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export interface PendingInvite {
  id: string;
  tenantId: string;
  email: string;
  role: string;
  status: 'pending' | 'accepted' | 'expired';
  expiresAt: string;
  createdAt: string;
}

export const mockCompanyRequests: CompanyRequest[] = [
  {
    id: 'req-1',
    companyName: 'Lagos Logistics Ltd',
    contactName: 'Kunle Adeyemi',
    email: 'kunle@lagoslogistics.com',
    phone: '+2348011223344',
    companySize: '51-200',
    country: 'NG',
    message: 'We currently manage payroll manually in spreadsheets for ~120 staff. Looking for a scalable solution.',
    status: 'pending',
    createdAt: '2026-06-22T09:15:00Z',
  },
  {
    id: 'req-2',
    companyName: 'Apex Microfinance Bank',
    contactName: 'Fatima Bello',
    email: 'fatima@apexmfb.com',
    phone: '+2348055667788',
    companySize: '201-500',
    country: 'NG',
    message: 'Need full payroll management with statutory compliance (PAYE, Pension, NHF) for banking sector.',
    status: 'pending',
    createdAt: '2026-06-23T14:30:00Z',
  },
  {
    id: 'req-3',
    companyName: 'TechVault Africa',
    contactName: 'Seun Ojo',
    email: 'seun@techvault.africa',
    phone: '+2348099887766',
    companySize: '1-50',
    country: 'NG',
    message: '',
    status: 'approved',
    createdAt: '2026-06-10T08:00:00Z',
  },
];

export const mockPendingInvites: PendingInvite[] = [
  {
    id: 'inv-1',
    tenantId: 'tenant-1',
    email: 'new.payroll@dangote.com',
    role: 'PAYROLL_MANAGER',
    status: 'pending',
    expiresAt: '2026-07-05T00:00:00Z',
    createdAt: '2026-06-25T10:00:00Z',
  },
  {
    id: 'inv-2',
    tenantId: 'tenant-1',
    email: 'compliance@dangote.com',
    role: 'FINANCE_DIRECTOR',
    status: 'expired',
    expiresAt: '2026-06-20T00:00:00Z',
    createdAt: '2026-06-13T10:00:00Z',
  },
];
