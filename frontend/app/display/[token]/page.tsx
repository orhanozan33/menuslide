'use client';

import { DisplayPageView } from '@/components/display/DisplayPageView';

/**
 * Root display route: /display/{token} (no locale).
 * Görsel URL ve Halka Açık URL bu path ile çalışır.
 */
export default function DisplayPage() {
  return <DisplayPageView />;
}
