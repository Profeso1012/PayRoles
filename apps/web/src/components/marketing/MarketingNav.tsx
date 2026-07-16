import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { ArrowRight, ChevronDown, Users, Calculator, Play, CreditCard } from 'lucide-react'
import { buildGetStartedMailto } from '@/lib/supportContact'

const FEATURE_LINKS = [
  {
    to: '/features/team',
    icon: Users,
    title: 'Add Your Team',
    desc: 'Set up your legal entity and bring employees into PayRole.',
  },
  {
    to: '/features/pay-setup',
    icon: Calculator,
    title: 'Set Up Pay',
    desc: 'Configure allowances, deductions, and statutory rules once.',
  },
  {
    to: '/features/payroll',
    icon: Play,
    title: 'Run Payroll',
    desc: 'Calculate, review, and submit a pay run for approval.',
  },
  {
    to: '/features/payments',
    icon: CreditCard,
    title: 'Get Paid',
    desc: 'Approve, disburse salaries, and issue payslips instantly.',
  },
]

export default function MarketingNav() {
  const navigate = useNavigate()
  const location = useLocation()
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [featuresOpen, setFeaturesOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (!featuresOpen) return
    const onClickAway = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setFeaturesOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickAway)
    return () => document.removeEventListener('mousedown', onClickAway)
  }, [featuresOpen])

  // Close the dropdown/mobile menu whenever the route changes.
  useEffect(() => {
    setFeaturesOpen(false)
    setMenuOpen(false)
  }, [location.pathname])

  const isOnLanding = location.pathname === '/'

  return (
    <>
      {/*
        Self-contained so MarketingNav renders identically wherever it's used
        (Landing, Features pages, etc.) - these rules used to live only in
        Landing.tsx's own <style> tag, so any other page using this same nav
        had no CSS backing its .nav-links-desktop/.hamburger-btn/.mobile-menu
        classes at all (links fell back to inline/block default display).
      */}
      <style>{`
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
        }
      `}</style>

      <nav
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          height: 79,
          display: 'flex',
          alignItems: 'stretch',
          background: scrolled || !isOnLanding ? 'rgba(15,46,35,0.92)' : 'rgba(15,46,35,0.26)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255,255,255,0.10)',
          transition: 'background 0.3s',
        }}
      >
        {/* Left side */}
        <div style={{ display: 'flex', alignItems: 'stretch' }}>
          <button
            className="hamburger-btn"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMenuOpen((v) => !v)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '0 28px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'white',
              transition: 'opacity 0.2s',
            }}
          >
            {menuOpen ? (
              <div style={{ width: 22, height: 22, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ position: 'absolute', width: '100%', height: 1.5, background: 'white', borderRadius: 2, transform: 'rotate(45deg)' }} />
                <span style={{ position: 'absolute', width: '100%', height: 1.5, background: 'white', borderRadius: 2, transform: 'rotate(-45deg)' }} />
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, width: 22 }}>
                <span style={{ width: '100%', height: 1.5, background: 'white', borderRadius: 2, display: 'block' }} />
                <span style={{ width: '66%', height: 1.5, background: 'white', borderRadius: 2, display: 'block' }} />
                <span style={{ width: '50%', height: 1.5, background: 'white', borderRadius: 2, display: 'block' }} />
              </div>
            )}
          </button>

          <div style={{ width: 1, background: 'rgba(255,255,255,0.20)', alignSelf: 'stretch' }} />

          <Link to="/" style={{ display: 'flex', alignItems: 'center', padding: '0 52px' }}>
            <img src="/assets/payrole-logo.png" alt="PayRole" style={{ height: 28 }} />
          </Link>
        </div>

        {/* Right side */}
        <div style={{ display: 'flex', alignItems: 'stretch', marginLeft: 'auto' }}>
          <a
            href="/#how-it-works"
            className="nav-links-desktop"
            style={{
              alignItems: 'center',
              padding: '0 24px',
              color: 'rgba(255,255,255,0.90)',
              fontSize: 14,
              textDecoration: 'none',
              transition: 'color 0.2s',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = '#4FAD72' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,255,255,0.90)' }}
          >
            How It Works
          </a>

          {/* Features dropdown trigger */}
          <div ref={dropdownRef} className="nav-links-desktop" style={{ position: 'relative', alignSelf: 'stretch' }}>
            <button
              onClick={() => setFeaturesOpen((v) => !v)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                height: '100%',
                padding: '0 24px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: featuresOpen ? '#4FAD72' : 'rgba(255,255,255,0.90)',
                fontSize: 14,
                whiteSpace: 'nowrap',
                transition: 'color 0.2s',
              }}
            >
              Features
              <ChevronDown size={14} style={{ transform: featuresOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
            </button>

            {featuresOpen && (
              <div
                style={{
                  position: 'fixed',
                  top: 79,
                  left: 0,
                  right: 0,
                  background: '#F7FAF8',
                  borderBottom: '1px solid #CDEFD7',
                  boxShadow: '0 16px 40px rgba(15,46,35,0.18)',
                  zIndex: 999,
                }}
              >
                <div
                  style={{
                    maxWidth: 1400,
                    margin: '0 auto',
                    padding: '48px 56px',
                    display: 'grid',
                    gridTemplateColumns: '280px 1fr',
                    gap: 56,
                  }}
                >
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#4FAD72', marginBottom: 12 }}>
                      Features
                    </p>
                    <h3 style={{ fontSize: '1.375rem', fontWeight: 700, color: '#0F2E23', marginBottom: 10 }}>
                      How PayRole works
                    </h3>
                    <p style={{ fontSize: 14, color: '#1F6F4E', lineHeight: 1.6 }}>
                      Four steps, from adding your first employee to paying them —
                      see exactly what happens on screen at each one.
                    </p>
                    <Link
                      to="/features"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 20, color: '#0F2E23', fontSize: 14, fontWeight: 600, textDecoration: 'none' }}
                    >
                      See the full walkthrough <ArrowRight size={14} />
                    </Link>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '28px 40px' }}>
                    {FEATURE_LINKS.map((f) => (
                      <Link
                        key={f.to}
                        to={f.to}
                        style={{ display: 'flex', gap: 14, textDecoration: 'none', padding: 12, borderRadius: 10, transition: 'background 0.15s' }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = '#CDEFD7' }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = 'transparent' }}
                      >
                        <div style={{ width: 36, height: 36, borderRadius: 8, background: '#CDEFD7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <f.icon size={17} color="#1F6F4E" />
                        </div>
                        <div>
                          <p style={{ fontSize: 14.5, fontWeight: 600, color: '#0F2E23', marginBottom: 3 }}>{f.title}</p>
                          <p style={{ fontSize: 13, color: '#1F6F4E', lineHeight: 1.5 }}>{f.desc}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <a
            href="/#pricing"
            className="nav-links-desktop"
            style={{
              alignItems: 'center',
              padding: '0 24px',
              color: 'rgba(255,255,255,0.90)',
              fontSize: 14,
              textDecoration: 'none',
              transition: 'color 0.2s',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = '#4FAD72' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,255,255,0.90)' }}
          >
            Pricing
          </a>

          <a
            href={buildGetStartedMailto()}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '0 24px',
              background: 'rgba(79,173,114,0.20)',
              color: 'white',
              fontSize: 14,
              fontWeight: 500,
              textDecoration: 'none',
              transition: 'background 0.2s',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(79,173,114,0.30)' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(79,173,114,0.20)' }}
          >
            Get Started
          </a>

          <div style={{ width: 1, background: 'rgba(255,255,255,0.20)', alignSelf: 'stretch' }} />

          <button
            onClick={() => navigate('/login')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '0 72px 0 24px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'rgba(255,255,255,0.90)',
              fontSize: 14,
              transition: 'color 0.2s',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#4FAD72' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.90)' }}
          >
            Sign in
            <ArrowRight size={15} />
          </button>
        </div>
      </nav>

      {/* Mobile menu panel */}
      {menuOpen && (
        <div
          className="mobile-menu"
          style={{
            position: 'fixed',
            top: 79,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 999,
            background: 'rgba(10,30,20,0.97)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            display: 'flex',
            flexDirection: 'column',
            padding: '40px 32px 48px',
            overflowY: 'auto',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 24 }}>
            <a
              href="/#how-it-works"
              onClick={() => setMenuOpen(false)}
              style={{
                display: 'block',
                padding: '16px 0',
                fontSize: 'clamp(1.1rem, 4vw, 1.4rem)',
                fontWeight: 600,
                color: 'rgba(255,255,255,0.85)',
                textDecoration: 'none',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              How It Works
            </a>
            <a
              href="/#pricing"
              onClick={() => setMenuOpen(false)}
              style={{
                display: 'block',
                padding: '16px 0',
                fontSize: 'clamp(1.1rem, 4vw, 1.4rem)',
                fontWeight: 600,
                color: 'rgba(255,255,255,0.85)',
                textDecoration: 'none',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              Pricing
            </a>
          </div>

          {/* Features sub-links, always expanded on mobile */}
          <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#4FAD72', margin: '8px 0 12px' }}>
            Features
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 32 }}>
            <Link
              to="/features"
              onClick={() => setMenuOpen(false)}
              style={{ padding: '10px 0', fontSize: 15, fontWeight: 600, color: 'white', textDecoration: 'none' }}
            >
              Full walkthrough
            </Link>
            {FEATURE_LINKS.map((f) => (
              <Link
                key={f.to}
                to={f.to}
                onClick={() => setMenuOpen(false)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', fontSize: 15, color: 'rgba(255,255,255,0.80)', textDecoration: 'none' }}
              >
                <f.icon size={15} style={{ opacity: 0.7 }} />
                {f.title}
              </Link>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 'auto' }}>
            <button
              onClick={() => { setMenuOpen(false); window.location.href = buildGetStartedMailto() }}
              style={{
                width: '100%',
                padding: '15px 24px',
                background: '#1F6F4E',
                border: 'none',
                borderRadius: 10,
                color: 'white',
                fontSize: 15,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
              }}
            >
              Get Started <ArrowRight size={16} />
            </button>
            <button
              onClick={() => { setMenuOpen(false); navigate('/login') }}
              style={{
                width: '100%',
                padding: '15px 24px',
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 10,
                color: 'rgba(255,255,255,0.80)',
                fontSize: 15,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Sign in
            </button>
          </div>

          <p style={{ marginTop: 32, fontSize: 12, color: 'rgba(255,255,255,0.25)', textAlign: 'center' }}>
            PayRole — Payroll. People. Possibilities.
          </p>
        </div>
      )}
    </>
  )
}
