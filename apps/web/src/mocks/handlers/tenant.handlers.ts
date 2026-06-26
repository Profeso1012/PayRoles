import { http, HttpResponse } from 'msw';
import { mockUsers } from '../data/auth.data';

function getAuthUser(request: Request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  return mockUsers.find((u) => u.id === token) ?? null;
}

function unauthorized(message = 'Unauthorized') {
  return HttpResponse.json(
    { success: false, error: { code: 'UNAUTHORIZED', message } },
    { status: 401 },
  );
}

function forbidden(message = 'Forbidden') {
  return HttpResponse.json(
    { success: false, error: { code: 'FORBIDDEN', message } },
    { status: 403 },
  );
}

interface MockTenant {
  id: string;
  name: string;
  slug: string;
  status: string;
  plan: string;
  country: string;
  createdAt: string;
  setupComplete: boolean;
  adminEmail: string;
}

let mockTenants: MockTenant[] = [
  {
    id: 'tenant-1',
    name: 'Dangote Cement Plc',
    slug: 'dangote-cement',
    status: 'active',
    plan: 'enterprise',
    country: 'NG',
    createdAt: '2026-01-01T00:00:00Z',
    setupComplete: true,
    adminEmail: 'superadmin@dangote.com',
  },
  {
    id: 'tenant-2',
    name: 'BUA Foods Limited',
    slug: 'bua-foods',
    status: 'active',
    plan: 'growth',
    country: 'NG',
    createdAt: '2026-02-15T00:00:00Z',
    setupComplete: true,
    adminEmail: 'admin@buafoods.com',
  },
  {
    id: 'tenant-3',
    name: 'Transcorp Hotels',
    slug: 'transcorp-hotels',
    status: 'suspended',
    plan: 'starter',
    country: 'NG',
    createdAt: '2026-03-01T00:00:00Z',
    setupComplete: false,
    adminEmail: 'admin@transcorp.com',
  },
];

let tenantProfile: MockTenant = mockTenants[0];

export const tenantHandlers = [
  http.get('/api/admin/tenants', ({ request }) => {
    const user = getAuthUser(request);
    if (!user) return unauthorized();
    if (user.role !== 'PLATFORM_ADMIN') return forbidden('Platform Admin only.');
    return HttpResponse.json({ success: true, data: mockTenants });
  }),

  http.post('/api/admin/tenants', async ({ request }) => {
    const user = getAuthUser(request);
    if (!user) return unauthorized();
    if (user.role !== 'PLATFORM_ADMIN') return forbidden('Platform Admin only.');
    const body = (await request.json()) as Record<string, unknown>;
    const created: MockTenant = {
      id: `tenant-${Date.now()}`,
      name: '',
      slug: '',
      status: 'active',
      plan: 'starter',
      country: 'NG',
      createdAt: new Date().toISOString(),
      setupComplete: false,
      adminEmail: '',
      ...body,
    } as MockTenant;
    mockTenants = [...mockTenants, created];
    return HttpResponse.json({ success: true, data: created }, { status: 201 });
  }),

  http.get('/api/admin/tenants/:id', ({ request, params }) => {
    const user = getAuthUser(request);
    if (!user) return unauthorized();
    if (user.role !== 'PLATFORM_ADMIN') return forbidden('Platform Admin only.');
    const tenant = mockTenants.find((t) => t.id === params.id);
    if (!tenant) {
      return HttpResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Tenant not found' } },
        { status: 404 },
      );
    }
    return HttpResponse.json({ success: true, data: tenant });
  }),

  http.patch('/api/admin/tenants/:id/status', async ({ request, params }) => {
    const user = getAuthUser(request);
    if (!user) return unauthorized();
    if (user.role !== 'PLATFORM_ADMIN') return forbidden('Platform Admin only.');
    const body = (await request.json()) as { status: string };
    const idx = mockTenants.findIndex((t) => t.id === params.id);
    if (idx === -1) {
      return HttpResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Tenant not found' } },
        { status: 404 },
      );
    }
    const updated = { ...mockTenants[idx], status: body.status };
    mockTenants = mockTenants.map((t) => (t.id === params.id ? updated : t));
    return HttpResponse.json({ success: true, data: updated });
  }),

  http.get('/api/tenants/profile', ({ request }) => {
    if (!getAuthUser(request)) return unauthorized();
    return HttpResponse.json({ success: true, data: tenantProfile });
  }),

  http.patch('/api/tenants/profile', async ({ request }) => {
    if (!getAuthUser(request)) return unauthorized();
    const body = (await request.json()) as Partial<MockTenant>;
    tenantProfile = { ...tenantProfile, ...body };
    return HttpResponse.json({ success: true, data: tenantProfile });
  }),

  http.post('/api/tenants/setup', async ({ request }) => {
    if (!getAuthUser(request)) return unauthorized();
    tenantProfile = { ...tenantProfile, setupComplete: true };
    return HttpResponse.json({ success: true, data: tenantProfile });
  }),
];
