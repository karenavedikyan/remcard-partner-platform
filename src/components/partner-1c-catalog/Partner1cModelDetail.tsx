"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  BRANCHES,
  BRANCH_IDS,
  DISCOUNTS,
} from "@/lib/partner-1c-catalog/constants";
import {
  branchPrice,
  markup,
  mkPct,
  mkTone,
  modelIssues,
  modelStatus,
  presentIn,
  rulePrice,
  stockOf,
  type PublicationState,
} from "@/lib/partner-1c-catalog/models";
import { blank, matched, modelProps } from "@/lib/partner-1c-catalog/lk";
import type { FilterState, PartnerCatalogModel } from "@/lib/partner-1c-catalog/types";
import { num, plural, rub } from "@/lib/partner-1c-catalog/text";
import {
  PcIconAlert,
  PcIconArrowLeft,
  PcIconEye,
  PcIconEyeOff,
  PcIconExternal,
  PcIconLock,
} from "./Partner1cIcons";
import { StatusPill } from "./status";
import styles from "./Partner1cCatalog.module.css";
import { clonePublication } from "./publication";

type Props = {
  model: PartnerCatalogModel;
  publication: PublicationState;
  manage: boolean;
  showCost: boolean;
  priceType: string;
  filter: FilterState;
  onBack: () => void;
  onPublication: (pub: PublicationState) => void;
  onToggleHidden: () => void;
};

function skuCost(m: PartnerCatalogModel, price: number | null) {
  if (m.cost == null || price == null || !m.price) return null;
  return Math.round(((price * m.cost) / m.price / 10)) * 10;
}

function signed(n: number) {
  return `${n < 0 ? "−" : "+"}${num(Math.abs(n))}`;
}

export function Partner1cModelDetail({
  model: m,
  publication: pub,
  manage,
  showCost,
  priceType,
  filter,
  onBack,
  onPublication,
  onToggleHidden,
}: Props) {
  const [shot, setShot] = useState(0);
  const st = modelStatus(pub, m);
  const issues = modelIssues(m);
  const money = manage && showCost;
  const mk = m.price != null && m.cost != null ? markup(m.price, m.cost) : null;
  const onBranches = presentIn(pub, m);

  const fitKeys = useMemo(
    () => new Set(matched(m.item, filter).map((k) => k.key)),
    [m, filter],
  );
  const partial =
    filter.q.trim() !== "" ||
    filter.min !== "" ||
    filter.max !== "" ||
    filter.avail.length > 0 ||
    Object.keys(filter.facets).length > 0;

  const issueText = {
    nophoto:
      "В 1С к позиции не прикреплено фото. Добавьте фото в карточку номенклатуры — после следующего обмена товар можно будет опубликовать.",
    noprice: `В 1С не задана цена типа «${priceType}». Установите цену — после следующего обмена товар можно будет опубликовать.`,
  };

  const setBranchOn = (i: number, on: boolean) => {
    const next = clonePublication(pub);
    const off = new Set(next.branchOff.get(m.id) || []);
    if (on) off.delete(i);
    else off.add(i);
    if (off.size >= BRANCHES.length) return;
    if (off.size) next.branchOff.set(m.id, off);
    else next.branchOff.delete(m.id);
    onPublication(next);
  };

  const setBranchPrice = (i: number, raw: string) => {
    const next = clonePublication(pub);
    const prices = { ...(next.branchPrice.get(m.id) || {}) };
    const digits = raw.replace(/[^\d]/g, "").slice(0, 9);
    if (!digits) delete prices[i];
    else prices[i] = parseInt(digits, 10);
    if (Object.keys(prices).length) next.branchPrice.set(m.id, prices);
    else next.branchPrice.delete(m.id);
    onPublication(next);
  };

  const clientHref = `/preview/client-catalog/p/${m.id}`;

  return (
    <div className={`stack pc-section ${styles.catalogScope}`} data-testid="pc-model-view">
      <button type="button" className="linkbtn pc-back" onClick={onBack}>
        <PcIconArrowLeft /> Ко всем товарам
      </button>
      <section className="panel pc-model">
        <div className="pc-gallery">
          {m.imgs.length ? (
            <>
              <Image
                className="pc-shot"
                src={m.imgs[Math.min(shot, m.imgs.length - 1)]!}
                alt={m.name}
                width={340}
                height={480}
                unoptimized
              />
              {m.imgs.length > 1 ? (
                <div className="pc-shots">
                  {m.imgs.map((src, i) => (
                    <button
                      key={src}
                      type="button"
                      className={i === shot ? "selected" : ""}
                      onClick={() => setShot(i)}
                      aria-label={`Фото ${i + 1}`}
                    >
                      <Image src={src} alt="" width={52} height={72} unoptimized />
                    </button>
                  ))}
                </div>
              ) : null}
            </>
          ) : (
            <div className="pc-shot pc-shot--none">
              <span>Фото из 1С не пришло</span>
            </div>
          )}
        </div>
        <div className="stack pc-model-info">
          <div>
            <span className="eyebrow">{m.section}</span>
            <h2>{m.name}</h2>
            <p className="muted">{m.variant}</p>
          </div>
          <div className="row">
            <StatusPill code={st} />
            <span className="pill">
              {m.skus.length} {plural(m.skus.length, "вариант", "варианта", "вариантов")}
            </span>
            <span className="pill">
              {onBranches.length === BRANCHES.length
                ? "все филиалы"
                : `${onBranches.length} из ${BRANCHES.length} филиалов`}
            </span>
          </div>
          <div className="pc-price">
            {m.price == null ? (
              <span className="muted">Цена не задана</span>
            ) : (
              <>
                {rub(m.price)}
                <small> / {m.unit}</small>
              </>
            )}
            <span className="small">
              {`тип цены: ${priceType}`}
              {money && mk && m.cost != null
                ? ` · закупка ${rub(m.cost)} · наценка ${mkPct(mk)}`
                : ""}
            </span>
          </div>
          {issues.map((code) => (
            <p key={code} className="notice accent">
              {issueText[code as keyof typeof issueText]}
            </p>
          ))}
          {!issues.length ? (
            <div className="row">
              {st === "live" ? (
                <>
                  <button type="button" className="btn" onClick={onToggleHidden}>
                    <PcIconEyeOff /> Скрыть с сайта
                  </button>
                  <Link
                    className="btn"
                    href={clientHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-testid="pc-model-client-link"
                  >
                    <PcIconExternal /> Как видит клиент
                  </Link>
                </>
              ) : (
                <button type="button" className="btn primary" onClick={onToggleHidden}>
                  <PcIconEye /> Показать на сайте
                </button>
              )}
            </div>
          ) : null}
          {m.desc ? <p className="small">{m.desc}</p> : null}
        </div>
      </section>

      {money && m.price != null ? (
        <section className="panel stack pc-money" data-testid="pc-money">
          <div className="row between">
            <h3>Закупка и наценка</h3>
            <span className="pill pc-status">
              <PcIconLock />
              видно только вам
            </span>
          </div>
          {mk && m.cost != null ? (
            <>
              <div className="pc-figs">
                <div>
                  <span>Цена на сайте</span>
                  <strong>{rub(m.price)}</strong>
                </div>
                <div>
                  <span>Закупка у поставщика</span>
                  <strong>{rub(m.cost)}</strong>
                </div>
                <div>
                  <span>Наценка</span>
                  <strong className={`pc-mk pc-mk--${mkTone(mk)}`}>{mkPct(mk)}</strong>
                </div>
                <div>
                  <span>Доход с единицы</span>
                  <strong>{rub(mk.rub)}</strong>
                </div>
              </div>
              <div className="pc-table-wrap">
                <table className="pc-table pc-disc">
                  <thead>
                    <tr>
                      <th>Скидка клиенту</th>
                      <th>Цена со скидкой</th>
                      <th>Ваш доход с единицы</th>
                      <th>Наценка</th>
                    </tr>
                  </thead>
                  <tbody>
                    {DISCOUNTS.map((d) => {
                      const p = Math.round(m.price! * (1 - d / 100));
                      const x = markup(p, m.cost);
                      return (
                        <tr key={d} className={x && x.rub < 0 ? "is-loss" : ""}>
                          <td>{d} %</td>
                          <td data-l="Цена со скидкой">{rub(p)}</td>
                          <td data-l="Ваш доход с единицы">
                            {x && x.rub < 0 ? `−${rub(-x.rub)}` : x ? rub(x.rub) : "—"}
                          </td>
                          <td data-l="Наценка">
                            {x ? (
                              <b className={`pc-mk pc-mk--${mkTone(x)}`}>{mkPct(x)}</b>
                            ) : (
                              "—"
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="small">
                Без убытка можно дать скидку до <strong>{mk.room} %</strong>. Закупочная цена приходит
                из 1С и видна только вам: на сайте и клиентам она не показывается. Расчёт предварительный
                — без учёта скидки по сертификату RemCard и вознаграждений партнёрам.
              </p>
            </>
          ) : (
            <p className="notice">
              <PcIconAlert />
              <span>
                В 1С нет закупочной цены этой позиции — наценка и доход не считаются. Они появятся после
                следующего обмена, когда цена закупки будет заполнена.
              </span>
            </p>
          )}
        </section>
      ) : null}

      {manage ? (
      <section className="panel stack pc-brs" data-testid="pc-model-branches">
        <div className="row between">
          <h3>Филиалы и цены</h3>
          <span className="small">
            {onBranches.length === BRANCHES.length
              ? "представлен во всех филиалах"
              : `представлен в ${onBranches.length} из ${BRANCHES.length} филиалов`}
          </span>
        </div>
        <div className="pc-brlist">
          {BRANCH_IDS.map((i) => {
            const here = onBranches.includes(i);
            const own = pub.branchPrice.get(m.id)?.[i];
            const rule = rulePrice(pub, m, i);
            const p = branchPrice(pub, m, i);
            return (
              <div
                key={i}
                className={`pc-brrow ${here ? "" : "is-off"}`}
                data-testid={`pc-model-branch-${i}`}
              >
                <label className="pc-check">
                  <input
                    type="checkbox"
                    data-testid={`pc-branch-on-${i}`}
                    checked={here}
                    disabled={!manage}
                    onChange={(e) => setBranchOn(i, e.target.checked)}
                  />
                  <span>
                    <strong>{BRANCHES[i]}</strong>
                    <small>
                      {here
                        ? m.price == null
                          ? "под заказ · остатка в 1С нет"
                          : "в наличии"
                        : "товар здесь не представлен"}
                    </small>
                  </span>
                </label>
                {m.price != null && manage ? (
                  <label className="pc-brprice">
                    <span>Цена в филиале, ₽</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      data-testid={`pc-branch-price-${i}`}
                      value={own != null ? own : ""}
                      placeholder={rule != null ? num(rule) : ""}
                      disabled={!here}
                      onChange={(e) => setBranchPrice(i, e.target.value)}
                    />
                  </label>
                ) : m.price != null ? (
                  <div className="pc-brprice">
                    <span>Цена в филиале</span>
                    <strong>{p != null ? rub(p) : "—"}</strong>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
        <p className="small">
          {manage
            ? "По умолчанию товар представлен во всех филиалах по цене из 1С. Снимите отметку, если в филиале его нет, или укажите свою цену для филиала — пустое поле означает цену по правилу филиала. Изменения демонстрационные и в 1С не передаются."
            : "Филиалы и цены настраивает владелец кабинета."}
        </p>
      </section>
      ) : null}

      <section className="panel stack">
        <div className="row between">
          <h3>Варианты из 1С</h3>
          <span className="small">одна модель на сайте — несколько позиций номенклатуры</span>
        </div>
        <div className="pc-table-wrap">
          <table className="pc-table">
            <thead>
              <tr>
                <th>Позиция в 1С</th>
                <th>Размер</th>
                <th>Цвет</th>
                <th>Цена</th>
                {money ? (
                  <>
                    <th>Закупка</th>
                    <th>Наценка</th>
                  </>
                ) : null}
                <th>Остаток</th>
              </tr>
            </thead>
            <tbody>
              {m.skus.map((k) => {
                const c = money ? skuCost(m, k.price) : null;
                const x = c != null && k.price != null ? markup(k.price, c) : null;
                const outside = partial && fitKeys.size > 0 && !fitKeys.has(k.key);
                return (
                  <tr key={k.key} className={outside ? "is-outside" : ""}>
                    <td>
                      {k.name1c}
                      {outside ? <span className="pc-outside"> вне фильтра</span> : null}
                      <small>
                        Арт. {k.art} · GUID …{k.guid}
                      </small>
                    </td>
                    <td data-l="Размер">{k.size || "—"}</td>
                    <td data-l="Цвет">{k.color || "—"}</td>
                    <td data-l="Цена">{k.price == null ? "—" : rub(k.price)}</td>
                    {money ? (
                      <>
                        <td data-l="Закупка">{c == null ? "—" : rub(c)}</td>
                        <td data-l="Наценка">
                          {x ? <b className={`pc-mk pc-mk--${mkTone(x)}`}>{mkPct(x)}</b> : "—"}
                        </td>
                      </>
                    ) : null}
                    <td data-l="Остаток">
                      {k.stock == null ? "нет данных" : k.stock === 0 ? "0" : num(k.stock)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel stack" data-testid="pc-model-props">
        <div className="row between">
          <h3>Свойства из 1С</h3>
          <span className="small">по ним товар находят в фильтрах — в кабинете и на сайте</span>
        </div>
        <dl className="pc-specs">
          {(
            [
              ["Раздел", m.group ? `${m.section} · ${m.group}` : m.section] as [string, string],
              ...(m.brand ? ([["Бренд", m.brand]] as [string, string][]) : []),
              ...modelProps(m.item).map(([key, vals]) => [key, vals.join(", ")] as [string, string]),
            ] as [string, string][]
          ).map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}