import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import MobileActionBar from '@/components/ui/MobileActionBar';

export default function DashboardRouteLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen md:h-screen md:overflow-hidden"><div className="flex min-h-screen md:h-full"><Sidebar /><div className="flex min-w-0 flex-1 flex-col md:overflow-hidden"><Header /><main className="flex-1 overflow-y-auto px-4 py-6 pb-28 outline-none md:px-8 md:py-8 md:pb-8"><div className="container">{children}</div></main><MobileActionBar /></div></div></div>;
}
