'use client';

import nextDynamic from 'next/dynamic';

// Root layout Server Component'ta ssr:false kullanılamadığı için client wrapper.
// 404 / icon.svg/sellers.json vb. isteklerde sunucuda "useState of null" hatasını önler.
const ClientProviders = nextDynamic(
  () => import('@/components/ClientProviders').then((m) => ({ default: m.ClientProviders })),
  { ssr: false, loading: () => null }
);

export function ClientProvidersWrapper({ children }: { children: React.ReactNode }) {
  return <ClientProviders>{children}</ClientProviders>;
}
