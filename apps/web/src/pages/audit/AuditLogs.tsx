import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Shield, Search, Calendar, User, FileText } from 'lucide-react';
import { apiClientWithMeta } from '@/lib/api';
import { ENDPOINTS, USE_REAL_API, buildPaginationParams, addFilterParams } from '@/lib/api/adapter';
import { transformPaginatedResponse } from '@/lib/api/transforms';
import { formatDate } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import PageHeader from '@/components/layout/PageHeader';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Pagination from '@/components/ui/Pagination';
import Badge from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';
import ErrorState from '@/components/ui/ErrorState';

interface AuditLog {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  userId: string;
  userName: string;
  userEmail: string;
  ipAddress: string;
  changes: Record<string, any> | null;
  metadata: Record<string, any> | null;
  createdAt: string;
}

const ACTION_LABELS: Record<string, string> = {
  CREATE: 'Created',
  UPDATE: 'Updated',
  DELETE: 'Deleted',
  LOGIN: 'Logged in',
  LOGOUT: 'Logged out',
  APPROVE: 'Approved',
  REJECT: 'Rejected',
  SUBMIT: 'Submitted',
};

const ACTION_VARIANTS: Record<string, 'success' | 'info' | 'warning' | 'danger'> = {
  CREATE: 'success',
  UPDATE: 'info',
  DELETE: 'danger',
  LOGIN: 'info',
  LOGOUT: 'info',
  APPROVE: 'success',
  REJECT: 'danger',
  SUBMIT: 'warning',
};

const ENTITY_OPTIONS = [
  { value: '', label: 'All entities' },
  { value: 'worker', label: 'Workers' },
  { value: 'payroll_run', label: 'Payroll Runs' },
  { value: 'user', label: 'Users' },
  { value: 'legal_entity', label: 'Legal Entities' },
  { value: 'compensation', label: 'Compensation' },
  { value: 'pay_element', label: 'Pay Elements' },
];

const ACTION_OPTIONS = [
  { value: '', label: 'All actions' },
  { value: 'CREATE', label: 'Created' },
  { value: 'UPDATE', label: 'Updated' },
  { value: 'DELETE', label: 'Deleted' },
  { value: 'APPROVE', label: 'Approved' },
  { value: 'REJECT', label: 'Rejected' },
  { value: 'SUBMIT', label: 'Submitted' },
];

export default function AuditLogs() {
  const role = useAuthStore((s) => s.user?.role);
  const canView =
    role === 'tenant_admin' ||
    role === 'super_admin' ||
    role === 'finance_manager' ||
    role === 'auditor';

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const { data, isLoading, isError, refetch } = useQuery<{
    data: AuditLog[];
    total: number;
    page: number;
    pageSize: number;
  }>({
    queryKey: ['audit-logs', page, search, entityFilter, actionFilter],
    queryFn: async () => {
      if (!USE_REAL_API) {
        return {
          data: [],
          total: 0,
          page: 1,
          pageSize: 20,
        };
      }

      const params = buildPaginationParams({ page, limit: 20 });
      addFilterParams(params, {
        search,
        entity: entityFilter,
        action: actionFilter,
      });

      const response = await apiClientWithMeta<AuditLog[]>(`${ENDPOINTS.AUDIT.LIST}?${params}`);
      return transformPaginatedResponse(response.data, response.meta);
    },
    enabled: canView,
  });

  if (!canView) {
    return (
      <div style={{ maxWidth: 'clamp(600px, 90vw, 1200px)', margin: '0 auto', padding: 'clamp(1rem, 3vw, 2rem) clamp(1rem, 3vw, 1.5rem)' }}>
        <PageHeader
          title="Audit Logs"
          breadcrumbs={[{ label: 'Audit Logs' }]}
        />
        <div style={{
          padding: 'clamp(1.5rem, 4vw, 2rem)',
          background: '#fff',
          border: '1px solid #CDEFD7',
          borderRadius: '0.75rem',
          textAlign: 'center',
          color: '#1F6F4E',
          fontSize: 'clamp(0.875rem, 2vw, 0.9375rem)',
        }}>
          You need Super Admin or Finance Director access to view audit logs.
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: 'clamp(300px, 50vh, 60vh)' }}>
        <Spinner size="lg" />
      </div>
    );
  }

  if (isError) {
    return <ErrorState message="Failed to load audit logs." onRetry={refetch} />;
  }

  const logs = data?.data || [];
  const totalPages = Math.ceil((data?.total || 0) / (data?.pageSize || 20));

  return (
    <div style={{ maxWidth: 'clamp(600px, 95vw, 1400px)', margin: '0 auto', padding: 'clamp(1rem, 3vw, 2rem) clamp(1rem, 3vw, 1.5rem)' }}>
      <PageHeader
        title="Audit Logs"
        breadcrumbs={[{ label: 'Audit Logs' }]}
        action={
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.875rem', borderRadius: '0.5rem', background: '#CDEFD7' }}>
            <Shield size={14} style={{ color: '#1F6F4E' }} />
            <span style={{ fontSize: 'clamp(0.75rem, 2vw, 0.8125rem)', fontWeight: 600, color: '#1F6F4E' }}>
              Activity Tracking
            </span>
          </div>
        }
      />

      {/* Filters */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 'clamp(0.75rem, 2vw, 1rem)',
        marginBottom: 'clamp(1rem, 3vw, 1.5rem)',
      }}>
        <div style={{ position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#1F6F4E', opacity: 0.5 }} />
          <input
            style={{
              width: '100%',
              paddingLeft: '2.5rem',
              paddingRight: '1rem',
              paddingTop: '0.625rem',
              paddingBottom: '0.625rem',
              fontSize: 'clamp(0.8125rem, 2vw, 0.875rem)',
              border: '1px solid #CDEFD7',
              borderRadius: '0.5rem',
              background: '#F7FAF8',
              outline: 'none',
              color: '#0F2E23',
              transition: 'border-color 0.2s',
            }}
            placeholder="Search by user or entity..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            onFocus={(e) => e.target.style.borderColor = '#4FAD72'}
            onBlur={(e) => e.target.style.borderColor = '#CDEFD7'}
          />
        </div>

        <Select
          value={entityFilter}
          options={ENTITY_OPTIONS}
          onChange={(v) => {
            setEntityFilter(v);
            setPage(1);
          }}
          placeholder="All entities"
        />

        <Select
          value={actionFilter}
          options={ACTION_OPTIONS}
          onChange={(v) => {
            setActionFilter(v);
            setPage(1);
          }}
          placeholder="All actions"
        />
      </div>

      {/* Logs Table */}
      <div style={{ background: '#fff', border: '1px solid #CDEFD7', borderRadius: '0.75rem', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', fontSize: 'clamp(0.8125rem, 2vw, 0.875rem)', borderCollapse: 'collapse', minWidth: '800px' }}>
            <thead>
              <tr style={{ background: '#F7FAF8', borderBottom: '1px solid #CDEFD7' }}>
                {['Timestamp', 'User', 'Action', 'Entity', 'Entity ID', 'IP Address', ''].map((h) => (
                  <th key={h} style={{
                    padding: 'clamp(0.625rem, 2vw, 0.75rem) clamp(0.75rem, 2vw, 1rem)',
                    textAlign: 'left',
                    fontWeight: 600,
                    fontSize: 'clamp(0.75rem, 1.5vw, 0.8125rem)',
                    color: '#1F6F4E',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    whiteSpace: 'nowrap',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: 'clamp(2rem, 5vw, 3rem)', textAlign: 'center', color: '#1F6F4E' }}>
                    No audit logs found.
                  </td>
                </tr>
              ) : (
                logs.map((log: AuditLog) => (
                  <tr
                    key={log.id}
                    style={{
                      borderBottom: '1px solid rgba(205, 239, 215, 0.6)',
                      cursor: log.changes ? 'pointer' : 'default',
                      transition: 'background-color 0.15s',
                    }}
                    onClick={() => log.changes && setSelectedLog(log)}
                    onMouseEnter={(e) => log.changes && (e.currentTarget.style.backgroundColor = '#F7FAF8')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <td style={{ padding: 'clamp(0.75rem, 2vw, 0.875rem) clamp(0.75rem, 2vw, 1rem)', color: '#1F6F4E', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Calendar size={13} style={{ color: '#4FAD72', flexShrink: 0 }} />
                        {formatDate(log.createdAt)}
                      </div>
                    </td>
                    <td style={{ padding: 'clamp(0.75rem, 2vw, 0.875rem) clamp(0.75rem, 2vw, 1rem)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <User size={13} style={{ color: '#4FAD72', flexShrink: 0 }} />
                        <div style={{ minWidth: 0 }}>
                          <p style={{ fontWeight: 500, color: '#0F2E23', fontSize: 'clamp(0.8125rem, 2vw, 0.875rem)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {log.userName}
                          </p>
                          <p style={{ fontSize: 'clamp(0.75rem, 1.5vw, 0.8125rem)', color: '#1F6F4E', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {log.userEmail}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: 'clamp(0.75rem, 2vw, 0.875rem) clamp(0.75rem, 2vw, 1rem)' }}>
                      <Badge
                        variant={ACTION_VARIANTS[log.action] || 'info'}
                        label={ACTION_LABELS[log.action] || log.action}
                      />
                    </td>
                    <td style={{ padding: 'clamp(0.75rem, 2vw, 0.875rem) clamp(0.75rem, 2vw, 1rem)', color: '#0F2E23', fontWeight: 500, textTransform: 'capitalize' }}>
                      {log.entity.replace(/_/g, ' ')}
                    </td>
                    <td style={{ padding: 'clamp(0.75rem, 2vw, 0.875rem) clamp(0.75rem, 2vw, 1rem)', color: '#1F6F4E', fontFamily: 'monospace', fontSize: 'clamp(0.75rem, 1.5vw, 0.8125rem)' }}>
                      {log.entityId.substring(0, 8)}...
                    </td>
                    <td style={{ padding: 'clamp(0.75rem, 2vw, 0.875rem) clamp(0.75rem, 2vw, 1rem)', color: '#1F6F4E', fontFamily: 'monospace', fontSize: 'clamp(0.75rem, 1.5vw, 0.8125rem)' }}>
                      {log.ipAddress}
                    </td>
                    <td style={{ padding: 'clamp(0.75rem, 2vw, 0.875rem) clamp(0.75rem, 2vw, 1rem)', textAlign: 'right' }}>
                      {log.changes && (
                        <FileText size={16} style={{ color: '#4FAD72' }} />
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div style={{ padding: 'clamp(0.75rem, 2vw, 1rem)', borderTop: '1px solid #CDEFD7' }}>
            <Pagination
              page={page}
              pageSize={data?.pageSize || 20}
              total={data?.total || 0}
              onChange={setPage}
            />
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedLog && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 46, 35, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
            padding: 'clamp(1rem, 3vw, 2rem)',
          }}
          onClick={() => setSelectedLog(null)}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '0.75rem',
              maxWidth: 'min(600px, 90vw)',
              width: '100%',
              maxHeight: '80vh',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: 'clamp(1rem, 3vw, 1.5rem)', borderBottom: '1px solid #CDEFD7', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ fontSize: 'clamp(1rem, 2.5vw, 1.125rem)', fontWeight: 600, color: '#0F2E23' }}>
                Change Details
              </h3>
              <button
                onClick={() => setSelectedLog(null)}
                style={{
                  padding: '0.5rem',
                  borderRadius: '0.375rem',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  color: '#1F6F4E',
                  transition: 'background-color 0.15s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#CDEFD7'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div style={{ padding: 'clamp(1rem, 3vw, 1.5rem)', overflowY: 'auto', flex: 1 }}>
              <div style={{ marginBottom: 'clamp(1rem, 3vw, 1.5rem)' }}>
                <p style={{ fontSize: 'clamp(0.75rem, 2vw, 0.8125rem)', color: '#1F6F4E', marginBottom: '0.25rem' }}>Action</p>
                <Badge variant={ACTION_VARIANTS[selectedLog.action] || 'info'} label={ACTION_LABELS[selectedLog.action] || selectedLog.action} />
              </div>

              <div style={{ marginBottom: 'clamp(1rem, 3vw, 1.5rem)' }}>
                <p style={{ fontSize: 'clamp(0.75rem, 2vw, 0.8125rem)', color: '#1F6F4E', marginBottom: '0.5rem' }}>User</p>
                <p style={{ fontSize: 'clamp(0.875rem, 2vw, 0.9375rem)', fontWeight: 500, color: '#0F2E23' }}>{selectedLog.userName}</p>
                <p style={{ fontSize: 'clamp(0.75rem, 2vw, 0.8125rem)', color: '#1F6F4E' }}>{selectedLog.userEmail}</p>
              </div>

              {selectedLog.changes && (
                <div style={{ marginBottom: 'clamp(1rem, 3vw, 1.5rem)' }}>
                  <p style={{ fontSize: 'clamp(0.75rem, 2vw, 0.8125rem)', color: '#1F6F4E', marginBottom: '0.5rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Changes
                  </p>
                  <div style={{ background: '#F7FAF8', border: '1px solid #CDEFD7', borderRadius: '0.5rem', padding: 'clamp(0.75rem, 2vw, 1rem)' }}>
                    <pre style={{ fontSize: 'clamp(0.75rem, 1.5vw, 0.8125rem)', color: '#0F2E23', fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0 }}>
                      {JSON.stringify(selectedLog.changes, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 'clamp(0.75rem, 2vw, 1rem)' }}>
                <div>
                  <p style={{ fontSize: 'clamp(0.75rem, 2vw, 0.8125rem)', color: '#1F6F4E', marginBottom: '0.25rem' }}>Entity</p>
                  <p style={{ fontSize: 'clamp(0.875rem, 2vw, 0.9375rem)', color: '#0F2E23', textTransform: 'capitalize' }}>
                    {selectedLog.entity.replace(/_/g, ' ')}
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: 'clamp(0.75rem, 2vw, 0.8125rem)', color: '#1F6F4E', marginBottom: '0.25rem' }}>Timestamp</p>
                  <p style={{ fontSize: 'clamp(0.875rem, 2vw, 0.9375rem)', color: '#0F2E23' }}>{formatDate(selectedLog.createdAt)}</p>
                </div>
                <div>
                  <p style={{ fontSize: 'clamp(0.75rem, 2vw, 0.8125rem)', color: '#1F6F4E', marginBottom: '0.25rem' }}>IP Address</p>
                  <p style={{ fontSize: 'clamp(0.875rem, 2vw, 0.9375rem)', color: '#0F2E23', fontFamily: 'monospace' }}>{selectedLog.ipAddress}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
