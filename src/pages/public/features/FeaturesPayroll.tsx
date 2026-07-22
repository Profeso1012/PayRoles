import FeatureDetailLayout from '@/components/marketing/FeatureDetailLayout'
import { PATHS } from '@/router/paths'

export default function FeaturesPayroll() {
  return (
    <FeatureDetailLayout
      stepNumber={3}
      totalSteps={4}
      title="Run payroll in a few clicks"
      description="Pick the pay period, let PayRole do the calculations, and review everything before it goes any further."
      bullets={[
        'Choose the pay period you want to run',
        "Let PayRole calculate everyone's pay automatically",
        'Review the totals before sending it on for approval',
      ]}
      screenshot="/assets/features/placeholder-payroll.svg"
      screenshotAlt="Run Payroll page screenshot placeholder"
      prev={{ label: 'Set Up Pay', to: PATHS.FEATURES_PAY_SETUP }}
      next={{ label: 'Get Paid', to: PATHS.FEATURES_PAYMENTS }}
    />
  )
}
