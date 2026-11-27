'use client';

import type { CSSProperties, ReactNode } from 'react';
import Link from 'next/link';
import { useEffect, useLayoutEffect, useRef } from 'react';
import {
  IcCheck,
  IcChevronLeft,
  IcChevronRight,
  IcCopy,
  IcDoorOpen,
  IcFileText,
  IcMinus,
  IcPencil,
  IcPlus,
  IcTrash2,
  IcX,
} from '@/components/doorCalculator/DoorWizardIcons';
import { depthNote, dobEff, bladeOf, priceOfRow } from '@/lib/doorCalculator';
import type { DoorCatalogModel } from '@/lib/doorCalculator';
import { emptyDoorModelSource } from '@/lib/doorCalculator/modelSource';
import { DoorSceneSvg, bladeOptionsForOpening } from './DoorSceneSvg';
import { DoorCompareSection } from './DoorCompareSection';
import { DoorMini } from './DoorMini';
import { clearDoorWizardSession } from '@/lib/doorCalculator/wizardSession';
import { useDoorWizard } from './useDoorWizard';
import { WizardBar } from './WizardBar';
import './door-wizard.css';

const STEPS = ['Проёмы', 'Размеры', 'Модель', 'Расчёт'];

function plural(n: number, a: string, b: string, c: string) {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return a;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return b;
  return c;
}

export function DoorCalculatorWizard({
  catalog: catalogProp,
  context = 'lk',
}: {
  catalog?: DoorCatalogModel[];
  context?: 'site' | 'lk';
} = {}) {
  const closeHref = context === 'lk' ? '/' : '/calculators';
  const catalog = catalogProp ?? emptyDoorModelSource.listModels();
  const w = useDoorWizard(catalog, { persist: context === 'lk' });
  const stageRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const fit = () => {
      const compact =
        window.innerWidth > 860 && window.innerHeight < 861 && w.step === 2;
      rootRef.current?.classList.toggle('is-compact2', compact);

      document.querySelectorAll<HTMLElement>('.door-wizard .stagebox').forEach((b) => {
        const g = b.closest<HTMLElement>('.s2__grid');
        let scw = 400;
        if (g) {
          if (window.innerWidth > 860) {
            if (compact) {
              const top = b.getBoundingClientRect().top + window.scrollY;
              scw = Math.round((window.innerHeight - top - 12) * (390 / 612));
              scw = Math.max(300, Math.min(scw, Math.round(g.clientWidth * 0.52)));
            } else {
              scw = Math.max(
                300,
                Math.min(400, Math.round((window.innerHeight - 340) * (390 / 612)))
              );
            }
          }
          g.style.setProperty('--scw', `${scw}px`);
        }
        const k = b.clientWidth / 390;
        const st = b.firstElementChild as HTMLElement | null;
        if (st) st.style.transform = `scale(${k})`;
        b.style.height = `${Math.round(612 * k)}px`;
      });

      const barEl = rootRef.current?.querySelector<HTMLElement>('#bar > .bar');
      const more = moreRef.current;
      if (compact && more && barEl) {
        const r = more.getBoundingClientRect();
        barEl.style.left = `${r.left}px`;
        barEl.style.width = `${r.width}px`;
      } else if (barEl) {
        barEl.style.left = '';
        barEl.style.width = '';
      }
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, [w.step, w.cur, w.openings]);

  useEffect(() => {
    if (w.step === 4 && w.variants.length === 0) {
      w.setVariants([w.snap()]);
      w.setVi(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- snapshot once on step 4
  }, [w.step, w.variants.length]);

  const go = (step: number, opts?: { skipSave?: boolean }) => {
    if (step === 4 && !opts?.skipSave) w.saveVariant();
    w.setStep(step);
  };

  const topBar = (
    <div className="wtop">
      <button
        type="button"
        className="iconbtn"
        aria-label="Назад"
        disabled={w.step === 1}
        onClick={() => {
          if (w.step === 3 && w.adding) {
            w.setAdding(false);
            w.setVi(w.prevVi);
            w.load(w.variants[w.prevVi]);
            go(4);
            return;
          }
          if (w.step === 2 && w.cur > 0) {
            w.setCur(w.cur - 1);
            return;
          }
          if (w.step === 3) w.setCur(w.openings.length - 1);
          go(w.step - 1);
        }}
      >
        <IcChevronLeft className="i" />
      </button>
      <div
        className="wprog"
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={4}
        aria-valuenow={w.step}
        aria-label={`Шаг ${w.step} из 4`}
      >
        {STEPS.map((_, i) => (
          <i
            key={STEPS[i]}
            className={i + 1 < w.step ? 'done' : i + 1 === w.step ? 'on' : ''}
          />
        ))}
      </div>
      <Link
        href={closeHref}
        className="iconbtn"
        aria-label="Закрыть калькулятор"
        onClick={() => {
          if (context === 'lk') clearDoorWizardSession();
        }}
      >
        <IcX className="i" />
      </Link>
    </div>
  );

  const step1 = (
    <section className="scr scr--narrow">
      <span className="eyebrow">Шаг 1 из 4 · {STEPS[0]}</span>
      <h1>Сколько проёмов?</h1>
      <p className="lead">Размеры и комплектацию каждого проёма укажем на следующем шаге.</p>
      <div className="count">
        <button
          type="button"
          className="count__b"
          aria-label="Меньше"
          disabled={w.openings.length < 2}
          onClick={() => w.setOpeningCount(w.openings.length - 1)}
        >
          <IcMinus className="i" />
        </button>
        <div className="count__n">
          <b>{w.openings.length}</b>
          <span>
            {plural(w.openings.length, 'проём', 'проёма', 'проёмов')}
          </span>
        </div>
        <button
          type="button"
          className="count__b"
          aria-label="Больше"
          onClick={() => w.setOpeningCount(Math.min(20, w.openings.length + 1))}
        >
          <IcPlus className="i" />
        </button>
      </div>
      <div className="doors" aria-hidden>
        {Array.from({ length: Math.min(w.openings.length, 12) }, (_, i) => (
          <i key={i} />
        ))}
        {w.openings.length > 12 ? <span>+{w.openings.length - 12}</span> : null}
      </div>
      <div className="quick" role="group" aria-label="Быстрый выбор">
        {[1, 2, 3, 4, 5, 6].map((k) => (
          <button
            key={k}
            type="button"
            data-v={k}
            className={w.openings.length === k ? 'on' : ''}
            onClick={() => w.setOpeningCount(k)}
          >
            {k}
          </button>
        ))}
      </div>
    </section>
  );

  const o = w.openings[w.cur];
  const step2 = o && (
    <section className="scr s2" data-id={o.id}>
      <div className="s2__grid">
        <div className="s2__head">
          <div className="s2__top">
            <MotionEyebrow
              text={`Шаг 2 из 4 · ${STEPS[1]} · проём ${w.cur + 1} из ${w.openings.length}`}
            />
            {w.openings.length > 1 ? (
              <div className="dots">
                {w.openings.map((x, i) => (
                  <button
                    key={x.id}
                    type="button"
                    className={`dot${i === w.cur ? ' on' : ''}${i !== w.cur && x.w && x.h ? ' full' : ''}`}
                    aria-label={`Проём ${i + 1}`}
                    onClick={() => w.setCur(i)}
                  >
                    {i !== w.cur && x.w && x.h ? '✓' : i + 1}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <label className="room">
            <IcPencil className="i" aria-hidden />
            <input
              value={o.room}
              placeholder={`Проём ${w.cur + 1}: название помещения`}
              aria-label="Название помещения"
              onChange={(e) => w.updateOpening(o.id, { room: e.target.value })}
            />
          </label>
          <div className="seg seg--full">
            {(['inter', 'entry', 'arch'] as const).map((t) => (
              <button
                key={t}
                type="button"
                className={o.type === t ? 'is-on' : ''}
                onClick={() => {
                  const patch: Partial<typeof o> = { type: t, nalF: true, nalB: t !== 'entry' };
                  if (t === 'arch') patch.sill = false;
                  w.updateOpening(o.id, patch);
                }}
              >
                {t === 'inter' ? 'Межкомнатная' : t === 'entry' ? 'Входная' : 'Без двери'}
              </button>
            ))}
          </div>
        </div>
        <div className="s2__scene" ref={stageRef}>
          <OpeningScene opening={o} model={w.curModel} onChange={(p) => w.updateOpening(o.id, p)} />
        </div>
        <div className="s2__more" ref={moreRef}>
          {o.type !== 'arch' ? (
            <div className="fld">
              <span className="fld__l">Петли</span>
              <div className="seg seg--full">
                {(['left', 'right'] as const).map((side) => (
                  <button
                    key={side}
                    type="button"
                    className={o.side === side ? 'is-on' : ''}
                    onClick={() => w.updateOpening(o.id, { side })}
                  >
                    {side === 'left' ? 'Слева' : 'Справа'}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          <div className="sumbox">
            <span className="eyebrow">Состав проёма</span>
            <ul>
              {w.calcResult.per[w.cur]?.lines.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
            <small>
              {o.type === 'arch'
                ? 'Облагораживание без двери: добор, наличники.'
                : o.type === 'entry'
                  ? 'Входная дверь считается в общем заказе: добор, наличники и порог.'
                  : 'Отмечайте нужное прямо на проёме. Ширина полотна уточнится после выбора модели.'}
            </small>
          </div>
          <div className="rowbtns">
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => {
                const copy = { ...o, id: Date.now(), room: o.room };
                w.setOpenings((ops) => {
                  const next = [...ops];
                  next.splice(w.cur + 1, 0, copy);
                  return next;
                });
                w.setCur(w.cur + 1);
              }}
            >
              <IcCopy className="i" /> Копировать проём
            </button>
            <button
              type="button"
              className="btn btn--text btn--sm"
              disabled={w.openings.length < 2}
              onClick={() => {
                w.resetCompareVariants();
                w.setOpenings((ops) => ops.filter((x) => x.id !== o.id));
                w.setCur(Math.min(w.cur, w.openings.length - 2));
              }}
            >
              <IcTrash2 className="i" /> Удалить
            </button>
          </div>
        </div>
      </div>
    </section>
  );

  const modelOk = !!w.curModel;
  const taken = w.takenIds();

  const step3 = (
    <section className="scr">
      <span className="eyebrow">
        Шаг 3 из 4 · {STEPS[2]}
        {w.adding ? ' · сравнение' : ''}
      </span>
      <h1>{w.adding ? 'Ещё одна модель' : 'Какая модель?'}</h1>
      <p className="lead">
        {w.hasCatalog
          ? w.adding
            ? 'Проёмы и комплектация те же. Выберите модель для сравнения.'
            : 'Выберите дверь из каталога или внесите свою модель и цены вручную.'
          : 'Каталог пока пуст — введите модель и цены вручную.'}
      </p>
      <div className="mgrid">
        <button
          type="button"
          className={`mcard mcard--own${w.manual.on ? ' is-on' : ''}`}
          onClick={() => w.pickModel('manual')}
        >
          <span className="mcard__pic">
            <DoorMini plus />
          </span>
          <b>Вне каталога</b>
          <small>Своя модель и цены вручную</small>
          {w.manual.on ? (
            <span className="mcard__ok">
              <IcCheck className="i" />
            </span>
          ) : null}
        </button>
        {w.catalog.map((x) => {
          const tk = taken.includes(x.id);
          const on = !w.manual.on && w.modelId === x.id;
          return (
            <button
              key={x.id}
              type="button"
              className={`mcard${on ? ' is-on' : ''}${tk ? ' is-taken' : ''}`}
              disabled={tk}
              onClick={() => w.pickModel(x.id)}
            >
              <span className="mcard__pic">
                <DoorMini color={x.color} glass={/стекл/i.test(x.name)} />
              </span>
              <b>{x.name}</b>
              <small>{x.maker}</small>
              <span className="mcard__p">от {w.formatRub(x.price)}</span>
              {x.blades ? (
                <span className="pill pill--ok">Размеры в каталоге</span>
              ) : (
                <span className="pill pill--warn">Стандартные размеры</span>
              )}
              {tk ? <span className="pill pill--more">Уже в сравнении</span> : null}
              {on ? (
                <span className="mcard__ok">
                  <IcCheck className="i" />
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
      {w.manual.on ? (
        <div className="card manual">
          <h2>Своя модель</h2>
          <div className="g2">
            <label className="f">
              Название модели
              <input
                value={w.manual.name}
                placeholder="Например, Престиж 7"
                onChange={(e) => w.setManual({ ...w.manual, name: e.target.value })}
              />
            </label>
            <label className="f">
              Производитель
              <input
                value={w.manual.maker}
                placeholder="Необязательно"
                onChange={(e) => w.setManual({ ...w.manual, maker: e.target.value })}
              />
            </label>
          </div>
          <p className="note">
            Цены необязательны: без цены позиция считается только по количеству.
          </p>
        </div>
      ) : null}
      {modelOk ? (
        <details className="card pl" open={w.manual.on}>
          <summary>
            <span>
              <b>Цены за штуку</b>
              <small>
                {w.manual.on ? 'Введите вручную' : 'Подставлены из каталога, можно изменить'}
              </small>
            </span>
            <IcChevronRight className="i" aria-hidden />
          </summary>
          <div className="prg">
            {w.priceLabels.map(([key, label]) => (
              <label key={key} className="f">
                {label}
                <span className="unit">
                  <input
                    type="number"
                    inputMode="numeric"
                    value={w.prices[key] ?? ''}
                    placeholder="не задана"
                    onChange={(e) =>
                      w.setPrices({ ...w.prices, [key]: e.target.value === '' ? '' : +e.target.value })
                    }
                  />
                  <i>₽</i>
                </span>
              </label>
            ))}
          </div>
        </details>
      ) : null}
    </section>
  );

  const step4 = (
    <section className="scr">
      <span className="eyebrow">Шаг 4 из 4 · {STEPS[3]}</span>
      <h1>Расчёт готов</h1>
      <p className="lead">
        {w.curModel?.name ?? ''}
        {w.curModel?.maker ? ` · ${w.curModel.maker}` : ''} · {w.openings.length}{' '}
        {plural(w.openings.length, 'проём', 'проёма', 'проёмов')}
      </p>
      <div className="cmp" id="cmp">
        {w.variants.length > 1 ? <DoorCompareSection w={w} /> : null}
      </div>
      <div className="res">
        <aside className="res__side">
          <div className="sumc">
            <span className="eyebrow">Итого</span>
            <div className="sumc__total">{w.formatRub(w.calcTotals.total)}</div>
            <dl className="sumc__rows">
              <div>
                <dt>Без скидки</dt>
                <dd>{w.formatRub(w.calcTotals.sum)}</dd>
              </div>
              <div>
                <dt>Скидка {w.calcTotals.dp ? `${w.calcTotals.dp} %` : ''}</dt>
                <dd>{w.calcTotals.dsc ? `− ${w.formatRub(w.calcTotals.dsc)}` : '—'}</dd>
              </div>
            </dl>
            {w.calcTotals.dsc ? (
              <div className="sumc__gain">
                <IcCheck className="i" aria-hidden /> Выгода клиента: {w.formatRub(w.calcTotals.dsc)}
              </div>
            ) : null}
            {w.calcTotals.none ? (
              <div className="sumc__warn">
                Цена не задана: {w.calcTotals.none} поз. Сумма посчитана без них.
              </div>
            ) : null}
            <label className="sumc__disc">
              <span>Скидка, %</span>
              <span className="unit">
                <input
                  data-disc
                  type="number"
                  inputMode="decimal"
                  min={0}
                  max={100}
                  value={w.disc}
                  placeholder="0"
                  onChange={(e) => w.setDisc(e.target.value)}
                />
                <i>%</i>
              </span>
            </label>
          </div>
          <div className="res__edit">
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => go(2)}>
              <IcPencil className="i" /> Изменить проёмы
            </button>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => go(3)}>
              <IcDoorOpen className="i" /> Сменить модель
            </button>
            {w.variants.length < 2 ? (
              <button
                type="button"
                className="btn btn--ghost btn--sm res__add"
                onClick={() => {
                  w.saveVariant();
                  w.setPrevVi(w.vi);
                  w.setVi(w.variants.length);
                  w.setAdding(true);
                  w.pickModel('manual');
                  go(3);
                }}
              >
                <IcPlus className="i" /> Добавить модель для сравнения
              </button>
            ) : null}
          </div>
        </aside>
        <div className="res__main">
          <div className="card">
            <div className="card__h">
              <h2>Спецификация</h2>
              <small>Количество по заказу, округлено вверх</small>
            </div>
            <div className="shead">
              <span>Позиция</span>
              <span>Цена за шт.</span>
              <span>Сумма</span>
            </div>
            {w.calcResult.rows.map((r) => (
              <div key={r.k} className="srow" data-rk={r.k}>
                <div className="srow__n">
                  <b>{r.name}</b>
                  <small>{r.q} шт</small>
                </div>
                <span className="unit">
                  <input
                    data-pr={r.pk}
                    type="number"
                    value={w.prices[r.pk] ?? ''}
                    placeholder="цена"
                    onChange={(e) =>
                      w.setPrices({
                        ...w.prices,
                        [r.pk]: e.target.value === '' ? '' : +e.target.value,
                      })
                    }
                  />
                  <i>₽</i>
                </span>
                <div className="srow__s">
                  <SumCell row={r} prices={w.prices} formatRub={w.formatRub} />
                </div>
              </div>
            ))}
            <label className="chk">
              <input
                type="checkbox"
                checked={w.share}
                onChange={(e) => w.setShare(e.target.checked)}
              />
              <span>Делить добор между проёмами</span>
            </label>
          </div>
          <div className="card">
            <div className="card__h">
              <h2>По проёмам</h2>
            </div>
            {w.calcResult.per.map((inf) => {
              const op = inf.o;
              const bl = bladeOf(w.curModel, op);
              const ask =
                op.type === 'inter' &&
                (bl.src === 'std' || bl.src === 'manual' || bl.src === 'out' || bl.src === 'nowidth');
              const { opts } = bladeOptionsForOpening(w.curModel, op);
              const bladeHint =
                bl.src === 'std'
                  ? ' · по стандартной сетке'
                  : bl.src === 'out'
                    ? ' · проём вне диапазона'
                    : '';
              return (
                <div key={op.id} className="pr" data-id={op.id}>
                  <div className="pr__h">
                    <span className="pr__n">{inf.i + 1}</span>
                    <b>{op.room || `Проём ${inf.i + 1}`}</b>
                    <small>
                      {op.w || '?'} × {op.h || '?'}
                      {op.depth ? ` · стена ${op.depth}` : ''}
                    </small>
                  </div>
                  <ul>
                    {inf.lines.map((l) => (
                      <li key={l}>{l}</li>
                    ))}
                  </ul>
                  {ask ? (
                    <label className="f f--inline">
                      Ширина полотна{bladeHint}
                      <select
                        value={op.blade || (bl.w ? String(bl.w) : '')}
                        onChange={(e) => w.updateOpening(op.id, { blade: e.target.value })}
                      >
                        {!bl.w ? <option value="">выберите</option> : null}
                        {opts.map((x) => (
                          <option key={x} value={x}>
                            {x} мм
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}
                </div>
              );
            })}
          </div>
          <details className="card pl">
            <summary>
              <span>
                <b>{context === 'lk' ? 'Данные заказчика' : 'Ваши данные'}</b>
                <small>Попадут в предложение, необязательно</small>
              </span>
              <IcChevronRight className="i" aria-hidden />
            </summary>
            <div className="g2" style={{ marginTop: 14 }}>
              <label className="f">
                {context === 'lk' ? 'Заказчик' : 'Имя'}
                <input
                  value={w.obj.client}
                  onChange={(e) => w.setObj({ ...w.obj, client: e.target.value })}
                />
              </label>
              <label className="f">
                Телефон
                <input
                  inputMode="tel"
                  value={w.obj.phone}
                  onChange={(e) => w.setObj({ ...w.obj, phone: e.target.value })}
                />
              </label>
              <label className="f f--wide">
                Адрес объекта
                <input
                  value={w.obj.address}
                  onChange={(e) => w.setObj({ ...w.obj, address: e.target.value })}
                />
              </label>
            </div>
          </details>
        </div>
      </div>
    </section>
  );

  const nextDisabledStep3 = !modelOk;
  const bar =
    w.step === 1 ? (
      <WizardBar>
        <BarNextButton
          label="Далее: размеры"
          onClick={() => {
            w.setCur(0);
            go(2);
          }}
        />
      </WizardBar>
    ) : w.step === 2 ? (
      <WizardBar>
        <button type="button" className="btn btn--ghost btn--lg bar__back" onClick={() => go(1)}>
          <IcChevronLeft className="i" /> <span>Назад</span>
        </button>
        <BarNextButton
          label={
            w.cur < w.openings.length - 1
              ? `Далее: проём ${w.cur + 2}`
              : 'Далее: модель'
          }
          onClick={() => {
            if (w.cur < w.openings.length - 1) {
              w.setCur(w.cur + 1);
            } else {
              go(3);
            }
          }}
        />
      </WizardBar>
    ) : w.step === 3 ? (
      <WizardBar
        hint={
          nextDisabledStep3
            ? w.adding
              ? 'Выберите модель для сравнения'
              : 'Выберите модель, чтобы получить расчёт'
            : undefined
        }
      >
        <button type="button" className="btn btn--ghost btn--lg bar__back" onClick={() => go(2)}>
          <IcChevronLeft className="i" /> <span>Назад</span>
        </button>
        <BarNextButton
          label={w.adding ? 'Добавить к сравнению' : 'Рассчитать'}
          disabled={nextDisabledStep3}
          onClick={() => {
            if (w.adding) {
              const added = w.snap();
              const prevIdx = w.prevVi;
              w.setVariants((vars) => {
                const next = [...vars];
                next[w.vi] = added;
                return next;
              });
              w.setAdding(false);
              w.setVi(prevIdx);
              const prev = w.variants[prevIdx];
              if (prev) w.load(prev);
              go(4, { skipSave: true });
              return;
            }
            go(4);
          }}
        />
      </WizardBar>
    ) : (
      <WizardBar>
        <button type="button" className="btn btn--ghost btn--lg bar__back" onClick={() => go(3)}>
          <IcChevronLeft className="i" /> <span>Назад</span>
        </button>
        <Link
          href={w.offerHref}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn--primary btn--lg bar__next"
        >
          <IcFileText className="i" /> <span>Предложение PDF</span>
        </Link>
      </WizardBar>
    );

  const shellClass =
    context === 'lk'
      ? 'door-wizard ctx-lk embedded-in-cabinet'
      : 'door-wizard ctx-site';

  return (
    <div ref={rootRef} className={shellClass} data-testid="door-calculator-wizard">
      <div className="page">
        <div className="page__in">
          {context === 'site' ? (
            <nav className="crumbs" aria-label="Хлебные крошки">
              <Link href="/calculators">Калькулятор</Link>
              <IcChevronRight className="i" aria-hidden />
              <Link href="/calculators">Отдельный расчёт</Link>
              <IcChevronRight className="i" aria-hidden />
              <span>Двери и проёмы</span>
            </nav>
          ) : (
            <nav className="crumbs" aria-label="Раздел">
              <Link href="/">Кабинет</Link>
              <IcChevronRight className="i" aria-hidden />
              <span>Калькулятор дверей</span>
            </nav>
          )}
          {topBar}
          <div className={`wz wz--${w.step}`}>
            {w.step === 1 ? step1 : w.step === 2 ? step2 : w.step === 3 ? step3 : step4}
          </div>
        </div>
      </div>
      <div id="bar">{bar}</div>
    </div>
  );
}

function MotionEyebrow({ text }: { text: string }) {
  return <span className="eyebrow">{text}</span>;
}

function BarNextButton({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      className="btn btn--primary btn--lg bar__next"
      disabled={disabled}
      onClick={onClick}
    >
      <span>{label}</span>
      <IcChevronRight className="i" />
    </button>
  );
}

function OpeningScene({
  opening,
  model,
  onChange,
}: {
  opening: import('@/lib/doorCalculator').DoorOpening;
  model: import('@/lib/doorCalculator').DoorCatalogModel | null;
  onChange: (p: Partial<import('@/lib/doorCalculator').DoorOpening>) => void;
}) {
  const entry = opening.type === 'entry';
  const arch = opening.type === 'arch';
  const left = opening.side === 'left';
  const chip = (
    key: 'nalF' | 'nalB' | 'hinge' | 'handle' | 'lock' | 'zav' | 'sill',
    label: string,
    sub: string,
    on: boolean,
    style: CSSProperties
  ) => (
    <label className={`chip${on ? ' on' : ''}`} style={style}>
      <input
        type="checkbox"
        checked={on}
        onChange={(e) => onChange({ [key]: e.target.checked })}
      />
      <span className="chip__i">
        <IcCheck className="i" aria-hidden />
        <IcPlus className="i" aria-hidden />
      </span>
      <span className="chip__t">
        {label}
        {sub ? <small>{sub}</small> : null}
      </span>
    </label>
  );

  const L = 'left:124px;';
  const R = 'right:38px;';
  const hs = left ? L : R;
  const os2 = left ? 'right:78px;' : 'left:164px;';

  return (
    <div className="stagebox">
      <div className="stage">
        <MotionWrap>
          <DoorSceneSvg opening={opening} model={model} />
        </MotionWrap>
        {chip('nalF', 'Наличник', 'лицевой', opening.nalF, { position: 'absolute', ...css(L, 'top:112px') })}
        {chip('nalB', 'Наличник', 'обратный', opening.nalB, { position: 'absolute', ...css(R, 'top:112px') })}
        {!entry && !arch
          ? chip('hinge', 'Петли', '2 шт', opening.hinge, {
              position: 'absolute',
              ...css(left ? 'left:138px;' : 'right:52px;', 'top:166px'),
            })
          : null}
        {!entry && !arch
          ? chip('handle', 'Ручка', '', opening.handle, {
              position: 'absolute',
              ...css(os2, 'top:280px'),
            })
          : null}
        {!entry && !arch
          ? chip('lock', 'Замок', '', opening.lock, {
              position: 'absolute',
              ...css(os2, 'top:324px'),
            })
          : null}
        {!entry && !arch
          ? chip('zav', 'Завёртка', '', opening.zav, {
              position: 'absolute',
              ...css(os2, 'top:368px'),
            })
          : null}
        <label
          className={`chip${dobEff(opening) ? ' on' : ''}`}
          style={{
            position: 'absolute',
            ...css(hs, `top:${entry || arch ? 300 : 416}px`),
          }}
        >
          <input
            type="checkbox"
            checked={dobEff(opening)}
            onChange={(e) => onChange({ dobor: e.target.checked, depth: opening.depth })}
          />
          <span className="chip__i">
            <IcCheck className="i" aria-hidden />
            <IcPlus className="i" aria-hidden />
          </span>
          <span className="chip__t">
            Добор
            <small>{depthNote(opening)}</small>
          </span>
        </label>
        {!arch
          ? chip('sill', 'Порог', '', opening.sill, {
              position: 'absolute',
              left: '238px',
              transform: 'translateX(-50%)',
              top: '468px',
            })
          : null}
        <label className="hin hin--w">
          <span>Ширина, мм</span>
          <input
            type="number"
            inputMode="numeric"
            value={opening.w}
            placeholder="900"
            onChange={(e) => onChange({ w: e.target.value })}
          />
        </label>
        <label className="hin hin--h">
          <span>Высота</span>
          <input
            type="number"
            inputMode="numeric"
            value={opening.h}
            placeholder="2050"
            onChange={(e) => onChange({ h: e.target.value })}
          />
        </label>
        <label className="hin hin--d">
          <span>Глубина стены, мм</span>
          <input
            type="number"
            inputMode="numeric"
            value={opening.depth}
            placeholder="250"
            onChange={(e) => onChange({ depth: e.target.value, dobor: null })}
          />
        </label>
      </div>
    </div>
  );
}

function css(...parts: string[]) {
  const out: CSSProperties = {};
  parts.forEach((p) => {
    p.split(';').forEach((pair) => {
      const [k, v] = pair.split(':').map((s) => s.trim());
      if (k && v) (out as Record<string, string>)[k] = v;
    });
  });
  return out;
}

function MotionWrap({ children }: { children: ReactNode }) {
  return <div className="sv">{children}</div>;
}

function SumCell({
  row,
  prices,
  formatRub,
}: {
  row: import('@/lib/doorCalculator').CalcRow;
  prices: import('@/lib/doorCalculator').DoorPrices;
  formatRub: (n: number) => string;
}) {
  const p = priceOfRow(prices, row.pk);
  if (p == null) {
    return <span className="pill pill--warn">нет цены</span>;
  }
  return <>{formatRub(p * row.q)}</>;
}