import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import MobileActionBar from '@/components/ui/MobileActionBar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen md:h-screen md:overflow-hidden">
      <div className="flex min-h-screen md:h-full">
        <Sidebar />
        <div className="flex flex-col flex-1 min-w-0 md:overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto px-4 py-5 pb-28 md:p-6 md:pb-6">
            <div className="max-w-7xl mx-auto animate-fade-in">
              {children}
            </div>
          </main>
          <MobileActionBar />
        </div>
      </div>
    </div>
  );
}
