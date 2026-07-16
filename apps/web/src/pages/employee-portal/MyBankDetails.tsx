import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { CreditCard, Info, CheckCircle } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import PageHeader from '@/components/layout/PageHeader';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import ErrorState from '@/components/ui/ErrorState';

interface MyBankDetails {
  bankName: string;
  accountNumber: string;
  accountName: string;
  bankCode: string;
}

const MOCK_BANK_DETAILS: MyBankDetails = {
  bankName: 'First Bank of Nigeria',
  accountNumber: '3012345678',
  accountName: 'ADAEZE OKONKWO',
  bankCode: '011',
};

export default function MyBankDetails() {
  const userId = useAuthStore((s) => s.user?.id);
  const [saved, setSaved] = useState(false);

  const [form, setForm] = useState<MyBankDetails>({
    bankName: '',
    accountNumber: '',
    accountName: '',
    bankCode: '',
  });

  const { data: bankDetails, isLoading, isError, refetch } = useQuery<MyBankDetails>({
    queryKey: ['my-bank-details', userId],
    queryFn: async () => {
      // Local mock — GET /api/employees/me/bank-details in production
      await new Promise((r) => setTimeout(r, 300));
      return MOCK_BANK_DETAILS;
    },
  });

  // Seed form once data arrives
  useEffect(() => {
    if (bankDetails) setForm(bankDetails);
  }, [bankDetails]);

  const mutation = useMutation({
    mutationFn: async (details: MyBankDetails) => {
      // No-op PUT — simulates /api/employees/me/bank-details
      await new Promise((r) => setTimeout(r, 600));
      return details;
    },
    onSuccess: () => {
      setSaved(true);
      setTimeout(() => setSaved(false), 5000);
    },
  });

  function handleChange(field: keyof MyBankDetails) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      setSaved(false);
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
    };
  }

  function handleSave() {
    mutation.mutate(form);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isError) {
    return <ErrorState onRetry={refetch} />;
  }

  return (
    <div style={{ width: '100%', maxWidth: '640px', margin: '0 auto', padding: '2rem clamp(0.75rem, 4vw, 1.5rem)' }}>
      <PageHeader
        title="My Bank Details"
        breadcrumbs={[{ label: 'My Bank Details' }]}
      />

      {/* Info banner */}
      <div className="flex items-start gap-3 p-4 bg-cash-gold/10 border border-cash-gold/30 rounded-lg mb-6">
        <Info size={18} className="text-cash-gold shrink-0 mt-0.5" />
        <p className="text-sm text-deep-cash">
          Salary for the current pay period has been processed. Changes will apply from the next pay run.
        </p>
      </div>

      {/* Success banner */}
      {saved && (
        <div className="flex items-center gap-3 p-4 bg-mint-light border border-fresh-cash/40 rounded-lg mb-6">
          <CheckCircle size={18} className="text-cash-green shrink-0" />
          <p className="text-sm text-cash-green font-medium">
            Bank details saved successfully. Changes will apply from the next pay run.
          </p>
        </div>
      )}

      {/* Edit form card */}
      <div className="bg-white rounded-xl border border-mint-light p-6">
        <div className="flex items-center gap-2 mb-6">
          <CreditCard size={16} className="text-cash-green" />
          <h2 className="text-sm font-semibold text-deep-cash">Bank Account</h2>
        </div>

        <div className="flex flex-col gap-5">
          <Input
            label="Bank Name"
            id="bankName"
            name="bankName"
            value={form.bankName}
            onChange={handleChange('bankName')}
            placeholder="e.g. First Bank of Nigeria"
          />

          <Input
            label="Account Number"
            id="accountNumber"
            name="accountNumber"
            value={form.accountNumber}
            onChange={handleChange('accountNumber')}
            placeholder="10-digit account number"
          />

          <Input
            label="Account Name"
            id="accountName"
            name="accountName"
            value={form.accountName}
            onChange={handleChange('accountName')}
            placeholder="Name on the account"
          />

          <Input
            label="Bank Code"
            id="bankCode"
            name="bankCode"
            value={form.bankCode}
            onChange={handleChange('bankCode')}
            placeholder="e.g. 011"
          />
        </div>

        <div className="mt-7 flex items-center gap-3">
          <Button
            variant="primary"
            onClick={handleSave}
            loading={mutation.isPending}
            disabled={
              !form.bankName.trim() ||
              !form.accountNumber.trim() ||
              !form.accountName.trim() ||
              !form.bankCode.trim()
            }
          >
            Save changes
          </Button>
          {mutation.isError && (
            <p className="text-sm text-red-500">Save failed. Please try again.</p>
          )}
        </div>
      </div>

      <p className="mt-4 text-xs text-cash-green/40 text-center">
        Your bank details are encrypted and used solely for salary disbursement.
      </p>
    </div>
  );
}
