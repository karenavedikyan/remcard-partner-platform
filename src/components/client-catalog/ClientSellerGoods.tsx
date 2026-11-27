"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  activeCount,
  apply,
  blank,
  chips,
  copy,
  options,
  prune,
  removeChip,
  summary,
} from "@/lib/partner-1c-catalog/lk";
import { defaultPublicationState, modelStatus } from "@/lib/partner-1c-catalog/models";
import { optovikFixtureProducts } from "@/lib/partner-1c-catalog/fixtures";
import { buildPartnerModels } from "@/lib/partner-1c-catalog/models";
import type { FilterState } from "@/lib/partner-1c-catalog/types";
import { Partner1cFilterPanel } from "@/components/partner-1c-catalog/Partner1cFilterPanel";
import { rub } from "@/lib/partner-1c-catalog/text";
import styles from "./ClientCatalog.module.css";

type Props = {
  initialHidden?: string[];
};

export function ClientSellerGoods({ initialHidden }: Props) {
  const [st, setSt] = useState<FilterState>(blank());
  const [drawer, setDrawer] = useState(false);
  const pub = useMemo(() => {
    const p = defaultPublicationState();
    (initialHidden || []).forEach((id) => p.hidden.add(id));
    return p;
  }, [initialHidden]);

  const models = useMemo(() => buildPartnerModels(optovikFixtureProducts()), []);
  const liveModels = useMemo(
    () => models.filter((m) => modelStatus(pub, m) === "live"),
    [models, pub],
  );
  const items = useMemo(() => liveModels.map((m) => m.item), [liveModels]);
  const rows = useMemo(() => apply(items, st), [items, st]);
  const opts = options(items, st);
  const chipList = [
    st.q.trim() ? { id: "q", text: `Поиск: ${st.q.trim()}` } : null,
    ...chips(st, "client"),
  ].filter(Boolean) as { id: string; text: string }[];

  return (
    <div className={styles.page} data-testid="sf">
      <header>
        <h1>Оптовик</h1>
        <p className="muted">Товары на remcard.ru · демо-каталог из 1С</p>
      </header>
      <div className={styles.sfBar}>
        <input
          className={styles.sfSearch}
          type="search"
          data-testid="sf-search"
          placeholder="Модель, цвет или артикул"
          maxLength={160}
          value={st.q}
          onChange={(e) => setSt(prune(items, { ...copy(st), q: e.target.value }))}
        />
        <button
          type="button"
          className="btn"
          data-testid="sf-open"
          onClick={() => setDrawer(true)}
        >
          Фильтры{activeCount(st) ? ` · ${activeCount(st)}` : ""}
        </button>
        <select
          aria-label="Сортировка"
          data-testid="sf-sort"
          value={st.sort}
          onChange={(e) => setSt(prune(items, { ...copy(st), sort: e.target.value }))}
        >
          <option value="">По умолчанию</option>
          <option value="price_asc">Сначала дешевле</option>
          <option value="price_desc">Сначала дороже</option>
          <option value="stock">Сначала в наличии</option>
        </select>
      </div>
      {chipList.length ? (
        <div data-testid="sf-found">
          <span>{rows.length ? `Найдено: ${summary(rows).text}` : "Ничего не найдено"}</span>
          <div>
            {chipList.map((c) => (
              <button
                key={c.id}
                type="button"
                data-testid="sf-chip"
                onClick={() => {
                  if (c.id === "q") setSt(prune(items, { ...copy(st), q: "" }));
                  else setSt(prune(items, removeChip(st, c.id)));
                }}
              >
                {c.text} ×
              </button>
            ))}
          </div>
        </div>
      ) : null}
      <Partner1cFilterPanel
        open={drawer}
        list={items}
        state={st}
        audience="client"
        priceType="РРЦ Тандор"
        title="Фильтры"
        sub={`Каталог продавца «Оптовик» · список обновляется сразу`}
        onChange={(next) => setSt(prune(items, next))}
        onClose={() => setDrawer(false)}
      />
      {rows.length ? (
        <div className={styles.goods} data-testid="sf-goods" id="sf-goods">
          {rows.map((r) => {
            const m = liveModels.find((x) => x.id === r.item.id);
            if (!m) return null;
            return (
              <Link
                key={m.id}
                href={`/preview/client-catalog/p/${m.id}`}
                className={styles.card}
              >
                {m.imgs[0] ? (
                  <Image src={m.imgs[0]} alt="" width={200} height={260} unoptimized />
                ) : (
                  <div>Нет фото</div>
                )}
                <strong>{m.name}</strong>
                <small>{m.variant}</small>
                <span>{m.price != null ? rub(m.price) : "Цена по запросу"}</span>
              </Link>
            );
          })}
        </div>
      ) : (
        <div data-testid="sf-empty">
          <b>Ничего не найдено</b>
          <p>Проверьте написание модели или снимите часть фильтров.</p>
        </div>
      )}
      <p className="small muted">
        Разделы: {opts.sections.map((s) => s.name).join(", ")} · {liveModels.length} моделей на сайте
      </p>
    </div>
  );
}