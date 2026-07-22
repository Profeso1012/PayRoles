import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Plus, Trash2 } from 'lucide-react';
import { apiClient } from '@/lib/api';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import MultiSelect from '@/components/ui/MultiSelect';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/hooks/useToast';

const STEPS = ['Company Profile', 'Jurisdictions', 'Pay Groups', 'Bank Details'];

const INDUSTRY_OPTIONS = [
  { value: 'manufacturing', label: 'Manufacturing' },
  { value: 'financial_services', label: 'Financial Services' },
  { value: 'technology', label: 'Technology' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'hospitality', label: 'Hospitality' },
  { value: 'retail', label: 'Retail' },
  { value: 'construction', label: 'Construction' },
  { value: 'other', label: 'Other' },
];

const COUNTRY_OPTIONS = [
  { value: 'NG', label: 'Nigeria', description: 'PAYE, Pension (PenCom), NHF, NSITF' },
  { value: 'GB', label: 'United Kingdom', description: 'PAYE, National Insurance, Auto-enrolment' },
  { value: 'CA', label: 'Canada', description: 'CPP, EI, Federal & Provincial Tax' },
  { value: 'US', label: 'United States', description: 'Federal, FICA, State Tax' },
];

const FREQUENCY_OPTIONS = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'bi-weekly', label: 'Bi-weekly' },
  { value: 'weekly', label: 'Weekly' },
];

interface PayGroupDraft {
  name: string;
  payFrequency: string;
  payDay: string;
}

export default function CompanySetup() {
  const navigate = useNavigate();
  const toast = useToast();
  const user = useAuthStore((s) => s.user);

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 0 — Company Profile
  const [legalName, setLegalName] = useState('');
  const [rcNumber, setRcNumber] = useState('');
  const [industry, setIndustry] = useState('');
  const [address, setAddress] = useState('');

  // Step 1 — Jurisdictions
  const [countries, setCountries] = useState<string[]>([]);

  // Step 2 — Pay Groups
  const [payGroups, setPayGroups] = useState<PayGroupDraft[]>([{ name: '', payFrequency: 'monthly', payDay: '28' }]);

  // Step 3 — Bank Details
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');

  const validate = (): boolean => {
    setError('');
    if (step === 0) {
      if (!legalName.trim()) { setError('Legal name is required'); return false; }
      if (!rcNumber.trim()) { setError('RC number is required'); return false; }
      if (!industry) { setError('Industry is required'); return false; }
      if (!address.trim()) { setError('Address is required'); return false; }
    }
    if (step === 1) {
      if (countries.length === 0) { setError('Select at least one country'); return false; }
    }
    if (step === 2) {
      for (const pg of payGroups) {
        if (!pg.name.trim()) { setError('All pay groups need a name'); return false; }
        if (!pg.payDay || isNaN(Number(pg.payDay))) { setError('All pay groups need a valid pay day'); return false; }
      }
    }
    if (step === 3) {
      if (!bankName.trim()) { setError('Bank name is required'); return false; }
      if (!accountNumber.trim()) { setError('Account number is required'); return false; }
      if (!accountName.trim()) { setError('Account name is required'); return false; }
    }
    return true;
  };

  const handleNext = async () => {
    if (!validate()) return;
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
      return;
    }
    setLoading(true);
    try {
      await apiClient('/tenants/setup', {
        method: 'POST',
        body: JSON.stringify({ legalName, rcNumber, industry, address, countries, payGroups, bankName, accountNumber, accountName }),
      });
      toast.success('Setup complete', 'Welcome to PayRole. Your workspace is ready.');
      navigate('/dashboard');
    } catch {
      setError('Setup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const addPayGroup = () =>
    setPayGroups((prev) => [...prev, { name: '', payFrequency: 'monthly', payDay: '28' }]);

  const removePayGroup = (i: number) =>
    setPayGroups((prev) => prev.filter((_, idx) => idx !== i));

  const updatePayGroup = (i: number, field: keyof PayGroupDraft, value: string) =>
    setPayGroups((prev) => prev.map((pg, idx) => (idx === i ? { ...pg, [field]: value } : pg)));

  return (
    <div className="min-h-screen bg-soft-white flex flex-col items-center justify-start py-12 px-4">
      <img src="/assets/payrole-logo.png" alt="PayRole" className="h-8 mb-10" />

      <div className="w-full max-w-[560px]">
        {/* Progress steps */}
        <div className="flex items-center gap-0 mb-10">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={[
                    'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all',
                    i < step
                      ? 'bg-fresh-cash border-fresh-cash text-white'
                      : i === step
                      ? 'bg-white border-cash-green text-cash-green'
                      : 'bg-white border-mint-light text-cash-green/40',
                  ].join(' ')}
                >
                  {i < step ? <CheckCircle size={16} /> : i + 1}
                </div>
                <span
                  className={[
                    'text-[10px] font-medium text-center leading-tight whitespace-nowrap',
                    i === step ? 'text-cash-green' : i < step ? 'text-fresh-cash' : 'text-cash-green/40',
                  ].join(' ')}
                >
                  {label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mb-5 mx-1 ${i < step ? 'bg-fresh-cash' : 'bg-mint-light'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-mint-light shadow-sm p-8">
          <h2 className="text-xl font-semibold text-deep-cash mb-1">{STEPS[step]}</h2>
          <p className="text-sm text-cash-green/60 mb-7">
            {step === 0 && `Setting up ${user?.tenantName ?? 'your company'}. You can update these later.`}
            {step === 1 && 'Select all countries where you have employees. This activates statutory rules for each.'}
            {step === 2 && 'Pay groups define how often a group of employees are paid. You can add more later.'}
            {step === 3 && 'The company bank account salaries will be disbursed from.'}
          </p>

          {/* Step 0 — Company Profile */}
          {step === 0 && (
            <div className="flex flex-col gap-5">
              {[
                { label: 'Full legal name', value: legalName, set: setLegalName, placeholder: 'Dangote Cement Plc' },
                { label: 'RC number', value: rcNumber, set: setRcNumber, placeholder: 'RC-123456' },
                { label: 'Registered address', value: address, set: setAddress, placeholder: '14 Dangote Crescent, Lagos' },
              ].map(({ label, value, set, placeholder }) => (
                <div key={label}>
                  <p className="text-xs font-medium text-cash-green mb-1.5">{label}</p>
                  <input
                    className="w-full bg-transparent border-b border-cash-green/30 py-2.5 text-sm text-deep-cash outline-none focus:border-cash-green transition-colors placeholder:text-cash-green/40"
                    value={value}
                    onChange={(e) => set(e.target.value)}
                    placeholder={placeholder}
                  />
                </div>
              ))}
              <Select label="Industry" value={industry} options={INDUSTRY_OPTIONS} onChange={setIndustry} placeholder="Select industry" />
            </div>
          )}

          {/* Step 1 — Jurisdictions */}
          {step === 1 && (
            <div className="flex flex-col gap-4">
              <MultiSelect
                label="Active country packs"
                values={countries}
                options={COUNTRY_OPTIONS}
                onChange={setCountries}
                placeholder="Select countries..."
              />
              {countries.length > 0 && (
                <div className="bg-soft-white rounded-lg p-4 border border-mint-light">
                  <p className="text-xs font-medium text-cash-green mb-3">Statutory rules that will be activated:</p>
                  <div className="flex flex-col gap-2">
                    {COUNTRY_OPTIONS.filter((c) => countries.includes(c.value)).map((c) => (
                      <div key={c.value} className="flex items-start gap-2">
                        <CheckCircle size={14} className="text-fresh-cash flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-deep-cash">
                          <span className="font-medium">{c.label}:</span> {c.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2 — Pay Groups */}
          {step === 2 && (
            <div className="flex flex-col gap-5">
              {payGroups.map((pg, i) => (
                <div key={i} className="border border-mint-light rounded-xl p-4">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-xs font-semibold text-cash-green uppercase tracking-wide">Pay Group {i + 1}</p>
                    {payGroups.length > 1 && (
                      <button onClick={() => removePayGroup(i)} className="text-red-400 hover:text-red-500">
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                  <div className="flex flex-col gap-4">
                    <div>
                      <p className="text-xs font-medium text-cash-green mb-1.5">Group name</p>
                      <input
                        className="w-full bg-transparent border-b border-cash-green/30 py-2.5 text-sm text-deep-cash outline-none focus:border-cash-green transition-colors placeholder:text-cash-green/40"
                        value={pg.name}
                        onChange={(e) => updatePayGroup(i, 'name', e.target.value)}
                        placeholder="e.g. Lagos Monthly Staff"
                      />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <Select
                        label="Pay frequency"
                        value={pg.payFrequency}
                        options={FREQUENCY_OPTIONS}
                        onChange={(v) => updatePayGroup(i, 'payFrequency', v)}
                      />
                      <div>
                        <p className="text-xs font-medium text-cash-green mb-1.5">Pay day</p>
                        <input
                          className="w-full bg-transparent border-b border-cash-green/30 py-2.5 text-sm text-deep-cash outline-none focus:border-cash-green transition-colors"
                          type="number"
                          min="1"
                          max="31"
                          value={pg.payDay}
                          onChange={(e) => updatePayGroup(i, 'payDay', e.target.value)}
                          placeholder={pg.payFrequency === 'monthly' ? '1–31' : '1–7'}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              <button
                onClick={addPayGroup}
                className="flex items-center gap-2 text-sm text-cash-green hover:text-fresh-cash border border-dashed border-cash-green/30 rounded-xl py-3 px-4 w-full justify-center hover:border-cash-green transition-colors"
              >
                <Plus size={15} /> Add another pay group
              </button>
            </div>
          )}

          {/* Step 3 — Bank Details */}
          {step === 3 && (
            <div className="flex flex-col gap-5">
              {[
                { label: 'Bank name', value: bankName, set: setBankName, placeholder: 'e.g. GTBank' },
                { label: 'Account number', value: accountNumber, set: setAccountNumber, placeholder: '0123456789' },
                { label: 'Account name', value: accountName, set: setAccountName, placeholder: 'Dangote Cement Plc' },
              ].map(({ label, value, set, placeholder }) => (
                <div key={label}>
                  <p className="text-xs font-medium text-cash-green mb-1.5">{label}</p>
                  <input
                    className="w-full bg-transparent border-b border-cash-green/30 py-2.5 text-sm text-deep-cash outline-none focus:border-cash-green transition-colors placeholder:text-cash-green/40"
                    value={value}
                    onChange={(e) => set(e.target.value)}
                    placeholder={placeholder}
                  />
                </div>
              ))}
            </div>
          )}

          {error && <p className="text-sm text-red-500 mt-4">{error}</p>}

          <div className="flex justify-between mt-8 pt-6 border-t border-mint-light">
            {step > 0 ? (
              <Button variant="ghost" onClick={() => { setStep((s) => s - 1); setError(''); }}>Back</Button>
            ) : (
              <div />
            )}
            <Button variant="primary" onClick={handleNext} loading={loading}>
              {step === STEPS.length - 1 ? 'Complete Setup' : 'Continue'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
