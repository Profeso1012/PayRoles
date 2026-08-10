import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { apiClient, ApiError } from '@/lib/api';
import { ENDPOINTS } from '@/lib/api/adapter';
import { PATHS } from '@/router/paths';
import type { SignupRequest } from '@/lib/api/types';

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

interface FormState {
  tenantName: string;
  tenantSlug: string;
  contactEmail: string;
  adminFirstName: string;
  adminLastName: string;
  adminEmail: string;
}

const EMPTY: FormState = {
  tenantName: '',
  tenantSlug: '',
  contactEmail: '',
  adminFirstName: '',
  adminLastName: '',
  adminEmail: '',
};

function errorCode(err: unknown): string | undefined {
  if (!(err instanceof ApiError) || !err.data || typeof err.data !== 'object') return undefined;
  const body = err.data as { error?: { code?: string } };
  return body.error?.code;
}

export default function RequestAccess() {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [errors, setErrors] = useState<Partial<FormState>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState('');

  function set(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
  }

  function validate(): boolean {
    const next: Partial<FormState> = {};
    if (!form.tenantName.trim()) next.tenantName = 'Company name is required';
    if (!form.tenantSlug.trim()) next.tenantSlug = 'Company code is required';
    else if (form.tenantSlug.trim().length < 2) next.tenantSlug = 'Must be at least 2 characters';
    else if (!/^[a-z0-9-]+$/.test(form.tenantSlug.trim())) next.tenantSlug = 'Only lowercase letters, numbers, and hyphens';
    if (!form.contactEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contactEmail)) next.contactEmail = 'Enter a valid email';
    if (!form.adminFirstName.trim()) next.adminFirstName = 'First name is required';
    if (!form.adminLastName.trim()) next.adminLastName = 'Last name is required';
    if (!form.adminEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.adminEmail)) next.adminEmail = 'Enter a valid email';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setSubmitting(true);
    setServerError('');
    try {
      await apiClient(ENDPOINTS.AUTH.SIGNUP, {
        method: 'POST',
        body: JSON.stringify({
          tenantName: form.tenantName.trim(),
          tenantSlug: form.tenantSlug.trim(),
          contactEmail: form.contactEmail.trim(),
          adminFirstName: form.adminFirstName.trim(),
          adminLastName: form.adminLastName.trim(),
          adminEmail: form.adminEmail.trim(),
        } satisfies SignupRequest),
        skipAuthRedirect: true,
      });
      setSubmitted(true);
    } catch (err) {
      if (errorCode(err) === 'TENANT_ALREADY_EXISTS') {
        setErrors((prev) => ({ ...prev, tenantSlug: 'That company code is already taken' }));
      } else {
        setServerError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-soft-white flex items-center justify-center p-[clamp(1rem,4vw,2rem)]">
        <div className="bg-white rounded-2xl shadow-sm border border-mint-light p-[clamp(1.5rem,5vw,2.5rem)] max-w-md w-full text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-mint-light mb-6">
            <CheckCircle className="text-cash-green" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-deep-cash mb-3">Check your email</h1>
          <p className="text-gray-600 mb-2">
            We've sent a verification link to{' '}
            <span className="font-medium text-deep-cash break-all">{form.adminEmail}</span>. Click it
            to activate your account.
          </p>
          <p className="text-sm text-gray-500 mb-8">
            A separate email with a temporary password is on its way too — you'll need both to sign in
            for the first time.
          </p>
          <Link to={PATHS.HOME}>
            <Button variant="secondary" className="w-full">Back to home</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-soft-white">
      <nav className="bg-deep-cash px-[clamp(1rem,4vw,1.5rem)] py-4 flex items-center">
        <Link to={PATHS.HOME}>
          <img src="/assets/payrole-logo.png" alt="PayRole" style={{ height: 28 }} />
        </Link>
      </nav>

      <div style={{ width: '100%', maxWidth: '640px', margin: '0 auto', padding: 'clamp(1.5rem,5vw,2.5rem) clamp(1rem,4vw,1rem)' }}>
        <div className="mb-8">
          <h1 className="text-[clamp(1.5rem,4vw,1.875rem)] font-bold text-deep-cash mb-2">Create your company account</h1>
          <p className="text-gray-600">
            Set up your organisation on PayRole in minutes. We'll email your first admin a
            verification link and temporary login credentials.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-[clamp(1.25rem,4vw,2rem)] space-y-6">
          {serverError && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {serverError}
            </div>
          )}

          <div>
            <h2 className="text-sm font-semibold text-deep-cash uppercase tracking-wider mb-4">
              Company details
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company name <span className="text-red-500">*</span>
                </label>
                <Input
                  value={form.tenantName}
                  onChange={(e) => {
                    const value = e.target.value;
                    set('tenantName', value);
                    if (!slugManuallyEdited) set('tenantSlug', slugify(value));
                  }}
                  placeholder="Dangote Cement Plc"
                  error={errors.tenantName}
                />
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company code <span className="text-red-500">*</span>
                </label>
                <Input
                  value={form.tenantSlug}
                  onChange={(e) => {
                    setSlugManuallyEdited(true);
                    set('tenantSlug', slugify(e.target.value));
                  }}
                  placeholder="dangote-cement"
                  error={errors.tenantSlug}
                  hint="This is your company's login code — lowercase letters, numbers, and hyphens only."
                />
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact email <span className="text-red-500">*</span>
                </label>
                <Input
                  type="email"
                  value={form.contactEmail}
                  onChange={(e) => set('contactEmail', e.target.value)}
                  placeholder="hello@company.com"
                  error={errors.contactEmail}
                  hint="General company contact — doesn't need to be the admin's email."
                />
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-deep-cash uppercase tracking-wider mb-4">
              First admin user
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First name <span className="text-red-500">*</span>
                </label>
                <Input
                  value={form.adminFirstName}
                  onChange={(e) => set('adminFirstName', e.target.value)}
                  placeholder="Aliko"
                  error={errors.adminFirstName}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last name <span className="text-red-500">*</span>
                </label>
                <Input
                  value={form.adminLastName}
                  onChange={(e) => set('adminLastName', e.target.value)}
                  placeholder="Dangote"
                  error={errors.adminLastName}
                />
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Admin login email <span className="text-red-500">*</span>
                </label>
                <Input
                  type="email"
                  value={form.adminEmail}
                  onChange={(e) => set('adminEmail', e.target.value)}
                  placeholder="you@company.com"
                  error={errors.adminEmail}
                  hint="This becomes the login for your first admin account — the verification link and temporary password both go here."
                />
              </div>
            </div>
          </div>

          <Button
            variant="primary"
            className="w-full"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? 'Creating account…' : 'Create account'}
          </Button>

          <p className="text-center text-sm text-gray-500">
            Already have an account?{' '}
            <Link to={PATHS.LOGIN} className="text-cash-green font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
