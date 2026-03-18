import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import './globals.css';

export const metadata: Metadata = {
  title: 'LinkSnap — URL Shortener & Analytics',
  description: 'Production-ready link shortener with a full analytics dashboard. Fast edge redirects, geo analytics, and multi-team support.',
  keywords: ['url shortener', 'link shortener', 'analytics', 'click tracking'],
  openGraph: {
    title: 'LinkSnap',
    description: 'Short links. Deep analytics.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
