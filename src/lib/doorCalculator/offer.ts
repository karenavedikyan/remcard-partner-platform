import { calcDoors, priceOfRow, totals } from './calc';
import type {
  DoorCatalogModel,
  DoorOpening,
  DoorPrices,
  OfferPayload,
} from './types';

export function buildOfferPayload(
  openings: DoorOpening[],
  model: DoorCatalogModel | null,
  prices: DoorPrices,
  discount: string | number,
  shareDobor: boolean,
  obj: { client: string; phone: string; address: string }
): OfferPayload {
  const res = calcDoors(openings, model, shareDobor);
  const t = totals(res.rows, prices, discount);
  const typeLabel = (type: DoorOpening['type']) =>
    type === 'entry' ? 'Входная' : type === 'arch' ? 'Без двери (облагораживание)' : 'Межкомнатная';

  return {
    obj,
    model: {
      name: model ? model.name : 'Модель не выбрана',
      maker: model ? model.maker : '',
    },
    disc: t.dp,
    per: res.per.map((inf) => {
      const o = inf.o;
      return {
        n: inf.i + 1,
        room: o.room,
        type: typeLabel(o.type),
        size: `${o.w || '?'} × ${o.h || '?'}` + (o.depth ? `, стена ${o.depth}` : ''),
        lines: inf.lines,
      };
    }),
    rows: res.rows.map((r) => {
      const p = priceOfRow(prices, r.pk);
      return [r.name, r.q, p] as [string, number, number | null];
    }),
  };
}

export function encodeOfferPayload(payload: OfferPayload): string {
  const json = JSON.stringify(payload);
  const b64 =
    typeof btoa !== 'undefined'
      ? btoa(unescape(encodeURIComponent(json)))
      : Buffer.from(json, 'utf8').toString('base64');
  return b64;
}

export function decodeOfferPayload(hash: string): OfferPayload | null {
  try {
    const json =
      typeof atob !== 'undefined'
        ? decodeURIComponent(escape(atob(hash)))
        : Buffer.from(hash, 'base64').toString('utf8');
    return JSON.parse(json) as OfferPayload;
  } catch {
    return null;
  }
}