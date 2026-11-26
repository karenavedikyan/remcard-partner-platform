import type { DoorCatalogModel, DoorOpening } from '@/lib/doorCalculator';
import { bladeOf, dobEff } from '@/lib/doorCalculator';

const FX1 = 114;
const FX2 = 362;
const FY1 = 100;
const FY2 = 512;
const VP: [number, number] = [238, 306];

export function DoorSceneSvg({
  opening,
  model,
}: {
  opening: DoorOpening;
  model: DoorCatalogModel | null;
}) {
  const entry = opening.type === 'entry';
  const arch = opening.type === 'arch';
  const dEff = dobEff(opening);
  const left = opening.side === 'left';
  const d = parseInt(opening.depth, 10) || 0;
  const sc = d ? 0.94 - (Math.min(d, 500) / 500) * 0.16 : 0.9;

  const P = (x: number, y: number): [number, number] => [
    VP[0] + (x - VP[0]) * sc,
    VP[1] + (y - VP[1]) * sc,
  ];
  const bl = P(FX1, FY2);
  const br = P(FX2, FY2);
  const tl = P(FX1, FY1);
  const tr = P(FX2, FY1);
  const pt = (a: [number, number]) => `${a[0].toFixed(1)},${a[1].toFixed(1)}`;
  const poly = (a: [number, number][], fill: string) =>
    `<polygon points="${a.map(pt).join(' ')}" fill="${fill}" stroke="#00000022" stroke-width="1" stroke-linejoin="round"/>`;
  const frame = (x1: number, y1: number, x2: number, c: string) =>
  `<path fill-rule="evenodd" d="M${x1} ${y1}H${x2}V${FY2}H${x1}ZM${FX1} ${FY1}H${FX2}V${FY2}H${FX1}Z" fill="${c}" stroke="#0000002b" stroke-width="1"/>`;

  const Ftl: [number, number] = [FX1, FY1];
  const Ftr: [number, number] = [FX2, FY1];
  const Fbl: [number, number] = [FX1, FY2];
  const Fbr: [number, number] = [FX2, FY2];
  const cT = dEff ? '#dcc097' : '#d8d4c9';
  const cL = dEff ? '#cdaa78' : '#cfcabf';
  const cR = dEff ? '#bd9259' : '#c4bfb3';
  const leaf = entry ? '#5e4f41' : model?.color || '#e9e4da';
  const x1 = tl[0];
  const y1 = tl[1];
  const w = br[0] - x1;
  const h = br[1] - y1;
  const x2 = x1 + w;

  let s =
    '<svg viewBox="0 0 390 612" width="390" height="612" aria-hidden="true"><defs><linearGradient id="lf" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity=".16"/><stop offset="1" stop-color="#000" stop-opacity=".07"/></linearGradient></defs>' +
    `<rect width="390" height="612" style="fill:var(--sc-wall)"/><rect y="${FY2}" width="390" height="100" style="fill:var(--sc-floor)"/><path d="M0 ${FY2}H390" stroke="#00000020"/>` +
    (opening.nalB ? frame(90, 76, 386, '#cfae7f') : '') +
    (opening.nalF ? frame(97, 83, 379, '#e8d2aa') : '') +
    `<rect x="${FX1}" y="${FY1}" width="${FX2 - FX1}" height="${FY2 - FY1}" fill="#b9b4a8"/>` +
    poly([Ftl, Ftr, tr, tl], cT) +
    poly([Ftl, tl, bl, Fbl], cL) +
    poly([Ftr, tr, br, Fbr], cR) +
    poly(
      [Fbl, Fbr, br, bl],
      opening.sill && !arch ? '#7d7972' : '#c9c4b8'
    );

  if (arch) {
    s +=
      `<rect x="${x1}" y="${y1}" width="${w}" height="${h}" style="fill:var(--sc-bg)"/>` +
      `<rect x="${x1}" y="${y1 + h * 0.8}" width="${w}" height="${h * 0.2}" style="fill:var(--sc-floor)" opacity=".7"/>` +
      `<text x="238" y="${y1 + h * 0.9}" text-anchor="middle" font-family="Manrope,sans-serif" font-weight="700" font-size="13" style="fill:var(--muted)">Проём без двери</text>`;
  } else {
    s += `<rect x="${x1}" y="${y1}" width="${w}" height="${h}" fill="${leaf}"/>`;
    if (entry) {
      [0.2, 0.4, 0.6, 0.8].forEach((k) => {
        s += `<path d="M${x1 + 14} ${y1 + h * k}H${x2 - 14}" stroke="#00000030" stroke-width="2"/>`;
      });
      s += `<circle cx="${x1 + w / 2}" cy="${y1 + h * 0.3}" r="4" fill="#d8c9a8"/><rect x="${left ? x2 - 24 : x1 + 16}" y="${y1 + h * 0.42}" width="8" height="${h * 0.16}" rx="4" fill="#d8c9a8"/>`;
    } else {
      const glass = model && /стекл/i.test(model.name);
      const px = x1 + w * 0.16;
      const pw = w * 0.68;
      s +=
        `<rect x="${px}" y="${y1 + h * 0.07}" width="${pw}" height="${h * 0.4}" rx="2" fill="${glass ? '#cfe3ea' : '#ffffff14'}" stroke="#00000022"/>` +
        `<rect x="${px}" y="${y1 + h * 0.53}" width="${pw}" height="${h * 0.4}" rx="2" fill="#ffffff14" stroke="#00000022"/>`;
    }
    s += `<rect x="${x1}" y="${y1}" width="${w}" height="${h}" fill="url(#lf)" stroke="#00000040" stroke-width="1.2"/>`;
    if (!entry) {
      const hx = left ? x2 - 20 : x1 + 20;
      const cy = y1 + h * 0.5;
      const hg = left ? x1 - 2 : x2 - 4;
      if (opening.hinge) {
        [0.12, 0.8].forEach((k) => {
          s += `<rect x="${hg}" y="${y1 + h * k}" width="6" height="32" rx="2" fill="#2f302e"/>`;
        });
      }
      s += opening.handle
        ? `<rect x="${left ? hx - 30 : hx}" y="${cy - 3.5}" width="30" height="7" rx="3.5" fill="#2a2b29"/><circle cx="${hx}" cy="${cy}" r="7.5" fill="#2a2b29"/>`
        : `<circle cx="${hx}" cy="${cy}" r="6" fill="none" stroke="#00000038" stroke-dasharray="3 3"/>`;
      if (opening.lock) {
        s += `<rect x="${hx - 5}" y="${cy + 20}" width="10" height="17" rx="3" fill="#4b4c49"/><circle cx="${hx}" cy="${cy + 26}" r="1.8" fill="#d9d5cb"/>`;
      }
      if (opening.zav) {
        s += `<circle cx="${hx}" cy="${cy + 54}" r="6.5" fill="none" stroke="#2a2b29" stroke-width="3"/>`;
      }
    }
  }
  s +=
    `<g style="stroke:var(--primary)" stroke-width="1.5" fill="none"><path d="M${FX1} 44H${FX2}M${FX1} 37v14M${FX2} 37v14"/><path d="M84 ${FY1}V${FY2}M77 ${FY1}h14M77 ${FY2}h14"/>` +
    `<path d="M${pt(Fbr).replace(',', ' ')}L${pt(br).replace(',', ' ')}" stroke-width="3" stroke-dasharray="1 5" stroke-linecap="round"/></g></svg>`;

  return (
    <div
      className="door-scene__svg"
      dangerouslySetInnerHTML={{ __html: s }}
      data-testid="door-scene"
    />
  );
}

export function bladeOptionsForOpening(model: DoorCatalogModel | null, opening: DoorOpening) {
  const bl = bladeOf(model, opening);
  const base = [600, 700, 800, 900];
  const extra =
    opening.blade && !base.includes(+opening.blade) ? [+opening.blade] : [];
  return { bl, opts: [...base, ...extra] };
}