import type { DoorOpening, DoorPrices, ModelVariantSnapshot } from './types';
import type { WizardObj } from '@/components/doorCalculator/useDoorWizard';

export const DOOR_WIZARD_SESSION_KEY = 'remcard.door-wizard.lk.v1';

export type DoorWizardSessionPayload = {
  v: 1;
  openings: DoorOpening[];
  step: number;
  cur: number;
  modelId: string | null;
  manual: { on: boolean; name: string; maker: string };
  prices: DoorPrices;
  pricesFor: string | null;
  disc: string;
  share: boolean;
  obj: WizardObj;
  variants: ModelVariantSnapshot[];
  vi: number;
};

function storage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    const probe = '__door_wizard_probe__';
    window.sessionStorage.setItem(probe, '1');
    window.sessionStorage.removeItem(probe);
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function isPayload(raw: unknown): raw is DoorWizardSessionPayload {
  if (!raw || typeof raw !== 'object') return false;
  const p = raw as DoorWizardSessionPayload;
  return (
    p.v === 1 &&
    Array.isArray(p.openings) &&
    typeof p.step === 'number' &&
    typeof p.cur === 'number'
  );
}

export function readDoorWizardSession(): DoorWizardSessionPayload | null {
  const s = storage();
  if (!s) return null;
  try {
    const raw = s.getItem(DOOR_WIZARD_SESSION_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isPayload(parsed)) {
      s.removeItem(DOOR_WIZARD_SESSION_KEY);
      return null;
    }
    return parsed;
  } catch {
    s.removeItem(DOOR_WIZARD_SESSION_KEY);
    return null;
  }
}

export function writeDoorWizardSession(payload: DoorWizardSessionPayload): void {
  const s = storage();
  if (!s) return;
  try {
    s.setItem(DOOR_WIZARD_SESSION_KEY, JSON.stringify(payload));
  } catch {
    /* quota or private mode */
  }
}

export function clearDoorWizardSession(): void {
  const s = storage();
  if (!s) return;
  try {
    s.removeItem(DOOR_WIZARD_SESSION_KEY);
  } catch {
    /* ignore */
  }
}