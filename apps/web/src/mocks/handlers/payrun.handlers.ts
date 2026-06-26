import { http, HttpResponse } from 'msw';
import { mockPayRuns, mockPayRunEmployees, mockPayslips } from '../data/payroll.data';
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

let payRuns = [...mockPayRuns];

// Map of payRunId -> setTimeout has fired (i.e., calculation is done)
const calculatingRuns = new Map<string, boolean>();

export const payrunHandlers = [
  http.get('/api/pay-runs', ({ request }) => {
    if (!getAuthUser(request)) return unauthorized();
    const url = new URL(request.url);
    const status = url.searchParams.get('status') ?? '';
    const page = Number(url.searchParams.get('page') ?? '1');
    const pageSize = Number(url.searchParams.get('pageSize') ?? '20');

    let filtered = payRuns;
    if (status) {
      filtered = filtered.filter((r) => r.status === status);
    }

    const total = filtered.length;
    const start = (page - 1) * pageSize;
    const paginated = filtered.slice(start, start + pageSize);

    return HttpResponse.json({
      success: true,
      data: paginated,
      meta: { page, pageSize, total },
    });
  }),

  http.post('/api/pay-runs', async ({ request }) => {
    const user = getAuthUser(request);
    if (!user) return unauthorized();
    if (user.role !== 'PAYROLL_MANAGER' && user.role !== 'COMPANY_SUPER_ADMIN') {
      return forbidden('Only Payroll Managers can create pay runs.');
    }
    const body = (await request.json()) as Record<string, unknown>;
    const created = {
      id: `run-${Date.now()}`,
      tenantId: 'tenant-1',
      status: 'draft',
      employeeCount: 0,
      totalGross: 0,
      totalNet: 0,
      totalDeductions: 0,
      currency: 'NGN',
      createdById: user.id,
      approvedById: null,
      createdAt: new Date().toISOString(),
      approvedAt: null,
      ...body,
    };
    payRuns = [...payRuns, created as typeof payRuns[0]];
    return HttpResponse.json({ success: true, data: created }, { status: 201 });
  }),

  http.get('/api/pay-runs/:id', ({ request, params }) => {
    if (!getAuthUser(request)) return unauthorized();

    let run = payRuns.find((r) => r.id === params.id);
    if (!run) {
      return HttpResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Pay run not found' } },
        { status: 404 },
      );
    }

    // If calculation timer has fired, promote status to 'calculated'
    if (run.status === 'calculating' && calculatingRuns.get(run.id) === true) {
      const updated = { ...run, status: 'calculated' as const };
      payRuns = payRuns.map((r) => (r.id === params.id ? updated : r));
      run = updated;
      calculatingRuns.delete(run.id);
    }

    return HttpResponse.json({ success: true, data: run });
  }),

  http.post('/api/pay-runs/:id/calculate', ({ request, params }) => {
    const user = getAuthUser(request);
    if (!user) return unauthorized();
    if (user.role !== 'PAYROLL_MANAGER' && user.role !== 'COMPANY_SUPER_ADMIN') {
      return forbidden('Only Payroll Managers can trigger calculation.');
    }

    const idx = payRuns.findIndex((r) => r.id === params.id);
    if (idx === -1) {
      return HttpResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Pay run not found' } },
        { status: 404 },
      );
    }

    const updated = {
      ...payRuns[idx],
      status: 'calculating' as const,
      employeeCount: mockPayRunEmployees.length,
      totalGross: mockPayRunEmployees.reduce((s, e) => s + e.grossPay, 0),
      totalDeductions: mockPayRunEmployees.reduce((s, e) => s + e.totalDeductions, 0),
      totalNet: mockPayRunEmployees.reduce((s, e) => s + e.netPay, 0),
    };
    payRuns = payRuns.map((r) => (r.id === params.id ? updated : r));

    calculatingRuns.set(params.id as string, false);
    setTimeout(() => {
      calculatingRuns.set(params.id as string, true);
    }, 3000);

    return HttpResponse.json({ success: true, data: updated });
  }),

  http.post('/api/pay-runs/:id/submit', ({ request, params }) => {
    const user = getAuthUser(request);
    if (!user) return unauthorized();
    if (user.role !== 'PAYROLL_MANAGER' && user.role !== 'COMPANY_SUPER_ADMIN') {
      return forbidden('Only Payroll Managers can submit pay runs.');
    }

    const idx = payRuns.findIndex((r) => r.id === params.id);
    if (idx === -1) {
      return HttpResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Pay run not found' } },
        { status: 404 },
      );
    }

    const updated = { ...payRuns[idx], status: 'in_review' as const };
    payRuns = payRuns.map((r) => (r.id === params.id ? updated : r));
    return HttpResponse.json({ success: true, data: updated });
  }),

  http.post('/api/pay-runs/:id/approve', ({ request, params }) => {
    const user = getAuthUser(request);
    if (!user) return unauthorized();
    if (user.role !== 'FINANCE_DIRECTOR') {
      return forbidden('Only Finance Directors can approve pay runs.');
    }

    const idx = payRuns.findIndex((r) => r.id === params.id);
    if (idx === -1) {
      return HttpResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Pay run not found' } },
        { status: 404 },
      );
    }

    const updated = {
      ...payRuns[idx],
      status: 'approved' as const,
      approvedById: user.id,
      approvedAt: new Date().toISOString(),
    };
    payRuns = payRuns.map((r) => (r.id === params.id ? updated : r));
    return HttpResponse.json({ success: true, data: updated });
  }),

  http.post('/api/pay-runs/:id/reject', async ({ request, params }) => {
    const user = getAuthUser(request);
    if (!user) return unauthorized();
    if (user.role !== 'FINANCE_DIRECTOR') {
      return forbidden('Only Finance Directors can reject pay runs.');
    }

    const idx = payRuns.findIndex((r) => r.id === params.id);
    if (idx === -1) {
      return HttpResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Pay run not found' } },
        { status: 404 },
      );
    }

    const updated = {
      ...payRuns[idx],
      status: 'calculated' as const,
      approvedById: null,
      approvedAt: null,
    };
    payRuns = payRuns.map((r) => (r.id === params.id ? updated : r));
    return HttpResponse.json({ success: true, data: updated });
  }),

  http.get('/api/pay-runs/:id/register', ({ request, params }) => {
    if (!getAuthUser(request)) return unauthorized();
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page') ?? '1');
    const pageSize = Number(url.searchParams.get('pageSize') ?? '20');

    // mockPayRunEmployees are tied to run-1; for other runs return the same set as a demo
    const total = mockPayRunEmployees.length;
    const start = (page - 1) * pageSize;
    const paginated = mockPayRunEmployees.slice(start, start + pageSize);

    return HttpResponse.json({
      success: true,
      data: paginated,
      meta: { page, pageSize, total },
    });
  }),

  http.get('/api/pay-runs/:id/payslips', ({ request, params }) => {
    if (!getAuthUser(request)) return unauthorized();
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page') ?? '1');
    const pageSize = Number(url.searchParams.get('pageSize') ?? '20');

    const forRun = mockPayslips.filter((s) => s.payRunId === params.id);
    const total = forRun.length;
    const start = (page - 1) * pageSize;
    const paginated = forRun.slice(start, start + pageSize);

    return HttpResponse.json({
      success: true,
      data: paginated,
      meta: { page, pageSize, total },
    });
  }),

  http.get('/api/payslips/:id', ({ request, params }) => {
    if (!getAuthUser(request)) return unauthorized();
    const payslip = mockPayslips.find((s) => s.id === params.id);
    if (!payslip) {
      return HttpResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Payslip not found' } },
        { status: 404 },
      );
    }
    return HttpResponse.json({ success: true, data: payslip });
  }),
];
