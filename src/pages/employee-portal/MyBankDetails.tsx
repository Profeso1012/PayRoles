import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CreditCard, Info, CheckCircle, AlertTriangle } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { apiClient } from '@/lib/api';
import { ENDPOINTS } from '@/lib/api/adapter';
import type { BackendWorker } from '@/lib/api/types';
import { errorMessage, fieldErrors } from '@/lib/errors';
import PageHeader from '@/components/layout/PageHeader';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import BankSelect from '@/components/ui/BankSelect';
import Spinner from '@/components/ui/Spinner';
import ErrorState from '@/components/ui/ErrorState';

/**
 * The signed-in user's own bank details, read from and saved to the employee
 * record their login is linked to (user.workerId) via GET/PATCH /workers/:id.
 * Those routes need WORKER_READ + WORKER_WRITE, so the page is only routed for
 * roles holding both (see router/index.tsx). The account number is never sent
 * back by the API - only whether one is on file - so it is only ever replaced.
 */
export default function MyBankDetails() {
  const workerId = useAuthStore((s) => s.user?.workerId);
  const queryClient = useQueryClient();

  const [bank, setBank] = useState<{ bankName: string; bankCode: string } | null>(null);
  const [accountNumber, setAccountNumber] = useState('');
  const [saved, setSaved] = useState(false);

  const { data: worker, isLoading, isError, error, refetch } = useQuery<BackendWorker>({
    queryKey: ['worker', workerId],
    queryFn: () => apiClient<BackendWorker>(ENDPOINTS.WORKERS.DETAIL(workerId!)),
    enabled: !!workerId,
  });

  // Untouched form = the saved values.
  const bankName = bank?.bankName ?? worker?.bankName ?? '';
  const bankCode = bank?.bankCode ?? worker?.bankRoutingCode ?? '';

  const mutation = useMutation({
    mutationFn: () =>
      apiClient<BackendWorker>(ENDPOINTS.WORKERS.UPDATE(workerId!), {
        method: 'PATCH',
        body: JSON.stringify({
          bankName,
          bankRoutingCode: bankCode,
          ...(accountNumber.trim() ? { bankAccount: accountNumber.trim() } : {}),
        }),
      }),
    onSuccess: async () => {
      setSaved(true);
      setAccountNumber('');
      setBank(null);
      await queryClient.invalidateQueries({ queryKey: ['worker', workerId] });
      setTimeout(() => setSaved(false), 5000);
    },
  });

  const errors = mutation.isError ? fieldErrors(mutation.error) : {};

  if (!workerId) {
    return (
      <div style={{ width: '100%', maxWidth: '640px', margin: '0 auto', padding: '2rem clamp(0.75rem, 4vw, 1.5rem)' }}>
        <PageHeader title="My Bank Details" breadcrumbs={[{ label: 'My Bank Details' }]} />
        <div className="flex items-start gap-3 p-4 bg-cash-gold/10 border border-cash-gold/30 rounded-lg">
          <Info size={18} className="text-cash-gold shrink-0 mt-0.5" />
          <p className="text-sm text-deep-cash">
            Your login isn't linked to an employee record, so there are no bank details to manage
            here. Ask an administrator to link your user account to your employee record.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isError || !worker) {
    return <ErrorState error={error} onRetry={refetch} />;
  }

  const needsAccount = !worker.hasBankAccount && !accountNumber.trim();

  return (
    <div style={{ width: '100%', maxWidth: '640px', margin: '0 auto', padding: '2rem clamp(0.75rem, 4vw, 1.5rem)' }}>
      <PageHeader title="My Bank Details" breadcrumbs={[{ label: 'My Bank Details' }]} />

      {!worker.hasBankAccount && (
        <div className="flex items-start gap-3 p-4 bg-cash-gold/10 border border-cash-gold/30 rounded-lg mb-6">
          <AlertTriangle size={18} className="text-cash-gold shrink-0 mt-0.5" />
          <p className="text-sm text-deep-cash">
            No bank account is on file — your salary will be skipped at payout until you add one.
          </p>
        </div>
      )}

      {saved && (
        <div className="flex items-center gap-3 p-4 bg-mint-light border border-fresh-cash/40 rounded-lg mb-6">
          <CheckCircle size={18} className="text-cash-green shrink-0" />
          <p className="text-sm text-cash-green font-medium">
            Bank details saved. They'll be used for your next payout.
          </p>
        </div>
      )}

      <div className="bg-white rounded-xl border border-mint-light p-6">
        <div className="flex items-center gap-2 mb-6">
          <CreditCard size={16} className="text-cash-green" />
          <h2 className="text-sm font-semibold text-deep-cash">Bank Account</h2>
        </div>

        <div className="flex flex-col gap-5">
          <div>
            <BankSelect
              label="Bank"
              bankName={bankName}
              bankCode={bankCode}
              onChange={(name, code) => {
                setSaved(false);
                setBank({ bankName: name, bankCode: code });
              }}
            />
            {(errors.bankName || errors.bankRoutingCode) && (
              <p className="text-xs text-red-500 mt-1">{errors.bankName || errors.bankRoutingCode}</p>
            )}
          </div>

          <Input
            label="Account Number"
            id="accountNumber"
            name="accountNumber"
            value={accountNumber}
            onChange={(e) => {
              setSaved(false);
              setAccountNumber(e.target.value.replace(/\D/g, ''));
            }}
            placeholder={worker.hasBankAccount ? 'On file — enter a new number to replace it' : '10-digit account number'}
            error={errors.bankAccount}
          />
        </div>

        <div className="mt-7 flex items-center gap-3">
          <Button
            variant="primary"
            onClick={() => mutation.mutate()}
            loading={mutation.isPending}
            disabled={!bankName.trim() || !bankCode.trim() || needsAccount || mutation.isPending}
          >
            Save changes
          </Button>
          {mutation.isError && (
            <p className="text-sm text-red-500">{errorMessage(mutation.error, 'Save failed. Please try again.')}</p>
          )}
        </div>
      </div>

      <p className="mt-4 text-xs text-cash-green/40 text-center">
        Your account number is stored encrypted and is only used to pay your salary.
      </p>
    </div>
  );
}
