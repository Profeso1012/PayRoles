import type { ReactNode } from 'react'
import MarketingNav from './MarketingNav'
import MarketingFooter from './MarketingFooter'

export default function FeaturePageShell({ children }: { children: ReactNode }) {
  return (
    <div style={{ fontFamily: 'inherit', overflowX: 'hidden', background: '#F7FAF8', minHeight: '100vh' }}>
      <MarketingNav />
      <main style={{ paddingTop: 79 }}>{children}</main>
      <MarketingFooter />
    </div>
  )
}
