import { http, HttpResponse } from 'msw';
import { mockUsers } from '../data/auth.data';
import { mockEmployees } from '../data/employee.data';
import { mockPayRuns, mockPayslips } from '../data/payroll.data';


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

export const dashboardHandlers = [
  http.get('/api/dashboard/hr', ({ request }) => {
    if (!getAuthUser(request)) return unauthorized();
    const active = mockEmployees.filter((e) => e.status === 'active').length;
    const onLeave = mockEmployees.filter((e) => e.status === 'suspended').length;
    const exited = mockEmployees.filter((e) => e.status === 'inactive' || e.status === 'archived').length;
    const missingBank = mockEmployees.filter((e) => e.bankDetails.length === 0).length;
    // "New this month" — created in 2026-06
    const newThisMonth = mockEmployees.filter((e) => e.createdAt.startsWith('2026-06')).length;
    const recentHires = [...mockEmployees]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
    return HttpResponse.json({
      success: true,
      data: {
        total: mockEmployees.length,
        active,
        onLeave,
        exited,
        newThisMonth,
        missingBankDetails: missingBank,
        recentHires,
      },
    });
  }),

  http.get('/api/dashboard/payroll', ({ request }) => {
    if (!getAuthUser(request)) return unauthorized();
    const runsThisMonth = mockPayRuns.filter((r) => r.period === '2026-06').length;
    const pendingApproval = mockPayRuns.filter((r) => r.status === 'in_review').length;
    const drafts = mockPayRuns.filter((r) => r.status === 'draft').length;
    return HttpResponse.json({
      success: true,
      data: {
        runsThisMonth,
        pendingApproval,
        drafts,
        nextPayDate: '2026-06-28',
        recentRuns: mockPayRuns.slice(0, 4),
      },
    });
  }),

  http.get('/api/dashboard/finance', ({ request }) => {
    if (!getAuthUser(request)) return unauthorized();
    const awaitingApproval = mockPayRuns.filter((r) => r.status === 'in_review');
    const approvedThisMonth = mockPayRuns.filter(
      (r) => r.status === 'approved' || r.status === 'paid',
    );
    const totalPayrollCost = approvedThisMonth.reduce((s, r) => s + r.totalGross, 0);
    return HttpResponse.json({
      success: true,
      data: {
        awaitingApproval: awaitingApproval.length,
        approvedThisMonth: approvedThisMonth.length,
        totalPayrollCost,
        currency: 'NGN',
        approvalQueue: awaitingApproval,
      },
    });
  }),

  http.get('/api/dashboard/employee', ({ request }) => {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return unauthorized();
    const token = authHeader.slice(7);
    const user = mockUsers.find((u) => u.id === token);
    if (!user) return unauthorized();

    const employee = mockEmployees.find((e) => e.email === user.email);

    // Latest payslip for this employee
    const myPayslips = mockPayslips.filter(
      (s) => s.employeeId === (employee?.id ?? ''),
    );
    const latest = myPayslips[myPayslips.length - 1] ?? null;

    return HttpResponse.json({
      success: true,
      data: {
        employeeName: user.fullName,
        nextPayDate: '2026-06-28',
        payGroupName: 'Lagos Monthly Staff',
        latestPayslip: latest,
        totalPayslips: myPayslips.length,
      },
    });
  }),
];
