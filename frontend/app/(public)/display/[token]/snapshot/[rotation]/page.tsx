'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { DisplayPageView } from '@/components/display/DisplayPageView';

/**
 * Path tabanlı snapshot URL: /display/:token/snapshot/:rotation
 * useParams() harici tarayıcıda (screenshot servisi) ilk paint'te boş kalıyor → hep rotation 0
 * yüklenip 3 aynı resim üretiliyordu. Rotation'ı path'ten okuyana kadar display göstermiyoruz.
 */
function getRotationFromPath(): number {
  if (typeof window === 'undefined') return 0;
  const match = window.location.pathname.match(/\/snapshot\/(\d+)$/);
  return match ? parseInt(match[1], 10) : 0;
}

export default function SnapshotByPathPage() {
  const params = useParams();
  const [rotationIndex, setRotationIndex] = useState<number | null>(null);

  useEffect(() => {
    const fromParams = params?.rotation;
    const str = typeof fromParams === 'string' ? fromParams : '';
    if (/^\d+$/.test(str)) {
      setRotationIndex(parseInt(str, 10));
    } else {
      setRotationIndex(getRotationFromPath());
    }
  }, [params?.rotation]);

  if (rotationIndex === null) {
    return (
      <div style={{ width: 1920, height: 1080, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }} />
    );
  }
  return <DisplayPageView key={`snapshot-${rotationIndex}`} snapshotRotationFromPath={rotationIndex} />;
}
