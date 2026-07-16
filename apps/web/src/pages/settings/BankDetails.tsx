import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Info, CheckCircle, AlertCircle } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { USE_REAL_API } from '@/lib/api/adapter';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/hooks/useToast';
import PageHeader from '@/components/layout/PageHeader';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Spinner from '@/components/ui/Spinner';
import ErrorState from '@/components/ui/ErrorState';

interface BankDetailsData {
  bankName: string;
  accountNumber: string;
  accountName: string;
  sortCode: string;
}

export default function BankDetails() {
  const qc = useQueryClient();
  const toast = useToast();
  const role = useAuthStore((s) => s.user?.role);
  const canEdit = role === 'tenant_admin' || role === 'super_admin';

  const [form, setForm] = useState<BankDetailsData>({
    bankName: '',
    accountNumber: '',
    accountName: '',
    sortCode: '',
  });
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const { data, isLoading, isError, refetch } = useQuery<BankDetailsData>({
    queryKey: ['settings-bank'],
    queryFn: () => {
      if (!USE_REAL_API) {
        return apiClient('/settings/bank');
      }
      // Backend may not have this endpoint yet, fall back to mock
      return apiClient('/settings/bank');
    },
  });

  useEffect(() => {
    if (data) {
      setForm(data);
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: (body: BankDetailsData) => {
      if (!USE_REAL_API) {
        return apiClient('/settings/bank', {
          method: 'PATCH',
          body: JSON.stringify(body),
        });
      }
      // Backend may not have this endpoint yet
      return apiClient('/settings/bank', {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings-bank'] });
      setSaveStatus('success');
      setLastSaved(new Date());
      toast.success('Bank details saved');
      setTimeout(() => setSaveStatus('idle'), 3000);
    },
    onError: () => {
      setSaveStatus('error');
      toast.error('Failed to save bank details');
      setTimeout(() => setSaveStatus('idle'), 3000);
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isError || !data) {
    return <ErrorState onRetry={refetch} />;
  }

  const isDirty =
    form.bankName !== data.bankName ||
    form.accountNumber !== data.accountNumber ||
    form.accountName !== data.accountName ||
    form.sortCode !== data.sortCode;

  function set(field: keyof BankDetailsData, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem clamp(0.75rem, 4vw, 1.5rem)' }}>
      <PageHeader
        title="Bank Details"
        breadcrumbs={[{ label: 'Settings' }, { label: 'Bank Details' }]}
      />

      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '0.625rem',
          padding: '0.875rem 1rem',
          background: '#F7FAF8',
          border: '1px solid #CDEFD7',
          borderRadius: '0.625rem',
          marginBottom: '1.25rem',
        }}
      >
        <Info size={15} style={{ color: '#1F6F4E', flexShrink: 0, marginTop: '0.125rem' }} />
        <p style={{ fontSize: '0.8125rem', color: '#1F6F4E', lineHeight: 1.5 }}>
          This is the account used for payroll disbursement. Changes here affect all future pay
          runs.
        </p>
      </div>

      <div
        style={{
          background: '#fff',
          border: '1px solid #CDEFD7',
          borderRadius: '0.75rem',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '1rem 1.5rem',
            borderBottom: '1px solid #CDEFD7',
            background: '#F7FAF8',
          }}
        >
          <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0F2E23' }}>
            Payroll Disbursement Account
          </p>
          {!canEdit && (
            <p style={{ fontSize: '0.8125rem', color: '#1F6F4E', marginTop: '0.25rem' }}>
              You have read-only access. Contact your Super Admin to make changes.
            </p>
          )}
        </div>

        <div style={{ padding: '1.5rem' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '1.25rem',
            }}
          >
            <Input
              label="Bank Name"
              value={form.bankName}
              onChange={(e) => set('bankName', e.target.value)}
              disabled={!canEdit}
              placeholder="e.g. First Bank"
            />
            <Input
              label="Account Number"
              value={form.accountNumber}
              onChange={(e) => set('accountNumber', e.target.value)}
              disabled={!canEdit}
              placeholder="10-digit account number"
            />
            <Input
              label="Account Name"
              value={form.accountName}
              onChange={(e) => set('accountName', e.target.value)}
              disabled={!canEdit}
              placeholder="Name as it appears on account"
            />
            <Input
              label="Sort Code / Routing No."
              value={form.sortCode}
              onChange={(e) => set('sortCode', e.target.value)}
              disabled={!canEdit}
              placeholder="e.g. 058"
            />
          </div>

          <div
            style={{
              marginTop: '2rem',
              paddingTop: '1.25rem',
              borderTop: '1px solid #CDEFD7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minHeight: '24px' }}>
              {saveStatus === 'success' && lastSaved && (
                <>
                  <CheckCircle size={16} style={{ color: '#4FAD72' }} />
                  <span style={{ fontSize: '0.8125rem', color: '#4FAD72', fontWeight: 500 }}>
                    Saved at {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </>
              )}
              {saveStatus === 'error' && (
                <>
                  <AlertCircle size={16} style={{ color: '#dc2626' }} />
                  <span style={{ fontSize: '0.8125rem', color: '#dc2626', fontWeight: 500 }}>
                    Save failed — please try again
                  </span>
                </>
              )}
              {saveStatus === 'idle' && lastSaved && (
                <span style={{ fontSize: '0.8125rem', color: '#6b7280' }}>
                  Last saved {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
            {canEdit && (
              <Button
                variant="primary"
                loading={saveMutation.isPending}
                disabled={!isDirty || saveMutation.isPending}
                onClick={() => saveMutation.mutate(form)}
              >
                Save changes
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
