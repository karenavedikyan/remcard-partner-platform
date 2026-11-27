import { describe, expect, it } from 'vitest';
import {
  bladeOf,
  calcDoors,
  dobEff,
  depthNote,
  initPricesFromModel,
  newOpening,
  totals,
} from './calc';
import { DEMO_DOOR_MODELS } from './modelSource';
import type { DoorCatalogModel, DoorOpening } from './types';

const skand = DEMO_DOOR_MODELS[0];

function flowsOpenings(): DoorOpening[] {
  return [
    { ...newOpening(1), w: '900', h: '2050', depth: '250', sill: false },
    { ...newOpening(2), w: '800', h: '', depth: '120', sill: false },
  ];
}

describe('bladeOf', () => {
  it('maps 900 mm opening to 800 blade for Скандинавия 01', () => {
    const o = { ...newOpening(1), w: '900' };
    expect(bladeOf(skand, o)).toEqual({ w: 800, src: 'auto' });
  });

  it('manual blade overrides catalog', () => {
    const o = { ...newOpening(1), w: '900', blade: '700' };
    expect(bladeOf(skand, o)).toEqual({ w: 700, src: 'manual' });
  });

  it('returns nowidth without opening width', () => {
    expect(bladeOf(skand, newOpening(1))).toEqual({ w: null, src: 'nowidth' });
  });

  it('uses standard grid for model without blades', () => {
    const klass = DEMO_DOOR_MODELS[2];
    const o = { ...newOpening(1), w: '820' };
    expect(bladeOf(klass, o)).toEqual({ w: 700, src: 'std' });
  });
});

describe('dobEff', () => {
  it('false when remainder <= 10 (depth 75 → R=10)', () => {
    const o = { ...newOpening(1), depth: '75' };
    expect(dobEff(o)).toBe(false);
  });

  it('true when remainder 11 (depth 76)', () => {
    const o = { ...newOpening(1), depth: '76' };
    expect(dobEff(o)).toBe(true);
  });

  it('respects manual override off', () => {
    expect(dobEff({ ...newOpening(1), depth: '250', dobor: false })).toBe(false);
  });

  it('depth exactly 65 → R=0, dobEff false at auto', () => {
    expect(dobEff({ ...newOpening(1), depth: '65' })).toBe(false);
  });
});

describe('depthNote', () => {
  it('shows remainder 185 for depth 250', () => {
    expect(depthNote({ ...newOpening(1), depth: '250' })).toBe('остаток 185 мм');
  });
});

describe('calcDoors — FLOWS acceptance (Скандинавия 01, 2 проёма, скидка 10 %)', () => {
  it('matches prototype totals 49 050 / 44 145 / выгода 4 905', () => {
    const res = calcDoors(flowsOpenings(), skand, true);
    const prices = initPricesFromModel(skand);
    const t = totals(res.rows, prices, '10');
    expect(t.sum).toBe(49050);
    expect(t.total).toBe(44145);
    expect(t.dsc).toBe(4905);
    expect(t.dp).toBe(10);
  });

  it('row quantities match prototype', () => {
    const res = calcDoors(flowsOpenings(), skand, true);
    const byK = Object.fromEntries(res.rows.map((r) => [r.k, r.q]));
    expect(byK).toMatchObject({
      blade800: 1,
      blade700: 1,
      box: 5,
      d100: 3,
      d200: 3,
      nal: 10,
      hinge: 4,
      handle: 2,
      lock: 2,
    });
  });
});

describe('calcDoors — добор rules', () => {
  it('single d100 when R<=110', () => {
    const o = [{ ...newOpening(1), type: 'inter' as const, w: '800', depth: '110', nalF: false, nalB: false }];
    const res = calcDoors(o, skand, false);
    const d100 = res.rows.find((r) => r.k === 'd100');
    expect(d100?.q).toBe(3);
  });

  it('split d150 + planka for R=235', () => {
    const o = [{ ...newOpening(1), type: 'inter' as const, w: '870', depth: '300', nalF: false, nalB: false }];
    const res = calcDoors(o, skand, false);
    const d150 = res.rows.find((r) => r.k === 'd150');
    const pl = res.rows.find((r) => r.k === 'planka');
    expect(d150?.q).toBe(5);
    expect(pl?.q).toBe(3);
  });

  it('arch: no blade or box', () => {
    const o = [{ ...newOpening(1), type: 'arch' as const, depth: '200', nalF: true, nalB: true }];
    const res = calcDoors(o, skand, false);
    expect(res.rows.some((r) => r.k.startsWith('blade'))).toBe(false);
    expect(res.rows.some((r) => r.k === 'box')).toBe(false);
  });

  it('shared dobor between two shallow openings', () => {
    const ops = [
      { ...newOpening(1), w: '770', depth: '100', nalF: false, nalB: false },
      { ...newOpening(2), w: '760', depth: '100', nalF: false, nalB: false },
    ];
    const res = calcDoors(ops, skand, true);
    const d100 = res.rows.find((r) => r.k === 'd100');
    expect(d100?.q).toBe(3);
    const shared = res.per.filter((p) => p.dob?.shared);
    expect(shared.length).toBe(2);
  });

  it('Классика Н uses only dobors 100 and 150', () => {
    const klass = DEMO_DOOR_MODELS[2];
    const o = [{ ...newOpening(1), type: 'inter' as const, w: '800', depth: '300', nalF: false, nalB: false }];
    const res = calcDoors(o, klass, false);
    expect(res.rows.some((r) => r.k === 'd200')).toBe(false);
  });
});

describe('totals edge cases', () => {
  it('skips rows without price', () => {
    const res = calcDoors(flowsOpenings(), skand, true);
    const t = totals(res.rows, { blade: 1000 }, '0');
    expect(t.none).toBeGreaterThan(0);
    expect(t.sum).toBe(2000);
  });

  it('clamps discount 0–100', () => {
    const res = calcDoors(flowsOpenings(), skand, true);
    const prices = initPricesFromModel(skand);
    expect(totals(res.rows, prices, '150').dp).toBe(100);
    expect(totals(res.rows, prices, '-5').dp).toBe(0);
  });

  it('accepts comma decimal in discount', () => {
    const res = calcDoors(flowsOpenings(), skand, true);
    const prices = initPricesFromModel(skand);
    expect(totals(res.rows, prices, '10,5').dp).toBe(10.5);
  });
});

describe('manual model prices', () => {
  it('counts with arbitrary prices', () => {
    const m: DoorCatalogModel = {
      id: 'manual',
      manual: true,
      name: 'X',
      maker: 'Y',
      price: 0,
      blades: null,
    };
    const o = [{ ...newOpening(1), w: '800', depth: '120' }];
    const res = calcDoors(o, m, false);
    const prices = { blade: 5000, box: 800, d100: 600, nal: 400, hinge: 200, handle: 300, lock: 250 };
    const t = totals(res.rows, prices, 0);
    expect(t.sum).toBeGreaterThan(0);
    expect(t.total).toBe(t.sum);
  });
});