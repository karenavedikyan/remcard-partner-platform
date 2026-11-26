'use client';

import { Suspense } from 'react';
import { DoorCalculatorWizard } from '@/components/doorCalculator/DoorCalculatorWizard';

export default function DoorCalculatorPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-rc-bg px-4 py-12 text-center text-rc-muted font-rc">
          Загрузка калькулятора дверей…
        </div>
      }
    >
      <DoorCalculatorWizard />
    </Suspense>
  );
}