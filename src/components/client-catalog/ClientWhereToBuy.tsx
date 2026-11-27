"use client";

import { useMemo, useState } from "react";
import { catalogOffers, offersSummary } from "@/lib/client-catalog/offers";
import type { CatalogProductRaw } from "@/lib/partner-1c-catalog/types";
import styles from "./ClientCatalog.module.css";

type Props = {
  product: CatalogProductRaw;
};

export function ClientWhereToBuy({ product }: Props) {
  const rows = useMemo(() => [...catalogOffers(product)].sort((a, b) => a.price - b.price), [product]);
  const [picked, setPicked] = useState(rows[0]?.key ?? "");
  const [city, setCity] = useState("");
  const { sellers, cities, maker, plural, rub } = offersSummary(rows);
  const min = Math.min(...rows.map((o) => o.price));

  const shown = rows.filter((o) => !city || o.city === city);

  if (!rows.length) return null;

  return (
    <section className="rcof" data-testid="rcof" aria-label="Где купить">
      <div className="rcof__head">
        <h3>Где купить</h3>
        <span className="xs muted">
          {sellers} {plural(sellers, "продавец", "продавца", "продавцов")} · {cities.length}{" "}
          {plural(cities.length, "город", "города", "городов")}
        </span>
      </div>
      <div className="chips rcof__cities" role="group" aria-label="Город">
        <button
          type="button"
          className={`chip ${city === "" ? "is-on" : ""}`}
          aria-pressed={city === ""}
          onClick={() => setCity("")}
        >
          Все города
        </button>
        {cities.map((c) => (
          <button
            key={c}
            type="button"
            className={`chip ${city === c ? "is-on" : ""}`}
            data-rcof-city={c}
            aria-pressed={city === c}
            onClick={() => setCity(c)}
          >
            {c}
          </button>
        ))}
      </div>
      <ol className="rcof__list">
        {shown.map((o) => {
          const on = o.key === picked;
          return (
            <li
              key={o.key}
              className={`rcof__row ${on ? "is-on" : ""}`}
              data-testid={`rcof-row-${o.key}`}
            >
              <div className="rcof__who">
                <b>
                  {o.sellerName}
                  {o.demo ? <span className="pill rcof__demo">пример</span> : null}
                </b>
                <small>
                  {o.city} · {o.addr}
                </small>
              </div>
              <span className="rcof__av">{o.avail}</span>
              <b className="rcof__price">
                {rub(o.price)}
                {o.price === min && rows.length > 1 ? <small>ниже всех</small> : null}
              </b>
              <button
                type="button"
                className={`btn btn--sm ${on ? "btn--primary" : "btn--ghost"}`}
                data-testid={`rcof-pick-${o.key}`}
                aria-pressed={on}
                onClick={() => setPicked(o.key)}
              >
                {on ? "✓ Выбран" : "Выбрать"}
              </button>
            </li>
          );
        })}
      </ol>
      <p className={`xs muted rcof__note ${styles.note}`}>
        Производитель — {maker}: карточку товара ведёт он. Цену, наличие и срок указывает каждый
        продавец. Заявка уйдёт продавцу, которого вы выбрали. Цены и продавцы с пометкой «пример» —
        демонстрационные.
      </p>
    </section>
  );
}