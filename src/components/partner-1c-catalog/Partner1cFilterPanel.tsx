"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FACETS,
  SORTS,
} from "@/lib/partner-1c-catalog/constants";
import {
  activeCount,
  apply,
  copy,
  parseSection,
  prune,
  options,
  sectionValue,
  type FilterState,
} from "@/lib/partner-1c-catalog/lk";
import type { CatalogAudience, CatalogItem } from "@/lib/partner-1c-catalog/types";
import { num, plural } from "@/lib/partner-1c-catalog/text";
import { PcIconX } from "./Partner1cIcons";
import styles from "./Partner1cCatalog.module.css";

type Props = {
  open: boolean;
  list: CatalogItem[];
  state: FilterState;
  audience: CatalogAudience;
  priceType: string;
  title?: string;
  sub?: string;
  onChange: (next: FilterState) => void;
  onClose: () => void;
};

const LONG = 8;
const SHORT = 6;

function parsePrice(v: string) {
  const n = parseInt(String(v).replace(/[^\d]/g, ""), 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function availLabel(code: string, audience: CatalogAudience) {
  const map: Record<string, [string, string]> = {
    in: ["Есть остаток", "В наличии"],
    zero: ["Нулевой остаток", "Скоро поступит"],
    unknown: ["Остаток не определён", "Под заказ"],
  };
  const row = map[code];
  return row ? row[audience === "client" ? 1 : 0] : code;
}

function markLabel(code: string) {
  const map: Record<string, string> = { hit: "Хит продаж", new: "Новинка", sale: "Акция" };
  return map[code] || code;
}

function facetLabel(key: string, audience: CatalogAudience) {
  const f = FACETS.find((x) => x.key === key);
  return !f ? key : audience === "client" ? f.buyer : f.key;
}

export function Partner1cFilterPanel({
  open,
  list,
  state,
  audience,
  priceType,
  title = "Фильтр",
  sub = "Данные из 1С · список обновляется сразу",
  onChange,
  onClose,
}: Props) {
  const [find, setFind] = useState("");
  const [more, setMore] = useState<Set<string>>(() => new Set());
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => new Set(["section", "price", "avail"]));

  const o = useMemo(() => options(list, state), [list, state]);
  const client = audience === "client";

  const priceText = useMemo(() => {
    const lo = parsePrice(state.min);
    const hi = parsePrice(state.max);
    if (lo == null && hi == null) return "";
    return `${lo != null ? `от ${num(lo)}` : ""}${lo != null && hi != null ? " " : ""}${hi != null ? `до ${num(hi)}` : ""} ₽`;
  }, [state.min, state.max]);

  const push = useCallback(
    (next: FilterState) => {
      onChange(prune(list, next));
    },
    [list, onChange],
  );

  const toggleArr = (field: "brand" | "avail" | "marks", value: string) => {
    const next = copy(state);
    next[field] = next[field].includes(value)
      ? next[field].filter((x) => x !== value)
      : [...next[field], value];
    push(next);
  };

  const toggleFacet = (key: string, value: string) => {
    const next = copy(state);
    const left = next.facets[key] || [];
    const toggled = left.includes(value) ? left.filter((x) => x !== value) : [...left, value];
    if (toggled.length) next.facets[key] = toggled;
    else delete next.facets[key];
    push(next);
  };

  const onSection = (value: string) => {
    const next = copy(state);
    Object.assign(next, parseSection(value));
    push(next);
  };

  const onReset = () => {
    const next = copy({ ...state, section: "", group: "", brand: [], min: "", max: "", avail: [], marks: [], facets: {} });
    push(next);
    setFind("");
  };

  const matchFind = (text: string) =>
    !find.trim() ||
    text
      .toLocaleLowerCase("ru")
      .replace(/ё/g, "е")
      .includes(find.toLocaleLowerCase("ru").replace(/ё/g, "е").trim());

  const nModels = apply(list, state).length;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (open) {
      document.documentElement.classList.add("pc-fpanel-open");
    } else {
      document.documentElement.classList.remove("pc-fpanel-open");
    }
    return () => document.documentElement.classList.remove("pc-fpanel-open");
  }, [open]);

  if (!open) return null;

  const renderChecks = (
    id: string,
    items: { value: string; count: number; label: string; on: boolean }[],
  ) => {
    const shown = find.trim()
      ? items.filter((x) => matchFind(x.label))
      : more.has(id)
        ? items
        : items.filter((x, i) => i < SHORT || x.on);
    const rest = items.length - shown.length;
    return (
      <>
        {shown.map((item) => (
          <label
            key={item.value}
            className={`lkf-check ${item.on ? "is-on" : ""} ${!item.count && !item.on ? "is-empty" : ""}`}
          >
            <input
              type="checkbox"
              checked={item.on}
              onChange={() => {
                if (id === "brand") toggleArr("brand", item.value);
                else if (id === "avail") toggleArr("avail", item.value);
                else if (id === "marks") toggleArr("marks", item.value);
              }}
            />
            <span>{item.label}</span>
            <small>{item.count}</small>
          </label>
        ))}
        {rest > 0 ? (
          <button type="button" className="lkf-more" onClick={() => setMore((s) => new Set(s).add(id))}>
            Показать ещё {rest}
          </button>
        ) : null}
      </>
    );
  };

  return (
    <aside className="pc-fpanel" data-testid="pc-filter-panel" aria-labelledby="lkf-title">
      <div className="pc-fpanel__back" onClick={onClose} role="presentation" />
      <div className={`pc-fpanel__box lkf ${styles.catalogScope}`} data-testid="lkf-form">
        <div className="lkf-head">
          <div>
            <h3 id="lkf-title">{title}</h3>
            {sub ? <p>{sub}</p> : null}
          </div>
          <button
            type="button"
            className="lkf-close"
            data-testid="lkf-close"
            aria-label="Закрыть фильтры"
            onClick={onClose}
          >
            <PcIconX />
          </button>
        </div>
        <label className="lkf-find">
          <input
            type="search"
            data-testid="lkf-find"
            maxLength={60}
            placeholder={
              client ? "Найти характеристику или значение" : "Найти свойство или значение"
            }
            aria-label="Поиск по фильтру"
            value={find}
            onChange={(e) => setFind(e.target.value)}
          />
        </label>
        <div className="lkf-body">
          <details
            className={`lkf-g ${state.section || state.brand.length ? "is-on" : ""}`}
            open={openGroups.has("section")}
            onToggle={(e) => {
              const el = e.currentTarget;
              setOpenGroups((s) => {
                const n = new Set(s);
                if (el.open) n.add("section");
                else n.delete("section");
                return n;
              });
            }}
          >
            <summary>
              <span className="lkf-gt">
                <b>Раздел и бренд</b>
                <small>
                  {[state.section ? (state.group ? `${state.section} · ${state.group}` : state.section) : "", ...state.brand]
                    .filter(Boolean)
                    .join(", ")}
                </small>
              </span>
              {state.section || state.brand.length ? (
                <em>{(state.section ? 1 : 0) + state.brand.length}</em>
              ) : null}
            </summary>
            <div className="lkf-gb">
              <label className="lkf-field">
                <span>Раздел</span>
                <select
                  value={sectionValue(state)}
                  onChange={(e) => onSection(e.target.value)}
                  data-lkf="section"
                >
                  <option value="">Все разделы</option>
                  {o.sections.map((s) => (
                    <optgroup key={s.name} label={`${s.name} · ${s.count}`}>
                      <option value={s.name}>{`${s.name} · ${s.count}`}</option>
                      {s.groups.map((g) => (
                        <option key={g.name} value={`${s.name}/${g.name}`}>
                          {`— ${g.name} · ${g.count}`}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </label>
              {o.brands.length ? (
                <>
                  <div className="lkf-sub">Бренд</div>
                  {renderChecks(
                    "brand",
                    o.brands.map((b) => ({
                      value: b.value,
                      count: b.count,
                      label: b.value,
                      on: state.brand.includes(b.value),
                    })),
                  )}
                </>
              ) : null}
            </div>
          </details>

          {o.price ? (
            <details className={`lkf-g ${priceText ? "is-on" : ""}`} open>
              <summary>
                <span className="lkf-gt">
                  <b>Цена</b>
                  <small>{priceText}</small>
                </span>
                {priceText ? <em>1</em> : null}
              </summary>
              <div className="lkf-gb">
                <div className="lkf-range">
                  <label>
                    <span>от, ₽</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      data-lkf="min"
                      value={state.min}
                      placeholder={num(o.price.lo)}
                      aria-label="Цена от"
                      onChange={(e) => push({ ...copy(state), min: e.target.value.replace(/[^\d]/g, "").slice(0, 9) })}
                    />
                  </label>
                  <i aria-hidden>—</i>
                  <label>
                    <span>до, ₽</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      data-lkf="max"
                      value={state.max}
                      placeholder={num(o.price.hi)}
                      aria-label="Цена до"
                      onChange={(e) => push({ ...copy(state), max: e.target.value.replace(/[^\d]/g, "").slice(0, 9) })}
                    />
                  </label>
                </div>
                <p className="lkf-note">
                  {client
                    ? "Цена продавца на сайте."
                    : `Тип цены для сайта: «${priceType}». Внутренние типы цен в фильтре не участвуют.`}
                </p>
              </div>
            </details>
          ) : null}

          {o.avail.length ? (
            <details className={`lkf-g ${state.avail.length ? "is-on" : ""}`} open>
              <summary>
                <span className="lkf-gt">
                  <b>{client ? "Наличие" : "Наличие на складах"}</b>
                  <small>{state.avail.map((v) => availLabel(v, audience)).join(", ")}</small>
                </span>
                {state.avail.length ? <em>{state.avail.length}</em> : null}
              </summary>
              <div className="lkf-gb">
                {renderChecks(
                  "avail",
                  o.avail.map((a) => ({
                    value: a.value,
                    count: a.count,
                    label: availLabel(a.value, audience),
                    on: state.avail.includes(a.value),
                  })),
                )}
                <p className="lkf-note">
                  {client
                    ? "«Под заказ» — остаток у продавца не указан, наличие уточняется по заявке."
                    : "Неизвестный остаток — не ноль: такие варианты на сайте показываются как «Под заказ»."}
                </p>
              </div>
            </details>
          ) : null}

          {o.marks.length ? (
            <details className={`lkf-g ${state.marks.length ? "is-on" : ""}`}>
              <summary>
                <span className="lkf-gt">
                  <b>Отметки</b>
                  <small>{state.marks.map(markLabel).join(", ")}</small>
                </span>
                {state.marks.length ? <em>{state.marks.length}</em> : null}
              </summary>
              <div className="lkf-gb">
                {renderChecks(
                  "marks",
                  o.marks.map((m) => ({
                    value: m.value,
                    count: m.count,
                    label: markLabel(m.value),
                    on: state.marks.includes(m.value),
                  })),
                )}
              </div>
            </details>
          ) : null}

          <details className="lkf-g">
            <summary>
              <span className="lkf-gt">
                <b>Сортировка</b>
                <small>
                  {state.sort
                    ? (SORTS.find((x) => x[0] === state.sort) || [])[client ? 2 : 1]
                    : ""}
                </small>
              </span>
            </summary>
            <div className="lkf-gb">
              <label className="lkf-field">
                <span>Порядок в списке</span>
                <select
                  value={state.sort}
                  onChange={(e) => push({ ...copy(state), sort: e.target.value })}
                  data-lkf="sort"
                >
                  {SORTS.map(([code, lk, buyer]) => (
                    <option key={code || "default"} value={code}>
                      {client ? buyer : lk}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </details>

          {o.facets.length ? (
            <>
              <div className="lkf-divider">
                <span>{client ? "Характеристики" : "Свойства из 1С"}</span>
                <small>
                  {o.facets.length}{" "}
                  {plural(o.facets.length, "свойство", "свойства", "свойств")} в этом разделе
                </small>
              </div>
              {o.facets.map((f) => {
                const sel = state.facets[f.key] || [];
                return (
                  <details key={f.key} className={`lkf-g ${sel.length ? "is-on" : ""}`}>
                    <summary>
                      <span className="lkf-gt">
                        <b>{facetLabel(f.key, audience)}</b>
                        <small>{sel.join(", ")}</small>
                      </span>
                      {sel.length ? <em>{sel.length}</em> : null}
                    </summary>
                    <div className="lkf-gb">
                      {f.values.map((v) => (
                        <label
                          key={v.value}
                          className={`lkf-check ${sel.includes(v.value) ? "is-on" : ""} ${!v.count && !sel.includes(v.value) ? "is-empty" : ""}`}
                        >
                          <input
                            type="checkbox"
                            checked={sel.includes(v.value)}
                            onChange={() => toggleFacet(f.key, v.value)}
                          />
                          <span>{v.value}</span>
                          <small>{v.count}</small>
                        </label>
                      ))}
                    </div>
                  </details>
                );
              })}
            </>
          ) : null}
        </div>
        <div className="lkf-foot">
          <button
            type="button"
            className="lkf-reset"
            data-testid="lkf-reset"
            disabled={!activeCount(state) && !state.sort}
            onClick={onReset}
          >
            Сбросить
          </button>
          <button type="button" className="lkf-apply" data-testid="lkf-apply" onClick={onClose}>
            {nModels
              ? `Показать ${nModels} ${plural(nModels, "модель", "модели", "моделей")}`
              : "Ничего не найдено"}
          </button>
        </div>
      </div>
    </aside>
  );
}