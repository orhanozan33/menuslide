'use client';

import { useParams } from 'next/navigation';
import DisplayPage from '../../page';

/**
 * Path tabanlı snapshot URL: /display/:token/snapshot/:rotation
 * Her rotation için farklı path → CDN/screenshot servisi cache çakışması olmaz.
 * Query string yerine path kullanıldığı için 3 slide = 3 farklı sayfa.
 */
export default function SnapshotByPathPage() {
  const params = useParams();
  const rotation = params?.rotation;
  const rotationStr = typeof rotation === 'string' ? rotation : '';
  const rotationIndex = /^\d+$/.test(rotationStr) ? parseInt(rotationStr, 10) : 0;
  return <DisplayPage snapshotRotationFromPath={rotationIndex} />;
}
