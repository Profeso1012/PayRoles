import { Link } from 'react-router-dom'
import { ArrowRight, Users, Calculator, Play, CreditCard } from 'lucide-react'
import FeaturePageShell from '@/components/marketing/FeaturePageShell'
import { PATHS } from '@/router/paths'
import { buildGetStartedMailto } from '@/lib/supportContact'

const STEPS = [
  {
    number: 1,
    icon: Users,
    title: 'Add Your Team',
    desc: 'Bring your employees into PayRole and keep their details in one place.',
    to: PATHS.FEATURES_TEAM,
  },
  {
    number: 2,
    icon: Calculator,
    title: 'Set Up Pay',
    desc: 'Set a salary, allowances, and deductions for each person — once.',
    to: PATHS.FEATURES_PAY_SETUP,
  },
  {
    number: 3,
    icon: Play,
    title: 'Run Payroll',
    desc: 'Pick a pay period and let PayRole calculate everything for you.',
    to: PATHS.FEATURES_PAYROLL,
  },
  {
    number: 4,
    icon: CreditCard,
    title: 'Get Paid',
    desc: 'Approve, pay your team, and payslips go out automatically.',
    to: PATHS.FEATURES_PAYMENTS,
  },
]

export default function FeaturesOverview() {
  return (
    <FeaturePageShell>
      {/* Hero */}
      <section style={{ background: '#0F2E23', padding: 'clamp(56px, 8vw, 96px) clamp(24px, 5vw, 56px)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 48, alignItems: 'center' }}>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#4FAD72', marginBottom: 14 }}>
              How PayRole works
            </p>
            <h1 style={{ fontSize: 'clamp(2rem, 4.5vw, 3.25rem)', fontWeight: 700, color: 'white', lineHeight: 1.12, marginBottom: 20 }}>
              From your first employee to their first payslip
            </h1>
            <p style={{ fontSize: 'clamp(1rem, 1.6vw, 1.2rem)', color: 'rgba(255,255,255,0.75)', lineHeight: 1.65, marginBottom: 32, maxWidth: 520 }}>
              PayRole takes you through four simple steps. No jargon, no guesswork —
              just add your team, set up their pay, run payroll, and get everyone paid.
            </p>
            <a
              href={buildGetStartedMailto()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '14px 28px',
                background: '#1F6F4E',
                color: 'white',
                borderRadius: 10,
                fontSize: 15,
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              Get Started <ArrowRight size={16} />
            </a>
          </div>
          <img
            src="/assets/features/placeholder-overview.svg"
            alt="PayRole dashboard screenshot placeholder"
            style={{ width: '100%', height: 'auto', borderRadius: 16 }}
          />
        </div>
      </section>

      {/* Step cards */}
      <section style={{ maxWidth: 1200, margin: '0 auto', padding: 'clamp(48px, 8vw, 80px) clamp(24px, 5vw, 56px)' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 24,
          }}
        >
          {STEPS.map((step) => (
            <Link
              key={step.to}
              to={step.to}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
                padding: 28,
                background: 'white',
                border: '1px solid #CDEFD7',
                borderRadius: 14,
                textDecoration: 'none',
                transition: 'box-shadow 0.2s, transform 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 12px 30px rgba(15,46,35,0.10)'
                e.currentTarget.style.transform = 'translateY(-2px)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = 'none'
                e.currentTarget.style.transform = 'none'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: '#CDEFD7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <step.icon size={20} color="#1F6F4E" />
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#4FAD72' }}>Step {step.number}</span>
              </div>
              <p style={{ fontSize: 17, fontWeight: 700, color: '#0F2E23' }}>{step.title}</p>
              <p style={{ fontSize: 14, color: '#1F6F4E', lineHeight: 1.55, flex: 1 }}>{step.desc}</p>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 600, color: '#0F2E23' }}>
                See how it works <ArrowRight size={14} />
              </span>
            </Link>
          ))}
        </div>
      </section>
    </FeaturePageShell>
  )
}
