import type { Metadata, Viewport } from 'next';
import nextDynamic from 'next/dynamic';
import './globals.css';

// Vercel/production'ta "Cannot read properties of null (reading 'useState')" hatasını önlemek için
// ClientProviders yalnızca istemcide yüklenir; sunucuda minimal shell döner.
const ClientProviders = nextDynamic(
  () => import('@/components/ClientProviders').then((m) => ({ default: m.ClientProviders })),
  {
    ssr: false,
    loading: () => (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a' }}>
        <span style={{ color: 'rgba(255,255,255,0.8)' }}>...</span>
      </div>
    ),
  }
);

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
      <body suppressHydrationWarning>
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
