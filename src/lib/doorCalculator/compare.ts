import { COMPARE_ROW_GROUPS } from './constants';
import { calcDoors, priceOfRow, totals } from './calc';
import type {
  CalcResult,
  DoorCatalogModel,
  DoorOpening,
  DoorPrices,
  ModelVariantSnapshot,
  Totals,
} from './types';

export type CompareGroupCell = {
  n: number;
  q: number;
  sum: number;
  none: number;
  det: string[];
};

export type CompareVariantRow = {
  i: number;
  m: DoorCatalogModel | { name: string; maker: string; manual?: boolean };
  t: Totals;
  g: CompareGroupCell[];
};

export function resolveModel(
  snapshot: ModelVariantSnapshot,
  catalog: DoorCatalogModel[]
): DoorCatalogModel | null {
  if (snapshot.manual.on) {
    return {
      id: 'manual',
      manual: true,
      name: snapshot.manual.name || 'Модель вне каталога',
      maker: snapshot.manual.maker || 'Производитель не указан',
      price: 0,
      blades: null,
    };
  }
  return catalog.find((x) => x.id === snapshot.modelId) ?? null;
}

export function applyVariantToOpenings(
  openings: DoorOpening[],
  snapshot: ModelVariantSnapshot
): DoorOpening[] {
  return openings.map((o) => ({
    ...o,
    blade: snapshot.bl[o.id] || '',
  }));
}

export function compareVariants(
  openings: DoorOpening[],
  variants: ModelVariantSnapshot[],
  catalog: DoorCatalogModel[],
  discount: string | number,
  shareDobor: boolean
): CompareVariantRow[] {
  return variants.map((v, i) => {
    const m = resolveModel(v, catalog);
    const ops = applyVariantToOpenings(openings, v);
    const res = calcDoors(ops, m, shareDobor);
    const t = totals(res.rows, v.prices, discount);
    const g = COMPARE_ROW_GROUPS.map((c) => groupCell(res, v.prices, c[1]));
    return { i, m: m || { name: 'Модель не выбрана', maker: '' }, t, g };
  });
}

function groupCell(res: CalcResult, prices: DoorPrices, re: RegExp): CompareGroupCell {
  const rs = res.rows.filter((r) => re.test(r.k));
  let q = 0;
  let sum = 0;
  let none = 0;
  const det: string[] = [];
  rs.forEach((r) => {
    const pr = priceOfRow(prices, r.pk);
    q += r.q;
    if (pr == null) none++;
    else sum += pr * r.q;
    const z = /(\d+) мм/.exec(r.name);
    if (z) det.push(z[1]);
  });
  return { n: rs.length, q, sum, none, det };
}