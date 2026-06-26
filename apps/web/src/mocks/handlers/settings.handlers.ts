import { http, HttpResponse } from 'msw';
import { mockUsers } from '../data/auth.data';
import { mockPendingInvites, type PendingInvite } from '../data/company-requests.data';

function getAuthUser(request: Request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  return mockUsers.find((u) => u.id === token) ?? null;
}

function unauthorized() {
  return HttpResponse.json(
    { success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
    { status: 401 },
  );
}

function forbidden() {
  return HttpResponse.json(
    { success: false, error: { code: 'FORBIDDEN', message: 'Forbidden' } },
    { status: 403 },
  );
}

let invites = [...mockPendingInvites];

let companyBank = {
  bankName: 'GTBank',
  accountNumber: '0123456789',
  accountName: 'Dangote Cement Plc',
  sortCode: '058',
};

const jurisdictions = [
  { code: 'NG', name: 'Nigeria', currency: 'NGN', active: true, deductions: ['PAYE', 'Employee Pension (8%)', 'Employer Pension (10%)', 'NHF (2.5%)'] },
  { code: 'GB', name: 'United Kingdom', currency: 'GBP', active: true, deductions: ['Income Tax (PAYE)', 'National Insurance (Employee)', 'National Insurance (Employer)'] },
  { code: 'CA', name: 'Canada', currency: 'CAD', active: false, deductions: ['Federal Income Tax', 'CPP', 'EI'] },
  { code: 'US', name: 'United States', currency: 'USD', active: false, deductions: ['Federal Income Tax', 'Social Security', 'Medicare'] },
];

export const settingsHandlers = [
  // Users list
  http.get('/api/settings/users', ({ request }) => {
    const user = getAuthUser(request);
    if (!user) return unauthorized();
    if (user.role !== 'COMPANY_SUPER_ADMIN') return forbidden();
    const tenantUsers = mockUsers
      .filter((u) => u.tenantId === user.tenantId)
      .map(({ password: _pw, ...u }) => ({ ...u, status: 'active' }));
    return HttpResponse.json({ success: true, data: tenantUsers });
  }),

  // Pending invites
  http.get('/api/settings/invites', ({ request }) => {
    const user = getAuthUser(request);
    if (!user) return unauthorized();
    if (user.role !== 'COMPANY_SUPER_ADMIN') return forbidden();
    const tenantInvites = invites.filter((i) => i.tenantId === user.tenantId);
    // Auto-mark expired
    const now = new Date();
    const enriched = tenantInvites.map((i) => ({
      ...i,
      status: i.status === 'pending' && new Date(i.expiresAt) < now ? 'expired' : i.status,
    }));
    return HttpResponse.json({ success: true, data: enriched });
  }),

  // Send invite
  http.post('/api/settings/invites', async ({ request }) => {
    const user = getAuthUser(request);
    if (!user) return unauthorized();
    if (user.role !== 'COMPANY_SUPER_ADMIN') return forbidden();
    const body = (await request.json()) as { email: string; role: string };
    const expires = new Date();
    expires.setDate(expires.getDate() + 7);
    const created: PendingInvite = {
      id: `inv-${Date.now()}`,
      tenantId: user.tenantId ?? '',
      email: body.email,
      role: body.role,
      status: 'pending',
      expiresAt: expires.toISOString(),
      createdAt: new Date().toISOString(),
    };
    invites = [...invites, created];
    return HttpResponse.json({ success: true, data: created }, { status: 201 });
  }),

  // Resend invite
  http.post('/api/settings/invites/:id/resend', ({ request, params }) => {
    const user = getAuthUser(request);
    if (!user) return unauthorized();
    if (user.role !== 'COMPANY_SUPER_ADMIN') return forbidden();
    const idx = invites.findIndex((i) => i.id === params.id);
    if (idx === -1) {
      return HttpResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Invite not found' } },
        { status: 404 },
      );
    }
    const expires = new Date();
    expires.setDate(expires.getDate() + 7);
    const updated = { ...invites[idx], status: 'pending' as const, expiresAt: expires.toISOString() };
    invites = invites.map((i) => (i.id === params.id ? updated : i));
    return HttpResponse.json({ success: true, data: updated });
  }),

  // Deactivate user
  http.patch('/api/settings/users/:id/deactivate', ({ request }) => {
    const user = getAuthUser(request);
    if (!user) return unauthorized();
    if (user.role !== 'COMPANY_SUPER_ADMIN') return forbidden();
    return HttpResponse.json({ success: true, data: { status: 'deactivated' } });
  }),

  // Company bank details
  http.get('/api/settings/bank', ({ request }) => {
    if (!getAuthUser(request)) return unauthorized();
    return HttpResponse.json({ success: true, data: companyBank });
  }),

  http.patch('/api/settings/bank', async ({ request }) => {
    const user = getAuthUser(request);
    if (!user) return unauthorized();
    if (user.role !== 'COMPANY_SUPER_ADMIN') return forbidden();
    const body = (await request.json()) as Partial<typeof companyBank>;
    companyBank = { ...companyBank, ...body };
    return HttpResponse.json({ success: true, data: companyBank });
  }),

  // Jurisdictions
  http.get('/api/settings/jurisdictions', ({ request }) => {
    if (!getAuthUser(request)) return unauthorized();
    return HttpResponse.json({ success: true, data: jurisdictions });
  }),

  http.patch('/api/settings/jurisdictions/:code', async ({ request, params }) => {
    const user = getAuthUser(request);
    if (!user) return unauthorized();
    if (user.role !== 'COMPANY_SUPER_ADMIN') return forbidden();
    const body = (await request.json()) as { active: boolean };
    const updated = jurisdictions.map((j) =>
      j.code === params.code ? { ...j, active: body.active } : j,
    );
    return HttpResponse.json({
      success: true,
      data: updated.find((j) => j.code === params.code),
    });
  }),
];
