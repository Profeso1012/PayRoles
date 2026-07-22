import { http, HttpResponse } from 'msw';
import {
  mockLegalEntities,
  mockDepartments,
  mockLocations,
  mockPayGroups,
  mockJobGrades,
} from '../data/organisation.data';
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

let legalEntities = [...mockLegalEntities];
let departments = [...mockDepartments];
let locations = [...mockLocations];
let payGroups = [...mockPayGroups];
let jobGrades = [...mockJobGrades];

export const organisationHandlers = [
  http.get('/api/organisation/setup-status', ({ request }) => {
    if (!getAuthUser(request)) return unauthorized();
    return HttpResponse.json({
      success: true,
      data: { hasLegalEntities: true, hasDepartments: true, hasPayGroups: true },
    });
  }),

  http.get('/api/organisation/overview', ({ request }) => {
    if (!getAuthUser(request)) return unauthorized();
    const overview = legalEntities.map((le) => ({
      ...le,
      departments: departments.filter((d) => d.legalEntityId === le.id),
      locations: locations.filter((l) => l.legalEntityId === le.id),
      payGroups: payGroups.filter((pg) => pg.legalEntityId === le.id),
    }));
    return HttpResponse.json({ success: true, data: overview });
  }),

  http.get('/api/organisation/legal-entities', ({ request }) => {
    if (!getAuthUser(request)) return unauthorized();
    return HttpResponse.json({ success: true, data: legalEntities });
  }),

  http.post('/api/organisation/legal-entities', async ({ request }) => {
    if (!getAuthUser(request)) return unauthorized();
    const body = (await request.json()) as Record<string, unknown>;
    const created = {
      id: `le-${Date.now()}`,
      tenantId: 'tenant-1',
      createdAt: new Date().toISOString(),
      ...body,
    };
    legalEntities = [...legalEntities, created as typeof legalEntities[0]];
    return HttpResponse.json({ success: true, data: created }, { status: 201 });
  }),

  http.get('/api/organisation/departments', ({ request }) => {
    if (!getAuthUser(request)) return unauthorized();
    const url = new URL(request.url);
    const legalEntityId = url.searchParams.get('legalEntityId');
    const result = legalEntityId
      ? departments.filter((d) => d.legalEntityId === legalEntityId)
      : departments;
    return HttpResponse.json({ success: true, data: result });
  }),

  http.post('/api/organisation/departments', async ({ request }) => {
    if (!getAuthUser(request)) return unauthorized();
    const body = (await request.json()) as Record<string, unknown>;
    const created = { id: `dept-${Date.now()}`, ...body };
    departments = [...departments, created as typeof departments[0]];
    return HttpResponse.json({ success: true, data: created }, { status: 201 });
  }),

  http.patch('/api/organisation/departments/:id', async ({ request, params }) => {
    if (!getAuthUser(request)) return unauthorized();
    const body = (await request.json()) as Record<string, unknown>;
    const idx = departments.findIndex((d) => d.id === params.id);
    if (idx === -1) {
      return HttpResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Department not found' } },
        { status: 404 },
      );
    }
    const updated = { ...departments[idx], ...body };
    departments = departments.map((d) => (d.id === params.id ? updated : d));
    return HttpResponse.json({ success: true, data: updated });
  }),

  http.delete('/api/organisation/departments/:id', ({ request, params }) => {
    if (!getAuthUser(request)) return unauthorized();
    departments = departments.filter((d) => d.id !== params.id);
    return HttpResponse.json({ success: true, data: null });
  }),

  http.get('/api/organisation/locations', ({ request }) => {
    if (!getAuthUser(request)) return unauthorized();
    const url = new URL(request.url);
    const legalEntityId = url.searchParams.get('legalEntityId');
    const result = legalEntityId
      ? locations.filter((l) => l.legalEntityId === legalEntityId)
      : locations;
    return HttpResponse.json({ success: true, data: result });
  }),

  http.post('/api/organisation/locations', async ({ request }) => {
    if (!getAuthUser(request)) return unauthorized();
    const body = (await request.json()) as Record<string, unknown>;
    const created = { id: `loc-${Date.now()}`, ...body };
    locations = [...locations, created as typeof locations[0]];
    return HttpResponse.json({ success: true, data: created }, { status: 201 });
  }),

  http.get('/api/organisation/pay-groups', ({ request }) => {
    if (!getAuthUser(request)) return unauthorized();
    return HttpResponse.json({ success: true, data: payGroups });
  }),

  http.post('/api/organisation/pay-groups', async ({ request }) => {
    if (!getAuthUser(request)) return unauthorized();
    const body = (await request.json()) as Record<string, unknown>;
    const created = { id: `pg-${Date.now()}`, tenantId: 'tenant-1', ...body };
    payGroups = [...payGroups, created as typeof payGroups[0]];
    return HttpResponse.json({ success: true, data: created }, { status: 201 });
  }),

  http.patch('/api/organisation/pay-groups/:id', async ({ request, params }) => {
    if (!getAuthUser(request)) return unauthorized();
    const body = (await request.json()) as Record<string, unknown>;
    const idx = payGroups.findIndex((pg) => pg.id === params.id);
    if (idx === -1) {
      return HttpResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Pay group not found' } },
        { status: 404 },
      );
    }
    const updated = { ...payGroups[idx], ...body };
    payGroups = payGroups.map((pg) => (pg.id === params.id ? updated : pg));
    return HttpResponse.json({ success: true, data: updated });
  }),

  http.delete('/api/organisation/pay-groups/:id', ({ request, params }) => {
    if (!getAuthUser(request)) return unauthorized();
    payGroups = payGroups.filter((pg) => pg.id !== params.id);
    return HttpResponse.json({ success: true, data: null });
  }),

  http.get('/api/organisation/job-grades', ({ request }) => {
    if (!getAuthUser(request)) return unauthorized();
    return HttpResponse.json({ success: true, data: jobGrades });
  }),

  http.post('/api/organisation/job-grades', async ({ request }) => {
    if (!getAuthUser(request)) return unauthorized();
    const body = (await request.json()) as Record<string, unknown>;
    const created = { id: `jg-${Date.now()}`, tenantId: 'tenant-1', ...body };
    jobGrades = [...jobGrades, created as typeof jobGrades[0]];
    return HttpResponse.json({ success: true, data: created }, { status: 201 });
  }),

  http.patch('/api/organisation/locations/:id', async ({ request, params }) => {
    if (!getAuthUser(request)) return unauthorized();
    const body = (await request.json()) as Record<string, unknown>;
    const idx = locations.findIndex((l) => l.id === params.id);
    if (idx === -1) {
      return HttpResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Location not found' } },
        { status: 404 },
      );
    }
    const updated = { ...locations[idx], ...body };
    locations = locations.map((l) => (l.id === params.id ? updated : l));
    return HttpResponse.json({ success: true, data: updated });
  }),

  http.delete('/api/organisation/locations/:id', ({ request, params }) => {
    if (!getAuthUser(request)) return unauthorized();
    locations = locations.filter((l) => l.id !== params.id);
    return HttpResponse.json({ success: true, data: null });
  }),

  http.patch('/api/organisation/legal-entities/:id', async ({ request, params }) => {
    if (!getAuthUser(request)) return unauthorized();
    const body = (await request.json()) as Record<string, unknown>;
    const idx = legalEntities.findIndex((le) => le.id === params.id);
    if (idx === -1) {
      return HttpResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Legal entity not found' } },
        { status: 404 },
      );
    }
    const updated = { ...legalEntities[idx], ...body };
    legalEntities = legalEntities.map((le) => (le.id === params.id ? updated : le));
    return HttpResponse.json({ success: true, data: updated });
  }),

  http.delete('/api/organisation/legal-entities/:id', ({ request, params }) => {
    if (!getAuthUser(request)) return unauthorized();
    legalEntities = legalEntities.filter((le) => le.id !== params.id);
    return HttpResponse.json({ success: true, data: null });
  }),

  http.patch('/api/organisation/job-grades/:id', async ({ request, params }) => {
    if (!getAuthUser(request)) return unauthorized();
    const body = (await request.json()) as Record<string, unknown>;
    const idx = jobGrades.findIndex((jg) => jg.id === params.id);
    if (idx === -1) {
      return HttpResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Job grade not found' } },
        { status: 404 },
      );
    }
    const updated = { ...jobGrades[idx], ...body };
    jobGrades = jobGrades.map((jg) => (jg.id === params.id ? updated : jg));
    return HttpResponse.json({ success: true, data: updated });
  }),

  http.delete('/api/organisation/job-grades/:id', ({ request, params }) => {
    if (!getAuthUser(request)) return unauthorized();
    jobGrades = jobGrades.filter((jg) => jg.id !== params.id);
    return HttpResponse.json({ success: true, data: null });
  }),
];
