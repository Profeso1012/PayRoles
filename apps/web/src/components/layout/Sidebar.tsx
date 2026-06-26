import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Building2, FolderTree, Users, Calculator,
  CreditCard, BarChart3, Settings, Receipt, User, Landmark,
  ChevronDown, ChevronRight, FileText, MapPin, Layers, Play,
  TrendingUp, Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { useUiStore } from '@/store/uiStore';
import type { UserRole } from '@contracts/types/auth';

interface NavItem {
  label: string;
  path: string;
  icon: React.ElementType;
  children?: NavItem[];
}

const NAV_MAP: Record<UserRole, NavItem[]> = {
  PLATFORM_ADMIN: [
    { label: 'Dashboard', path: '/admin', icon: LayoutDashboard },
    { label: 'Companies', path: '/admin/companies', icon: Building2 },
  ],
  COMPANY_SUPER_ADMIN: [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    {
      label: 'Organisation', path: '/organisation', icon: FolderTree,
      children: [
        { label: 'Overview', path: '/organisation', icon: FolderTree },
        { label: 'Legal Entities', path: '/organisation/legal-entities', icon: Shield },
        { label: 'Departments', path: '/organisation/departments', icon: Layers },
        { label: 'Locations', path: '/organisation/locations', icon: MapPin },
        { label: 'Pay Groups', path: '/organisation/pay-groups', icon: Users },
        { label: 'Job Grades', path: '/organisation/job-grades', icon: TrendingUp },
      ],
    },
    { label: 'Employees', path: '/employees', icon: Users },
    {
      label: 'Payroll', path: '/payroll', icon: Calculator,
      children: [
        { label: 'Pay Elements', path: '/payroll/pay-elements', icon: FileText },
        { label: 'Pay Runs', path: '/payroll/runs', icon: Play },
      ],
    },
    { label: 'Payments', path: '/payments', icon: CreditCard },
    {
      label: 'Reports', path: '/reports', icon: BarChart3,
      children: [
        { label: 'Payroll Register', path: '/reports/register', icon: FileText },
        { label: 'Statutory Reports', path: '/reports/statutory', icon: Shield },
        { label: 'Cost Summary', path: '/reports/cost', icon: TrendingUp },
      ],
    },
    { label: 'Settings', path: '/settings/profile', icon: Settings },
  ],
  HR_MANAGER: [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    {
      label: 'Organisation', path: '/organisation', icon: FolderTree,
      children: [
        { label: 'Overview', path: '/organisation', icon: FolderTree },
        { label: 'Legal Entities', path: '/organisation/legal-entities', icon: Shield },
        { label: 'Departments', path: '/organisation/departments', icon: Layers },
        { label: 'Locations', path: '/organisation/locations', icon: MapPin },
        { label: 'Pay Groups', path: '/organisation/pay-groups', icon: Users },
        { label: 'Job Grades', path: '/organisation/job-grades', icon: TrendingUp },
      ],
    },
    { label: 'Employees', path: '/employees', icon: Users },
    {
      label: 'Reports', path: '/reports', icon: BarChart3,
      children: [
        { label: 'Payroll Register', path: '/reports/register', icon: FileText },
        { label: 'Statutory Reports', path: '/reports/statutory', icon: Shield },
        { label: 'Cost Summary', path: '/reports/cost', icon: TrendingUp },
      ],
    },
  ],
  PAYROLL_MANAGER: [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Pay Elements', path: '/payroll/pay-elements', icon: FileText },
    { label: 'Pay Runs', path: '/payroll/runs', icon: Play },
    {
      label: 'Reports', path: '/reports', icon: BarChart3,
      children: [
        { label: 'Payroll Register', path: '/reports/register', icon: FileText },
        { label: 'Statutory Reports', path: '/reports/statutory', icon: Shield },
        { label: 'Cost Summary', path: '/reports/cost', icon: TrendingUp },
      ],
    },
  ],
  FINANCE_DIRECTOR: [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Employees', path: '/employees', icon: Users },
    { label: 'Pay Runs', path: '/payroll/runs', icon: Play },
    { label: 'Payments', path: '/payments', icon: CreditCard },
    {
      label: 'Reports', path: '/reports', icon: BarChart3,
      children: [
        { label: 'Payroll Register', path: '/reports/register', icon: FileText },
        { label: 'Statutory Reports', path: '/reports/statutory', icon: Shield },
        { label: 'Cost Summary', path: '/reports/cost', icon: TrendingUp },
      ],
    },
  ],
  EMPLOYEE: [
    { label: 'My Payslips', path: '/my-payslips', icon: Receipt },
    { label: 'My Profile', path: '/my-profile', icon: User },
    { label: 'My Bank Details', path: '/my-bank-details', icon: Landmark },
  ],
};

interface NavItemProps {
  item: NavItem;
  depth?: number;
}

function NavEntry({ item, depth = 0 }: NavItemProps) {
  const location = useLocation();
  const [expanded, setExpanded] = useState(() =>
    item.children?.some((c) => location.pathname.startsWith(c.path)) ?? false
  );

  const isActive = item.children
    ? location.pathname.startsWith(item.path) && item.path !== '/organisation'
      ? true
      : location.pathname === item.path
    : location.pathname === item.path || location.pathname.startsWith(item.path + '/');

  const Icon = item.icon;

  if (item.children) {
    return (
      <li>
        <button
          onClick={() => setExpanded((e) => !e)}
          className={cn(
            'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm transition-all duration-150',
            'border-l-[3px]',
            isActive
              ? 'bg-white border-fresh-cash text-deep-cash font-semibold shadow-sm'
              : 'border-transparent text-cash-green hover:bg-mint-light/40 hover:text-fresh-cash',
            depth > 0 && 'pl-6 text-xs py-2'
          )}
        >
          <Icon size={15} className="flex-shrink-0" />
          <span className="flex-1 text-left">{item.label}</span>
          {expanded
            ? <ChevronDown size={13} className="flex-shrink-0" />
            : <ChevronRight size={13} className="flex-shrink-0" />}
        </button>
        {expanded && (
          <ul className="mt-0.5 ml-3 border-l border-mint-light pl-2 flex flex-col gap-0.5">
            {item.children.map((child) => (
              <NavEntry key={child.path} item={child} depth={depth + 1} />
            ))}
          </ul>
        )}
      </li>
    );
  }

  return (
    <li>
      <Link
        to={item.path}
        className={cn(
          'flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm transition-all duration-150',
          'border-l-[3px]',
          isActive
            ? 'bg-white border-fresh-cash text-deep-cash font-semibold shadow-sm'
            : 'border-transparent text-cash-green hover:bg-mint-light/40 hover:text-fresh-cash',
          depth > 0 && 'pl-6 text-xs py-2'
        )}
      >
        <Icon size={15} className="flex-shrink-0" />
        <span>{item.label}</span>
      </Link>
    </li>
  );
}

export default function Sidebar() {
  const user = useAuthStore((s) => s.user);
  const sidebarOpen = useUiStore((s) => s.sidebarOpen);

  const navItems = user ? NAV_MAP[user.role] ?? [] : [];

  return (
    <>
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-deep-cash/40 lg:hidden"
          onClick={() => useUiStore.getState().setSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          'flex-shrink-0 bg-soft-white border-r border-mint-light flex flex-col',
          'transition-all duration-300 overflow-hidden',
          'fixed top-[72px] left-0 bottom-0 z-40',
          'lg:sticky lg:top-[72px] lg:h-[calc(100vh-72px)]',
          sidebarOpen ? 'w-[240px]' : 'w-0 lg:w-[240px]'
        )}
      >
        <div className="flex-1 overflow-y-auto px-3 py-4 min-w-[240px]">
          {/* Logo */}
          <Link to="/" className="flex items-center px-2 mb-5">
            <img src="/assets/payrole-logo.png" alt="PayRole" className="h-7 w-auto" />
          </Link>

          {/* Nav section label */}
          <p className="px-2 mb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-cash-green/60 border-b-2 border-fresh-cash pb-2">
            {user?.role === 'EMPLOYEE' ? 'My Portal' : user?.role === 'PLATFORM_ADMIN' ? 'Admin Portal' : 'Workspace'}
          </p>

          <ul className="flex flex-col gap-0.5">
            {navItems.map((item) => (
              <NavEntry key={item.path + item.label} item={item} />
            ))}
          </ul>
        </div>

        {/* User info at bottom */}
        <div className="px-4 py-3 border-t border-mint-light min-w-[240px]">
          <p className="text-xs font-semibold text-deep-cash truncate">{user?.fullName}</p>
          <p className="text-[10px] text-cash-green/70 truncate">
            {user?.role?.replace(/_/g, ' ')}
          </p>
        </div>
      </aside>
    </>
  );
}
