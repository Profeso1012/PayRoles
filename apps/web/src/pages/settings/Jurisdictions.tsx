import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, ChevronUp, Globe } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { ENDPOINTS } from '@/lib/api/adapter';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/hooks/useToast';
import PageHeader from '@/components/layout/PageHeader';
import Badge from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';
import ErrorState from '@/components/ui/ErrorState';
import type { TaxJurisdiction, TaxRule, TaxVersion } from '@/lib/api/types';

const FLAG_EMOJI: Record<string, string> = {
  NG: '🇳🇬',
  GB: '🇬🇧',
  US: '🇺🇸',
  CA: '🇨🇦',
  GH: '🇬🇭',
  KE: '🇰🇪',
  ZA: '🇿🇦',
};

interface JurisdictionRow {
  jurisdiction: TaxJurisdiction;
  rules: Array<{ rule: TaxRule; versions: TaxVersion[] }>;
}

export default function Jurisdictions() {
  const qc = useQueryClient();
  const toast = useToast();
  const role = useAuthStore((s) => s.user?.role);
  const canEdit = role === 'tenant_admin' || role === 'super_admin';

  const [expandedCodes, setExpandedCodes] = useState<Set<string>>(new Set());
  const [togglingCode, setTogglingCode] = useState<string | null>(null);

  // Real tax module has no "enable/disable jurisdiction" concept - jurisdictions
  // are just country reference data. The actual configurable/toggleable unit is
  // a *tax rule version* (e.g. "Nigeria PIT 2026" can be active or inactive).
  const { data: rows, isLoading, isError, refetch } = useQuery<JurisdictionRow[]>({
    queryKey: ['tax-jurisdictions-with-rules'],
    queryFn: async () => {
      const [jurisdictions, rules] = await Promise.all([
        apiClient<TaxJurisdiction[]>(ENDPOINTS.TAX.JURISDICTIONS),
        apiClient<TaxRule[]>(ENDPOINTS.TAX.RULES),
      ]);

      return Promise.all(
        jurisdictions.map(async (jurisdiction): Promise<JurisdictionRow> => {
          const jurisdictionRules = rules.filter((r) => r.jurisdictionId === jurisdiction.id);
          const withVersions = await Promise.all(
            jurisdictionRules.map(async (rule) => {
              const versions = await apiClient<TaxVersion[]>(ENDPOINTS.TAX.RULE_VERSIONS(rule.code)).catch(
                () => [],
              );
              return { rule, versions };
            }),
          );
          return { jurisdiction, rules: withVersions };
        }),
      );
    },
  });

  const activateMutation = useMutation({
    mutationFn: ({ code, activate }: { code: string; activate: boolean }) =>
      apiClient(
        activate ? ENDPOINTS.TAX.ACTIVATE(code) : ENDPOINTS.TAX.DEACTIVATE(code),
        { method: 'PATCH' },
      ),
    onMutate: ({ code }) => setTogglingCode(code),
    onSuccess: (_, { activate }) => {
      qc.invalidateQueries({ queryKey: ['tax-jurisdictions-with-rules'] });
      toast.success(activate ? 'Tax version activated' : 'Tax version deactivated');
    },
    onError: () => toast.error('Failed to update tax version'),
    onSettled: () => setTogglingCode(null),
  });

  function toggleExpand(code: string) {
    setExpandedCodes((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isError || !rows) {
    return <ErrorState onRetry={() => refetch()} />;
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem 1.5rem' }}>
      <PageHeader
        title="Jurisdictions"
        breadcrumbs={[{ label: 'Settings' }, { label: 'Jurisdictions' }]}
      />

      <p style={{ fontSize: '0.875rem', color: '#1F6F4E', marginBottom: '1.5rem', marginTop: '-0.5rem' }}>
        Countries your payroll operates in, and the statutory tax rules configured for each.
      </p>

      {!canEdit && (
        <div
          style={{
            padding: '0.75rem 1rem',
            background: '#F7FAF8',
            border: '1px solid #CDEFD7',
            borderRadius: '0.5rem',
            marginBottom: '1.25rem',
            fontSize: '0.8125rem',
            color: '#1F6F4E',
          }}
        >
          You have read-only access. Contact your Tenant Admin to activate or deactivate tax rule versions.
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {rows.length === 0 && (
          <div style={{ background: '#fff', border: '1px solid #CDEFD7', borderRadius: '0.75rem', padding: '2rem', textAlign: 'center', color: '#1F6F4E', fontSize: '0.875rem' }}>
            No jurisdictions configured yet.
          </div>
        )}

        {rows.map(({ jurisdiction, rules }) => {
          const isExpanded = expandedCodes.has(jurisdiction.code);

          return (
            <div
              key={jurisdiction.id}
              style={{
                background: '#fff',
                border: '1px solid #CDEFD7',
                borderRadius: '0.75rem',
                overflow: 'hidden',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', padding: '1rem 1.25rem' }}>
                <span style={{ fontSize: '1.5rem', lineHeight: 1, flexShrink: 0 }}>
                  {FLAG_EMOJI[jurisdiction.code] ?? <Globe size={24} />}
                </span>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 600, color: '#0F2E23', fontSize: '0.9375rem' }}>
                    {jurisdiction.name}
                  </p>
                  <p style={{ fontSize: '0.8125rem', color: '#1F6F4E', marginTop: '0.125rem' }}>
                    {jurisdiction.currency} · {rules.length} tax rule{rules.length !== 1 ? 's' : ''}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => toggleExpand(jurisdiction.code)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    padding: '0.375rem 0.625rem',
                    borderRadius: '0.375rem',
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    color: '#1F6F4E',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                  }}
                >
                  {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  {isExpanded ? 'Hide' : 'Show'} rules
                </button>
              </div>

              {isExpanded && (
                <div style={{ borderTop: '1px solid #CDEFD7', padding: '0.875rem 1.25rem', background: '#F7FAF8' }}>
                  {rules.length === 0 ? (
                    <p style={{ fontSize: '0.8125rem', color: '#1F6F4E' }}>No tax rules configured for this jurisdiction.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {rules.map(({ rule, versions }) => (
                        <div key={rule.id}>
                          <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#0F2E23', marginBottom: '0.375rem' }}>
                            {rule.name}
                          </p>
                          {versions.length === 0 ? (
                            <p style={{ fontSize: '0.75rem', color: '#1F6F4E', paddingLeft: '0.5rem' }}>No versions defined.</p>
                          ) : (
                            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                              {versions.map((v) => {
                                const isToggling = togglingCode === v.code;
                                return (
                                  <li
                                    key={v.id}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      gap: '0.5rem',
                                      fontSize: '0.8125rem',
                                      color: '#1F6F4E',
                                      paddingLeft: '0.5rem',
                                      opacity: isToggling ? 0.6 : 1,
                                    }}
                                  >
                                    <span>
                                      {v.name} <span style={{ color: '#4FAD72' }}>· effective {v.effectiveDate}</span>
                                    </span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                      <Badge variant={v.isActive ? 'success' : 'info'} label={v.isActive ? 'Active' : 'Inactive'} />
                                      {canEdit && (
                                        <button
                                          type="button"
                                          disabled={isToggling}
                                          onClick={() =>
                                            activateMutation.mutate({ code: v.code, activate: !v.isActive })
                                          }
                                          style={{
                                            fontSize: '0.75rem',
                                            fontWeight: 600,
                                            color: '#1F6F4E',
                                            background: 'transparent',
                                            border: '1px solid #CDEFD7',
                                            borderRadius: '0.375rem',
                                            padding: '0.2rem 0.5rem',
                                            cursor: isToggling ? 'default' : 'pointer',
                                          }}
                                        >
                                          {v.isActive ? 'Deactivate' : 'Activate'}
                                        </button>
                                      )}
                                    </div>
                                  </li>
                                );
                              })}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
