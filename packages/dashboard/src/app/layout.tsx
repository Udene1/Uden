import type { Metadata, Viewport } from 'next';
import { ThemeProvider } from 'next-themes';
import SessionProvider from '@/components/SessionProvider';
import PwaRuntime from '@/components/PwaRuntime';
import './globals.css';

export const metadata: Metadata = {
  title: 'Uden — Work Operating System',
  description: 'Give Uden the outcome. It plans, executes, verifies, and keeps the work trail durable.',
  applicationName: 'Uden',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'Uden',
    statusBarStyle: 'black-translucent',
  },
};

export const viewport: Viewport = {
  themeColor: '#12110f',
  colorScheme: 'dark light',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <SessionProvider>
          <ThemeProvider attribute="data-theme" defaultTheme="dark" enableSystem={false}>
            <PwaRuntime />
            {children}
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
