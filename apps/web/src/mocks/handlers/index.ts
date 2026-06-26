import { authHandlers } from './auth.handlers';
import { organisationHandlers } from './organisation.handlers';
import { employeeHandlers } from './employee.handlers';
import { payrunHandlers } from './payrun.handlers';
import { tenantHandlers } from './tenant.handlers';

export const handlers = [
  ...authHandlers,
  ...organisationHandlers,
  ...employeeHandlers,
  ...payrunHandlers,
  ...tenantHandlers,
];
