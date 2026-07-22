import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { ENDPOINTS } from '@/lib/api/adapter';
import { mapPayrollRunFields } from '@/lib/api/transforms';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/hooks/useToast';
import PageHeader from '@/components/layout/PageHeader';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import Input from '@/components/ui/Input';
import type { PayRun } from '@contracts/types/payroll';

interface LegalEntity {
  id: string;
  name: string;
  country: string;
}

export default function PayRunCreate() {
  const navigate = useNavigate();
  const toast = useToast();

  const [legalEntityId, setLegalEntityId] = useState('');
  const [name, setName] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [payDate, setPayDate] = useState('');

  const { data: legalEntities, isLoading: loadingEntities } = useQuery<LegalEntity[]>({
    queryKey: ['legal-entities'],
    queryFn: async () => {
      const response = await apiClient<any>(ENDPOINTS.LEGAL_ENTITIES.LIST);
      const entities = Array.isArray(response) ? response : (response.data || []);
      return entities;
    },
  });

  const entityOptions = (legalEntities ?? []).map((e) => ({ value: e.id, label: e.name }));

  const createMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        legalEntityId,
        name,
        periodStart,
        periodEnd,
        payDate,
      };
      
      const response = await apiClient<any>(ENDPOINTS.PAYROLL.RUNS.CREATE, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      
      // Transform response
      const transformed = mapPayrollRunFields(response, 'toFrontend');
      return transformed;
    },
    onSuccess: (run) => {
      toast.success('Pay run created');
      navigate(`/payroll/runs/${run.id}`);
    },
    onError: () => toast.error('Failed to create pay run'),
  });

  const selectedEntity = (legalEntities ?? []).find((e) => e.id === legalEntityId);

  return (
    <div style={{ width: '100%', maxWidth: '600px', margin: '0 auto', padding: '2rem clamp(0.75rem, 4vw, 1.5rem)' }}>
      <PageHeader
        title="New Pay Run"
        breadcrumbs={[
          { label: 'Pay Runs', path: '/payroll/runs' },
          { label: 'New Pay Run' },
        ]}
      />

      <div className="bg-white rounded-xl border border-mint-light p-6">
        <p className="text-sm text-cash-green/70 mb-6">
          Select a legal entity and define the payroll period to create a new pay run.
        </p>

        <div className="flex flex-col gap-5">
          <Select
            label="Legal Entity"
            value={legalEntityId}
            options={loadingEntities ? [] : entityOptions}
            onChange={setLegalEntityId}
            placeholder="Select legal entity"
            disabled={loadingEntities}
          />

          {selectedEntity && (
            <div className="px-4 py-3 bg-mint-light/30 rounded-lg border border-mint-light text-sm">
              <p className="text-cash-green/70">
                Country:{' '}
                <span className="text-deep-cash font-medium">
                  {selectedEntity.country}
                </span>
              </p>
            </div>
          )}

          <Input
            label="Pay Run Name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., January 2025 Payroll"
          />

          <div>
            <p className="text-sm text-cash-green font-medium mb-1">Period Start</p>
            <input
              type="date"
              className="w-full bg-white border border-mint-light rounded-md px-3 py-2.5 text-sm text-deep-cash outline-none focus:border-fresh-cash transition-colors"
              value={periodStart}
              onChange={(e) => setPeriodStart(e.target.value)}
            />
            <p className="text-xs text-cash-green/50 mt-1">First day of the payroll period.</p>
          </div>

          <div>
            <p className="text-sm text-cash-green font-medium mb-1">Period End</p>
            <input
              type="date"
              className="w-full bg-white border border-mint-light rounded-md px-3 py-2.5 text-sm text-deep-cash outline-none focus:border-fresh-cash transition-colors"
              value={periodEnd}
              onChange={(e) => setPeriodEnd(e.target.value)}
            />
            <p className="text-xs text-cash-green/50 mt-1">Last day of the payroll period.</p>
          </div>

          <div>
            <p className="text-sm text-cash-green font-medium mb-1">Pay Date</p>
            <input
              type="date"
              className="w-full bg-white border border-mint-light rounded-md px-3 py-2.5 text-sm text-deep-cash outline-none focus:border-fresh-cash transition-colors"
              value={payDate}
              onChange={(e) => setPayDate(e.target.value)}
            />
            <p className="text-xs text-cash-green/50 mt-1">Date employees will be paid.</p>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-8 pt-5 border-t border-mint-light">
          <Button variant="ghost" onClick={() => navigate('/payroll/runs')}>Cancel</Button>
          <Button
            variant="primary"
            loading={createMutation.isPending}
            disabled={!legalEntityId || !name || !periodStart || !periodEnd || !payDate}
            onClick={() => createMutation.mutate()}
          >
            Create Pay Run
          </Button>
        </div>
      </div>
    </div>
  );
}

