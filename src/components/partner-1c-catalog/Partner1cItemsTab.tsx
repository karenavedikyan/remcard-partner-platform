"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import {
  BRANCH_IDS,
  BRANCH_SHORT,
  BRANCHES,
  FULL_SNAPSHOT,
  LOW_MARKUP,
  MARKS,
  MODEL_STATUS,
  SELLER_NAME,
  SORTS,
} from "@/lib/partner-1c-catalog/constants";
import {
  activeCount,
  apply,
  blank,
  chips,
  copy,
  parseSection,
  removeChip,
  options,
  sectionValue,
  skuLevel,
  summary,
} from "@/lib/partner-1c-catalog/lk";
import {
  branchPrice,
  branchRange,
  isLowMarkup,
  markup,
  mkPct,
  mkTone,
  modelIssues,
  modelStatus,
  presentIn,
  priceIn,
  stockOf,
  type PublicationState,
} from "@/lib/partner-1c-catalog/models";
import type { FilterState, ModelStatusCode, PartnerCatalogModel } from "@/lib/partner-1c-catalog/types";
import type { CatalogListUiAccess } from "@/lib/partner-1c-catalog/catalog-access";
import { num, plural, rub } from "@/lib/partner-1c-catalog/text";
import { Partner1cFilterPanel } from "./Partner1cFilterPanel";
import {
  PcIconEye,
  PcIconEyeOff,
  PcIconGrid,
  PcIconImageOff,
  PcIconList,
  PcIconMapPin,
  PcIconMaximize,
  PcIconMinimize,
  PcIconSliders,
  PcIconX,
} from "./Partner1cIcons";
import { StatusPill } from "./status";
import styles from "./Partner1cCatalog.module.css";
import { clonePublication } from "./publication";

export type ItemsUiState = {
  q: string;
  sectionPath: string;
  status: ModelStatusCode | "";
  branch: string;
  low: boolean;
  f: FilterState;
  selected: Set<string>;
  layout: "list" | "cards";
  full: boolean;
  showCost: boolean;
};

type Props = {
  models: PartnerCatalogModel[];
  publication: PublicationState;
  manage: boolean;
  priceType: string;
  access?: CatalogListUiAccess;
  ui: ItemsUiState;
  onUi: (next: ItemsUiState) => void;
  onPublication: (pub: PublicationState) => void;
  onOpenModel: (id: string) => void;
};

function filterState(ui: ItemsUiState): FilterState {
  const sec = parseSection(ui.sectionPath);
  return { ...ui.f, q: ui.q, ...sec };
}

function inScope(
  pub: PublicationState,
  ui: ItemsUiState,
  m: PartnerCatalogModel,
  manage: boolean,
): boolean {
  const st = modelStatus(pub, m);
  if (ui.status && st !== ui.status) return false;
  if (ui.branch !== "" && pub.branchOff.get(m.id)?.has(Number(ui.branch))) return false;
  if (ui.low && manage && !isLowMarkup(pub, m, ui.branch)) return false;
  return true;
}

function branchesText(n: number) {
  return n === BRANCHES.length ? `Все ${n}` : `${n} из ${BRANCHES.length}`;
}

export function Partner1cItemsTab({
  models: all,
  publication: pub,
  manage,
  priceType,
  access,
  ui,
  onUi,
  onPublication,
  onOpenModel,
}: Props) {
  const [panelOpen, setPanelOpen] = useState(false);
  const st = filterState(ui);
  const pool = useMemo(
    () => all.filter((m) => inScope(pub, ui, m, manage)).map((m) => m.item),
    [all, pub, ui, manage],
  );
  const byId = useMemo(() => new Map(all.map((m) => [m.id, m])), [all]);
  const found = useMemo(() => {
    return apply(
      all.map((m) => m.item),
      st,
    )
      .map((r) => ({ m: byId.get(r.item.id)!, matched: r.matched, item: r.item, index: r.index }))
      .filter((r) => r.m && inScope(pub, ui, r.m, manage));
  }, [all, st, byId, pub, ui, manage]);
  const summaryRows = useMemo(
    () => found.map(({ item, index, matched }) => ({ item, index, matched })),
    [found],
  );
  const list = found.map((r) => r.m);
  const opts = options(pool, st);
  const money = manage && ui.showCost;
  const showRetailPrices =
    !access?.publicationPricesBlocked &&
    access?.branchHint !== "pick-active-branch" &&
    (access?.showBranchRetailPrices !== false || ui.branch !== "");
  const partial = skuLevel(st);
  const active = activeCount(st);

  const setUi = (patch: Partial<ItemsUiState>) => onUi({ ...ui, ...patch });
  const setFilter = (f: FilterState) => {
    const sec = sectionValue(f);
    onUi({
      ...ui,
      sectionPath: sec,
      f: { ...copy(f), q: "", section: "", group: "" },
    });
  };

  const toggleHidden = (ids: string[], hide: boolean) => {
    const next = clonePublication(pub);
    ids.forEach((id) => {
      const m = byId.get(id);
      if (!m) return;
      if (modelIssues(m).length) return;
      if (hide) next.hidden.add(id);
      else next.hidden.delete(id);
    });
    onPublication(next);
    setUi({ selected: new Set() });
  };

  const count = (code: ModelStatusCode) => all.filter((m) => modelStatus(pub, m) === code).length;
  const attention = count("nophoto") + count("noprice");

  const chipList = [
    ui.q.trim() ? { id: "q", text: `Поиск: ${ui.q.trim()}` } : null,
    ...chips(st, "partner"),
    ui.status ? { id: "status", text: `Статус: ${MODEL_STATUS[ui.status]![0]}` } : null,
    ui.branch !== ""
      ? { id: "branch", text: `Филиал: ${BRANCH_SHORT[Number(ui.branch)]}` }
      : null,
    ui.low && manage ? { id: "low", text: `Наценка ниже ${LOW_MARKUP} %` } : null,
    st.sort
      ? {
          id: "sort",
          text: `Сортировка: ${(SORTS.find((x) => x[0] === st.sort)?.[1] ?? st.sort).toLowerCase()}`,
        }
      : null,
  ].filter(Boolean) as { id: string; text: string }[];

  const quick = [
    ...MARKS.map(([code, , short]) => ({
      id: `marks:${code}`,
      text: short === "Хит" ? "Хит продаж" : short,
      on: st.marks.includes(code),
      n: opts.marks.find((x) => x.value === code)?.count ?? 0,
    })),
    {
      id: "avail:in",
      text: "В наличии",
      on: st.avail.includes("in"),
      n: opts.avail.find((x) => x.value === "in")?.count ?? 0,
    },
    manage
      ? {
          id: "low",
          text: `Наценка ниже ${LOW_MARKUP} %`,
          on: ui.low,
          n: list.filter((m) => isLowMarkup(pub, m, ui.branch)).length,
        }
      : null,
  ].filter(Boolean) as { id: string; text: string; on: boolean; n: number }[];

  const picked = list.filter((m) => ui.selected.has(m.id));
  const allPicked = list.length > 0 && picked.length === list.length;
  const canHide = picked.filter((m) => modelStatus(pub, m) === "live").length;
  const canShow = picked.filter((m) => modelStatus(pub, m) === "hidden").length;

  const priced = all.filter((m) => m.price != null && m.cost != null);
  const avg =
    priced.length && money
      ? {
          pct: Math.round(
            priced.reduce((a, m) => a + (markup(m.price, m.cost)?.pct ?? 0), 0) / priced.length,
          ),
          rub: Math.round(
            priced.reduce((a, m) => a + ((m.price ?? 0) - (m.cost ?? 0)), 0) / priced.length,
          ),
        }
      : null;

  const variantsNote = (m: PartnerCatalogModel) => {
    const fit = found.find((r) => r.m.id === m.id)?.matched.length ?? m.skus.length;
    if (partial && fit < m.skus.length) {
      return `подходит ${fit} из ${m.skus.length}`;
    }
    return `${m.skus.length} ${plural(m.skus.length, "вариант", "варианта", "вариантов")}`;
  };

  return (
  <div className={styles.catalogScope}>
      {access?.branchHint === "pick-active-branch" ? (
        <p className="notice" role="status" data-testid="pc-branch-hint">
          Выберите рабочий филиал в шапке кабинета, чтобы видеть цены по точке. Это не отказ в доступе к
          каталогу.
        </p>
      ) : null}
      <div className={`stats pc-stats ${money && avg ? "pc-stats--4" : ""}`}>
        <div className="stat" data-testid="pc-stat-models">
          <span className="small">Моделей из 1С</span>
          <strong>{all.length}</strong>
          <small>
            {all.reduce((a, m) => a + m.skus.length, 0)} вариантов · демо-выборка
          </small>
        </div>
        <div className="stat">
          <span className="small">На сайте remcard.ru</span>
          <strong>{count("live")}</strong>
          <small>видят клиенты</small>
        </div>
        <div className="stat">
          <span className="small">Требуют внимания</span>
          <strong>{attention}</strong>
          <small>
            {attention ? "нет фото или цены — на сайт не выходят" : "всё в порядке"}
          </small>
        </div>
        {money && avg ? (
          <div className="stat" data-testid="pc-stat-markup">
            <span className="small">Средняя наценка</span>
            <strong>{avg.pct} %</strong>
            <small>
              в среднем {avg.rub >= 0 ? "+" : "−"}
              {num(Math.abs(avg.rub))} ₽ с единицы · видно только вам
            </small>
          </div>
        ) : null}
      </div>

      {ui.full ? (
        <div className="pc-full-title">
          <strong>Товары из 1С</strong>
          <span>
            «{SELLER_NAME}» · на сайте {count("live")} из {all.length}
          </span>
        </div>
      ) : null}

      <div className="panel pc-filters">
        <label className="field pc-search">
          <span className="pc-flabel">Поиск</span>
          <input
            type="search"
            data-testid="pc-search"
            maxLength={160}
            placeholder="Модель, цвет или артикул"
            value={ui.q}
            onChange={(e) => setUi({ q: e.target.value })}
          />
        </label>
        <label className="field">
          <span className="pc-flabel">Раздел</span>
          <select
            data-testid="pc-section-filter"
            value={ui.sectionPath}
            onChange={(e) => {
              const f = copy(st);
              Object.assign(f, parseSection(e.target.value));
              setFilter(f);
            }}
          >
            <option value="">Все разделы</option>
            {opts.sections.map((s) => (
              <optgroup key={s.name} label={s.name}>
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
        <label className="field">
          <span className="pc-flabel">Статус</span>
          <select
            data-testid="pc-status-filter"
            value={ui.status}
            onChange={(e) => setUi({ status: e.target.value as ItemsUiState["status"] })}
          >
            <option value="">Все статусы</option>
            {(Object.keys(MODEL_STATUS) as ModelStatusCode[]).map((code) => (
              <option key={code} value={code}>
                {MODEL_STATUS[code]![0]}
              </option>
            ))}
          </select>
        </label>
        {manage ? (
          <label className="field">
            <span className="pc-flabel">Филиал</span>
            <select
              data-testid="pc-branch-filter"
              value={ui.branch}
              onChange={(e) => setUi({ branch: e.target.value })}
            >
              <option value="">Все филиалы</option>
              {BRANCH_IDS.map((i) => (
                <option key={i} value={String(i)}>
                  {BRANCH_SHORT[i]}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <button
          type="button"
          className={`btn pc-filter-btn ${active ? "is-on" : ""} ${panelOpen ? "is-open" : ""}`}
          data-testid="pc-filters-open"
          aria-expanded={panelOpen}
          onClick={() => setPanelOpen((v) => !v)}
        >
          <PcIconSliders />
          <span>{panelOpen ? "Скрыть фильтры" : "Все фильтры"}</span>
          {active ? <em>{active}</em> : null}
        </button>
      </div>

      <Partner1cFilterPanel
        open={panelOpen}
        list={pool}
        state={st}
        audience="partner"
        priceType={priceType}
        onChange={(next) => setFilter(next)}
        onClose={() => setPanelOpen(false)}
      />

      <div className="pc-quick" data-testid="pc-quick" role="group" aria-label="Быстрый отбор">
        {quick.map((x) => (
          <button
            key={x.id}
            type="button"
            className={x.on ? "selected" : ""}
            data-testid={`pc-quick-${x.id.replace(":", "-")}`}
            aria-pressed={x.on}
            disabled={!x.n && !x.on}
            onClick={() => {
              if (x.id === "low") setUi({ low: !ui.low });
              else if (x.id.startsWith("marks:")) {
                const code = x.id.split(":")[1]!;
                const f = copy(st);
                f.marks = f.marks.includes(code)
                  ? f.marks.filter((m) => m !== code)
                  : [...f.marks, code];
                setFilter(f);
              } else if (x.id === "avail:in") {
                const f = copy(st);
                f.avail = f.avail.includes("in") ? f.avail.filter((v) => v !== "in") : [...f.avail, "in"];
                setFilter(f);
              }
            }}
          >
            {x.text}
            <em>{x.n}</em>
          </button>
        ))}
        <span className="pc-quick-note">Свойства и отметки приходят из 1С</span>
      </div>

      {chipList.length ? (
        <div className="pc-found" data-testid="pc-found">
          <span className="pc-found-n">Найдено: {summary(summaryRows).text}</span>
          <div className="pc-fchips">
            {chipList.map((c) => (
              <button
                key={c.id}
                type="button"
                aria-label={`Убрать условие: ${c.text}`}
                onClick={() => {
                  if (c.id === "q") setUi({ q: "" });
                  else if (c.id === "status") setUi({ status: "" });
                  else if (c.id === "branch") setUi({ branch: "" });
                  else if (c.id === "low") setUi({ low: false });
                  else if (c.id === "sort") setFilter({ ...copy(st), sort: "" });
                  else setFilter(removeChip(st, c.id));
                }}
              >
                {c.text}
                <PcIconX />
              </button>
            ))}
          </div>
          <button
            type="button"
            className="linkbtn"
            data-testid="pc-reset"
            onClick={() => {
              setUi({
                q: "",
                sectionPath: "",
                status: "",
                branch: "",
                low: false,
                f: blank(),
              });
            }}
          >
            Сбросить фильтры
          </button>
        </div>
      ) : null}

      <div className={`pc-toolbar ${picked.length ? "is-bulk" : ""}`} data-testid="pc-toolbar">
        <label className="pc-pick pc-pick--all">
          <input
            type="checkbox"
            data-testid="pc-select-all"
            checked={allPicked}
            disabled={!list.length}
            ref={(el) => {
              if (el) el.indeterminate = picked.length > 0 && !allPicked;
            }}
            onChange={() => {
              setUi({
                selected:
                  list.length && list.every((m) => ui.selected.has(m.id))
                    ? new Set()
                    : new Set(list.map((m) => m.id)),
              });
            }}
          />
          <span>
            {picked.length
              ? `Выбрано ${picked.length} из ${list.length}`
              : `Выбрать все · ${list.length} ${plural(list.length, "модель", "модели", "моделей")}`}
          </span>
        </label>
        {picked.length ? (
          <div className="pc-bulk" data-testid="pc-bulk-bar">
            <button
              type="button"
              className="btn pc-btn-sm"
              data-testid="pc-bulk-hide"
              disabled={!canHide}
              onClick={() => toggleHidden(picked.map((m) => m.id), true)}
            >
              <PcIconEyeOff /> Скрыть с сайта{canHide ? ` · ${canHide}` : ""}
            </button>
            <button
              type="button"
              className="btn pc-btn-sm"
              data-testid="pc-bulk-show"
              disabled={!canShow}
              onClick={() => toggleHidden(picked.map((m) => m.id), false)}
            >
              <PcIconEye /> Показать на сайте{canShow ? ` · ${canShow}` : ""}
            </button>
            <button
              type="button"
              className="linkbtn pc-bulk-clear"
              data-testid="pc-bulk-clear"
              onClick={() => setUi({ selected: new Set() })}
            >
              Снять выбор
            </button>
          </div>
        ) : null}
        <div className="pc-view">
          {manage ? (
            <button
              type="button"
              className={`btn pc-btn-sm pc-cost-btn ${ui.showCost ? "is-on" : ""}`}
              data-testid="pc-cost-toggle"
              aria-pressed={ui.showCost}
              onClick={() => setUi({ showCost: !ui.showCost, low: ui.showCost ? false : ui.low })}
            >
              {ui.showCost ? <PcIconEye /> : <PcIconEyeOff />}
              <span>Закупка и наценка</span>
            </button>
          ) : null}
          <div className="pc-seg" role="group" aria-label="Вид списка">
            <button
              type="button"
              className={ui.layout === "list" ? "selected" : ""}
              data-testid="pc-layout-list"
              aria-pressed={ui.layout === "list"}
              onClick={() => setUi({ layout: "list" })}
            >
              <PcIconList />
              <span>Список</span>
            </button>
            <button
              type="button"
              className={ui.layout === "cards" ? "selected" : ""}
              data-testid="pc-layout-cards"
              aria-pressed={ui.layout === "cards"}
              onClick={() => setUi({ layout: "cards" })}
            >
              <PcIconGrid />
              <span>Карточки</span>
            </button>
          </div>
          <button
            type="button"
            className="btn pc-btn-sm pc-full-btn"
            data-testid="pc-fullscreen"
            aria-pressed={ui.full}
            onClick={() => setUi({ full: !ui.full })}
          >
            {ui.full ? <PcIconMinimize /> : <PcIconMaximize />}
            <span>{ui.full ? "Свернуть" : "На весь экран"}</span>
          </button>
        </div>
      </div>

      {!list.length ? (
        <div className="panel empty" data-testid="pc-empty">
          <h3>Ничего не найдено</h3>
          <p className="muted">Проверьте написание модели или снимите часть фильтров.</p>
          <button
            type="button"
            className="btn"
            onClick={() =>
              setUi({ q: "", sectionPath: "", status: "", branch: "", low: false, f: blank() })
            }
          >
            Сбросить фильтры
          </button>
        </div>
      ) : ui.layout === "cards" ? (
        <section className="pc-cards" aria-label="Товары каталога">
          {list.map((m) => {
            const code = modelStatus(pub, m);
            const stock = stockOf(m);
            const mk =
              money && showRetailPrices ? markup(priceIn(pub, m, ui.branch), m.cost) : null;
            const n = presentIn(pub, m).length;
            return (
              <article
                key={m.id}
                className={`pc-card ${ui.selected.has(m.id) ? "is-picked" : ""}`}
                data-testid={`pc-model-${m.id}`}
              >
                <label className="pc-pick">
                  <input
                    type="checkbox"
                    data-testid={`pc-select-${m.id}`}
                    checked={ui.selected.has(m.id)}
                    onChange={() => {
                      const sel = new Set(ui.selected);
                      if (sel.has(m.id)) sel.delete(m.id);
                      else sel.add(m.id);
                      setUi({ selected: sel });
                    }}
                  />
                </label>
                <button
                  type="button"
                  className="pc-card-photo"
                  onClick={() => onOpenModel(m.id)}
                >
                  {m.imgs[0] ? (
                    <Image src={m.imgs[0]} alt="" width={200} height={260} unoptimized />
                  ) : (
                    <span className="pc-card-nophoto">
                      <PcIconImageOff />
                      Фото из 1С не пришло
                    </span>
                  )}
                </button>
                <div className="pc-card-body">
                  <button type="button" className="pc-card-title" onClick={() => onOpenModel(m.id)}>
                    <strong>{m.name}</strong>
                    <small>
                      {m.variant} · {variantsNote(m)}
                    </small>
                  </button>
                  <div className="pc-card-nums">
                    {m.price == null || !showRetailPrices ? (
                      <span className="muted">{m.price == null ? "не задана" : "—"}</span>
                    ) : (
                      <strong>{rub(priceIn(pub, m, ui.branch)!)}</strong>
                    )}
                    <span>{stock.text}</span>
                  </div>
                  {money && m.price != null ? (
                    <div className="pc-card-mk">
                      {m.cost != null ? (
                        <>
                          <span>закупка {rub(m.cost)}</span>
                          {mk ? (
                            <b className={`pc-mk pc-mk--${mkTone(mk)}`}>{mkPct(mk)}</b>
                          ) : null}
                        </>
                      ) : (
                        <span>закупки нет в 1С</span>
                      )}
                    </div>
                  ) : null}
                  {manage ? (
                    <div className="pc-card-br">
                      <PcIconMapPin />
                      {n === BRANCHES.length ? "во всех филиалах" : `в ${n} из ${BRANCHES.length} филиалов`}
                    </div>
                  ) : null}
                  <div className="pc-card-foot">
                    <StatusPill code={code} />
                    <RowAction pub={pub} m={m} onOpen={onOpenModel} onToggle={toggleHidden} />
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      ) : (
        <section
          className={`pc-list ${money ? "pc-list--money" : ""} ${!manage ? "pc-list--staff" : ""}`}
          data-testid="pc-list"
          aria-label="Товары каталога"
        >
          <div className="pc-row pc-row--head" aria-hidden>
            <span />
            <span>Модель</span>
            <span>Цена{money ? " · закупка" : ""}</span>
            {money ? <span className="pc-cell--mk">Наценка</span> : null}
            <span className="pc-cell--stock">Остаток</span>
            {manage ? <span className="pc-cell--br">Филиалы</span> : null}
            <span className="pc-cell--status">Статус</span>
            <span />
          </div>
          {list.map((m) => (
            <ModelRow
              key={m.id}
              m={m}
              pub={pub}
              ui={ui}
              money={money}
              manage={manage}
              showRetailPrices={showRetailPrices}
              branch={ui.branch}
              note={variantsNote(m)}
              selected={ui.selected.has(m.id)}
              onSelect={(on) => {
                const sel = new Set(ui.selected);
                if (on) sel.add(m.id);
                else sel.delete(m.id);
                setUi({ selected: sel });
              }}
              onOpen={() => onOpenModel(m.id)}
              onToggle={() => toggleHidden([m.id], modelStatus(pub, m) === "live")}
            />
          ))}
        </section>
      )}

      <p className="small pc-foot">
        Название, цена и остаток приходят из 1С и меняются только там.{" "}
        {manage
          ? "Здесь вы решаете, показывать ли товар на сайте, в каких филиалах он представлен и по какой цене. Закупочная цена и наценка видны только вам: на сайт и клиентам они не попадают."
          : "Здесь вы решаете, показывать ли товар на сайте. Филиалы и цены по филиалам настраивает владелец."}
        {" "}
        Пример: выборка из {num(FULL_SNAPSHOT.positions)} позиций (демо).
      </p>
    </div>
  );
}

function RowAction({
  pub,
  m,
  onOpen,
  onToggle,
}: {
  pub: PublicationState;
  m: PartnerCatalogModel;
  onOpen: (id: string) => void;
  onToggle: (ids: string[], hide: boolean) => void;
}) {
  const code = modelStatus(pub, m);
  if (code === "live" || code === "hidden") {
    return (
      <button
        type="button"
        className="btn pc-btn-sm"
        onClick={() => onToggle([m.id], code === "live")}
      >
        {code === "live" ? "Скрыть" : "Показать"}
      </button>
    );
  }
  return (
    <button type="button" className="btn pc-btn-sm" onClick={() => onOpen(m.id)}>
      Что исправить
    </button>
  );
}

function ModelRow({
  m,
  pub,
  ui,
  money,
  manage,
  showRetailPrices,
  branch,
  note,
  selected,
  onSelect,
  onOpen,
  onToggle,
}: {
  m: PartnerCatalogModel;
  pub: PublicationState;
  ui: ItemsUiState;
  money: boolean;
  manage: boolean;
  showRetailPrices: boolean;
  branch: string;
  note: string;
  selected: boolean;
  onSelect: (on: boolean) => void;
  onOpen: () => void;
  onToggle: () => void;
}) {
  const code = modelStatus(pub, m);
  const stock = stockOf(m);
  const p = showRetailPrices ? priceIn(pub, m, branch) : null;
  const range = showRetailPrices && branch === "" ? branchRange(pub, m) : null;
  const mk = money ? markup(p, m.cost) : null;
  const n = presentIn(pub, m).length;

  return (
    <article className={`pc-row ${selected ? "is-picked" : ""}`} data-testid={`pc-model-${m.id}`}>
      <label className="pc-pick">
        <input
          type="checkbox"
          data-testid={`pc-select-${m.id}`}
          checked={selected}
          onChange={(e) => onSelect(e.target.checked)}
        />
      </label>
      <button type="button" className="pc-row-main" onClick={onOpen}>
        {m.imgs[0] ? (
          <Image className="pc-thumb" src={m.imgs[0]} alt="" width={44} height={60} unoptimized />
        ) : (
          <span className="pc-thumb pc-thumb--none">
            <PcIconImageOff />
          </span>
        )}
        <span className="pc-row-title">
          <strong>{m.name}</strong>
          <small>{m.variant}</small>
          <small className="pc-row-var">{note}</small>
          {code !== "live" ? <small className="pc-row-flag">{MODEL_STATUS[code]![0]}</small> : null}
        </span>
      </button>
      <span className="pc-cell pc-cell--price" data-label="Цена">
        {m.price == null || !showRetailPrices ? (
          <span className="muted">{m.price == null ? "не задана" : "—"}</span>
        ) : (
          <>
            <strong>{rub(p!)}</strong>
            {money ? (
              <small>
                {m.cost == null ? "закупки нет в 1С" : `закупка ${rub(m.cost)}`}
              </small>
            ) : null}
            {range ? (
              <small className="pc-brnote">
                в филиалах {num(range.lo)}–{num(range.hi)} ₽
              </small>
            ) : null}
          </>
        )}
      </span>
      {money ? (
        <span className="pc-cell pc-cell--mk" data-label="Наценка">
          {mk ? (
            <>
              <strong className={`pc-mk pc-mk--${mkTone(mk)}`}>{mkPct(mk)}</strong>
            </>
          ) : (
            <span className="muted">—</span>
          )}
        </span>
      ) : null}
      <span className="pc-cell pc-cell--stock" data-label="Остаток">
        <span>{stock.text}</span>
        <small className="pc-stock-sub">{stock.sub}</small>
      </span>
      {manage ? (
        <span className="pc-cell pc-cell--br" data-label="Филиалы">
          {branchesText(n)}
        </span>
      ) : null}
      <span className="pc-cell pc-cell--status">
        <StatusPill code={code} />
      </span>
      <span className="pc-cell pc-cell--act">
        {code === "live" || code === "hidden" ? (
          <button type="button" className="btn pc-btn-sm" onClick={onToggle}>
            {code === "live" ? "Скрыть" : "Показать"}
          </button>
        ) : (
          <button type="button" className="btn pc-btn-sm" onClick={onOpen}>
            Что исправить
          </button>
        )}
      </span>
    </article>
  );
}