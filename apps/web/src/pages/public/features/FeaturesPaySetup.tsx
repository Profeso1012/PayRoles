import FeatureDetailLayout from '@/components/marketing/FeatureDetailLayout'
import { PATHS } from '@/router/paths'

export default function FeaturesPaySetup() {
  return (
    <FeatureDetailLayout
      stepNumber={2}
      totalSteps={4}
      title="Set up how everyone gets paid"
      description="Set a salary and any extra pay or deductions for each person, once. PayRole reuses this every time you run payroll, so you don't re-enter it."
      bullets={[
        'Set a salary for each employee',
        'Add allowances like housing or transport',
        'Add deductions like tax or pension — applied automatically after that',
      ]}
      screenshot="/assets/features/placeholder-pay-setup.svg"
      screenshotAlt="Set Up Pay page screenshot placeholder"
      prev={{ label: 'Add Your Team', to: PATHS.FEATURES_TEAM }}
      next={{ label: 'Run Payroll', to: PATHS.FEATURES_PAYROLL }}
    />
  )
}
