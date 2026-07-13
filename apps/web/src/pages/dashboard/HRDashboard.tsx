import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Users, UserCheck, Clock, UserX, UserPlus, AlertTriangle, ArrowRight } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { apiClient } from '@/lib/api';
import { ENDPOINTS, USE_REAL_API, buildPaginationParams } from '@/lib/api/adapter';
import { transformPaginatedResponse, mapWorkerStatus } from '@/lib/api/transforms';
import { formatDate } from '@/lib/utils';
import { PATHS } from '@/router/paths';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Avatar from '@/components/ui/Avatar';
import Spinner from '@/components/ui/Spinner';
import ErrorState from '@/components/ui/ErrorState';

interface RecentHire {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  department: string;
  jobTitle: string;
  createdAt: string;
  status: string;
}

interface HRDashboardData {
  total: number;
  active: number;
  onLeave: number;
  exited: number;
  newThisMonth: number;
  missingBankDetails: number;
  recentHires: RecentHire[];
}

// Build HR dashboard data from workers API
async function buildHRDashboard(): Promise<HRDashboardData> {
  if (!USE_REAL_API) {
    return apiClient<HRDashboardData>('/dashboard/hr');
  }

  // Fetch all workers (or at least first 100 for stats)
  const params = buildPaginationParams({ page: 1, limit: 100 });
  params.set('sortBy', 'createdAt');
  params.set('sortDir', 'DESC');
  
  const response = await apiClient<any>(`${ENDPOINTS.WORKERS.LIST}?${params}`);
  const { data: workers, total } = transformPaginatedResponse(
    response.data || response, 
    response.meta
  );

  // Calculate stats
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  
  const active = workers.filter((w: any) => 
    mapWorkerStatus(w.status, 'toFrontend') === 'active'
  ).length;
  
  const onLeave = workers.filter((w: any) => 
    mapWorkerStatus(w.status, 'toFrontend') === 'on_leave'
  ).length;
  
  const exited = workers.filter((w: any) => 
    mapWorkerStatus(w.status, 'toFrontend') === 'terminated'
  ).length;
  
  const newThisMonth = workers.filter((w: any) => {
    const createdAt = new Date(w.createdAt);
    return createdAt >= firstDayOfMonth;
  }).length;
  
  const missingBankDetails = workers.filter((w: any) => 
    !w.bankName || (!w.bankAccount && !w.bankAccountEncrypted)
  ).length;

  // Recent hires (last 10)
  const recentHires = workers.slice(0, 10).map((w: any) => ({
    id: w.id,
    firstName: w.firstName,
    lastName: w.lastName,
    email: w.email || '',
    department: w.department || 'N/A',
    jobTitle: w.position || 'N/A',
    createdAt: w.createdAt,
    status: mapWorkerStatus(w.status, 'toFrontend'),
  }));

  return {
    total,
    active,
    onLeave,
    exited,
    newThisMonth,
    missingBankDetails,
    recentHires,
  };
}

const statusVariantMap: Record<string, 'active' | 'on_leave' | 'exited' | 'info'> = {
  active: 'active',
  on_leave: 'on_leave',
  exited: 'exited',
};

const statusLabelMap: Record<string, string> = {
  active: 'Active',
  on_leave: 'On Leave',
  exited: 'Exited',
};

export default function HRDashboard() {
  const navigate = useNavigate();
  const fullName = useAuthStore((s) => s.user?.fullName);

  const { data, isLoading, isError, refetch } = useQuery<HRDashboardData>({
    queryKey: ['dashboard-hr'],
    queryFn: buildHRDashboard,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isError || !data) {
    return <ErrorState message="Could not load HR dashboard." onRetry={() => refetch()} />;
  }

  const statCards = [
    {
      label: 'Total Employees',
      value: data.total,
      icon: Users,
      bg: 'bg-deep-cash',
      text: 'text-white',
      iconColor: 'text-mint-light',
    },
    {
      label: 'Active',
      value: data.active,
      icon: UserCheck,
      bg: 'bg-mint-light',
      text: 'text-deep-cash',
      iconColor: 'text-cash-green',
    },
    {
      label: 'On Leave',
      value: data.onLeave,
      icon: Clock,
      bg: 'bg-amber-50',
      text: 'text-amber-800',
      iconColor: 'text-amber-500',
    },
    {
      label: 'Exited',
      value: data.exited,
      icon: UserX,
      bg: 'bg-red-50',
      text: 'text-red-700',
      iconColor: 'text-red-400',
    },
  ];

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-sm text-cash-green font-medium mb-0.5">HR Dashboard</p>
          <h1 className="text-2xl font-bold text-deep-cash">
            Good morning, {fullName ?? 'there'}
          </h1>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="primary" onClick={() => navigate(PATHS.EMPLOYEE_ADD)}>
            <UserPlus size={16} />
            Add Employee
          </Button>
          <Button variant="secondary" onClick={() => navigate(PATHS.EMPLOYEES)}>
            View All
            <ArrowRight size={15} />
          </Button>
        </div>
      </div>

      {/* Alert: missing bank details */}
      {data.missingBankDetails > 0 && (
        <button
          type="button"
          onClick={() => navigate(PATHS.EMPLOYEES)}
          className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl bg-cash-gold/15 border border-cash-gold/40 text-left hover:bg-cash-gold/20 transition-colors"
        >
          <AlertTriangle size={20} className="text-cash-gold shrink-0" />
          <span className="text-sm font-medium text-deep-cash flex-1">
            {data.missingBankDetails} employee{data.missingBankDetails !== 1 ? 's' : ''} missing
            bank details — click to review
          </span>
          <ArrowRight size={16} className="text-cash-gold shrink-0" />
        </button>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className={`rounded-xl px-5 py-4 ${card.bg} flex flex-col gap-2`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-xs font-medium uppercase tracking-wide ${card.text} opacity-70`}>
                  {card.label}
                </span>
                <Icon size={18} className={card.iconColor} />
              </div>
              <span className={`text-3xl font-bold ${card.text}`}>{card.value}</span>
            </div>
          );
        })}
      </div>

      {/* New this month */}
      <div className="rounded-xl border border-mint-light bg-soft-white px-5 py-4 flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-fresh-cash/20 flex items-center justify-center shrink-0">
          <UserPlus size={20} className="text-cash-green" />
        </div>
        <div>
          <p className="text-xs text-cash-green/70 uppercase tracking-wide font-medium">
            New This Month
          </p>
          <p className="text-2xl font-bold text-deep-cash">{data.newThisMonth}</p>
        </div>
      </div>

      {/* Recent Hires table */}
      <div className="rounded-xl border border-mint-light overflow-hidden">
        <div className="px-5 py-4 border-b border-mint-light flex items-center justify-between bg-white">
          <h2 className="text-sm font-semibold text-deep-cash">Recent Hires</h2>
          <button
            type="button"
            onClick={() => navigate(PATHS.EMPLOYEES)}
            className="text-xs text-cash-green hover:text-fresh-cash font-medium flex items-center gap-1 transition-colors"
          >
            View all <ArrowRight size={13} />
          </button>
        </div>

        {data.recentHires.length === 0 ? (
          <div className="py-10 text-center text-sm text-cash-green/60 bg-white">
            No recent hires to show.
          </div>
        ) : (
          <div className="overflow-x-auto bg-white">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="bg-soft-white border-b border-mint-light">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-cash-green/70 uppercase tracking-wide">
                    Employee
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-cash-green/70 uppercase tracking-wide">
                    Department
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-cash-green/70 uppercase tracking-wide">
                    Job Title
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-cash-green/70 uppercase tracking-wide">
                    Joined
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-cash-green/70 uppercase tracking-wide">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-mint-light">
                {data.recentHires.map((hire) => (
                  <tr
                    key={hire.id}
                    onClick={() => navigate(PATHS.EMPLOYEE_DETAIL(hire.id))}
                    className="hover:bg-soft-white cursor-pointer transition-colors"
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <Avatar
                          name={`${hire.firstName} ${hire.lastName}`}
                          size="sm"
                        />
                        <div>
                          <p className="text-sm font-medium text-deep-cash">
                            {hire.firstName} {hire.lastName}
                          </p>
                          <p className="text-xs text-cash-green/60">{hire.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-cash-green">{hire.department}</td>
                    <td className="px-4 py-3.5 text-sm text-cash-green">{hire.jobTitle}</td>
                    <td className="px-4 py-3.5 text-xs text-cash-green/70">
                      {formatDate(hire.createdAt)}
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge
                        variant={statusVariantMap[hire.status] ?? 'info'}
                        label={statusLabelMap[hire.status] ?? hire.status}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
