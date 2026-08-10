import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Building2 } from 'lucide-react';
import { apiClient, fetchAllPages } from '@/lib/api';
import { ENDPOINTS, buildPaginationParams } from '@/lib/api/adapter';
import { mapPayrollRunFields } from '@/lib/api/transforms';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/hooks/useToast';
import PageHeader from '@/components/layout/PageHeader';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import Input from '@/components/ui/Input';
import EmptyState from '@/components/ui/EmptyState';
import Spinner from '@/components/ui/Spinner';
import type { PayRun } from '@contracts/types/payroll';

interface LegalEntity {
  id: string;
  name: string;
  country: string;
  status: string;
}

export default function PayRunCreate() {
  const navigate = useNavigate();
  const toast = useToast();
  const role = useAuthStore((s) => s.user?.role);
  // Mirrors PAYROLL_CREATE grants (roles.enum.ts): payroll_manager/
  // payroll_officer/tenant_admin/super_admin. finance_manager can reach
  // /payroll/runs/new via the shared router RoleGuard (it needs PAYROLL_READ
  // for the list/detail pages) but has no PAYROLL_CREATE - without this gate
  // it could fill out the whole form and only find out via a 403 on submit.
  const canCreate =
    role === 'payroll_manager' ||
    role === 'payroll_officer' ||
    role === 'tenant_admin' ||
    role === 'super_admin';

  const [legalEntityId, setLegalEntityId] = useState('');
  const [name, setName] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [payDate, setPayDate] = useState('');

  const { data: legalEntities, isLoading: loadingEntities } = useQuery<LegalEntity[]>({
    queryKey: ['legal-entities'],
    // GET /legal-entities is paginated (limit defaults to 20, capped at 100) -
    // a bare apiClient() call silently returns only page 1.
    queryFn: () =>
      fetchAllPages<LegalEntity>((page) => `${ENDPOINTS.LEGAL_ENTITIES.LIST}?${buildPaginationParams({ page, limit: 100 })}`),
    enabled: canCreate,
  });

  // GET /legal-entities returns deactivated entities too (no server-side
  // filter) - excluded here so a new pay run can't be created against a
  // retired legal entity.
  const entityOptions = (legalEntities ?? [])
    .filter((e) => e.status !== 'inactive')
    .map((e) => ({ value: e.id, label: e.name }));

  const createMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        legalEntityId,
        name,
        periodStart,
        periodEnd,
        payDate,
      };
      
      console.log('Creating pay run with payload:', payload);
      
      const response = await apiClient<any>(ENDPOINTS.PAYROLL.RUNS.CREATE, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      
      console.log('Pay run created successfully:', response);
      
      // Transform response
      const transformed = mapPayrollRunFields(response, 'toFrontend');
      return transformed;
    },
    onSuccess: (run) => {
      toast.success('Pay run created');
      navigate(`/payroll/runs/${run.id}`);
    },
    onError: (err) => {
      console.error('Pay run creation failed:', err);
      
      // Extract the actual error message from the backend
      let errorMessage = 'Failed to create pay run';
      
      if (err instanceof Error) {
        // The error message from apiClient contains the backend error
        errorMessage = err.message;
        console.error('Error message:', err.message);
        console.error('Full error object:', err);
      }
      
      toast.error(errorMessage);
    },
  });

  const selectedEntity = (legalEntities ?? []).find((e) => e.id === legalEntityId);

  if (!canCreate) {
    return (
      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '2rem clamp(0.75rem, 4vw, 1.5rem)' }}>
        <div className="bg-white rounded-xl border border-mint-light p-8 text-center text-cash-green/70 text-sm">
          You don't have access to create pay runs. Contact a Payroll Manager or Tenant Admin.
        </div>
      </div>
    );
  }

  if (loadingEntities) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }

  // A pay run always needs a legalEntityId - guard upfront rather than
  // letting someone fill out the whole form only to find the Legal Entity
  // select empty and Create silently disabled.
  if (entityOptions.length === 0) {
    return (
      <div style={{ width: '100%', maxWidth: '600px', margin: '0 auto', padding: '2rem clamp(0.75rem, 4vw, 1.5rem)' }}>
        <PageHeader
          title="New Pay Run"
          breadcrumbs={[
            { label: 'Pay Runs', path: '/payroll/runs' },
            { label: 'New Pay Run' },
          ]}
        />
        <div className="bg-white rounded-xl border border-mint-light">
          <EmptyState
            icon={Building2}
            title="No legal entities yet"
            description="A pay run is always created against a legal entity. Create one first, then come back to run payroll."
            action={{ label: 'Go to Legal Entities', onClick: () => navigate('/organisation/legal-entities') }}
          />
        </div>
      </div>
    );
  }

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

