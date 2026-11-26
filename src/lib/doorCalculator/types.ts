export type DoorOpeningType = 'inter' | 'entry' | 'arch';

export type BladeGridRow = { w: number; from: number; to?: number };

export type DoorCatalogModel = {
  id: string;
  name: string;
  maker: string;
  color?: string;
  price: number;
  blades: BladeGridRow[] | null;
  dobors?: number[];
  manual?: boolean;
};

export type DoorOpening = {
  id: number;
  room: string;
  type: DoorOpeningType;
  w: string;
  h: string;
  depth: string;
  side: 'left' | 'right';
  nalF: boolean;
  nalB: boolean;
  dobor: boolean | null;
  zav: boolean;
  hinge: boolean;
  handle: boolean;
  lock: boolean;
  sill: boolean;
  blade: string;
  note: string;
};

export type PriceKey =
  | 'blade'
  | 'box'
  | 'd100'
  | 'd150'
  | 'd200'
  | 'planka'
  | 'nal'
  | 'sill'
  | 'hinge'
  | 'handle'
  | 'lock'
  | 'zav';

export type DoorPrices = Partial<Record<PriceKey, number | '' | null>>;

export type CalcRow = {
  k: string;
  name: string;
  q: number;
  pk: PriceKey | 'blade';
};

export type DobInfo = {
  size: number;
  sets: number;
  planks: number;
  shared?: boolean;
  mate?: number;
  split?: boolean;
};

export type OpeningCalcInfo = {
  i: number;
  o: DoorOpening;
  lines: string[];
  R?: number;
  dob?: DobInfo;
};

export type CalcResult = {
  per: OpeningCalcInfo[];
  rows: CalcRow[];
};

export type Totals = {
  sum: number;
  none: number;
  dp: number;
  dsc: number;
  total: number;
};

export type ModelVariantSnapshot = {
  modelId: string | null;
  manual: { on: boolean; name: string; maker: string };
  prices: DoorPrices;
  pricesFor: string | null;
  bl: Record<number, string>;
};

export type OfferPayload = {
  obj: { client: string; phone: string; address: string };
  model: { name: string; maker: string };
  disc: number;
  per: Array<{
    n: number;
    room: string;
    type: string;
    size: string;
    lines: string[];
  }>;
  rows: Array<[string, number, number | null]>;
};

export type DoorModelSource = {
  listModels(): DoorCatalogModel[];
};