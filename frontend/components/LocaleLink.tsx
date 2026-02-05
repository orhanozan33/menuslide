'use client';

import Link from 'next/link';
import { useTranslation } from '@/lib/i18n/useTranslation';

interface LocaleLinkProps extends React.ComponentProps<typeof Link> {
  href: string;
}

/** Link that automatically prepends locale to href (e.g. /menus -> /en/menus) */
export function LocaleLink({ href, ...props }: LocaleLinkProps) {
  const { localePath } = useTranslation();
  const localizedHref = href.startsWith('http') || href.startsWith('//') || href.startsWith('mailto:')
    ? href
    : localePath(href);
  return <Link href={localizedHref} {...props} />;
}
