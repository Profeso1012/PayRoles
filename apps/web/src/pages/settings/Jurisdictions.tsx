import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, ChevronUp, Globe } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { USE_REAL_API } from '@/lib/api/adapter';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/hooks/useToast';
import PageHeader from '@/components/layout/PageHeader';
import Spinner from '@/components/ui/Spinner';
import ErrorState from '@/components/ui/ErrorState';

interface Jurisdiction {
  code: string;
  name: string;
  currency: string;
  active: boolean;
  deductions: string[];
}

const FLAG_EMOJI: Record<string, string> = {
  NG: '🇳🇬',
  GB: '🇬🇧',
  US: '🇺🇸',
  CA: '🇨🇦',
  GH: '🇬🇭',
  KE: '🇰🇪',
  ZA: '🇿🇦',
};

export default function Jurisdictions() {
  const qc = useQueryClient();
  const toast = useToast();
  const role = useAuthStore((s) => s.user?.role);
  const canEdit = role === 'tenant_admin' || role === 'super_admin';

  const [expandedCodes, setExpandedCodes] = useState<Set<string>>(new Set());
  const [togglingCode, setTogglingCode] = useState<string | null>(null);

  const { data: jurisdictions, isLoading, isError, refetch } = useQuery<Jurisdiction[]>({
    queryKey: ['settings-jurisdictions'],
    queryFn: () => {
      if (!USE_REAL_API) {
        return apiClient('/settings/jurisdictions');
      }
      // Backend may not have this endpoint yet, fall back to mock
      return apiClient('/settings/jurisdictions');
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ code, active }: { code: string; active: boolean }) => {
      if (!USE_REAL_API) {
        return apiClient(`/settings/jurisdictions/${code}`, {
          method: 'PATCH',
          body: JSON.stringify({ active }),
        });
      }
      // Backend may not have this endpoint yet, fall back to mock
      return apiClient(`/settings/jurisdictions/${code}`, {
        method: 'PATCH',
        body: JSON.stringify({ active }),
      });
    },
    onMutate: ({ code }) => setTogglingCode(code),
    onSuccess: (_, { code, active }) => {
      qc.invalidateQueries({ queryKey: ['settings-jurisdictions'] });
      const jurisdiction = (jurisdictions ?? []).find((j) => j.code === code);
      toast.success(
        `${jurisdiction?.name ?? code} ${active ? 'enabled' : 'disabled'}`,
      );
    },
    onError: (_, { code }) => {
      const jurisdiction = (jurisdictions ?? []).find((j) => j.code === code);
      toast.error(`Failed to update ${jurisdiction?.name ?? code}`);
    },
    onSettled: () => setTogglingCode(null),
  });

  function toggleExpand(code: string) {
    setExpandedCodes((prev) => {
      const next = new Set(prev);
      if (next.has(code)) {
        next.delete(code);
      } else {
        next.add(code);
      }
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

  if (isError || !jurisdictions) {
    return <ErrorState onRetry={refetch} />;
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem 1.5rem' }}>
      <PageHeader
        title="Jurisdictions"
        breadcrumbs={[{ label: 'Settings' }, { label: 'Jurisdictions' }]}
      />

      <p style={{ fontSize: '0.875rem', color: '#1F6F4E', marginBottom: '1.5rem', marginTop: '-0.5rem' }}>
        Control which countries' statutory deductions apply to your payroll.
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
          You have read-only access. Contact your Super Admin to enable or disable jurisdictions.
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {jurisdictions.map((j) => {
          const isExpanded = expandedCodes.has(j.code);
          const isToggling = togglingCode === j.code;

          return (
            <div
              key={j.code}
              style={{
                background: '#fff',
                border: '1px solid #CDEFD7',
                borderRadius: '0.75rem',
                overflow: 'hidden',
                opacity: isToggling ? 0.7 : 1,
                transition: 'opacity 0.15s',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.875rem',
                  padding: '1rem 1.25rem',
                }}
              >
                <span style={{ fontSize: '1.5rem', lineHeight: 1, flexShrink: 0 }}>
                  {FLAG_EMOJI[j.code] ?? <Globe size={24} />}
                </span>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 600, color: '#0F2E23', fontSize: '0.9375rem' }}>
                    {j.name}
                  </p>
                  <p style={{ fontSize: '0.8125rem', color: '#1F6F4E', marginTop: '0.125rem' }}>
                    {j.currency} · {j.deductions.length} deduction
                    {j.deductions.length !== 1 ? 's' : ''}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => toggleExpand(j.code)}
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
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#CDEFD7')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  {isExpanded ? 'Hide' : 'Show'} deductions
                </button>

                <label
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    cursor: canEdit && !isToggling ? 'pointer' : 'default',
                    flexShrink: 0,
                  }}
                  title={!canEdit ? 'Read-only — Super Admin access required' : undefined}
                >
                  <div
                    style={{
                      position: 'relative',
                      width: '2.5rem',
                      height: '1.375rem',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={j.active}
                      disabled={!canEdit || isToggling}
                      onChange={(e) => toggleMutation.mutate({ code: j.code, active: e.target.checked })}
                      style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
                    />
                    <span
                      style={{
                        position: 'absolute',
                        inset: 0,
                        borderRadius: '9999px',
                        background: j.active ? '#4FAD72' : '#d1d5db',
                        transition: 'background 0.2s',
                      }}
                    />
                    <span
                      style={{
                        position: 'absolute',
                        top: '0.1875rem',
                        left: j.active ? 'calc(100% - 1.0625rem)' : '0.1875rem',
                        width: '1rem',
                        height: '1rem',
                        borderRadius: '9999px',
                        background: '#fff',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                        transition: 'left 0.2s',
                      }}
                    />
                  </div>
                  <span
                    style={{
                      marginLeft: '0.5rem',
                      fontSize: '0.8125rem',
                      fontWeight: 500,
                      color: j.active ? '#1F6F4E' : '#6b7280',
                      minWidth: '3.5rem',
                    }}
                  >
                    {j.active ? 'Enabled' : 'Disabled'}
                  </span>
                </label>
              </div>

              {isExpanded && (
                <div
                  style={{
                    borderTop: '1px solid #CDEFD7',
                    padding: '0.875rem 1.25rem',
                    background: '#F7FAF8',
                  }}
                >
                  <p
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: '#0F2E23',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      marginBottom: '0.5rem',
                    }}
                  >
                    Statutory Deductions
                  </p>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                    {j.deductions.map((d) => (
                      <li
                        key={d}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          fontSize: '0.8125rem',
                          color: '#1F6F4E',
                        }}
                      >
                        <span
                          style={{
                            width: '5px',
                            height: '5px',
                            borderRadius: '9999px',
                            background: '#4FAD72',
                            flexShrink: 0,
                          }}
                        />
                        {d}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
