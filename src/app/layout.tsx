import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Gmailo — All-In-One Marketing Automation Platform',
  description:
    'Gmailo: One unified platform to create, publish, reach out, and reply. Empowering small businesses with AI-powered social publishing, unified inbox, and cold outreach automation.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased selection:bg-brand selection:text-white">
        {children}
      </body>
    </html>
  );
}
