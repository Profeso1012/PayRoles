import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  ChevronRight,
  CheckCircle,
  XCircle,
  RefreshCw,
  Inbox,
  Clock,
  Building2,
  Phone,
  Mail,
  MessageSquare,
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { ENDPOINTS } from '@/lib/api/adapter';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';
import ErrorState from '@/components/ui/ErrorState';
import Modal from '@/components/ui/Modal';
import Select from '@/components/ui/Select';
import ConfirmModal from '@/components/ui/ConfirmModal';
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

interface CompanyRequest {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  companySize: string;
  country: string;
  message: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

const PLAN_OPTIONS = [
  { value: 'starter', label: 'Starter' },
  { value: 'growth', label: 'Growth' },
  { value: 'enterprise', label: 'Enterprise' },
];

const COUNTRY_OPTIONS = [
  { value: 'NG', label: 'Nigeria' },
  { value: 'GH', label: 'Ghana' },
  { value: 'KE', label: 'Kenya' },
  { value: 'ZA', label: 'South Africa' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'CA', label: 'Canada' },
  { value: 'US', label: 'United States' },
];

const REQUEST_STATUS: Record<CompanyRequest['status'], { label: string; variant: 'success' | 'warning' | 'danger' }> = {
  pending: { label: 'Pending review', variant: 'warning' },
  approved: { label: 'Approved', variant: 'success' },
  rejected: { label: 'Rejected', variant: 'danger' },
};

type Tab = 'companies' | 'requests';

export default function SACompanies() {
  const navigate = useNavigate();
  const toast = useToast();
  const qc = useQueryClient();

  const [activeTab, setActiveTab] = useState<Tab>('companies');
  const [search, setSearch] = useState('');
  const [requestSearch, setRequestSearch] = useState('');
  const [requestFilter, setRequestFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<CompanyRequest | null>(null);
  const [resendTarget, setResendTarget] = useState<CompanyRequest | null>(null);
  const [detailTarget, setDetailTarget] = useState<CompanyRequest | null>(null);

  // Form state
  const [companyName, setCompanyName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [plan, setPlan] = useState('starter');
  const [country, setCountry] = useState('NG');
  const [formError, setFormError] = useState('');

  const { data: tenants, isLoading: tenantsLoading, isError: tenantsError, refetch: refetchTenants } = useQuery({
    queryKey: ['platform-tenants'],
    queryFn: async () => {
      const response = await apiClient<any>(ENDPOINTS.PLATFORM_TENANTS.LIST);
      const items = Array.isArray(response) ? response : (response.data || []);
      return items;
    },
  });

  // Note: Company requests endpoint not implemented in backend yet
  // Keep the query disabled for now
  const { data: requests, isLoading: reqLoading, isError: reqError, refetch: refetchReq } = useQuery({
    queryKey: ['company-requests'],
    queryFn: () => apiClient<CompanyRequest[]>('/platform/company-requests'),
    enabled: false, // Disabled until backend implements this endpoint
  });

  const onboard = useMutation({
    mutationFn: (payload: { name: string; adminEmail: string; plan: string; country: string }) =>
      apiClient(ENDPOINTS.PLATFORM_TENANTS.CREATE, { method: 'POST', body: JSON.stringify(payload) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['platform-tenants'] });
      toast.success('Company onboarded', 'An invite has been sent to the admin email.');
      resetForm();
    },
    onError: () => toast.error('Failed to onboard company', 'Please try again.'),
  });

  // Note: Company requests feature not implemented in backend yet
  const approveRequest = useMutation({
    mutationFn: (id: string) =>
      apiClient(`/platform/company-requests/${id}/approve`, { method: 'PATCH' }),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: ['company-requests'] });
      const req = requests?.find((r) => r.id === id);
      toast.success('Request approved', `Invite sent to ${req?.email ?? 'the contact'}.`);
      if (detailTarget?.id === id) setDetailTarget(null);
    },
    onError: () => toast.error('Failed to approve', 'Please try again.'),
  });

  const rejectRequest = useMutation({
    mutationFn: (id: string) =>
      apiClient(`/platform/company-requests/${id}/reject`, { method: 'PATCH' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['company-requests'] });
      toast.success('Request rejected', 'The request has been declined.');
      setRejectTarget(null);
      if (detailTarget) setDetailTarget(null);
    },
    onError: () => toast.error('Failed to reject', 'Please try again.'),
  });

  const resendInvite = useMutation({
    mutationFn: (id: string) =>
      apiClient(`/platform/company-requests/${id}/resend-invite`, { method: 'POST' }),
    onSuccess: (_data, id) => {
      const req = requests?.find((r) => r.id === id);
      toast.success('Invite resent', `A new invite link was sent to ${req?.email ?? 'the contact'}.`);
      setResendTarget(null);
    },
    onError: () => toast.error('Failed to resend', 'Please try again.'),
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
    (t: any) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      (t.contactEmail ?? t.adminEmail ?? '').toLowerCase().includes(search.toLowerCase()),
  );

  const filteredRequests = (requests ?? []).filter((r) => {
    const matchesSearch =
      r.companyName.toLowerCase().includes(requestSearch.toLowerCase()) ||
      r.contactName.toLowerCase().includes(requestSearch.toLowerCase()) ||
      r.email.toLowerCase().includes(requestSearch.toLowerCase());
    const matchesStatus = requestFilter ? r.status === requestFilter : true;
    return matchesSearch && matchesStatus;
  });

  const pendingCount = (requests ?? []).filter((r) => r.status === 'pending').length;

  const tabs: { key: Tab; label: string; badge?: number }[] = [
    { key: 'companies', label: 'Active Companies' },
    { key: 'requests', label: 'Access Requests', badge: pendingCount },
  ];

  return (
    <div className="p-6 max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-[clamp(1.25rem,2.5vw,1.75rem)] font-semibold text-deep-cash">Companies</h1>
          <p className="text-sm text-cash-green/70 mt-0.5">Manage tenants and review access requests</p>
        </div>
        {activeTab === 'companies' && (
          <Button variant="primary" onClick={() => setShowModal(true)}>
            <Plus size={16} className="mr-2" />
            Onboard New Company
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-mint-light mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-cash-green text-deep-cash'
                : 'border-transparent text-cash-green/60 hover:text-deep-cash'
            }`}
          >
            {tab.label}
            {tab.badge != null && tab.badge > 0 && (
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-cash-gold text-deep-cash text-xs font-bold">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Companies tab ─────────────────────────────────── */}
      {activeTab === 'companies' && (
        <>
          {tenantsLoading && (
            <div className="flex items-center justify-center h-64">
              <Spinner size="lg" />
            </div>
          )}
          {tenantsError && <ErrorState message="Failed to load companies." onRetry={refetchTenants} />}
          {!tenantsLoading && !tenantsError && (
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
                        filtered.map((t: any) => (
                          <tr
                            key={t.id}
                            className="border-b border-mint-light/60 hover:bg-soft-white transition-colors cursor-pointer"
                            onClick={() => navigate(`/admin/companies/${t.id}`)}
                          >
                            <td className="px-6 py-4 font-medium text-deep-cash">{t.name}</td>
                            <td className="px-6 py-4 text-cash-green/80">{t.contactEmail ?? t.adminEmail}</td>
                            <td className="px-6 py-4 capitalize text-deep-cash">{t.plan ?? '—'}</td>
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
            </>
          )}
        </>
      )}

      {/* ── Requests tab ───────────────────────────────────── */}
      {activeTab === 'requests' && (
        <>
          {reqLoading && (
            <div className="flex items-center justify-center h-64">
              <Spinner size="lg" />
            </div>
          )}
          {reqError && <ErrorState message="Failed to load requests." onRetry={refetchReq} />}
          {!reqLoading && !reqError && (
            <>
              {/* Filters */}
              <div className="flex items-center gap-3 mb-6 flex-wrap">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-cash-green/50" />
                  <input
                    className="w-full pl-9 pr-4 py-2.5 text-sm border border-mint-light rounded-lg bg-soft-white outline-none focus:border-cash-green transition-colors text-deep-cash placeholder:text-cash-green/40"
                    placeholder="Search requests…"
                    value={requestSearch}
                    onChange={(e) => setRequestSearch(e.target.value)}
                  />
                </div>
                <div className="w-44">
                  <Select
                    options={[
                      { value: '', label: 'All statuses' },
                      { value: 'pending', label: 'Pending' },
                      { value: 'approved', label: 'Approved' },
                      { value: 'rejected', label: 'Rejected' },
                    ]}
                    value={requestFilter}
                    onChange={setRequestFilter}
                    placeholder="All statuses"
                  />
                </div>
              </div>

              {filteredRequests.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <Inbox size={40} className="text-mint-light mb-4" />
                  <p className="text-sm text-cash-green/60">No access requests found.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {filteredRequests.map((req) => (
                    <div
                      key={req.id}
                      className="bg-white border border-mint-light rounded-xl shadow-sm p-5"
                    >
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2 flex-wrap">
                            <h3 className="font-semibold text-deep-cash text-base">{req.companyName}</h3>
                            <Badge
                              variant={REQUEST_STATUS[req.status].variant}
                              label={REQUEST_STATUS[req.status].label}
                            />
                          </div>
                          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-cash-green/80">
                            <span className="flex items-center gap-1.5">
                              <Building2 size={13} className="text-cash-green/50" />
                              {req.companySize} employees · {req.country}
                            </span>
                            <span className="flex items-center gap-1.5">
                              <Mail size={13} className="text-cash-green/50" />
                              {req.contactName} — {req.email}
                            </span>
                            {req.phone && (
                              <span className="flex items-center gap-1.5">
                                <Phone size={13} className="text-cash-green/50" />
                                {req.phone}
                              </span>
                            )}
                            <span className="flex items-center gap-1.5">
                              <Clock size={13} className="text-cash-green/50" />
                              {formatDate(req.createdAt)}
                            </span>
                          </div>
                          {req.message && (
                            <p className="mt-3 text-sm text-gray-600 bg-soft-white rounded-lg px-3 py-2 flex items-start gap-2">
                              <MessageSquare size={13} className="text-cash-green/50 mt-0.5 flex-shrink-0" />
                              {req.message}
                            </p>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {req.status === 'pending' && (
                            <>
                              <Button
                                variant="danger"
                                onClick={() => setRejectTarget(req)}
                              >
                                <XCircle size={14} className="mr-1.5" />
                                Reject
                              </Button>
                              <Button
                                variant="primary"
                                onClick={() => approveRequest.mutate(req.id)}
                                loading={approveRequest.isPending && approveRequest.variables === req.id}
                              >
                                <CheckCircle size={14} className="mr-1.5" />
                                Approve & Invite
                              </Button>
                            </>
                          )}
                          {req.status === 'approved' && (
                            <Button
                              variant="secondary"
                              onClick={() => setResendTarget(req)}
                            >
                              <RefreshCw size={14} className="mr-1.5" />
                              Resend Invite
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
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
          <Select label="Subscription plan" value={plan} options={PLAN_OPTIONS} onChange={setPlan} />
          <Select label="Country" value={country} options={COUNTRY_OPTIONS} onChange={setCountry} />
          {formError && <p className="text-sm text-red-500">{formError}</p>}
          <div className="flex justify-end gap-3 pt-2 border-t border-mint-light">
            <Button variant="ghost" onClick={resetForm}>Cancel</Button>
            <Button variant="primary" onClick={handleSubmit} loading={onboard.isPending}>
              Send Invite
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Reject confirm ─────────────────────────────────── */}
      <ConfirmModal
        isOpen={!!rejectTarget}
        onClose={() => setRejectTarget(null)}
        onConfirm={() => rejectTarget && rejectRequest.mutate(rejectTarget.id)}
        title="Reject request?"
        message={`This will decline the access request from ${rejectTarget?.companyName}. The contact will not be notified automatically.`}
        confirmLabel="Reject"
        variant="danger"
        isLoading={rejectRequest.isPending}
      />

      {/* ── Resend confirm ─────────────────────────────────── */}
      <ConfirmModal
        isOpen={!!resendTarget}
        onClose={() => setResendTarget(null)}
        onConfirm={() => resendTarget && resendInvite.mutate(resendTarget.id)}
        title="Resend invite?"
        message={`A fresh invite link will be sent to ${resendTarget?.email}. The previous link will expire immediately.`}
        confirmLabel="Resend invite"
        variant="default"
        isLoading={resendInvite.isPending}
      />
    </div>
  );
}
