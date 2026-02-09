import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ClientProvidersWrapper } from '@/components/ClientProvidersWrapper';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Menu Slide',
  description: 'Manage your digital menu displays with Menu Slide',
  icons: {
    icon: [{ url: '/icon.svg', type: 'image/svg+xml' }],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      </head>
      <body suppressHydrationWarning>
        <ClientProvidersWrapper>{children}</ClientProvidersWrapper>
      </body>
    </html>
  );
}
