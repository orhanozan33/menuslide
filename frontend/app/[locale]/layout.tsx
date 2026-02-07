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
  try {
    const resolved = await params;
    const localeParam = resolved?.locale;
    if (localeParam && !VALID_LOCALES.includes(localeParam as (typeof VALID_LOCALES)[number])) {
      notFound();
    }
    return <>{children}</>;
  } catch (e) {
    console.error('[LocaleLayout] params error:', e);
    throw e;
  }
}
