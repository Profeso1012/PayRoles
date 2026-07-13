import FeatureDetailLayout from '@/components/marketing/FeatureDetailLayout'
import { PATHS } from '@/router/paths'

export default function FeaturesTeam() {
  return (
    <FeatureDetailLayout
      stepNumber={1}
      totalSteps={4}
      title="Bring your team into PayRole"
      description="Add the people you pay, once. Their basic details stay in one place, ready for the next step — setting up how they get paid."
      bullets={[
        "Add each person's name, role, and start date",
        'Keep your company details organised in one place',
        'See your whole team in one simple, searchable list',
      ]}
      screenshot="/assets/features/placeholder-team.svg"
      screenshotAlt="Add Your Team page screenshot placeholder"
      next={{ label: 'Set Up Pay', to: PATHS.FEATURES_PAY_SETUP }}
    />
  )
}
