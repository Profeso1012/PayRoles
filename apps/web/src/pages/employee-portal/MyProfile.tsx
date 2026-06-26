import { useQuery } from '@tanstack/react-query';
import { User, Briefcase } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { formatDate } from '@/lib/utils';
import PageHeader from '@/components/layout/PageHeader';
import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';
import ErrorState from '@/components/ui/ErrorState';

interface MyEmployeeProfile {
  id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: string;
  nationalId: string;
  status: string;
  department: string;
  jobTitle: string;
  jobGrade: string;
  employmentType: string;
  startDate: string;
}

const MOCK_PROFILE: MyEmployeeProfile = {
  id: 'emp-001',
  employeeNumber: 'EMP-00042',
  firstName: 'Adaeze',
  lastName: 'Okonkwo',
  email: 'adaeze.okonkwo@example.com',
  phone: '+234 801 234 5678',
  dateOfBirth: '1992-04-15T00:00:00Z',
  gender: 'female',
  nationalId: 'NIN-1234567890',
  status: 'active',
  department: 'Engineering',
  jobTitle: 'Senior Software Engineer',
  jobGrade: 'L4',
  employmentType: 'full_time',
  startDate: '2021-03-01T00:00:00Z',
};

const statusVariant: Record<string, 'active' | 'on_leave' | 'exited' | 'info'> = {
  active: 'active',
  on_leave: 'on_leave',
  exited: 'exited',
};

const statusLabel: Record<string, string> = {
  active: 'Active',
  on_leave: 'On Leave',
  exited: 'Exited',
};

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-sm text-cash-green/60 font-medium">{label}</dt>
      <dd className="text-sm text-deep-cash font-medium">{value}</dd>
    </>
  );
}

export default function MyProfile() {
  const userId = useAuthStore((s) => s.user?.id);

  const { data: profile, isLoading, isError, refetch } = useQuery<MyEmployeeProfile>({
    queryKey: ['my-profile', userId],
    queryFn: async () => {
      // Local mock — fetches from /api/employees/me in production
      await new Promise((r) => setTimeout(r, 300));
      return MOCK_PROFILE;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isError || !profile) {
    return <ErrorState onRetry={refetch} />;
  }

  const fullName = `${profile.firstName} ${profile.lastName}`;
  const badgeVariant = statusVariant[profile.status] ?? 'info';
  const badgeLabel = statusLabel[profile.status] ?? profile.status;

  return (
    <div style={{ width: '100%', maxWidth: '800px', margin: '0 auto', padding: '2rem 1.5rem' }}>
      <PageHeader
        title="My Profile"
        breadcrumbs={[{ label: 'My Profile' }]}
      />

      {/* Profile identity card */}
      <div className="bg-white rounded-xl border border-mint-light p-6 mb-6 flex flex-wrap items-center gap-5">
        <Avatar name={fullName} size="lg" className="w-16 h-16 text-xl" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-xl font-bold text-deep-cash">{fullName}</h2>
            <Badge variant={badgeVariant} label={badgeLabel} />
          </div>
          <p className="text-sm text-cash-green mt-0.5">{profile.jobTitle}</p>
          <p className="text-xs text-cash-green/60 mt-0.5 font-mono">{profile.employeeNumber}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-cash-green/50 uppercase tracking-wide font-medium">Joined</p>
          <p className="text-sm font-semibold text-deep-cash mt-0.5">{formatDate(profile.startDate)}</p>
        </div>
      </div>

      <div className="grid gap-6">
        {/* Personal Details */}
        <div className="bg-white rounded-xl border border-mint-light p-6">
          <div className="flex items-center gap-2 mb-5">
            <User size={16} className="text-cash-green" />
            <h3 className="text-sm font-semibold text-deep-cash">Personal Details</h3>
          </div>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-4">
            <DetailRow label="Full Name" value={fullName} />
            <DetailRow label="Email Address" value={profile.email} />
            <DetailRow label="Phone Number" value={profile.phone} />
            <DetailRow label="Date of Birth" value={formatDate(profile.dateOfBirth)} />
            <DetailRow
              label="Gender"
              value={profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1)}
            />
            <DetailRow label="National ID" value={profile.nationalId} />
          </dl>
        </div>

        {/* Employment Details */}
        <div className="bg-white rounded-xl border border-mint-light p-6">
          <div className="flex items-center gap-2 mb-5">
            <Briefcase size={16} className="text-cash-green" />
            <h3 className="text-sm font-semibold text-deep-cash">Employment Details</h3>
          </div>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-4">
            <DetailRow label="Employee Number" value={profile.employeeNumber} />
            <DetailRow label="Department" value={profile.department} />
            <DetailRow label="Job Title" value={profile.jobTitle} />
            <DetailRow label="Job Grade" value={profile.jobGrade} />
            <DetailRow
              label="Employment Type"
              value={profile.employmentType.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
            />
            <DetailRow label="Start Date" value={formatDate(profile.startDate)} />
          </dl>
        </div>
      </div>

      <p className="mt-6 text-xs text-cash-green/40 text-center">
        Profile updates are managed by your HR team. Contact HR to request changes.
      </p>
    </div>
  );
}
