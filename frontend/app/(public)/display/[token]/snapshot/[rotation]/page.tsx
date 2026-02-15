import { SnapshotClient } from './SnapshotClient';

/**
 * Sunucu bileşeni: rotation path'ten request anında okunur, ilk HTML doğru rotation ile gider.
 * Böylece screenshot servisi sayfayı açtığında client hydration beklemeden doğru slayt yüklenir.
 */
export default async function SnapshotByPathPage({
  params,
}: {
  params: Promise<{ token: string; rotation?: string }>;
}) {
  const { rotation } = await params;
  const rotationStr = typeof rotation === 'string' ? rotation : '';
  const rotationIndex = /^\d+$/.test(rotationStr) ? parseInt(rotationStr, 10) : 0;
  return <SnapshotClient rotationIndex={rotationIndex} />;
}
