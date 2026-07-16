import { Outlet } from 'react-router-dom';
import Topbar from './Topbar';
import Sidebar from './Sidebar';
import ToastProvider from '@/components/ui/ToastProvider';
import TourGuide from '@/components/tour/TourGuide';

export default function AppShell() {
  return (
    <div className="min-h-screen bg-soft-white font-sans">
      <Topbar />
      <div className="flex" style={{ paddingTop: '72px' }}>
        <Sidebar />
        <main className="flex-1 min-w-0 overflow-x-hidden">
          <div className="p-5 lg:p-8">
            <Outlet />
          </div>
        </main>
      </div>
      <ToastProvider />
      <TourGuide />
    </div>
  );
}
