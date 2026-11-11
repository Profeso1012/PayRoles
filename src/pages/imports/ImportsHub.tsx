import { Link } from 'react-router-dom';
import { Users, Wallet, FileText, Layers, Shield, ChevronRight } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import PageHeader from '@/components/layout/PageHeader';
import { PATHS } from '@/router/paths';
import type { UserRole } from '@contracts/types/auth';
import { CSV_IMPORTS, WORKER_IMPORT_ROLES } from './importTypes';

interface HubEntry {
  title: string;
  summary: string;
  path: string;
  roles: UserRole[];
  icon: React.ElementType;
}

const ENTRIES: HubEntry[] = [
  {
    title: 'Employees',
    summary: 'Create or update employee records, matched on employee number.',
    path: PATHS.EMPLOYEE_IMPORT,
    roles: WORKER_IMPORT_ROLES,
    icon: Users,
  },
  { ...pick('legal-entities'), path: PATHS.IMPORT_LEGAL_ENTITIES, icon: Shield },
  { ...pick('compensation'), path: PATHS.IMPORT_COMPENSATION, icon: Wallet },
  { ...pick('pay-elements'), path: PATHS.IMPORT_PAY_ELEMENTS, icon: FileText },
  { ...pick('assignments'), path: PATHS.IMPORT_ASSIGNMENTS, icon: Layers },
];

function pick(kind: keyof typeof CSV_IMPORTS) {
  const c = CSV_IMPORTS[kind];
  return { title: c.title.replace(/^Import /, ''), summary: c.summary, roles: c.roles };
}

export default function ImportsHub() {
  const role = useAuthStore((s) => s.user?.role);
  const visible = ENTRIES.filter((e) => !!role && e.roles.includes(role));

  return (
    <div style={{ width: '100%', maxWidth: '900px', margin: '0 auto', padding: '2rem clamp(0.75rem, 4vw, 1.5rem)' }}>
      <PageHeader title="Imports" breadcrumbs={[{ label: 'Dashboard', path: PATHS.DASHBOARD }, { label: 'Imports' }]} />
      <p className="text-sm text-cash-green/70 mb-5">
        Bulk-load data from a CSV or Excel file. Each import runs in the background, and you get a row-level error report for
        anything that couldn't be saved.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {visible.map((e) => {
          const Icon = e.icon;
          return (
            <Link
              key={e.path}
              to={e.path}
              className="group bg-white rounded-xl border border-mint-light p-5 flex items-start gap-3 hover:border-fresh-cash transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-mint-light/60 flex items-center justify-center shrink-0">
                <Icon size={18} className="text-cash-green" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-deep-cash">{e.title}</p>
                <p className="text-sm text-cash-green/70 mt-0.5">{e.summary}</p>
              </div>
              <ChevronRight size={16} className="text-cash-green/50 group-hover:text-fresh-cash mt-1 shrink-0" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
