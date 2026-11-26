import type { ReactNode } from 'react';

export function WizardBar({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <div className="bar">
      <div className="bar__in">{children}</div>
      {hint ? <div className="bar__h">{hint}</div> : null}
    </div>
  );
}