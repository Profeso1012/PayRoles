import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/hooks/useToast';
import PageHeader from '@/components/layout/PageHeader';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import type { PayRun } from '@contracts/types/payroll';

interface PayGroup {
  id: string;
  name: string;
  payFrequency: string;
}

export default function PayRunCreate() {
  const navigate = useNavigate();
  const toast = useToast();

  const [payGroupId, setPayGroupId] = useState('');
  const [period, setPeriod] = useState('');

  const { data: payGroups, isLoading: loadingGroups } = useQuery<PayGroup[]>({
    queryKey: ['pay-groups'],
    queryFn: async () => {
      const { token } = useAuthStore.getState();
      const res = await fetch('/api/organisation/pay-groups', {
        headers: { Authorization: `Bearer ${token ?? ''}` },
      });
      return (await res.json()).data ?? [];
    },
  });

  const pgOptions = (payGroups ?? []).map((p) => ({ value: p.id, label: p.name }));

  const createMutation = useMutation({
    mutationFn: () =>
      apiClient<PayRun>('/pay-runs', {
        method: 'POST',
        body: JSON.stringify({ payGroupId, period }),
      }),
    onSuccess: (run) => {
      toast.success('Pay run created');
      navigate(`/payroll/runs/${run.id}`);
    },
    onError: () => toast.error('Failed to create pay run'),
  });

  const selectedGroup = (payGroups ?? []).find((p) => p.id === payGroupId);

  return (
    <div style={{ width: '100%', maxWidth: '600px', margin: '0 auto', padding: '2rem 1.5rem' }}>
      <PageHeader
        title="New Pay Run"
        breadcrumbs={[
          { label: 'Pay Runs', path: '/payroll/runs' },
          { label: 'New Pay Run' },
        ]}
      />

      <div className="bg-white rounded-xl border border-mint-light p-6">
        <p className="text-sm text-cash-green/70 mb-6">
          Select a pay group and the payroll period to create a new pay run.
        </p>

        <div className="flex flex-col gap-5">
          <Select
            label="Pay Group"
            value={payGroupId}
            options={loadingGroups ? [] : pgOptions}
            onChange={setPayGroupId}
            placeholder="Select pay group"
            disabled={loadingGroups}
          />

          {selectedGroup && (
            <div className="px-4 py-3 bg-mint-light/30 rounded-lg border border-mint-light text-sm">
              <p className="text-cash-green/70">
                Frequency:{' '}
                <span className="text-deep-cash font-medium capitalize">
                  {selectedGroup.payFrequency}
                </span>
              </p>
            </div>
          )}

          <div>
            <p className="text-sm text-cash-green font-medium mb-1">Period</p>
            <input
              type="month"
              className="w-full bg-white border border-mint-light rounded-md px-3 py-2.5 text-sm text-deep-cash outline-none focus:border-fresh-cash transition-colors"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
            />
            <p className="text-xs text-cash-green/50 mt-1">Select the month this payroll covers.</p>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-8 pt-5 border-t border-mint-light">
          <Button variant="ghost" onClick={() => navigate('/payroll/runs')}>Cancel</Button>
          <Button
            variant="primary"
            loading={createMutation.isPending}
            disabled={!payGroupId || !period}
            onClick={() => createMutation.mutate()}
          >
            Create Pay Run
          </Button>
        </div>
      </div>
    </div>
  );
}
