// Always render [locale] on demand to avoid 500 during static generation
export const dynamic = 'force-dynamic';

export default function LocaleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
