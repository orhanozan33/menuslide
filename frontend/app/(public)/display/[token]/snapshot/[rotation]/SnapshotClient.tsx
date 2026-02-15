'use client';

import { DisplayPageView } from '@/components/display/DisplayPageView';

/** İlk HTML'de sunucudan gelen rotationIndex ile render; hydration'da aynı değer. */
export function SnapshotClient({ rotationIndex }: { rotationIndex: number }) {
  return (
    <DisplayPageView
      key={`snapshot-${rotationIndex}`}
      snapshotRotationFromPath={rotationIndex}
    />
  );
}
