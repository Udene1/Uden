export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-center min-h-screen relative overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
      {/* Background decorations */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full opacity-20 animate-pulse" style={{ background: 'var(--accent-gradient)', filter: 'blur(100px)' }}></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full opacity-20 animate-pulse" style={{ background: 'var(--accent-secondary)', filter: 'blur(100px)', animationDelay: '1s' }}></div>
      
      <div className="z-10 w-full max-w-md p-4 animate-slide-up">
        {children}
      </div>
    </div>
  );
}
