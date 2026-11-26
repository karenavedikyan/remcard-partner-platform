'use client';

import { Suspense } from 'react';
import { DoorOfferPage } from '@/components/doorCalculator/DoorOfferPage';

export default function DoorOfferRoute() {
  return (
    <Suspense fallback={<div className="p-8 font-rc text-rc-muted">Загрузка…</div>}>
      <DoorOfferPage />
    </Suspense>
  );
}