// Sourced from "User story flow" Part 3, "What to actually do first, in order" -
// the same 3 steps a tenant_admin needs on a brand-new tenant, in the same order.
export interface TourStep {
  tourId: string;
  title: string;
  description: string;
}

export const TOUR_STEPS: TourStep[] = [
  {
    tourId: 'tour-step-1',
    title: '1. Add your legal entity',
    description:
      'Start under Organisation → Legal Entities. Add your company name, country, tax ID, and address — employees and pay runs both need a legal entity to exist first.',
  },
  {
    tourId: 'tour-step-2',
    title: '2. Add your team\'s accounts',
    description:
      'Under Settings → Users & Roles, create accounts for your HR Manager, Payroll Manager, Finance Manager, etc. Share their temporary password with them directly.',
  },
  {
    tourId: 'tour-step-3',
    title: '3. Start adding employees',
    description:
      'Under Employees, add your team one by one (or hand this off to whoever you just added as HR Manager). Each employee record can include their compensation and bank details.',
  },
];
