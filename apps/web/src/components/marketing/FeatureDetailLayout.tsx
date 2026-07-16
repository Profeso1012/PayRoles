import { Link } from 'react-router-dom'
import { ArrowRight, ArrowLeft, Check } from 'lucide-react'
import FeaturePageShell from './FeaturePageShell'
import { PATHS } from '@/router/paths'
import { buildGetStartedMailto } from '@/lib/supportContact'

interface StepLink {
  label: string
  to: string
}

interface FeatureDetailLayoutProps {
  stepNumber: number
  totalSteps: number
  title: string
  description: string
  bullets: string[]
  screenshot: string
  screenshotAlt: string
  prev?: StepLink
  next?: StepLink
}

export default function FeatureDetailLayout({
  stepNumber,
  totalSteps,
  title,
  description,
  bullets,
  screenshot,
  screenshotAlt,
  prev,
  next,
}: FeatureDetailLayoutProps) {
  return (
    <FeaturePageShell>
      <section
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: 'clamp(48px, 8vw, 96px) clamp(24px, 5vw, 56px)',
        }}
      >
        <Link
          to={PATHS.FEATURES}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            color: '#1F6F4E',
            fontSize: 14,
            fontWeight: 600,
            textDecoration: 'none',
            marginBottom: 32,
          }}
        >
          <ArrowLeft size={15} /> All features
        </Link>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)',
            gap: 'clamp(32px, 5vw, 64px)',
            alignItems: 'center',
          }}
        >
          <div>
            <p
              style={{
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: '#4FAD72',
                marginBottom: 14,
              }}
            >
              Step {stepNumber} of {totalSteps}
            </p>
            <h1
              style={{
                fontSize: 'clamp(1.75rem, 4vw, 2.75rem)',
                fontWeight: 700,
                color: '#0F2E23',
                lineHeight: 1.15,
                marginBottom: 18,
              }}
            >
              {title}
            </h1>
            <p style={{ fontSize: 'clamp(1rem, 1.5vw, 1.125rem)', color: '#1F6F4E', lineHeight: 1.65, marginBottom: 28 }}>
              {description}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 36 }}>
              {bullets.map((b) => (
                <div key={b} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      background: '#CDEFD7',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      marginTop: 1,
                    }}
                  >
                    <Check size={13} color="#1F6F4E" />
                  </div>
                  <span style={{ fontSize: 15, color: '#0F2E23', lineHeight: 1.5 }}>{b}</span>
                </div>
              ))}
            </div>

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

          <div>
            <img
              src={screenshot}
              alt={screenshotAlt}
              style={{
                width: '100%',
                height: 'auto',
                borderRadius: 16,
                border: '1px solid #CDEFD7',
                boxShadow: '0 20px 50px rgba(15,46,35,0.10)',
              }}
            />
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 16,
            marginTop: 'clamp(56px, 8vw, 96px)',
            paddingTop: 32,
            borderTop: '1px solid #CDEFD7',
            flexWrap: 'wrap',
          }}
        >
          {prev ? (
            <Link
              to={prev.to}
              style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#1F6F4E', fontSize: 14, fontWeight: 600, textDecoration: 'none' }}
            >
              <ArrowLeft size={15} /> {prev.label}
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link
              to={next.to}
              style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#1F6F4E', fontSize: 14, fontWeight: 600, textDecoration: 'none' }}
            >
              {next.label} <ArrowRight size={15} />
            </Link>
          ) : (
            <span />
          )}
        </div>
      </section>
    </FeaturePageShell>
  )
}
