import { AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';

interface OrgSetupBannerProps {
  message?: string;
}

export default function OrgSetupBanner({
  message = 'Complete your organisation setup before adding employees.',
}: OrgSetupBannerProps) {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-start gap-3 mb-4">
      <AlertTriangle size={16} className="text-cash-gold flex-shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-medium text-amber-800">Organisation setup incomplete</p>
        <p className="text-xs text-amber-700">{message}</p>
        <Link to="/organisation" className="text-xs text-cash-gold underline font-medium">
          Set up organisation
        </Link>
      </div>
    </div>
  );
}
