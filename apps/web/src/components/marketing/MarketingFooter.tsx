import { ArrowRight } from 'lucide-react'

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

export default function MarketingFooter() {
  return (
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
  )
}
