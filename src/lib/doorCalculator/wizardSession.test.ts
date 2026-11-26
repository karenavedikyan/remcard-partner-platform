import { describe, expect, it, beforeEach } from 'vitest';
import { newOpening } from './calc';
import {
  clearDoorWizardSession,
  DOOR_WIZARD_SESSION_KEY,
  readDoorWizardSession,
  writeDoorWizardSession,
  type DoorWizardSessionPayload,
} from './wizardSession';

function sample(): DoorWizardSessionPayload {
  return {
    v: 1,
    openings: [{ ...newOpening(1), w: '900', depth: '250' }],
    step: 4,
    cur: 0,
    modelId: null,
    manual: { on: true, name: 'Тест', maker: '' },
    prices: { blade: 5000, box: 2000 },
    pricesFor: 'manual',
    disc: '10',
    share: true,
    obj: { client: 'Иван', phone: '', address: '' },
    variants: [],
    vi: 0,
  };
}

describe('wizardSession', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('round-trips state', () => {
    writeDoorWizardSession(sample());
    const got = readDoorWizardSession();
    expect(got?.manual.name).toBe('Тест');
    expect(got?.disc).toBe('10');
    expect(got?.obj.client).toBe('Иван');
  });

  it('returns null for invalid JSON', () => {
    sessionStorage.setItem(DOOR_WIZARD_SESSION_KEY, '{bad');
    expect(readDoorWizardSession()).toBeNull();
    expect(sessionStorage.getItem(DOOR_WIZARD_SESSION_KEY)).toBeNull();
  });

  it('returns null for wrong version', () => {
    sessionStorage.setItem(DOOR_WIZARD_SESSION_KEY, JSON.stringify({ v: 2, openings: [] }));
    expect(readDoorWizardSession()).toBeNull();
  });

  it('clear removes key', () => {
    writeDoorWizardSession(sample());
    clearDoorWizardSession();
    expect(readDoorWizardSession()).toBeNull();
  });
});