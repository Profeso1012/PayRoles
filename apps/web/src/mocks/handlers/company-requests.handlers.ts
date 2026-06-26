import { http, HttpResponse } from 'msw';
import { mockUsers } from '../data/auth.data';
import { mockCompanyRequests, type CompanyRequest } from '../data/company-requests.data';

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

let requests = [...mockCompanyRequests];

export const companyRequestHandlers = [
  // PUBLIC — no auth — company submits interest from landing page
  http.post('/api/company-requests', async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    const created: CompanyRequest = {
      id: `req-${Date.now()}`,
      companyName: String(body.companyName ?? ''),
      contactName: String(body.contactName ?? ''),
      email: String(body.email ?? ''),
      phone: String(body.phone ?? ''),
      companySize: String(body.companySize ?? ''),
      country: String(body.country ?? ''),
      message: String(body.message ?? ''),
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    requests = [...requests, created];
    return HttpResponse.json({ success: true, data: created }, { status: 201 });
  }),

  // Platform Admin: list all company requests
  http.get('/api/admin/company-requests', ({ request }) => {
    const user = getAuthUser(request);
    if (!user) return unauthorized();
    if (user.role !== 'PLATFORM_ADMIN') return forbidden();
    const url = new URL(request.url);
    const status = url.searchParams.get('status') ?? '';
    const filtered = status ? requests.filter((r) => r.status === status) : requests;
    return HttpResponse.json({ success: true, data: filtered });
  }),

  // Platform Admin: approve a request → create tenant + send invite
  http.patch('/api/admin/company-requests/:id/approve', async ({ request, params }) => {
    const user = getAuthUser(request);
    if (!user) return unauthorized();
    if (user.role !== 'PLATFORM_ADMIN') return forbidden();
    const idx = requests.findIndex((r) => r.id === params.id);
    if (idx === -1) {
      return HttpResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Request not found' } },
        { status: 404 },
      );
    }
    const updated = { ...requests[idx], status: 'approved' as const };
    requests = requests.map((r) => (r.id === params.id ? updated : r));
    // In reality this would create a tenant + send invite email
    return HttpResponse.json({
      success: true,
      data: {
        request: updated,
        message: `Invite sent to ${updated.email}`,
      },
    });
  }),

  // Platform Admin: reject a request
  http.patch('/api/admin/company-requests/:id/reject', ({ request, params }) => {
    const user = getAuthUser(request);
    if (!user) return unauthorized();
    if (user.role !== 'PLATFORM_ADMIN') return forbidden();
    const idx = requests.findIndex((r) => r.id === params.id);
    if (idx === -1) {
      return HttpResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Request not found' } },
        { status: 404 },
      );
    }
    const updated = { ...requests[idx], status: 'rejected' as const };
    requests = requests.map((r) => (r.id === params.id ? updated : r));
    return HttpResponse.json({ success: true, data: updated });
  }),

  // Platform Admin: resend invite to Company Super Admin (World 1 resend)
  http.post('/api/admin/company-requests/:id/resend-invite', ({ request, params }) => {
    const user = getAuthUser(request);
    if (!user) return unauthorized();
    if (user.role !== 'PLATFORM_ADMIN') return forbidden();
    const req = requests.find((r) => r.id === params.id);
    if (!req) {
      return HttpResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Request not found' } },
        { status: 404 },
      );
    }
    return HttpResponse.json({
      success: true,
      data: { message: `Invite resent to ${req.email}` },
    });
  }),
];
