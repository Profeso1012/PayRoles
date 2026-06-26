import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, CheckCircle } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { apiClient } from '@/lib/api';
import { PATHS } from '@/router/paths';

const COMPANY_SIZES = [
  { value: '1-50', label: '1–50 employees' },
  { value: '51-200', label: '51–200 employees' },
  { value: '201-500', label: '201–500 employees' },
  { value: '501-1000', label: '501–1,000 employees' },
  { value: '1000+', label: 'Over 1,000 employees' },
];

const COUNTRIES = [
  { value: 'NG', label: 'Nigeria' },
  { value: 'GH', label: 'Ghana' },
  { value: 'KE', label: 'Kenya' },
  { value: 'ZA', label: 'South Africa' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'CA', label: 'Canada' },
  { value: 'US', label: 'United States' },
];

interface FormState {
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  companySize: string;
  country: string;
  message: string;
}

const EMPTY: FormState = {
  companyName: '',
  contactName: '',
  email: '',
  phone: '',
  companySize: '',
  country: '',
  message: '',
};

export default function RequestAccess() {
  const [form, setForm] = useState<FormState>(EMPTY);
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
    if (!form.companyName.trim()) next.companyName = 'Company name is required';
    if (!form.contactName.trim()) next.contactName = 'Contact name is required';
    if (!form.email.trim()) next.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next.email = 'Enter a valid email';
    if (!form.phone.trim()) next.phone = 'Phone number is required';
    if (!form.companySize) next.companySize = 'Select a company size';
    if (!form.country) next.country = 'Select a country';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setSubmitting(true);
    setServerError('');
    try {
      await apiClient('/company-requests', { method: 'POST', body: JSON.stringify(form) });
      setSubmitted(true);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-soft-white flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-mint-light p-10 max-w-md w-full text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-mint-light mb-6">
            <CheckCircle className="text-cash-green" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-deep-cash mb-3">Request received!</h1>
          <p className="text-gray-600 mb-2">
            Thanks for your interest in PayRole. Our team will review your request and reach out
            to <span className="font-medium text-deep-cash">{form.email}</span> within 1–2 business days.
          </p>
          <p className="text-sm text-gray-500 mb-8">
            If approved, you'll receive an invitation link to set up your company account.
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
      {/* Minimal nav */}
      <nav className="bg-deep-cash px-6 py-4 flex items-center gap-3">
        <Link to={PATHS.HOME} className="flex items-center gap-2">
          <div className="w-8 h-8 bg-cash-gold rounded-lg flex items-center justify-center">
            <Building2 size={18} className="text-deep-cash" />
          </div>
          <span className="text-white font-bold text-lg tracking-tight">PayRole</span>
        </Link>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-deep-cash mb-2">Request access</h1>
          <p className="text-gray-600">
            Tell us about your company and we'll get you set up on PayRole. One of our team members
            will review your request and send an invitation to the email address provided.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-6">
          {serverError && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {serverError}
            </div>
          )}

          {/* Company details */}
          <div>
            <h2 className="text-sm font-semibold text-deep-cash uppercase tracking-wider mb-4">
              Company details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company name <span className="text-red-500">*</span>
                </label>
                <Input
                  value={form.companyName}
                  onChange={(e) => set('companyName', e.target.value)}
                  placeholder="Dangote Cement Plc"
                  error={errors.companyName}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company size <span className="text-red-500">*</span>
                </label>
                <Select
                  options={COMPANY_SIZES}
                  value={form.companySize}
                  onChange={(v) => set('companySize', v)}
                  placeholder="Select size"
                  error={errors.companySize}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Country <span className="text-red-500">*</span>
                </label>
                <Select
                  options={COUNTRIES}
                  value={form.country}
                  onChange={(v) => set('country', v)}
                  placeholder="Select country"
                  error={errors.country}
                />
              </div>
            </div>
          </div>

          {/* Contact details */}
          <div>
            <h2 className="text-sm font-semibold text-deep-cash uppercase tracking-wider mb-4">
              Your contact details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full name <span className="text-red-500">*</span>
                </label>
                <Input
                  value={form.contactName}
                  onChange={(e) => set('contactName', e.target.value)}
                  placeholder="Aliko Dangote"
                  error={errors.contactName}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Work email <span className="text-red-500">*</span>
                </label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => set('email', e.target.value)}
                  placeholder="you@company.com"
                  error={errors.email}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone number <span className="text-red-500">*</span>
                </label>
                <Input
                  value={form.phone}
                  onChange={(e) => set('phone', e.target.value)}
                  placeholder="+234 800 000 0000"
                  error={errors.phone}
                />
              </div>
            </div>
          </div>

          {/* Message */}
          <div>
            <h2 className="text-sm font-semibold text-deep-cash uppercase tracking-wider mb-4">
              Anything else? (optional)
            </h2>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tell us about your payroll needs
            </label>
            <textarea
              value={form.message}
              onChange={(e) => set('message', e.target.value)}
              placeholder="e.g. We have 300 staff across 3 states with PAYE obligations..."
              rows={4}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cash-green focus:border-transparent resize-none"
            />
          </div>

          <Button
            variant="primary"
            className="w-full"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? 'Submitting…' : 'Submit request'}
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
