import FeatureDetailLayout from '@/components/marketing/FeatureDetailLayout'
import { PATHS } from '@/router/paths'

export default function FeaturesPayments() {
  return (
    <FeatureDetailLayout
      stepNumber={4}
      totalSteps={4}
      title="Get everyone paid, and get a payslip"
      description="Once a pay run is approved, PayRole takes it from there — payments go out and every employee gets a payslip they can view anytime."
      bullets={[
        'Approved pay runs move straight to payment',
        'Employees get a payslip they can view anytime',
        'Track every payment right through to completion',
      ]}
      screenshot="/assets/features/placeholder-payments.svg"
      screenshotAlt="Get Paid page screenshot placeholder"
      prev={{ label: 'Run Payroll', to: PATHS.FEATURES_PAYROLL }}
    />
  )
}
