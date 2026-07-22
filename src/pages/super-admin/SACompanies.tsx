import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, ChevronRight } from 'lucide-react';
import { apiClient, apiClientWithMeta } from '@/lib/api';
import { ENDPOINTS, buildPaginationParams } from '@/lib/api/adapter';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';
import ErrorState from '@/components/ui/ErrorState';
import Modal from '@/components/ui/Modal';
import Select from '@/components/ui/Select';
import { useToast } from '@/hooks/useToast';
import { formatDate, generateTempPassword } from '@/lib/utils';
import type { BackendTenant, CreateTenantRequest } from '@/lib/api/types';

const COUNTRY_OPTIONS = [
  { value: 'NG', label: 'Nigeria' },
  { value: 'GH', label: 'Ghana' },
  { value: 'KE', label: 'Kenya' },
  { value: 'ZA', label: 'South Africa' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'CA', label: 'Canada' },
  { value: 'US', label: 'United States' },
];

const CURRENCY_OPTIONS = [
  { value: 'NGN', label: 'NGN — Nigerian Naira' },
  { value: 'GHS', label: 'GHS — Ghanaian Cedi' },
  { value: 'KES', label: 'KES — Kenyan Shilling' },
  { value: 'ZAR', label: 'ZAR — South African Rand' },
  { value: 'GBP', label: 'GBP — British Pound' },
  { value: 'CAD', label: 'CAD — Canadian Dollar' },
  { value: 'USD', label: 'USD — US Dollar' },
];

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

const blankForm = {
  name: '',
  slug: '',
  contactEmail: '',
  country: 'NG',
  currency: 'NGN',
  adminFirstName: '',
  adminLastName: '',
  adminPassword: generateTempPassword(),
};

export default function SACompanies() {
  const navigate = useNavigate();
  const toast = useToast();
  const qc = useQueryClient();

  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(blankForm);
  const [formError, setFormError] = useState('');
  // Slug keeps auto-populating from the name until the user edits the slug
  // field directly - tracking this separately from `form.slug` itself, since
  // `form.slug` is non-empty after the very first auto-populated character,
  // which previously made `f.slug || slugify(...)` freeze after one keystroke.
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  const { data: tenants, isLoading, isError, refetch } = useQuery<BackendTenant[]>({
    queryKey: ['platform-tenants'],
    queryFn: async () => {
      const params = buildPaginationParams({ page: 1, limit: 100 });
      const { data } = await apiClientWithMeta<BackendTenant[]>(`${ENDPOINTS.PLATFORM_TENANTS.LIST}?${params}`);
      return data;
    },
  });

  // Real CreateTenantDto only has {name, slug, contactEmail, contactPhone?, country?,
  // timezone?, currency?} - no plan/adminEmail/setupComplete field exists. A newly
  // created tenant also has zero users, so it can't log in yet - follow up with
  // POST /platform/tenants/:id/users to create its first tenant_admin.
  const onboard = useMutation({
    mutationFn: async () => {
      const tenant = await apiClient<BackendTenant>(ENDPOINTS.PLATFORM_TENANTS.CREATE, {
        method: 'POST',
        body: JSON.stringify({
          name: form.name,
          slug: form.slug,
          contactEmail: form.contactEmail,
          country: form.country,
          currency: form.currency,
        } satisfies CreateTenantRequest),
      });

      await apiClient(ENDPOINTS.PLATFORM_TENANTS.CREATE_USER(tenant.id), {
        method: 'POST',
        body: JSON.stringify({
          email: form.contactEmail,
          password: form.adminPassword,
          firstName: form.adminFirstName,
          lastName: form.adminLastName,
          role: 'tenant_admin',
        }),
      });

      return tenant;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['platform-tenants'] });
      toast.success(
        'Company onboarded',
        `Share these credentials with ${form.contactEmail} directly: temp password ${form.adminPassword}`,
      );
      resetForm();
    },
    onError: () => toast.error('Failed to onboard company', 'Please check the details and try again.'),
  });

  const resetForm = () => {
    setForm({ ...blankForm, adminPassword: generateTempPassword() });
    setFormError('');
    setSlugManuallyEdited(false);
    setShowModal(false);
  };

  const handleSubmit = () => {
    if (!form.name.trim()) return setFormError('Company name is required');
    if (!form.slug.trim()) return setFormError('Slug is required');
    if (!form.contactEmail.trim() || !form.contactEmail.includes('@')) return setFormError('A valid contact email is required');
    if (!form.adminFirstName.trim() || !form.adminLastName.trim()) return setFormError("The first admin's name is required");
    setFormError('');
    onboard.mutate();
  };

  const filtered = (tenants ?? []).filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.contactEmail.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="p-6 max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-[clamp(1.25rem,2.5vw,1.75rem)] font-semibold text-deep-cash">Companies</h1>
          <p className="text-sm text-cash-green/70 mt-0.5">Manage tenants on the platform</p>
        </div>
        <Button variant="primary" onClick={() => setShowModal(true)}>
          <Plus size={16} className="mr-2" />
          Onboard New Company
        </Button>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center h-64">
          <Spinner size="lg" />
        </div>
      )}
      {isError && <ErrorState message="Failed to load companies." onRetry={() => refetch()} />}
      {!isLoading && !isError && (
        <>
          <div className="relative mb-6 w-full max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-cash-green/50" />
            <input
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-mint-light rounded-lg bg-soft-white outline-none focus:border-cash-green transition-colors text-deep-cash placeholder:text-cash-green/40"
              placeholder="Search by name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="bg-white border border-mint-light rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-mint-light bg-soft-white">
                    {['Company', 'Contact Email', 'Country', 'Currency', 'Status', 'Joined', ''].map((h) => (
                      <th key={h} className="text-left px-6 py-3 text-xs font-medium text-cash-green/70 uppercase tracking-wide">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-cash-green/50 text-sm">
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
                        <td className="px-6 py-4 text-cash-green/80">{t.contactEmail}</td>
                        <td className="px-6 py-4 text-cash-green/80">{t.country || '—'}</td>
                        <td className="px-6 py-4 text-cash-green/80">{t.currency || '—'}</td>
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
        </>
      )}

      {/* ── Onboard modal ──────────────────────────────────── */}
      <Modal isOpen={showModal} onClose={resetForm} title="Onboard New Company">
        <div className="flex flex-col gap-5 pt-2">
          <div>
            <p className="text-xs font-medium text-cash-green mb-1.5">Company name</p>
            <input
              className="w-full bg-transparent border-b border-cash-green/30 py-2.5 text-sm text-deep-cash outline-none focus:border-cash-green transition-colors placeholder:text-cash-green/40"
              placeholder="e.g. Zenith Logistics Ltd"
              value={form.name}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  name: e.target.value,
                  slug: slugManuallyEdited ? f.slug : slugify(e.target.value),
                }))
              }
              autoFocus
            />
          </div>
          <div>
            <p className="text-xs font-medium text-cash-green mb-1.5">Slug</p>
            <input
              className="w-full bg-transparent border-b border-cash-green/30 py-2.5 text-sm text-deep-cash outline-none focus:border-cash-green transition-colors placeholder:text-cash-green/40 font-mono"
              placeholder="zenith-logistics"
              value={form.slug}
              onChange={(e) => {
                setSlugManuallyEdited(true);
                setForm((f) => ({ ...f, slug: slugify(e.target.value) }));
              }}
            />
            <p className="text-xs text-cash-green/50 mt-1">Used as the company code at login — lowercase, hyphens only.</p>
          </div>
          <div>
            <p className="text-xs font-medium text-cash-green mb-1.5">Contact email (also the first admin's login)</p>
            <input
              className="w-full bg-transparent border-b border-cash-green/30 py-2.5 text-sm text-deep-cash outline-none focus:border-cash-green transition-colors placeholder:text-cash-green/40"
              type="email"
              placeholder="admin@company.com"
              value={form.contactEmail}
              onChange={(e) => setForm((f) => ({ ...f, contactEmail: e.target.value }))}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Select label="Country" value={form.country} options={COUNTRY_OPTIONS} onChange={(v) => setForm((f) => ({ ...f, country: v }))} />
            <Select label="Currency" value={form.currency} options={CURRENCY_OPTIONS} onChange={(v) => setForm((f) => ({ ...f, currency: v }))} />
          </div>

          <div className="pt-2 border-t border-mint-light">
            <p className="text-xs font-semibold text-cash-green uppercase tracking-wide mb-3 mt-3">First Admin User</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <input
                className="w-full bg-transparent border-b border-cash-green/30 py-2.5 text-sm text-deep-cash outline-none focus:border-cash-green transition-colors placeholder:text-cash-green/40"
                placeholder="First name"
                value={form.adminFirstName}
                onChange={(e) => setForm((f) => ({ ...f, adminFirstName: e.target.value }))}
              />
              <input
                className="w-full bg-transparent border-b border-cash-green/30 py-2.5 text-sm text-deep-cash outline-none focus:border-cash-green transition-colors placeholder:text-cash-green/40"
                placeholder="Last name"
                value={form.adminLastName}
                onChange={(e) => setForm((f) => ({ ...f, adminLastName: e.target.value }))}
              />
            </div>
            <div className="mt-4">
              <p className="text-xs font-medium text-cash-green mb-1.5">Temporary password</p>
              <input
                className="w-full bg-transparent border-b border-cash-green/30 py-2.5 text-sm text-deep-cash outline-none focus:border-cash-green transition-colors font-mono"
                value={form.adminPassword}
                onChange={(e) => setForm((f) => ({ ...f, adminPassword: e.target.value }))}
              />
              <p className="text-xs text-cash-green/50 mt-1">
                There is no invite email — share this with them directly.
              </p>
            </div>
          </div>

          {formError && <p className="text-sm text-red-500">{formError}</p>}
          <div className="flex justify-end gap-3 pt-2 border-t border-mint-light">
            <Button variant="ghost" onClick={resetForm}>Cancel</Button>
            <Button variant="primary" onClick={handleSubmit} loading={onboard.isPending}>
              Create Company
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
