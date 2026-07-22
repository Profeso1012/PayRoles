import { authHandlers } from './auth.handlers';
import { organisationHandlers } from './organisation.handlers';
import { employeeHandlers } from './employee.handlers';
import { payrunHandlers } from './payrun.handlers';
import { tenantHandlers } from './tenant.handlers';
import { settingsHandlers } from './settings.handlers';
import { dashboardHandlers } from './dashboard.handlers';
import { companyRequestHandlers } from './company-requests.handlers';

export const handlers = [
  ...authHandlers,
  ...organisationHandlers,
  ...employeeHandlers,
  ...payrunHandlers,
  ...tenantHandlers,
  ...settingsHandlers,
  ...dashboardHandlers,
  ...companyRequestHandlers,
];
