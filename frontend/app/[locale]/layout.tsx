import { notFound } from 'next/navigation';

// Always render [locale] on demand to avoid 500 during static generation
export const dynamic = 'force-dynamic';

const VALID_LOCALES = ['en', 'tr', 'fr'] as const;

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale?: string }>;
}) {
  const { locale: localeParam } = await params;
  if (localeParam && !VALID_LOCALES.includes(localeParam as (typeof VALID_LOCALES)[number])) {
    notFound();
  }
  return <>{children}</>;
}
