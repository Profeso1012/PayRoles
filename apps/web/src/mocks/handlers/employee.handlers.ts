import { http, HttpResponse } from 'msw';
import { mockEmployees, mockAssignments, mockCompensations } from '../data/employee.data';
import { mockPayslips } from '../data/payroll.data';
import { mockUsers } from '../data/auth.data';

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

let employees = [...mockEmployees];
let assignments = [...mockAssignments];
let compensations = [...mockCompensations];

export const employeeHandlers = [
  http.get('/api/employees', ({ request }) => {
    if (!getAuthUser(request)) return unauthorized();
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page') ?? '1');
    const pageSize = Number(url.searchParams.get('pageSize') ?? '20');
    const search = (url.searchParams.get('search') ?? '').toLowerCase();
    const status = url.searchParams.get('status') ?? '';
    const departmentId = url.searchParams.get('departmentId') ?? '';

    let filtered = employees;

    if (search) {
      filtered = filtered.filter(
        (e) =>
          e.firstName.toLowerCase().includes(search) ||
          e.lastName.toLowerCase().includes(search) ||
          e.email.toLowerCase().includes(search) ||
          e.employeeNumber.toLowerCase().includes(search),
      );
    }

    if (status) {
      filtered = filtered.filter((e) => e.status === status);
    }

    if (departmentId) {
      const empIds = new Set(
        assignments.filter((a) => a.departmentId === departmentId).map((a) => a.employeeId),
      );
      filtered = filtered.filter((e) => empIds.has(e.id));
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

  http.post('/api/employees', async ({ request }) => {
    if (!getAuthUser(request)) return unauthorized();
    const body = (await request.json()) as Record<string, unknown>;
    const num = String(employees.length + 1).padStart(4, '0');
    const created = {
      id: `emp-${Date.now()}`,
      tenantId: 'tenant-1',
      employeeNumber: `DCP-${num}`,
      status: 'active',
      avatarUrl: null,
      bankDetails: [],
      createdAt: new Date().toISOString(),
      ...body,
    };
    employees = [...employees, created as unknown as typeof employees[0]];
    return HttpResponse.json({ success: true, data: created }, { status: 201 });
  }),

  http.get('/api/employees/:id', ({ request, params }) => {
    if (!getAuthUser(request)) return unauthorized();
    const employee = employees.find((e) => e.id === params.id);
    if (!employee) {
      return HttpResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Employee not found' } },
        { status: 404 },
      );
    }
    return HttpResponse.json({ success: true, data: employee });
  }),

  http.patch('/api/employees/:id', async ({ request, params }) => {
    if (!getAuthUser(request)) return unauthorized();
    const body = (await request.json()) as Record<string, unknown>;
    const idx = employees.findIndex((e) => e.id === params.id);
    if (idx === -1) {
      return HttpResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Employee not found' } },
        { status: 404 },
      );
    }
    const updated = { ...employees[idx], ...body };
    employees = employees.map((e) => (e.id === params.id ? updated : e));
    return HttpResponse.json({ success: true, data: updated });
  }),

  http.get('/api/employees/:id/assignments', ({ request, params }) => {
    if (!getAuthUser(request)) return unauthorized();
    const result = assignments.filter((a) => a.employeeId === params.id);
    return HttpResponse.json({ success: true, data: result });
  }),

  http.post('/api/employees/:id/assignments', async ({ request, params }) => {
    if (!getAuthUser(request)) return unauthorized();
    const body = (await request.json()) as Record<string, unknown>;
    const created = {
      id: `asn-${Date.now()}`,
      employeeId: params.id as string,
      effectiveTo: null,
      ...body,
    };
    assignments = [...assignments, created as typeof assignments[0]];
    return HttpResponse.json({ success: true, data: created }, { status: 201 });
  }),

  http.get('/api/employees/:id/compensations', ({ request, params }) => {
    if (!getAuthUser(request)) return unauthorized();
    const result = compensations.filter((c) => c.employeeId === params.id);
    return HttpResponse.json({ success: true, data: result });
  }),

  http.post('/api/employees/:id/compensations', async ({ request, params }) => {
    if (!getAuthUser(request)) return unauthorized();
    const body = (await request.json()) as Record<string, unknown>;
    const created = {
      id: `comp-${Date.now()}`,
      employeeId: params.id as string,
      effectiveTo: null,
      ...body,
    };
    compensations = [...compensations, created as typeof compensations[0]];
    return HttpResponse.json({ success: true, data: created }, { status: 201 });
  }),

  http.get('/api/employees/:id/payslips', ({ request, params }) => {
    if (!getAuthUser(request)) return unauthorized();
    const result = mockPayslips.filter((s) => s.employeeId === params.id);
    return HttpResponse.json({ success: true, data: result });
  }),
];
