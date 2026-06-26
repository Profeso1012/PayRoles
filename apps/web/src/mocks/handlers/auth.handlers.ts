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

export const authHandlers = [
  http.post('/api/auth/login', async ({ request }) => {
    const body = (await request.json()) as { email: string; password: string };
    const user = mockUsers.find(
      (u) => u.email === body.email && u.password === body.password,
    );
    if (!user) {
      return HttpResponse.json(
        { success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' } },
        { status: 401 },
      );
    }
    const { password: _pw, ...safeUser } = user;
    return HttpResponse.json({
      success: true,
      data: { token: user.id, user: safeUser, requiresOtp: false },
    });
  }),

  http.post('/api/auth/logout', () => {
    return HttpResponse.json({ success: true, data: null });
  }),

  http.get('/api/auth/me', ({ request }) => {
    const user = getAuthUser(request);
    if (!user) return unauthorized();
    const { password: _pw, ...safeUser } = user;
    return HttpResponse.json({ success: true, data: safeUser });
  }),

  http.post('/api/auth/forgot-password', () => {
    return HttpResponse.json({
      success: true,
      data: { message: 'If that email exists, a reset link has been sent.' },
    });
  }),

  http.post('/api/auth/reset-password', () => {
    return HttpResponse.json({ success: true, data: null });
  }),

  http.post('/api/auth/accept-invite', () => {
    return HttpResponse.json({
      success: true,
      data: {
        token: 'u-invited-1',
        user: {
          id: 'u-invited-1',
          email: 'newuser@dangote.com',
          fullName: 'New User',
          role: 'EMPLOYEE',
          tenantId: 'tenant-1',
          tenantName: 'Dangote Cement Plc',
          avatarUrl: null,
          permissions: ['view:own_payslips'],
        },
      },
    });
  }),
];
