import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  ChevronRight,
  ChevronDown,
  ChevronLeft,
  Menu,
  Calculator,
  Shield,
  Users,
  FileText,
  BarChart3,
  Lock,
  Zap,
  Clock,
} from 'lucide-react'
import MarketingNav from '@/components/marketing/MarketingNav'
import MarketingFooter from '@/components/marketing/MarketingFooter'

const FEATURES = [
  {
    icon: Calculator,
    title: 'Automated Payroll',
    desc: 'Multi-country statutory calculations in seconds',
    tag: 'Core',
  },
  {
    icon: Shield,
    title: 'Compliance Engine',
    desc: 'PAYE, pension, NHF computed automatically',
    tag: 'Core',
  },
  {
    icon: Users,
    title: 'Team Management',
    desc: 'Org hierarchy, departments, job grades',
    tag: 'Core',
  },
  {
    icon: FileText,
    title: 'Payslip Generation',
    desc: 'Branded payslips distributed each pay run',
    tag: 'Core',
  },
  {
    icon: BarChart3,
    title: 'Reports & Analytics',
    desc: 'Statutory filings and cost summaries',
    tag: 'Core',
  },
  {
    icon: Lock,
    title: 'Role-Based Access',
    desc: '6 permission tiers protect sensitive data',
    tag: 'Core',
  },
]

export default function Landing() {
  const [cardOffset, setCardOffset] = useState(0)
  const cardTrackRef = useRef<HTMLDivElement>(null)

  const scrollCards = (dir: 'left' | 'right') => {
    const track = cardTrackRef.current
    if (!track) return
    const amount = 260
    const maxScroll = track.scrollWidth - track.clientWidth
    const next =
      dir === 'right'
        ? Math.min(cardOffset + amount, maxScroll)
        : Math.max(cardOffset - amount, 0)
    setCardOffset(next)
    track.scrollTo({ left: next, behavior: 'smooth' })
  }

  return (
    <div style={{ fontFamily: 'inherit', overflowX: 'hidden' }}>
      {/* ─── bounce animation ─── */}
      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateX(-50%) translateY(0); }
          40%            { transform: translateX(-50%) translateY(-9px); }
        }
        @keyframes menuSlideDown {
          from { opacity: 0; transform: translateY(-12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .mobile-menu { animation: menuSlideDown 0.22s ease forwards; }
        @media (min-width: 768px) {
          .nav-links-desktop { display: flex !important; }
          .hamburger-btn { display: none !important; }
        }
        @media (max-width: 767px) {
          .nav-links-desktop { display: none !important; }
          .hero-card { right: 32px !important; bottom: 70px !important; max-width: calc(100% - 64px) !important; }
          .hero-content { padding: 0 32px !important; }
          .art-grid { grid-template-columns: 1fr !important; }
          .footer-grid { grid-template-columns: 1fr 1fr !important; padding: 40px 24px 32px !important; gap: 40px !important; }
          .footer-brand-col { grid-column: 1 / -1 !important; }
          .footer-bar { padding: 24px 24px !important; flex-direction: column !important; align-items: flex-start !important; gap: 16px !important; }
          .stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .purp-inner { flex-direction: column !important; }
          .purp-sidebar { flex: unset !important; width: 100% !important; padding-right: 0 !important; padding-bottom: 32px !important; }
        }
      `}</style>

      <MarketingNav />

      {/* ═══════════════════════════════════════════════════════
          2. HERO
      ═══════════════════════════════════════════════════════ */}
      <section
        style={{
          height: '100vh',
          minHeight: 700,
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        {/* Background image */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
          <img
            src="/assets/mockup1.png"
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        </div>

        {/* Gradient overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 2,
            background:
              'linear-gradient(105deg, rgba(15,46,35,.92) 0%, rgba(15,46,35,.7) 55%, rgba(15,46,35,.22) 100%)',
          }}
        />

        {/* Hero content */}
        <div
          className="hero-content"
          style={{
            position: 'relative',
            zIndex: 3,
            maxWidth: 600,
            padding: '0 80px',
            color: 'white',
            marginTop: 40,
          }}
        >
          <div
            style={{
              display: 'inline-block',
              background: '#4FAD72',
              color: 'white',
              padding: '5px 14px',
              borderRadius: 999,
              fontSize: 11,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: 20,
            }}
          >
            Multi-Country Payroll Platform
          </div>

          <h1
            style={{
              fontSize: 'clamp(2rem, 4.5vw, 3.25rem)',
              fontWeight: 700,
              lineHeight: 1.06,
              margin: 0,
            }}
          >
            Payroll.<br />
            <span style={{ color: '#4FAD72' }}>People.</span><br />
            Possibilities.
          </h1>

          <p
            style={{
              fontSize: 18,
              lineHeight: 1.6,
              opacity: 0.85,
              marginTop: 16,
              fontWeight: 400,
            }}
          >
            Run compliant, multi-country payroll for your African team in minutes. Automated
            calculations, statutory compliance, and beautiful payslips — all in one platform.
          </p>

          <div style={{ marginTop: 32, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <Link
              to="/login"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: '#4FAD72',
                color: 'white',
                padding: '16px 28px',
                fontWeight: 600,
                fontSize: 14,
                textDecoration: 'none',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = '#1F6F4E' }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = '#4FAD72' }}
            >
              Get Started Free
              <ArrowRight size={16} />
            </Link>

            <a
              href="#how-it-works"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                color: 'white',
                fontWeight: 600,
                fontSize: 14,
                padding: '16px 28px',
                border: '1px solid rgba(255,255,255,0.30)',
                textDecoration: 'none',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(255,255,255,0.05)' }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = 'transparent' }}
            >
              See How It Works
            </a>
          </div>
        </div>

        {/* Floating card — bottom-right */}
        <div
          className="hero-card"
          style={{
            position: 'absolute',
            right: 80,
            bottom: 110,
            background: 'rgba(15,28,20,.86)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            padding: '28px 32px',
            maxWidth: 340,
            color: 'white',
            zIndex: 3,
          }}
        >
          <span
            style={{
              display: 'inline-block',
              background: '#F2B35E',
              color: '#0F2E23',
              padding: '4px 12px',
              fontSize: 10,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: 12,
            }}
          >
            Now Available
          </span>
          <div style={{ fontSize: 12, opacity: 0.70, marginBottom: 8 }}>Active Country Packs</div>
          <h3
            style={{
              fontSize: 17,
              fontWeight: 600,
              lineHeight: 1.35,
              marginBottom: 20,
              margin: '0 0 20px',
            }}
          >
            Nigeria, United Kingdom, Canada and United States — all in one payroll run
          </h3>
          <Link
            to="/login"
            style={{
              color: '#4FAD72',
              fontSize: 14,
              fontWeight: 500,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              textDecoration: 'none',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.textDecoration = 'underline' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.textDecoration = 'none' }}
          >
            Start running payroll
            <ChevronRight size={14} />
          </Link>
        </div>

        {/* Scroll indicator */}
        <div
          style={{
            position: 'absolute',
            bottom: 38,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 3,
            width: 38,
            height: 38,
            border: '1.5px solid rgba(79,173,114,.65)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'bounce 2.4s ease-in-out infinite',
          }}
        >
          <ChevronDown size={14} color="white" />
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          3. ART SECTION — split image + text
      ═══════════════════════════════════════════════════════ */}
      <section style={{ background: '#0F2E23', padding: '80px 0' }}>
        <div
          className="art-grid"
          style={{
            maxWidth: 1400,
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: 72,
            alignItems: 'center',
            padding: '0 56px',
          }}
        >
          {/* Image */}
          <div>
            <img
              src="/assets/mockup3.png"
              alt="PayRole dashboard"
              style={{ width: '100%', borderRadius: 3, display: 'block' }}
            />
          </div>

          {/* Text */}
          <div style={{ color: 'white' }}>
            <p
              style={{
                fontSize: 11,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '.1em',
                color: 'rgba(205,239,215,.55)',
                marginBottom: 10,
              }}
            >
              Built for African Payroll
            </p>

            <h2
              style={{
                fontSize: 'clamp(1.75rem, 3vw, 2.25rem)',
                fontWeight: 700,
                lineHeight: 1.15,
                marginBottom: 16,
                position: 'relative',
                paddingBottom: 0,
              }}
            >
              Your compliance is handled before you even click run
            </h2>

            {/* Underline decoration */}
            <div style={{ width: 36, height: 3, background: '#4FAD72', marginTop: 20, marginBottom: 32 }} />

            <p style={{ fontSize: 16, lineHeight: 1.65, marginBottom: 32, opacity: 0.88 }}>
              PayRole's built-in statutory engine handles PAYE, pension, NHF, and all local
              deductions automatically. No more manual calculation spreadsheets. No more compliance
              surprises.
            </p>

            <Link
              to="/login"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: 'white',
                color: '#1F6F4E',
                padding: '14px 28px',
                fontWeight: 700,
                fontSize: 14,
                textDecoration: 'none',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = '#CDEFD7' }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = 'white' }}
            >
              Explore features
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          4. PURPOSE / FEATURES SECTION
      ═══════════════════════════════════════════════════════ */}
      <section style={{ padding: '80px 0', background: 'white', overflow: 'hidden' }}>
        <div
          className="purp-inner"
          style={{
            maxWidth: 1400,
            margin: '0 auto',
            padding: '0 56px',
            display: 'flex',
            gap: 0,
            alignItems: 'flex-start',
          }}
        >
          {/* Sidebar */}
          <div
            className="purp-sidebar"
            style={{ flex: '0 0 280px', paddingRight: 44, paddingTop: 4 }}
          >
            <p
              style={{
                fontSize: 11,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '.1em',
                color: '#1F6F4E',
                marginBottom: 14,
              }}
            >
              Platform Features
            </p>

            <h2
              style={{
                fontSize: 'clamp(1.5rem, 2.5vw, 2rem)',
                fontWeight: 700,
                color: '#0F2E23',
                lineHeight: 1.2,
                marginBottom: 0,
              }}
            >
              Built for trust at every step
            </h2>

            {/* Underline */}
            <div style={{ width: 36, height: 3, background: '#1F6F4E', marginTop: 16, marginBottom: 20 }} />

            <p style={{ fontSize: 14, lineHeight: 1.65, color: 'rgba(15,46,35,0.70)', marginBottom: 32 }}>
              Every feature in PayRole is designed around the realities of African payroll —
              multi-currency, multi-jurisdiction, and built for compliance from day one.
            </p>

            {/* Arrow buttons */}
            <div style={{ display: 'flex', gap: 10 }}>
              {[
                { dir: 'left' as const, icon: <ChevronLeft size={18} /> },
                { dir: 'right' as const, icon: <ChevronRight size={18} /> },
              ].map(({ dir, icon }) => (
                <button
                  key={dir}
                  onClick={() => scrollCards(dir)}
                  aria-label={`Scroll ${dir}`}
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    border: '1.5px solid #4FAD72',
                    background: 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#4FAD72',
                    transition: 'background 0.2s, color 0.2s',
                    flexShrink: 0,
                  }}
                  onMouseEnter={(e) => {
                    const el = e.currentTarget as HTMLButtonElement
                    el.style.background = '#4FAD72'
                    el.style.color = 'white'
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget as HTMLButtonElement
                    el.style.background = 'transparent'
                    el.style.color = '#4FAD72'
                  }}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          {/* Scrollable card track */}
          <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
            <div
              ref={cardTrackRef}
              style={{
                display: 'flex',
                gap: 16,
                overflowX: 'auto',
                scrollBehavior: 'smooth',
                paddingBottom: 8,
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
              }}
            >
              {FEATURES.map((feat) => {
                const Icon = feat.icon
                return (
                  <div
                    key={feat.title}
                    style={{
                      flex: '0 0 230px',
                      background: 'white',
                      border: '1px solid #CDEFD7',
                      borderRadius: 2,
                      overflow: 'hidden',
                      cursor: 'default',
                      transition: 'box-shadow 0.2s, transform 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      const el = e.currentTarget as HTMLDivElement
                      el.style.boxShadow = '0 8px 24px rgba(15,46,35,0.12)'
                      el.style.transform = 'translateY(-2px)'
                    }}
                    onMouseLeave={(e) => {
                      const el = e.currentTarget as HTMLDivElement
                      el.style.boxShadow = 'none'
                      el.style.transform = 'translateY(0)'
                    }}
                  >
                    {/* Icon area */}
                    <div
                      style={{
                        height: 140,
                        background: 'rgba(205,239,215,0.30)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <div
                        style={{
                          width: 52,
                          height: 52,
                          borderRadius: '50%',
                          background: 'rgba(79,173,114,0.18)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Icon size={22} color="#1F6F4E" />
                      </div>
                    </div>

                    {/* Card body */}
                    <div style={{ padding: 14 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 600,
                            background: 'rgba(79,173,114,0.12)',
                            color: '#1F6F4E',
                            padding: '2px 8px',
                            borderRadius: 999,
                          }}
                        >
                          {feat.tag}
                        </span>
                      </div>
                      <p style={{ fontWeight: 600, fontSize: 13, color: '#0F2E23', marginBottom: 8 }}>
                        {feat.title}
                      </p>
                      <hr style={{ border: 'none', borderTop: '1px solid #CDEFD7', margin: '0 0 8px' }} />
                      <p style={{ fontSize: 11, color: 'rgba(31,111,78,0.70)', lineHeight: 1.5 }}>
                        {feat.desc}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          5. STATS BAR
      ═══════════════════════════════════════════════════════ */}
      <section
        style={{
          background: 'white',
          padding: '44px 0',
          borderBottom: '1px solid rgba(205,239,215,.6)',
        }}
      >
        <div
          className="stats-grid"
          style={{
            maxWidth: 1400,
            margin: '0 auto',
            padding: '0 56px',
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
          }}
        >
          {[
            { label: 'Active Employees Managed', value: '50,000+', unit: 'across all tenants' },
            { label: 'Payroll Runs Completed', value: '8,200+', unit: 'on time, every month' },
            { label: 'Time Saved vs Manual', value: '94%', unit: 'reduction in processing time' },
            { label: 'Platform Rating', value: '4.9/5', unit: 'from 1,200+ reviews' },
          ].map((stat, i, arr) => (
            <div
              key={stat.label}
              style={{
                textAlign: 'center',
                padding: '8px 24px',
                borderRight: i < arr.length - 1 ? '1px solid #CDEFD7' : 'none',
              }}
            >
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '.08em',
                  color: '#1F6F4E',
                  marginBottom: 8,
                }}
              >
                {stat.label}
              </p>
              <p
                style={{
                  fontSize: 40,
                  fontWeight: 700,
                  color: '#4FAD72',
                  lineHeight: 1,
                  margin: 0,
                }}
              >
                {stat.value}
              </p>
              <p style={{ fontSize: 13, color: '#1F6F4E', marginTop: 4 }}>{stat.unit}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          6. HOW IT WORKS / CAR SECTION
      ═══════════════════════════════════════════════════════ */}
      <section id="how-it-works" style={{ background: '#0F2E23', padding: '96px 0', color: 'white' }}>
        <div
          style={{
            maxWidth: 1400,
            margin: '0 auto',
            padding: '0 56px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 72,
            alignItems: 'start',
          }}
        >
          {/* Left col */}
          <div>
            <p
              style={{
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: '.06em',
                color: 'rgba(255,255,255,0.50)',
                marginBottom: 12,
              }}
            >
              How It Works
            </p>
            <h2
              style={{
                fontSize: 'clamp(2rem, 3vw, 2.75rem)',
                fontWeight: 700,
                margin: 0,
              }}
            >
              Run payroll in 3 steps
            </h2>

            {/* Gold underline */}
            <div style={{ width: 36, height: 3, background: '#F2B35E', marginTop: 20, marginBottom: 24 }} />

            <p
              style={{
                fontSize: 17,
                lineHeight: 1.6,
                marginBottom: 32,
                opacity: 0.88,
              }}
            >
              From employee setup to payslip delivery — PayRole handles every step. Our automated
              engine calculates, validates and distributes payroll with a single approval.
            </p>

            <Link
              to="/login"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: '#F2B35E',
                color: '#0F2E23',
                padding: '14px 28px',
                fontWeight: 700,
                fontSize: 14,
                textDecoration: 'none',
                transition: 'opacity 0.2s',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.opacity = '0.88' }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.opacity = '1' }}
            >
              Get started today
            </Link>
          </div>

          {/* Right col — 3 stat cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 16,
            }}
          >
            {[
              { icon: Users, number: '3', label: 'Minutes avg. setup per employee' },
              { icon: Zap, number: '99.9%', label: 'Payroll accuracy rate' },
              { icon: Clock, number: '5x', label: 'Faster than spreadsheet payroll' },
            ].map((card) => {
              const CardIcon = card.icon
              return (
                <div
                  key={card.label}
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(79,173,114,0.18)',
                    borderRadius: 2,
                    padding: 32,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-end',
                    minHeight: 180,
                    position: 'relative',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      top: 20,
                      right: 20,
                      width: 38,
                      height: 38,
                      opacity: 0.55,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <CardIcon size={22} color="#4FAD72" />
                  </div>
                  <p
                    style={{
                      fontSize: 38,
                      fontWeight: 700,
                      color: '#4FAD72',
                      fontVariantNumeric: 'tabular-nums',
                      lineHeight: 1,
                      marginBottom: 8,
                    }}
                  >
                    {card.number}
                  </p>
                  <p style={{ fontSize: 13, opacity: 0.65, lineHeight: 1.4 }}>{card.label}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          7. TESTIMONIALS / FAC SECTION
      ═══════════════════════════════════════════════════════ */}
      <section style={{ background: '#051f14', padding: '60px 0' }}>
        <div
          style={{
            maxWidth: 1400,
            margin: '0 auto',
            padding: '0 56px',
          }}
        >
          {/* Header row */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              marginBottom: 32,
              flexWrap: 'wrap',
              gap: 20,
            }}
          >
            <div>
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '.08em',
                  color: 'rgba(255,255,255,0.45)',
                  marginBottom: 8,
                }}
              >
                Real Results, Real Businesses
              </p>
              <h2
                style={{
                  fontSize: 'clamp(1.5rem, 3vw, 2.25rem)',
                  fontWeight: 700,
                  color: 'white',
                  margin: 0,
                }}
              >
                Trusted by payroll teams
              </h2>
              <div style={{ width: 36, height: 3, background: '#F2B35E', marginTop: 14 }} />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {(['left', 'right'] as const).map((dir) => (
                <button
                  key={dir}
                  aria-label={`Scroll ${dir}`}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    border: '1.5px solid rgba(79,173,114,0.35)',
                    background: 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: 'rgba(255,255,255,0.70)',
                    transition: 'background 0.2s',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(79,173,114,0.15)' }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                >
                  {dir === 'left' ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
                </button>
              ))}
              <Link
                to="/login"
                style={{
                  background: '#F2B35E',
                  color: '#0F2E23',
                  fontWeight: 700,
                  padding: '10px 24px',
                  fontSize: 14,
                  textDecoration: 'none',
                  borderRadius: 2,
                  transition: 'opacity 0.2s',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.opacity = '0.88' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.opacity = '1' }}
              >
                Join today
              </Link>
            </div>
          </div>

          {/* Face cards */}
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            {[
              {
                img: '/assets/person1.png',
                name: 'Amara Nwosu',
                role: 'Head of Finance, TradeLenda',
                quote: 'PayRole cut our payroll processing time from 3 days to 20 minutes.',
              },
              {
                img: '/assets/person2.png',
                name: 'Kwame Adjei',
                role: 'HR Director, Kora',
                quote: 'Finally a payroll system that understands Nigerian compliance.',
              },
            ].map((person) => (
              <FaceCard key={person.name} {...person} />
            ))}
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  )
}

interface FaceCardProps {
  img: string
  name: string
  role: string
  quote: string
}

function FaceCard({ img, name, role, quote }: FaceCardProps) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 3,
        cursor: 'pointer',
        width: 300,
        aspectRatio: '3/4',
        flexShrink: 0,
      }}
    >
      {/* Photo */}
      <img
        src={img}
        alt={name}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: 'block',
          transition: 'transform 0.4s ease',
          transform: hovered ? 'scale(1.06)' : 'scale(1)',
        }}
      />

      {/* Gradient overlay — always present */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to top, rgba(15,46,35,0.90) 0%, rgba(15,46,35,0.20) 55%, transparent 100%)',
        }}
      />

      {/* Info block */}
      <div
        style={{
          position: 'absolute',
          bottom: 20,
          left: 20,
          right: 20,
          color: 'white',
        }}
      >
        <p style={{ fontWeight: 600, fontSize: 15, margin: 0 }}>{name}</p>
        <p style={{ color: '#4FAD72', fontSize: 12, marginTop: 4, margin: '4px 0 0' }}>{role}</p>

        {/* Quote — slides in on hover */}
        <p
          style={{
            fontSize: 13,
            lineHeight: 1.5,
            marginTop: 10,
            opacity: hovered ? 1 : 0,
            transform: hovered ? 'translateY(0)' : 'translateY(8px)',
            transition: 'opacity 0.3s ease, transform 0.3s ease',
            color: 'rgba(255,255,255,0.88)',
            fontStyle: 'italic',
          }}
        >
          "{quote}"
        </p>
      </div>
    </div>
  )
}
