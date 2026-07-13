import { useQuery } from '@tanstack/react-query';
import { Building2, Users, CheckCircle, PauseCircle, Archive } from 'lucide-react';
import { apiClientWithMeta } from '@/lib/api';
import { ENDPOINTS, buildPaginationParams } from '@/lib/api/adapter';
import Spinner from '@/components/ui/Spinner';
import ErrorState from '@/components/ui/ErrorState';
import Badge from '@/components/ui/Badge';
import { formatDate } from '@/lib/utils';
import type { BackendTenant } from '@/lib/api/types';

// Real backend Status enum (common.enum.ts): active | inactive | suspended | archived.
// There is no "onboarding" tenant status.
const STATUS_ICON: Record<string, React.ReactNode> = {
  active: <CheckCircle size={18} className="text-fresh-cash" />,
  inactive: <PauseCircle size={18} className="text-cash-gold" />,
  suspended: <PauseCircle size={18} className="text-red-400" />,
  archived: <Archive size={18} className="text-cash-green/40" />,
};

export default function SADashboard() {
  const { data: tenants, isLoading, isError, refetch } = useQuery<BackendTenant[]>({
    queryKey: ['platform-tenants'],
    queryFn: async () => {
      const params = buildPaginationParams({ page: 1, limit: 100 });
      const { data } = await apiClientWithMeta<BackendTenant[]>(`${ENDPOINTS.PLATFORM_TENANTS.LIST}?${params}`);
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isError || !tenants) {
    return <ErrorState message="Failed to load tenants." onRetry={() => refetch()} />;
  }

  const active = tenants.filter((t) => t.status === 'active').length;
  const suspended = tenants.filter((t) => t.status === 'suspended').length;
  const inactive = tenants.filter((t) => t.status === 'inactive' || t.status === 'archived').length;
  const recent = [...tenants].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5);

  const stats = [
    { label: 'Total Companies', value: tenants.length, icon: Building2, color: 'text-fresh-cash', bg: 'bg-mint-light/40' },
    { label: 'Active', value: active, icon: CheckCircle, color: 'text-fresh-cash', bg: 'bg-mint-light/40' },
    { label: 'Inactive', value: inactive, icon: Archive, color: 'text-cash-gold', bg: 'bg-cash-gold/10' },
    { label: 'Suspended', value: suspended, icon: PauseCircle, color: 'text-red-400', bg: 'bg-red-50' },
  ];

  return (
    <div className="p-6 max-w-[1200px] mx-auto">
      <div className="mb-8">
        <h1 className="text-[clamp(1.25rem,2.5vw,1.75rem)] font-semibold text-deep-cash">Platform Overview</h1>
        <p className="text-sm text-cash-green/70 mt-1">All companies on the PayRole platform</p>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }} className="mb-10">
        {stats.map((s) => (
          <div key={s.label} className="bg-white border border-mint-light rounded-xl p-5 flex items-center gap-4 shadow-sm">
            <div className={`w-11 h-11 rounded-lg ${s.bg} flex items-center justify-center flex-shrink-0`}>
              <s.icon size={22} className={s.color} />
            </div>
            <div>
              <p className="text-2xl font-bold text-deep-cash">{s.value}</p>
              <p className="text-xs text-cash-green/70 mt-0.5">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Recent tenants */}
      <div className="bg-white border border-mint-light rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-mint-light flex items-center gap-2">
          <Users size={16} className="text-cash-green" />
          <h2 className="text-sm font-semibold text-deep-cash">Recent Companies</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-mint-light bg-soft-white">
                {['Company', 'Contact Email', 'Country', 'Currency', 'Status', 'Joined'].map((h) => (
                  <th key={h} className="text-left px-6 py-3 text-xs font-medium text-cash-green/70 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recent.map((t) => (
                <tr key={t.id} className="border-b border-mint-light/60 hover:bg-soft-white transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {STATUS_ICON[t.status] ?? null}
                      <span className="font-medium text-deep-cash">{t.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-cash-green/80">{t.contactEmail}</td>
                  <td className="px-6 py-4 text-cash-green/80">{t.country || '—'}</td>
                  <td className="px-6 py-4 text-cash-green/80">{t.currency || '—'}</td>
                  <td className="px-6 py-4">
                    <Badge
                      variant={t.status === 'active' ? 'success' : t.status === 'suspended' ? 'danger' : 'warning'}
                      label={t.status}
                    />
                  </td>
                  <td className="px-6 py-4 text-cash-green/70">{formatDate(t.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
