import { SnapshotClient } from '@/app/(public)/display/[token]/snapshot/[rotation]/SnapshotClient';

/**
 * Root snapshot route: /display/{token}/snapshot/{rotation}
 * Screenshot servisi bu URL ile her slaytı ayrı ayrı açar; 404 almaz.
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
