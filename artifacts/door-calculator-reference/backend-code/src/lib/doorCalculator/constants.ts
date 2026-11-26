import type { BladeGridRow, PriceKey } from './types';

/** Коробка: вычет из глубины стены, мм */
export const BOX_DEPTH_MM = 65;

export const STANDARD_BLADE_GRID: BladeGridRow[] = [
  { w: 600, from: 700, to: 790 },
  { w: 700, from: 791, to: 850 },
  { w: 800, from: 851, to: 940 },
  { w: 900, from: 941, to: 1040 },
];

export const DEFAULT_DOBOR_SIZES = [100, 150, 200] as const;

/** Коэффициенты цен от полотна (каталог) */
export const DEFAULT_PRICE_RATIOS: Record<Exclude<PriceKey, 'blade'>, number> = {
  box: 0.16,
  d100: 0.12,
  d150: 0.17,
  d200: 0.22,
  planka: 0.08,
  nal: 0.06,
  hinge: 0.045,
  handle: 0.12,
  lock: 0.08,
  zav: 0.06,
  sill: 0.1,
};

export const PRICE_LABELS: [PriceKey | 'blade', string][] = [
  ['blade', 'Полотно'],
  ['box', 'Коробка'],
  ['d100', 'Добор 100'],
  ['d150', 'Добор 150'],
  ['d200', 'Добор 200'],
  ['planka', 'Стыковочная планка'],
  ['nal', 'Наличник'],
  ['sill', 'Порог'],
  ['hinge', 'Петля'],
  ['handle', 'Ручка'],
  ['lock', 'Замок'],
  ['zav', 'Завёртка'],
];

export const COMPARE_ROW_GROUPS: [string, RegExp][] = [
  ['Полотна', /^blade/],
  ['Коробка', /^box$/],
  ['Добор', /^d\d/],
  ['Стыковочная планка', /^planka$/],
  ['Наличник', /^nal$/],
  ['Петли', /^hinge$/],
  ['Ручки', /^handle$/],
  ['Замки', /^lock$/],
  ['Завёртки', /^zav$/],
  ['Порог', /^sill$/],
];

export const MAX_COMPARE_VARIANTS = 4;