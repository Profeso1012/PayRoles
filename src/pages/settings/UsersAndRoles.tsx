import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserPlus, ShieldOff, ShieldCheck, KeyRound, Pencil, Building2 } from 'lucide-react';
import { apiClient, fetchAllPages } from '@/lib/api';
import { ENDPOINTS, buildPaginationParams } from '@/lib/api/adapter';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/hooks/useToast';
import PageHeader from '@/components/layout/PageHeader';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Badge from '@/components/ui/Badge';
import Avatar from '@/components/ui/Avatar';
import Modal from '@/components/ui/Modal';
import ConfirmModal from '@/components/ui/ConfirmModal';
import Spinner from '@/components/ui/Spinner';
import ErrorState from '@/components/ui/ErrorState';
import type { BackendUser, BackendRole, BackendWorker, BackendLegalEntity, CreateUserRequest, UpdateUserRequest } from '@/lib/api/types';
import { errorMessage } from '@/lib/errors';

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  tenant_admin: 'Tenant Admin',
  hr_manager: 'HR Manager',
  hr_officer: 'HR Officer',
  payroll_manager: 'Payroll Manager',
  payroll_officer: 'Payroll Officer',
  finance_manager: 'Finance Manager',
  auditor: 'Auditor',
  read_only: 'Read Only',
  employee_self_service: 'Employee',
};

const ROLE_BADGE_VARIANT: Record<string, 'success' | 'info' | 'warning'> = {
  super_admin: 'success',
  tenant_admin: 'success',
  hr_manager: 'info',
  hr_officer: 'info',
  payroll_manager: 'info',
  payroll_officer: 'info',
  finance_manager: 'warning',
  auditor: 'warning',
  read_only: 'info',
  employee_self_service: 'info',
};

// Real backend CreateUserDto has no invite-token flow and no password field -
// a "new user" is created directly and the backend generates a temporary
// password, emailed straight to them along with a mandatory first-login
// password change (mustChangePassword).
const ROLE_OPTIONS = Object.entries(ROLE_LABELS)
  .filter(([value]) => value !== 'super_admin') // super_admin is reserved, not self-servable here
  .map(([value, label]) => ({ value, label }));

const blankAddUserForm = {
  firstName: '',
  lastName: '',
  email: '',
  role: 'read_only' as BackendRole,
  workerId: '',
  legalEntityIds: [] as string[],
};

export default function UsersAndRoles() {
  const qc = useQueryClient();
  const toast = useToast();
  const currentUser = useAuthStore((s) => s.user);
  const role = currentUser?.role;
  const isSuperAdmin = role === 'tenant_admin' || role === 'super_admin';
  // user.service.ts's update() enforces PRIVILEGED_ROLES = [SUPER_ADMIN, TENANT_ADMIN]:
  // only a caller whose OWN role is literally super_admin may set a user's role to
  // tenant_admin (create() has no such restriction, so it stays in ROLE_OPTIONS there).
  const canReassignToTenantAdmin = role === 'super_admin';
  const editRoleOptions = canReassignToTenantAdmin ? ROLE_OPTIONS : ROLE_OPTIONS.filter((o) => o.value !== 'tenant_admin');

  const [addUserOpen, setAddUserOpen] = useState(false);
  const [form, setForm] = useState(blankAddUserForm);
  const [disableTarget, setDisableTarget] = useState<BackendUser | null>(null);
  const [resetPasswordTarget, setResetPasswordTarget] = useState<BackendUser | null>(null);
  const [editTarget, setEditTarget] = useState<BackendUser | null>(null);
  const [editForm, setEditForm] = useState<UpdateUserRequest>({});
  const [legalEntityTarget, setLegalEntityTarget] = useState<BackendUser | null>(null);

  const {
    data: users = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<BackendUser[]>({
    queryKey: ['settings-users'],
    // PaginationDto caps limit at 100 - page through every user rather than
    // silently dropping user #101+ from this full-list table.
    queryFn: () =>
      fetchAllPages<BackendUser>(
        (page) => `${ENDPOINTS.USERS.LIST}?${buildPaginationParams({ page, limit: 100 })}`,
      ),
    enabled: isSuperAdmin,
  });

  // Populates the "Link to Employee" picker on Add User (mandatory for
  // employee_self_service - an account with no workerId can never resolve
  // its own payslips), and also used to show which employee an existing
  // employee_self_service account is already linked to on Edit User (that
  // link is create-only, can't be changed here, but the admin should still
  // be able to see it rather than it being invisible).
  const { data: workerCatalog } = useQuery<BackendWorker[]>({
    queryKey: ['workers-catalog'],
    queryFn: async () => {
      // PaginationDto caps limit at 100 - page through the whole tenant
      // roster rather than requesting an oversized single page.
      return fetchAllPages<BackendWorker>(
        (page) => `${ENDPOINTS.WORKERS.LIST}?${buildPaginationParams({ page, limit: 100 })}`,
      );
    },
    enabled: (addUserOpen && form.role === 'employee_self_service') || editTarget?.role === 'employee_self_service',
  });

  // Shared between the Add User form's legal-entity checklist and the
  // per-user "Manage Legal Entities" modal. GET /legal-entities is scoped to
  // the caller's own restriction, but only a tenant_admin/super_admin can
  // reach this page at all (isSuperAdmin gate above), and those two roles
  // are unrestricted by default - so this is the tenant's full roster.
  const { data: legalEntities = [] } = useQuery<BackendLegalEntity[]>({
    queryKey: ['legal-entities-full'],
    queryFn: () => fetchAllPages<BackendLegalEntity>(
      (page) => `${ENDPOINTS.LEGAL_ENTITIES.LIST}?${buildPaginationParams({ page, limit: 100 })}`,
    ),
    enabled: addUserOpen || !!legalEntityTarget,
  });

  // Current live assignment for whichever user's access is being managed -
  // GET /auth/me only ever reflects the CALLER's own restriction, this is
  // the only way to see another user's actual current set.
  const { data: assignedLegalEntityIds = [], isLoading: loadingAssignedEntities } = useQuery<string[]>({
    queryKey: ['user-legal-entities', legalEntityTarget?.id],
    queryFn: async () => {
      const { legalEntityIds } = await apiClient<{ legalEntityIds: string[] }>(
        ENDPOINTS.USERS.LEGAL_ENTITIES(legalEntityTarget!.id),
      );
      return legalEntityIds;
    },
    enabled: !!legalEntityTarget,
  });

  const [pendingLegalEntityId, setPendingLegalEntityId] = useState<string | null>(null);
  const addLegalEntityMutation = useMutation({
    mutationFn: (legalEntityId: string) => {
      setPendingLegalEntityId(legalEntityId);
      return apiClient(ENDPOINTS.USERS.LEGAL_ENTITIES(legalEntityTarget!.id), {
        method: 'POST',
        body: JSON.stringify({ legalEntityId }),
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['user-legal-entities', legalEntityTarget?.id] }),
    onError: (err) => toast.error('Failed to add legal entity', errorMessage(err)),
    onSettled: () => setPendingLegalEntityId(null),
  });
  const removeLegalEntityMutation = useMutation({
    mutationFn: (legalEntityId: string) => {
      setPendingLegalEntityId(legalEntityId);
      return apiClient(ENDPOINTS.USERS.LEGAL_ENTITY(legalEntityTarget!.id, legalEntityId), { method: 'DELETE' });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['user-legal-entities', legalEntityTarget?.id] }),
    onError: (err) => toast.error('Failed to remove legal entity', errorMessage(err)),
    onSettled: () => setPendingLegalEntityId(null),
  });

  const createUserMutation = useMutation({
    mutationFn: (body: CreateUserRequest) =>
      apiClient(ENDPOINTS.USERS.CREATE, { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['settings-users'] });
      toast.success(`User created for ${vars.email}`, 'Login credentials were emailed to them.');
      setForm(blankAddUserForm);
      setAddUserOpen(false);
    },
    onError: (err) => toast.error('Failed to create user', errorMessage(err)),
  });

  // UpdateUserDto (backend) only supports firstName/lastName/role/phone - there
  // is no workerId field on the update path, only on create. A user created
  // without a worker link (or created as a different role, later switched to
  // employee_self_service) can never be linked after the fact through this
  // endpoint - the only fix is creating a fresh, correctly-linked account.
  const updateUserMutation = useMutation({
    mutationFn: () => {
      // user.service.ts's update() 403s whenever `role` is present in the body
      // and is a PRIVILEGED_ROLES value (tenant_admin/super_admin) and the
      // caller isn't literally super_admin - even if that role is unchanged.
      // Omitting it when it matches the target's current role means a plain
      // tenant_admin editing another tenant_admin's name/phone doesn't 403 on
      // an update that never actually touches their role.
      const body = { ...editForm };
      if (body.role === editTarget?.role) delete body.role;
      return apiClient(ENDPOINTS.USERS.UPDATE(editTarget!.id), { method: 'PATCH', body: JSON.stringify(body) });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings-users'] });
      toast.success('User updated');
      setEditTarget(null);
    },
    onError: (err) => toast.error('Failed to update user', errorMessage(err)),
  });

  function openEdit(u: BackendUser) {
    setEditTarget(u);
    setEditForm({ firstName: u.firstName, lastName: u.lastName, role: u.role, phone: u.phone ?? '' });
  }

  const disableMutation = useMutation({
    mutationFn: (id: string) =>
      apiClient(ENDPOINTS.USERS.DISABLE(id), { method: 'PATCH' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings-users'] });
      toast.success('User disabled');
      setDisableTarget(null);
    },
    onError: (err) => toast.error('Failed to disable user', errorMessage(err)),
  });

  const enableMutation = useMutation({
    mutationFn: (id: string) => apiClient(ENDPOINTS.USERS.ENABLE(id), { method: 'PATCH' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings-users'] });
      toast.success('User re-enabled');
    },
    onError: (err) => toast.error('Failed to enable user', errorMessage(err)),
  });

  // Generates a random temp password server-side and returns it once - never
  // emailed/stored - so it has to be relayed to the user out-of-band. Also
  // invalidates their refresh token, forcing them to log back in.
  const resetPasswordMutation = useMutation({
    mutationFn: (id: string) =>
      apiClient<{ temporaryPassword: string }>(ENDPOINTS.USERS.RESET_PASSWORD(id), { method: 'PATCH' }),
    // The backend emails the new temporary password directly to the user -
    // it also returns it in the response as a fallback for if email delivery
    // is unavailable, but there's no need to surface/copy it here too.
    onSuccess: () => {
      toast.success('Password reset', `A new temporary password was emailed to ${resetPasswordTarget?.email ?? 'the user'}.`);
      setResetPasswordTarget(null);
    },
    onError: (err) => toast.error('Failed to reset password', errorMessage(err)),
  });

  if (!isSuperAdmin) {
    return (
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem clamp(0.75rem, 4vw, 1.5rem)' }}>
        <PageHeader
          title="Users & Roles"
          breadcrumbs={[{ label: 'Settings' }, { label: 'Users & Roles' }]}
        />
        <div
          style={{
            padding: '2rem',
            background: '#fff',
            border: '1px solid #CDEFD7',
            borderRadius: '0.75rem',
            textAlign: 'center',
            color: '#1F6F4E',
            fontSize: '0.9375rem',
          }}
        >
          You need Tenant Admin access to manage users and roles.
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

  if (isError) {
    return <ErrorState error={error} message={errorMessage(error, '') || undefined} onRetry={() => refetch()} />;
  }

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', padding: '2rem clamp(0.75rem, 4vw, 1.5rem)' }}>
      <PageHeader
        title="Users & Roles"
        breadcrumbs={[{ label: 'Settings' }, { label: 'Users & Roles' }]}
        action={
          <Button variant="primary" onClick={() => setAddUserOpen(true)}>
            <UserPlus size={15} />
            Add User
          </Button>
        }
      />

      <div
        style={{
          background: '#fff',
          border: '1px solid #CDEFD7',
          borderRadius: '0.75rem',
          overflow: 'hidden',
        }}
      >
        {/* min-width forces the table to keep every column at its natural,
            one-line width - on a narrow viewport the container scrolls
            horizontally instead of squeezing a column until its text (e.g.
            "Reset Password", "Tenant Admin") wraps and inflates row height. */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: '760px', fontSize: 'clamp(0.8125rem, 1.5vw, 0.875rem)', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F7FAF8', borderBottom: '1px solid #CDEFD7' }}>
                {['Name', 'Email', 'Role', 'Status', 'Actions'].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: 'clamp(0.625rem, 1.5vw, 0.75rem) clamp(0.75rem, 2vw, 1rem)',
                      textAlign: 'left',
                      fontWeight: 600,
                      color: '#0F2E23',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const fullName = `${u.firstName} ${u.lastName}`;
                const isCurrentUser = u.id === currentUser?.id;
                const isActive = u.status === 'active';
                return (
                  <tr key={u.id} style={{ borderBottom: '1px solid #CDEFD7' }}>
                    <td style={{ padding: 'clamp(0.75rem, 2vw, 0.875rem) clamp(0.75rem, 2vw, 1rem)', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                        <Avatar name={fullName} size="sm" />
                        <span style={{ fontWeight: 500, color: '#0F2E23' }}>{fullName}</span>
                        {isCurrentUser && (
                          <span
                            style={{
                              fontSize: '0.6875rem',
                              fontWeight: 600,
                              color: '#1F6F4E',
                              background: '#CDEFD7',
                              padding: '0.125rem 0.4rem',
                              borderRadius: '0.25rem',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            You
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: 'clamp(0.75rem, 2vw, 0.875rem) clamp(0.75rem, 2vw, 1rem)', color: '#1F6F4E', whiteSpace: 'nowrap' }}>{u.email}</td>
                    <td style={{ padding: 'clamp(0.75rem, 2vw, 0.875rem) clamp(0.75rem, 2vw, 1rem)', whiteSpace: 'nowrap' }}>
                      <Badge
                        variant={ROLE_BADGE_VARIANT[u.role] ?? 'info'}
                        label={ROLE_LABELS[u.role] ?? u.role}
                      />
                    </td>
                    <td style={{ padding: 'clamp(0.75rem, 2vw, 0.875rem) clamp(0.75rem, 2vw, 1rem)', whiteSpace: 'nowrap' }}>
                      <Badge variant={isActive ? 'success' : 'error'} label={isActive ? 'Active' : u.status} />
                    </td>
                    <td style={{ padding: 'clamp(0.75rem, 2vw, 0.875rem) clamp(0.75rem, 2vw, 1rem)', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'nowrap' }}>
                        <Button variant="ghost" size="sm" className="whitespace-nowrap" onClick={() => openEdit(u)}>
                          <Pencil size={13} />
                          Edit
                        </Button>
                        {u.role !== 'employee_self_service' && (
                          <Button variant="ghost" size="sm" className="whitespace-nowrap" onClick={() => setLegalEntityTarget(u)}>
                            <Building2 size={13} />
                            Legal Entities
                          </Button>
                        )}
                        {isActive && (
                          <Button variant="ghost" size="sm" className="whitespace-nowrap" onClick={() => setResetPasswordTarget(u)}>
                            <KeyRound size={13} />
                            Reset Password
                          </Button>
                        )}
                        {isActive ? (
                          <Button
                            variant="danger"
                            size="sm"
                            className="whitespace-nowrap"
                            disabled={isCurrentUser}
                            onClick={() => setDisableTarget(u)}
                          >
                            <ShieldOff size={13} />
                            Disable
                          </Button>
                        ) : (
                          <Button
                            variant="secondary"
                            size="sm"
                            className="whitespace-nowrap"
                            loading={enableMutation.isPending && enableMutation.variables === u.id}
                            onClick={() => enableMutation.mutate(u.id)}
                          >
                            <ShieldCheck size={13} />
                            Enable
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {users.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: '#1F6F4E' }}>
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={addUserOpen}
        onClose={() => {
          setAddUserOpen(false);
          setForm(blankAddUserForm);
        }}
        title="Add User"
        size="sm"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem' }}>
            <Input
              label="First name"
              value={form.firstName}
              onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
            />
            <Input
              label="Last name"
              value={form.lastName}
              onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
            />
          </div>
          <Input
            label="Email address"
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            placeholder="colleague@company.com"
          />
          <Select
            label="Role"
            value={form.role}
            options={ROLE_OPTIONS}
            onChange={(v) => setForm((f) => ({ ...f, role: v as BackendRole, workerId: '' }))}
            placeholder="Select a role"
          />
          {form.role === 'employee_self_service' && (
            <div>
              <Select
                label="Link to Employee"
                value={form.workerId}
                options={(workerCatalog ?? []).map((w) => ({
                  value: w.id,
                  label: `${w.firstName} ${w.lastName}${w.employeeNumber ? ` (${w.employeeNumber})` : ''}`,
                }))}
                onChange={(v) => setForm((f) => ({ ...f, workerId: v }))}
                placeholder={workerCatalog ? 'Select an employee' : 'Loading...'}
              />
              <p className="text-xs text-cash-green/60 mt-1">
                Required — without this, the employee can't see their own payslips.
              </p>
            </div>
          )}
          {form.role !== 'employee_self_service' && legalEntities.length > 0 && (
            <div>
              <p className="text-xs font-medium text-cash-green mb-1.5">
                Legal entity access (optional)
              </p>
              <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto border border-mint-light rounded-lg p-2.5">
                {legalEntities.map((le) => (
                  <label key={le.id} className="flex items-center gap-2 text-sm text-deep-cash cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.legalEntityIds.includes(le.id)}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          legalEntityIds: e.target.checked
                            ? [...f.legalEntityIds, le.id]
                            : f.legalEntityIds.filter((id) => id !== le.id),
                        }))
                      }
                    />
                    {le.name}
                  </label>
                ))}
              </div>
              <p className="text-xs text-cash-green/60 mt-1">
                Leave everything unchecked for unrestricted access to every legal entity in the tenant.
              </p>
            </div>
          )}
          <p className="text-xs text-cash-green/60">
            A temporary password will be generated and emailed to them, along with a link to
            verify and set a permanent password on first login.
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
            <Button
              variant="ghost"
              onClick={() => {
                setAddUserOpen(false);
                setForm(blankAddUserForm);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              loading={createUserMutation.isPending}
              disabled={
                !form.firstName ||
                !form.lastName ||
                !form.email ||
                (form.role === 'employee_self_service' && !form.workerId) ||
                createUserMutation.isPending
              }
              onClick={() =>
                createUserMutation.mutate({
                  firstName: form.firstName,
                  lastName: form.lastName,
                  email: form.email,
                  role: form.role,
                  workerId: form.role === 'employee_self_service' ? form.workerId : undefined,
                  legalEntityIds: form.legalEntityIds.length > 0 ? form.legalEntityIds : undefined,
                })
              }
            >
              <ShieldCheck size={14} />
              Create User
            </Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!editTarget} onClose={() => setEditTarget(null)} title="Edit User" size="sm">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem' }}>
            <Input
              label="First name"
              value={editForm.firstName ?? ''}
              onChange={(e) => setEditForm((f) => ({ ...f, firstName: e.target.value }))}
            />
            <Input
              label="Last name"
              value={editForm.lastName ?? ''}
              onChange={(e) => setEditForm((f) => ({ ...f, lastName: e.target.value }))}
            />
          </div>
          <Input
            label="Phone (optional)"
            value={editForm.phone ?? ''}
            onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
          />
          <Select
            label="Role"
            value={editForm.role ?? ''}
            options={editTarget?.role === 'tenant_admin' ? ROLE_OPTIONS : editRoleOptions}
            disabled={editTarget?.role === 'tenant_admin' && !canReassignToTenantAdmin}
            hint={editTarget?.role === 'tenant_admin' && !canReassignToTenantAdmin ? 'Only a Super Admin can change a Tenant Admin\'s role.' : undefined}
            onChange={(v) => setEditForm((f) => ({ ...f, role: v as BackendRole }))}
          />
          {editTarget?.role === 'employee_self_service' && (
            <div>
              <p className="text-xs font-medium text-cash-green mb-1">Linked Employee</p>
              <p className="text-sm text-deep-cash bg-soft-white border border-mint-light rounded-md px-3 py-2.5">
                {(() => {
                  const worker = workerCatalog?.find((w) => w.id === editTarget.workerId);
                  return worker
                    ? `${worker.firstName} ${worker.lastName}${worker.employeeNumber ? ` (${worker.employeeNumber})` : ''}`
                    : editTarget.workerId ?? 'None';
                })()}
              </p>
              <p className="text-xs text-cash-green/60 mt-1">
                Set when this account was created — can't be changed here.
              </p>
            </div>
          )}
          {editForm.role === 'employee_self_service' && editTarget?.role !== 'employee_self_service' && (
            <p className="text-xs text-red-500">
              Can't switch to Employee here — this role needs a linked employee record, and there's no way to
              set that on an existing account. Create a new Employee user instead (Add User) and disable this
              one.
            </p>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
            <Button variant="ghost" onClick={() => setEditTarget(null)}>Cancel</Button>
            <Button
              variant="primary"
              loading={updateUserMutation.isPending}
              disabled={
                !editForm.firstName ||
                !editForm.lastName ||
                (editForm.role === 'employee_self_service' && editTarget?.role !== 'employee_self_service')
              }
              onClick={() => updateUserMutation.mutate()}
            >
              Save Changes
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={!!disableTarget}
        onClose={() => setDisableTarget(null)}
        onConfirm={() => disableTarget && disableMutation.mutate(disableTarget.id)}
        title="Disable User"
        message={`Are you sure you want to disable ${disableTarget ? `${disableTarget.firstName} ${disableTarget.lastName}` : 'this user'}? They will lose access to PayRole immediately.`}
        confirmLabel="Disable"
        variant="danger"
        isLoading={disableMutation.isPending}
      />

      <ConfirmModal
        isOpen={!!resetPasswordTarget}
        onClose={() => setResetPasswordTarget(null)}
        onConfirm={() => resetPasswordTarget && resetPasswordMutation.mutate(resetPasswordTarget.id)}
        title="Reset Password"
        message={`Generate a new temporary password for ${resetPasswordTarget ? `${resetPasswordTarget.firstName} ${resetPasswordTarget.lastName}` : 'this user'}? Their current password stops working immediately and they'll be signed out everywhere.`}
        confirmLabel="Reset Password"
        variant="danger"
        isLoading={resetPasswordMutation.isPending}
      />

      <Modal
        isOpen={!!legalEntityTarget}
        onClose={() => setLegalEntityTarget(null)}
        title="Manage Legal Entity Access"
        size="sm"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-cash-green/70">
            Legal entities{' '}
            <span className="font-medium text-deep-cash">
              {legalEntityTarget ? `${legalEntityTarget.firstName} ${legalEntityTarget.lastName}` : 'this user'}
            </span>{' '}
            may access. Checking/unchecking takes effect immediately - no need to save.
          </p>
          {loadingAssignedEntities ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : legalEntities.length === 0 ? (
            <p className="text-sm text-cash-green/60 py-4 text-center">No legal entities exist yet.</p>
          ) : (
            <>
              {assignedLegalEntityIds.length === 0 && (
                <p className="text-xs text-cash-gold bg-cash-gold/10 border border-cash-gold/30 rounded-lg px-3 py-2">
                  Currently unrestricted — sees every legal entity in the tenant. Check one below to start restricting access.
                </p>
              )}
              <div className="flex flex-col gap-1.5 max-h-72 overflow-y-auto">
                {legalEntities.map((le) => {
                  const isAssigned = assignedLegalEntityIds.includes(le.id);
                  const isPending = pendingLegalEntityId === le.id && (addLegalEntityMutation.isPending || removeLegalEntityMutation.isPending);
                  return (
                    <label
                      key={le.id}
                      className={`flex items-center gap-2.5 text-sm text-deep-cash px-2.5 py-2 rounded-lg border cursor-pointer ${
                        isAssigned ? 'border-fresh-cash/40 bg-mint-light/30' : 'border-mint-light'
                      } ${isPending ? 'opacity-60 pointer-events-none' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={isAssigned}
                        disabled={isPending}
                        onChange={() =>
                          isAssigned
                            ? removeLegalEntityMutation.mutate(le.id)
                            : addLegalEntityMutation.mutate(le.id)
                        }
                      />
                      <span className="flex-1">{le.name}</span>
                      {isPending && <Spinner size="sm" />}
                    </label>
                  );
                })}
              </div>
            </>
          )}
          <div className="flex justify-end pt-2">
            <Button variant="ghost" onClick={() => setLegalEntityTarget(null)}>Done</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
