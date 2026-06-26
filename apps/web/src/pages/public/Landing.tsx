import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
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

const SOCIAL_ICONS = [
  {
    label: 'LinkedIn',
    path: 'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z',
  },
  {
    label: 'X',
    path: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z',
  },
  {
    label: 'Instagram',
    path: 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z',
  },
  {
    label: 'TikTok',
    path: 'M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.27 8.27 0 004.84 1.55V6.79a4.85 4.85 0 01-1.07-.1z',
  },
]

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
  const navigate = useNavigate()
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [cardOffset, setCardOffset] = useState(0)
  const cardTrackRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

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

      {/* ═══════════════════════════════════════════════════════
          1. NAVBAR
      ═══════════════════════════════════════════════════════ */}
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
          background: scrolled ? 'rgba(15,46,35,0.82)' : 'rgba(15,46,35,0.26)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255,255,255,0.10)',
          transition: 'background 0.3s',
        }}
      >
        {/* Left side */}
        <div style={{ display: 'flex', alignItems: 'stretch' }}>
          {/* Hamburger + divider */}
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
              /* X icon when open */
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

          {/* Divider */}
          <div style={{ width: 1, background: 'rgba(255,255,255,0.20)', alignSelf: 'stretch' }} />

          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', padding: '0 52px' }}>
            <img src="/assets/payrole-logo.png" alt="PayRole" style={{ height: 28 }} />
          </div>
        </div>

        {/* Right side */}
        <div style={{ display: 'flex', alignItems: 'stretch', marginLeft: 'auto' }}>
          {/* Nav links — hidden on mobile via .nav-links-desktop class */}
          {['How It Works', 'Features', 'Pricing'].map((label) => (
            <a
              key={label}
              href={label === 'How It Works' ? '#how-it-works' : '#'}
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
              {label}
            </a>
          ))}

          {/* Get Started button */}
          <Link
            to="/request-access"
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
          </Link>

          {/* Divider */}
          <div style={{ width: 1, background: 'rgba(255,255,255,0.20)', alignSelf: 'stretch' }} />

          {/* Sign in CTA */}
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

      {/* ═══════════════════════════════════════════════════════
          MOBILE MENU PANEL
      ═══════════════════════════════════════════════════════ */}
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
          {/* Nav links */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 40 }}>
            {[
              { label: 'How It Works', href: '#how-it-works' },
              { label: 'Features', href: '#features' },
              { label: 'Pricing', href: '#pricing' },
            ].map(({ label, href }) => (
              <a
                key={label}
                href={href}
                onClick={() => setMenuOpen(false)}
                style={{
                  display: 'block',
                  padding: '16px 0',
                  fontSize: 'clamp(1.1rem, 4vw, 1.4rem)',
                  fontWeight: 600,
                  color: 'rgba(255,255,255,0.85)',
                  textDecoration: 'none',
                  borderBottom: '1px solid rgba(255,255,255,0.08)',
                  transition: 'color 0.2s',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = '#4FAD72' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,255,255,0.85)' }}
              >
                {label}
              </a>
            ))}
          </div>

          {/* CTAs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 'auto' }}>
            <button
              onClick={() => { setMenuOpen(false); navigate('/request-access') }}
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

          {/* Footer note */}
          <p style={{ marginTop: 32, fontSize: 12, color: 'rgba(255,255,255,0.25)', textAlign: 'center' }}>
            PayRole — Payroll. People. Possibilities.
          </p>
        </div>
      )}

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
              to="/request-access"
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
            to="/request-access"
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
              to="/request-access"
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
                to="/request-access"
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

      {/* ═══════════════════════════════════════════════════════
          8. FOOTER
      ═══════════════════════════════════════════════════════ */}
      <footer style={{ background: '#0F2E23', position: 'relative', overflow: 'hidden' }}>
        {/* Dot grid */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'radial-gradient(circle, rgba(79,173,114,0.052) 1px, transparent 1px)',
            backgroundSize: '22px 22px',
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />

        {/* Main footer content */}
        <div
          className="footer-grid"
          style={{
            position: 'relative',
            zIndex: 10,
            maxWidth: 1400,
            margin: '0 auto',
            padding: '72px 56px 48px',
            display: 'grid',
            gridTemplateColumns: '320px 1fr 1fr',
            gap: 72,
          }}
        >
          {/* Brand col */}
          <div className="footer-brand-col">
            <img src="/assets/payrole-logo.png" alt="PayRole" style={{ height: 32, marginBottom: 40, display: 'block' }} />
            <h2 style={{ fontSize: '1.25rem', color: 'rgba(255,255,255,0.90)', marginBottom: 24, fontWeight: 500 }}>
              Stay connected
            </h2>

            {/* Social icons */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 40 }}>
              {SOCIAL_ICONS.map((s) => (
                <button
                  key={s.label}
                  aria-label={s.label}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    border: '1.5px solid rgba(79,173,114,0.30)',
                    background: 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                    flexShrink: 0,
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(79,173,114,0.15)' }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="rgba(255,255,255,0.7)" xmlns="http://www.w3.org/2000/svg">
                    <path d={s.path} />
                  </svg>
                </button>
              ))}
            </div>

            {/* Contact button */}
            <button
              style={{
                background: '#F2B35E',
                color: '#0F2E23',
                fontWeight: 700,
                padding: '14px 32px',
                fontSize: 14,
                border: 'none',
                borderRadius: 2,
                cursor: 'pointer',
                transition: 'opacity 0.2s',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.88' }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '1' }}
            >
              Contact us
            </button>
          </div>

          {/* Platform col */}
          <div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 500, color: 'white', marginBottom: 24 }}>Platform</h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 48px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {['How It Works', 'For Companies', 'For Employees', 'Pricing', 'Security'].map((link) => (
                <li key={link}>
                  <FooterLink label={link} />
                </li>
              ))}
            </ul>

            <h3 style={{ fontSize: '1.125rem', fontWeight: 500, color: 'white', marginBottom: 24 }}>
              Trust &amp; Safety
            </h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {['Compliance Engine', 'Data Protection', 'Role-Based Access', 'Report a Problem'].map((link) => (
                <li key={link}>
                  <FooterLink label={link} />
                </li>
              ))}
            </ul>
          </div>

          {/* Company col */}
          <div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 500, color: 'white', marginBottom: 24 }}>Company</h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 48px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { label: 'About PayRole', external: false },
                { label: 'Blog & Updates', external: false },
                { label: 'Press Kit', external: true },
                { label: 'Careers', external: false },
                { label: 'Investors', external: false },
              ].map((item) => (
                <li key={item.label}>
                  <a
                    href="#"
                    style={{
                      color: 'rgba(255,255,255,0.80)',
                      fontSize: 14,
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      transition: 'color 0.2s',
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = '#4FAD72' }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,255,255,0.80)' }}
                  >
                    {item.label}
                    {item.external && (
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.55 }}>
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                        <polyline points="15 3 21 3 21 9" />
                        <line x1="10" y1="14" x2="21" y2="3" />
                      </svg>
                    )}
                  </a>
                </li>
              ))}
            </ul>

            <h3 style={{ fontSize: '1.125rem', fontWeight: 500, color: 'white', marginBottom: 24 }}>
              Active Regions
            </h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {['Nigeria', 'United Kingdom', 'Canada', 'United States'].map((region) => (
                <li key={region}>
                  <a
                    href="#"
                    style={{
                      color: 'rgba(255,255,255,0.80)',
                      fontSize: 14,
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      transition: 'color 0.2s',
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = '#4FAD72' }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,255,255,0.80)' }}
                  >
                    <ArrowRight size={12} style={{ opacity: 0.5 }} />
                    {region}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Closure bar */}
        <div
          className="footer-bar"
          style={{
            position: 'relative',
            zIndex: 10,
            maxWidth: 1400,
            margin: '0 auto',
            padding: '32px 56px',
            borderTop: '1px solid rgba(79,173,114,0.15)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center' }}>
            {['Privacy Policy', 'Terms of Use', 'Cookie Policy', 'Compliance'].map((item) => (
              <a
                key={item}
                href="#"
                style={{
                  color: 'rgba(255,255,255,0.50)',
                  fontSize: 12,
                  textDecoration: 'none',
                  transition: 'color 0.2s',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = '#4FAD72' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,255,255,0.50)' }}
              >
                {item}
              </a>
            ))}
            <button
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'rgba(255,255,255,0.50)',
                fontSize: 12,
                padding: 0,
                transition: 'color 0.2s',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#4FAD72' }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.50)' }}
            >
              Cookie Settings
            </button>
          </div>
          <p style={{ color: 'rgba(255,255,255,0.40)', fontSize: 12, margin: 0 }}>
            &copy; PayRole 2026. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────
   Sub-components
───────────────────────────────────────────────────────── */

function FooterLink({ label }: { label: string }) {
  return (
    <a
      href="#"
      style={{
        color: 'rgba(255,255,255,0.80)',
        fontSize: 14,
        textDecoration: 'none',
        transition: 'color 0.2s',
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = '#4FAD72' }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,255,255,0.80)' }}
    >
      {label}
    </a>
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
