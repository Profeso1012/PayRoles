import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, ChevronRight } from 'lucide-react';
import { apiClient } from '@/lib/api';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';
import ErrorState from '@/components/ui/ErrorState';
import Modal from '@/components/ui/Modal';
import Select from '@/components/ui/Select';
import { useToast } from '@/hooks/useToast';
import { formatDate } from '@/lib/utils';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: 'active' | 'suspended' | 'onboarding';
  plan: string;
  country: string;
  createdAt: string;
  setupComplete: boolean;
  adminEmail: string;
}

const PLAN_OPTIONS = [
  { value: 'starter', label: 'Starter' },
  { value: 'growth', label: 'Growth' },
  { value: 'enterprise', label: 'Enterprise' },
];

const COUNTRY_OPTIONS = [
  { value: 'NG', label: 'Nigeria' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'CA', label: 'Canada' },
  { value: 'US', label: 'United States' },
];

export default function SACompanies() {
  const navigate = useNavigate();
  const toast = useToast();
  const qc = useQueryClient();

  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);

  // Form state
  const [companyName, setCompanyName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [plan, setPlan] = useState('starter');
  const [country, setCountry] = useState('NG');
  const [formError, setFormError] = useState('');

  const { data: tenants, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-tenants'],
    queryFn: () => apiClient<Tenant[]>('/admin/tenants'),
  });

  const onboard = useMutation({
    mutationFn: (payload: { name: string; adminEmail: string; plan: string; country: string }) =>
      apiClient('/admin/tenants', { method: 'POST', body: JSON.stringify(payload) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-tenants'] });
      toast.success('Company onboarded', 'An invite has been sent to the admin email.');
      resetForm();
    },
    onError: () => {
      toast.error('Failed to onboard company', 'Please try again.');
    },
  });

  const resetForm = () => {
    setCompanyName('');
    setAdminEmail('');
    setPlan('starter');
    setCountry('NG');
    setFormError('');
    setShowModal(false);
  };

  const handleSubmit = () => {
    if (!companyName.trim()) { setFormError('Company name is required'); return; }
    if (!adminEmail.trim() || !adminEmail.includes('@')) { setFormError('Valid admin email is required'); return; }
    setFormError('');
    onboard.mutate({ name: companyName, adminEmail, plan, country });
  };

  const filtered = (tenants ?? []).filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.adminEmail.toLowerCase().includes(search.toLowerCase()),
  );

  if (isLoading) return <div className="flex items-center justify-center h-64"><Spinner size="lg" /></div>;
  if (isError) return <ErrorState message="Failed to load companies." onRetry={refetch} />;

  return (
    <div className="p-6 max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-[clamp(1.25rem,2.5vw,1.75rem)] font-semibold text-deep-cash">Companies</h1>
          <p className="text-sm text-cash-green/70 mt-0.5">{filtered.length} total</p>
        </div>
        <Button variant="primary" onClick={() => setShowModal(true)}>
          <Plus size={16} className="mr-2" />
          Onboard New Company
        </Button>
      </div>

      {/* Search */}
      <div className="relative mb-6 w-full max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-cash-green/50" />
        <input
          className="w-full pl-9 pr-4 py-2.5 text-sm border border-mint-light rounded-lg bg-soft-white outline-none focus:border-cash-green transition-colors text-deep-cash placeholder:text-cash-green/40"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="bg-white border border-mint-light rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-mint-light bg-soft-white">
                {['Company', 'Admin', 'Plan', 'Country', 'Setup', 'Status', 'Joined', ''].map((h) => (
                  <th key={h} className="text-left px-6 py-3 text-xs font-medium text-cash-green/70 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-cash-green/50 text-sm">
                    No companies found.
                  </td>
                </tr>
              ) : (
                filtered.map((t) => (
                  <tr
                    key={t.id}
                    className="border-b border-mint-light/60 hover:bg-soft-white transition-colors cursor-pointer"
                    onClick={() => navigate(`/admin/companies/${t.id}`)}
                  >
                    <td className="px-6 py-4 font-medium text-deep-cash">{t.name}</td>
                    <td className="px-6 py-4 text-cash-green/80">{t.adminEmail}</td>
                    <td className="px-6 py-4 capitalize text-deep-cash">{t.plan}</td>
                    <td className="px-6 py-4 text-cash-green/80">{t.country}</td>
                    <td className="px-6 py-4">
                      {t.setupComplete ? (
                        <Badge variant="success" label="Complete" />
                      ) : (
                        <Badge variant="warning" label="Pending" />
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <Badge
                        variant={t.status === 'active' ? 'success' : t.status === 'suspended' ? 'danger' : 'warning'}
                        label={t.status}
                      />
                    </td>
                    <td className="px-6 py-4 text-cash-green/70">{formatDate(t.createdAt)}</td>
                    <td className="px-6 py-4">
                      <ChevronRight size={16} className="text-cash-green/40" />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Onboard modal */}
      <Modal
        isOpen={showModal}
        onClose={resetForm}
        title="Onboard New Company"
      >
        <div className="flex flex-col gap-5 pt-2">
          <div>
            <p className="text-xs font-medium text-cash-green mb-1.5">Company name</p>
            <input
              className="w-full bg-transparent border-b border-cash-green/30 py-2.5 text-sm text-deep-cash outline-none focus:border-cash-green transition-colors placeholder:text-cash-green/40"
              placeholder="e.g. Zenith Logistics Ltd"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              autoFocus
            />
          </div>

          <div>
            <p className="text-xs font-medium text-cash-green mb-1.5">Super Admin email</p>
            <input
              className="w-full bg-transparent border-b border-cash-green/30 py-2.5 text-sm text-deep-cash outline-none focus:border-cash-green transition-colors placeholder:text-cash-green/40"
              type="email"
              placeholder="admin@company.com"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
            />
          </div>

          <Select
            label="Subscription plan"
            value={plan}
            options={PLAN_OPTIONS}
            onChange={setPlan}
          />

          <Select
            label="Country"
            value={country}
            options={COUNTRY_OPTIONS}
            onChange={setCountry}
          />

          {formError && <p className="text-sm text-red-500">{formError}</p>}

          <div className="flex justify-end gap-3 pt-2 border-t border-mint-light">
            <Button variant="ghost" onClick={resetForm}>Cancel</Button>
            <Button variant="primary" onClick={handleSubmit} loading={onboard.isPending}>
              Send Invite
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
