"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo } from "react";
import { modelProps } from "@/lib/partner-1c-catalog/lk";
import { buildPartnerModels, defaultPublicationState, modelStatus } from "@/lib/partner-1c-catalog/models";
import { optovikFixtureProducts } from "@/lib/partner-1c-catalog/fixtures";
import { rub } from "@/lib/partner-1c-catalog/text";
import { ClientWhereToBuy } from "./ClientWhereToBuy";
import styles from "./ClientCatalog.module.css";

type Props = {
  id: string;
};

export function ClientProductPage({ id }: Props) {
  const pub = defaultPublicationState();
  const model = useMemo(
    () => buildPartnerModels(optovikFixtureProducts()).find((m) => m.id === id),
    [id],
  );

  if (!model || modelStatus(pub, model) !== "live") {
    return (
      <div className={styles.page}>
        <p>Товар не найден или скрыт.</p>
        <Link href="/preview/client-catalog/s6">К каталогу Оптовик</Link>
      </div>
    );
  }

  const props = modelProps(model.item);

  return (
    <div className={styles.page} data-testid="pd">
      <Link className={styles.back} href="/preview/client-catalog/s6">
        ← Оптовик
      </Link>
      <div className={styles.pd}>
        <div className={styles.pdGal}>
          {model.imgs[0] ? (
            <Image
              className={styles.pdMainImg}
              src={model.imgs[0]}
              alt={model.name}
              width={400}
              height={520}
              unoptimized
            />
          ) : (
            <div className={styles.pdMainImg}>Нет фото</div>
          )}
        </div>
        <div className={styles.pdInfo}>
          <span className={styles.eyebrow} data-testid="rcof-maker">
            Производитель · <b>Тандор</b>
          </span>
          <h1 className={styles.pdName}>{model.name}</h1>
          <p className={styles.pdVar}>{model.variant}</p>
          <p className={styles.pdPrice}>
            {model.price != null ? rub(model.price) : "Цена по запросу"}
            <small> / {model.unit}</small>
          </p>
          {model.desc ? <p className={styles.pdDesc}>{model.desc}</p> : null}
          <ClientWhereToBuy product={model.item.raw} />
          <dl className={styles.pdSpecs}>
            {props.map(([k, vals]) => (
              <div key={k} className={styles.pdSpecRow}>
                <dt>{k}</dt>
                <dd>{vals.join(", ")}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
}