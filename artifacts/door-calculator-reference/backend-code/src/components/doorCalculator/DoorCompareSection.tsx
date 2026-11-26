'use client';

import type { ReactNode } from 'react';
import { ChevronRight, Plus, X } from 'lucide-react';
import { COMPARE_ROW_GROUPS } from '@/lib/doorCalculator/constants';
import type { CompareVariantRow } from '@/lib/doorCalculator/compare';
import type { DoorWizardState } from './useDoorWizard';
import { DoorMini } from './DoorMini';

function plural(n: number, a: string, b: string, c: string) {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return a;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return b;
  return c;
}

export function DoorCompareSection({ w }: { w: DoorWizardState }) {
  const d = w.compareRows;
  if (d.length < 2) return null;

  const full = d.filter((x) => !x.t.none);
  const best =
    full.length > 1 ? Math.min(...full.map((x) => x.t.total)) : null;

  const pic = (m: CompareVariantRow['m']) => {
    const manual = 'manual' in m && m.manual;
    const color = 'color' in m ? m.color : undefined;
    const name = m.name;
    return manual || !color ? (
      <DoorMini color="#d9d4ca" glass={/стекл/i.test(name)} />
    ) : (
      <DoorMini color={color} glass={/стекл/i.test(name)} />
    );
  };

  const dp = d[0]?.t.dp ?? 0;

  const cols = `minmax(104px,1.1fr) repeat(${d.length},minmax(104px,1fr))`;

  const cell = (g: CompareVariantRow['g'][0]) =>
    !g.n ? (
      <div className="cc cc--no">—</div>
    ) : (
      <div className="cc">
        {g.none === g.n ? (
          <span className="pill pill--warn">нет цены</span>
        ) : (
          <b>
            {w.formatRub(g.sum)}
            {g.none ? ' *' : ''}
          </b>
        )}
        <small>
          {g.q} шт{g.det.length ? ` · ${g.det.join(', ')}` : ''}
        </small>
      </div>
    );

  const rows = COMPARE_ROW_GROUPS.map((c, k) =>
    d.some((x) => x.g[k].n)
      ? (
          <CompareTableRow key={c[0]} label={c[0]} d={d} k={k} cell={cell} />
        )
      : null
  );

  return (
    <>
      <div className="cmp__h">
        <h2>Сравнение моделей</h2>
        <small>
          {d.length} {plural(d.length, 'модель', 'модели', 'моделей')} · скидка общая
        </small>
      </div>
      <div className="vrow">
        {d.map((x) => {
          const on = x.i === w.vi;
          const m = x.m;
          const tag = x.t.none ? (
            <span className="pill pill--warn">Не все цены заданы</span>
          ) : best == null ? null : x.t.total === best ? (
            <span className="pill pill--ok">Самая выгодная</span>
          ) : (
            <span className="pill pill--more">+ {w.formatRub(x.t.total - best)}</span>
          );
          return (
            <div key={x.i} className={`vcard${on ? ' is-on' : ''}`}>
              <button
                type="button"
                className="vcard__m"
                aria-pressed={on}
                onClick={() => {
                  w.saveVariant();
                  w.setVi(x.i);
                  w.load(w.variants[x.i]);
                }}
              >
                <span className="vcard__pic">{pic(m)}</span>
                <span className="vcard__t">
                  {on ? <span className="vcard__on">Расчёт ниже</span> : null}
                  <b>{m.name}</b>
                  <small>{m.maker}</small>
                  <span className="vcard__sum">{w.formatRub(x.t.total)}</span>
                  {tag}
                </span>
              </button>
              <button
                type="button"
                className="vcard__x"
                aria-label={`Убрать из сравнения: ${m.name}`}
                onClick={() => {
                  if (w.variants.length < 2) return;
                  w.saveVariant();
                  const idx = x.i;
                  const next = w.variants.filter((_, i) => i !== idx);
                  w.setVariants(next);
                  if (w.vi > idx) w.setVi(w.vi - 1);
                  else if (w.vi === idx) w.setVi(Math.min(idx, next.length - 1));
                  w.load(next[w.vi]);
                }}
              >
                <X className="i" />
              </button>
            </div>
          );
        })}
        {w.variants.length < w.maxVariants ? (
          <button
            type="button"
            className="vcard vcard--add"
            onClick={() => {
              w.saveVariant();
              w.setPrevVi(w.vi);
              w.setVi(w.variants.length);
              w.setAdding(true);
              w.pickModel('manual');
              w.setStep(3);
            }}
          >
            <Plus className="i" />
            <span>Добавить модель</span>
          </button>
        ) : null}
      </div>
      <details
        className="card pl ctbl"
        open={w.cmpOpen}
        onToggle={(e) => w.setCmpOpen((e.target as HTMLDetailsElement).open)}
      >
        <summary>
          <span>
            <b>Сравнение по позициям</b>
            <small>Одинаковые проёмы, цены каждой модели</small>
          </span>
          <ChevronRight className="i" aria-hidden />
        </summary>
        <div className="ctbl__sc">
          <div
            className="ctbl__g"
            style={{
              gridTemplateColumns: cols,
              minWidth: 108 * (d.length + 1),
            }}
          >
            <div className="ch" />
            {d.map((x) => (
              <div key={x.i} className={`ch${x.i === w.vi ? ' on' : ''}`}>
                {x.m.name}
              </div>
            ))}
            {rows}
            {dp ? (
              <>
                <CompareTotalRow label="Без скидки" d={d} fn={(t) => w.formatRub(t.sum)} cls="cf" />
                <CompareTotalRow
                  label={`Скидка ${String(dp).replace('.', ',')} %`}
                  d={d}
                  fn={(t) => (t.dsc ? `− ${w.formatRub(t.dsc)}` : '—')}
                  cls="cf2"
                />
              </>
            ) : null}
            <CompareTotalRow
              label="Итого"
              d={d}
              fn={(t) => w.formatRub(t.total)}
              cls={dp ? 'ct' : 'cf ct'}
            />
          </div>
        </div>
        {d.length > 2 ? (
          <p className="note ctbl__swipe">Листайте таблицу вправо, чтобы увидеть все модели.</p>
        ) : null}
        {d.some((x) => x.t.none) ? (
          <p className="note">* Цена задана не для всех позиций, сумма посчитана без них.</p>
        ) : null}
      </details>
    </>
  );
}

function CompareTableRow({
  label,
  d,
  k,
  cell,
}: {
  label: string;
  d: CompareVariantRow[];
  k: number;
  cell: (g: CompareVariantRow['g'][0]) => ReactNode;
}) {
  return (
    <>
      <div className="cn">{label}</div>
      {d.map((x) => (
        <div key={x.i}>{cell(x.g[k])}</div>
      ))}
    </>
  );
}

function CompareTotalRow({
  label,
  d,
  fn,
  cls,
}: {
  label: string;
  d: CompareVariantRow[];
  fn: (t: CompareVariantRow['t']) => string;
  cls: string;
}) {
  return (
    <>
      <div className={`cn ${cls}`}>{label}</div>
      {d.map((x) => (
        <div key={x.i} className={`cc ${cls}`}>
          <b>{fn(x.t)}</b>
        </div>
      ))}
    </>
  );
}