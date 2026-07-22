export const SUPPORT_EMAIL = 'tech-support@tradelenda.com';

/**
 * PayRole has no self-signup flow (see e_payroll's auth/tenant modules -
 * tenants are provisioned by a platform admin, not created by visitors), so
 * every "Get Started" CTA on the marketing site opens a pre-filled email to
 * support instead of pointing at the login page.
 */
export function buildGetStartedMailto(): string {
  const subject = 'Interested in PayRole for my company';
  const body = [
    'Hi PayRole team,',
    '',
    "I'd like to get started with PayRole. Here are our details:",
    '',
    'Company name: ',
    'Contact person: ',
    'Phone number: ',
    'Number of employees (approx.): ',
    'Country: ',
    '',
    'Message:',
    '',
    '',
    'Thanks!',
  ].join('\n');

  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
