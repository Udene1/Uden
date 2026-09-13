import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import MobileActionBar from '@/components/ui/MobileActionBar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen md:h-screen md:overflow-hidden"><a href="#workspace-main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[120] focus:rounded-lg focus:bg-[var(--bg-card)] focus:px-4 focus:py-3 focus:text-sm focus:text-[var(--text-primary)] focus:shadow-xl">Skip to workspace</a><div className="flex min-h-screen md:h-full"><Sidebar/><div className="flex flex-col flex-1 min-w-0 md:overflow-hidden"><Header/><main id="workspace-main" tabIndex={-1} className="flex-1 overflow-y-auto px-4 py-5 pb-28 md:p-6 md:pb-6 outline-none"><div className="max-w-7xl mx-auto animate-fade-in">{children}</div></main><MobileActionBar/></div></div></div>;
}
