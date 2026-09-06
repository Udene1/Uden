import type { Metadata } from 'next';
import { ThemeProvider } from 'next-themes';
import SessionProvider from '@/components/SessionProvider';
import './globals.css';

export const metadata: Metadata = {
  title: 'AI Work Partner | Dashboard',
  description: 'Intelligent AI routing and cost management platform.',
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
            {children}
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
