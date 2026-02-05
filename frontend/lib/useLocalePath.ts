'use client';

import { useParams } from 'next/navigation';

/**
 * Returns a function that prefixes paths with current locale.
 * Use when useTranslation().localePath might not be available (e.g. server boundary).
 */
export function useLocale() {
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  return {
    locale,
    localePath: (path: string) => {
      const clean = path.startsWith('/') ? path.slice(1) : path;
      return `/${locale}/${clean}`.replace(/\/+/g, '/');
    },
  };
}
