import {
  BOX_DEPTH_MM,
  DEFAULT_DOBOR_SIZES,
  DEFAULT_PRICE_RATIOS,
  STANDARD_BLADE_GRID,
} from './constants';
import type {
  CalcResult,
  CalcRow,
  DoorCatalogModel,
  DoorOpening,
  DobInfo,
  OpeningCalcInfo,
  Totals,
  DoorPrices,
  PriceKey,
} from './types';

export type BladePick = {
  w: number | null;
  src: 'manual' | 'nowidth' | 'std' | 'auto' | 'out';
};

export function bladeOf(model: DoorCatalogModel | null, opening: DoorOpening): BladePick {
  if (opening.blade) return { w: +opening.blade, src: 'manual' };
  const w = parseInt(opening.w, 10);
  if (!w) return { w: null, src: 'nowidth' };
  const std = !model || !model.blades;
  const table = std ? STANDARD_BLADE_GRID : model.blades!;
  const row = table.filter((x) => w >= x.from && (!x.to || w <= x.to))[0];
  return row
    ? { w: row.w, src: std ? 'std' : 'auto' }
    : { w: null, src: 'out' };
}

export function dobEff(opening: DoorOpening): boolean {
  if (opening.dobor !== null) return opening.dobor;
  const d = parseInt(opening.depth, 10);
  return !!d && d - BOX_DEPTH_MM > 10;
}

type RowAcc = Record<string, { k: string; name: string; q: number }>;

export function calcDoors(
  openings: DoorOpening[],
  model: DoorCatalogModel | null,
  shareDoborBetweenOpenings: boolean
): CalcResult {
  const rows: RowAcc = {};
  const order: string[] = [];
  const per: OpeningCalcInfo[] = [];
  const sizes = (model && model.dobors) || [...DEFAULT_DOBOR_SIZES];
  let boxQty = 0;
  const groups: Record<number, OpeningCalcInfo[]> = {};

  function add(k: string, name: string, q: number) {
    if (!rows[k]) {
      rows[k] = { k, name, q: 0 };
      order.push(k);
    }
    rows[k].q += q;
  }

  openings.forEach((o, i) => {
    const inter = o.type === 'inter';
    const info: OpeningCalcInfo = { i, o, lines: [] };
    per.push(info);

    if (o.type === 'arch') info.lines.push('Без двери: облагораживание');

    if (inter) {
      const pick = bladeOf(model, o);
      if (pick.w) {
        add(`blade${pick.w}`, `Полотно ${pick.w} мм`, 1);
        info.lines.push(`Полотно ${pick.w} мм`);
      } else {
        add('blade?', 'Полотно (ширина не определена)', 1);
        info.lines.push('Полотно: ширина не определена');
      }
      boxQty += 2.5;
      info.lines.push('Коробка');
      if (o.hinge) add('hinge', 'Петли', 2);
      if (o.handle) add('handle', 'Ручка', 1);
      if (o.lock) add('lock', 'Замок', 1);
      if (o.zav) {
        add('zav', 'Завёртка', 1);
        info.lines.push('Завёртка');
      }
    }

    if (o.sill) {
      add('sill', 'Порог', 1);
      info.lines.push('Порог');
    }

    const nalQty = (o.nalF ? 2.5 : 0) + (o.nalB ? 2.5 : 0);
    if (nalQty) {
      add('nal', 'Наличник', nalQty);
      info.lines.push(`Наличник ${String(nalQty).replace('.', ',')} шт`);
    }

    const d = parseInt(o.depth, 10);
    if (!dobEff(o)) {
      info.lines.push(d ? 'Добор не нужен' : 'Добор: глубина не указана');
      return;
    }
    if (!d) {
      info.lines.push('Добор: глубина не указана');
      return;
    }

    const r = d - BOX_DEPTH_MM;
    info.R = r;
    if (r <= 0) {
      info.lines.push('Добор: остаток 0 мм');
      return;
    }

    const single = sizes.filter((z) => r <= z + 10)[0];
    if (single) {
      info.dob = { size: single, sets: 1, planks: 0 };
      const sh =
        o.type !== 'entry' && shareDoborBetweenOpenings
          ? sizes.filter((z) => r <= z / 2 - 5)[0]
          : undefined;
      if (sh !== undefined) {
        (groups[sh] = groups[sh] || []).push(info);
      }
    } else {
      for (let k = 2; k <= 4 && !info.dob; k++) {
        const z = sizes.filter((zz) => r / k <= zz + 10)[0];
        if (z) info.dob = { size: z, sets: k, planks: k - 1, split: true };
      }
      if (!info.dob) info.lines.push(`Остаток ${r} мм: добор вручную`);
    }
  });

  Object.keys(groups).forEach((zKey) => {
    const z = +zKey;
    const g = groups[z];
    if (g.length < 2) return;
    g.forEach((inf, idx) => {
      inf.dob = {
        size: z,
        sets: 0,
        planks: 0,
        shared: true,
        mate: g[idx % 2 ? idx - 1 : Math.min(idx + 1, g.length - 1)].i + 1,
      };
    });
    for (let j = 0; j < g.length; j += 2) g[j].dob!.sets = 1;
  });

  const dq: Record<number, number> = {};
  let plankaQty = 0;
  per.forEach((inf) => {
    const b = inf.dob;
    if (!b) return;
    if (b.shared) {
      inf.lines.push(
        `Добор ${b.size}${b.sets ? `: общий комплект с проёмом ${b.mate}` : `: на комплекте проёма ${b.mate}`}`
      );
    } else if (b.split) {
      inf.lines.push(
        `Остаток ${inf.R} мм: ${b.sets} комплекта добора ${b.size} и стыковочная планка`
      );
    } else {
      inf.lines.push(`Добор ${b.size}, остаток ${inf.R} мм`);
    }
    dq[b.size] = (dq[b.size] || 0) + b.sets * 2.5;
    if (b.planks) plankaQty += 2.5 * b.planks;
  });

  const out: CalcRow[] = [];
  order.forEach((k) => {
    if (/^blade/.test(k)) out.push(rowWithPk(rows[k]));
  });
  if (boxQty) out.push({ k: 'box', name: 'Коробка', q: boxQty, pk: 'box' });
  Object.keys(dq)
    .sort((a, b) => +a - +b)
    .forEach((z) => {
      out.push({ k: `d${z}`, name: `Добор ${z} мм`, q: dq[+z], pk: (`d${z}` as PriceKey) });
    });
  if (plankaQty) out.push({ k: 'planka', name: 'Стыковочная планка', q: plankaQty, pk: 'planka' });
  (['nal', 'hinge', 'handle', 'lock', 'zav', 'sill'] as const).forEach((k) => {
    if (rows[k]) out.push(rowWithPk(rows[k]));
  });
  out.forEach((r) => {
    r.q = Math.ceil(r.q - 1e-9);
  });
  return { per, rows: out };
}

function rowWithPk(r: { k: string; name: string; q: number }): CalcRow {
  const pk: CalcRow['pk'] = /^blade/.test(r.k) ? 'blade' : (r.k as PriceKey);
  return { ...r, pk };
}

export function initPricesFromModel(model: DoorCatalogModel | null): DoorPrices {
  const prices: DoorPrices = {};
  if (model && !model.manual) {
    prices.blade = model.price;
    (Object.keys(DEFAULT_PRICE_RATIOS) as Exclude<PriceKey, 'blade'>[]).forEach((k) => {
      prices[k] = Math.round((model.price * DEFAULT_PRICE_RATIOS[k]) / 10) * 10;
    });
  }
  return prices;
}

export function priceOfRow(prices: DoorPrices, pk: CalcRow['pk']): number | null {
  const v = prices[pk];
  if (v === '' || v == null) return null;
  return +v;
}

export function totals(
  rows: CalcRow[],
  prices: DoorPrices,
  discountInput: string | number
): Totals {
  let sum = 0;
  let none = 0;
  rows.forEach((r) => {
    const p = priceOfRow(prices, r.pk);
    if (p == null) none++;
    else sum += p * r.q;
  });
  const dp = Math.min(
    Math.max(parseFloat(String(discountInput).replace(',', '.')) || 0, 0),
    100
  );
  const dsc = Math.round((sum * dp) / 100);
  return { sum, none, dp, dsc, total: sum - dsc };
}

export function newOpening(id: number, room = ''): DoorOpening {
  return {
    id,
    room,
    type: 'inter',
    w: '',
    h: '',
    depth: '',
    side: 'left',
    nalF: true,
    nalB: true,
    dobor: null,
    zav: false,
    hinge: true,
    handle: true,
    lock: true,
    sill: false,
    blade: '',
    note: '',
  };
}

export function depthNote(opening: DoorOpening): string {
  const d = parseInt(opening.depth, 10);
  const r = d - BOX_DEPTH_MM;
  if (!d) return 'укажите глубину';
  if (r <= 10) return `остаток ${Math.max(r, 0)} мм, не нужен`;
  return `остаток ${r} мм`;
}