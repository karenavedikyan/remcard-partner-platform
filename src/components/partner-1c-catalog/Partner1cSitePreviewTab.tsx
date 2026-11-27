"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { SELLER_NAME } from "@/lib/partner-1c-catalog/constants";
import { modelStatus, type PublicationState } from "@/lib/partner-1c-catalog/models";
import type { PartnerCatalogModel } from "@/lib/partner-1c-catalog/types";
import { plural } from "@/lib/partner-1c-catalog/text";
import { PcIconExternal, PcIconMonitor, PcIconPhone } from "./Partner1cIcons";
import styles from "./Partner1cCatalog.module.css";

type Props = {
  models: PartnerCatalogModel[];
  publication: PublicationState;
};

export function Partner1cSitePreviewTab({ models, publication: pub }: Props) {
  const [device, setDevice] = useState<"desktop" | "phone">("desktop");
  const count = (code: ReturnType<typeof modelStatus>) =>
    models.filter((m) => modelStatus(pub, m) === code).length;
  const live = count("live");
  const hidden = count("hidden");
  const attn = count("nophoto") + count("noprice");

  const previewSrc = useMemo(() => {
    const hiddenIds = [...pub.hidden].join(".");
    const qs = hiddenIds ? `?hidden=${encodeURIComponent(hiddenIds)}` : "";
    return `/preview/client-catalog/s6${qs}`;
  }, [pub.hidden]);

  return (
    <div className={styles.catalogScope}>
      <section className="panel pc-site-head">
        <div className="stack">
          <h2>Так ваш каталог видят клиенты</h2>
          <p className="muted">
            Ваша страница на remcard.ru. Клиентам видны {live} из {models.length}{" "}
            {plural(models.length, "модели", "моделей", "моделей")}
            {hidden ? ` · скрыто вами: ${hidden}` : ""}
            {attn ? ` · без фото или цены: ${attn}` : ""}.
          </p>
        </div>
        <div className="pc-site-tools">
          <div className="pc-seg" role="group" aria-label="Устройство">
            <button
              type="button"
              className={device === "desktop" ? "selected" : ""}
              data-testid="pc-device-desktop"
              aria-pressed={device === "desktop"}
              onClick={() => setDevice("desktop")}
            >
              <PcIconMonitor />
              <span>Компьютер</span>
            </button>
            <button
              type="button"
              className={device === "phone" ? "selected" : ""}
              data-testid="pc-device-phone"
              aria-pressed={device === "phone"}
              onClick={() => setDevice("phone")}
            >
              <PcIconPhone />
              <span>Телефон</span>
            </button>
          </div>
          <Link
            className="btn pc-btn-sm"
            href={previewSrc}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="pc-site-open"
          >
            <PcIconExternal /> В новой вкладке
          </Link>
        </div>
      </section>
      <div
        className={`pc-browser pc-browser--${device === "phone" ? "phone" : "desktop"}`}
        data-testid="pc-site-preview"
      >
        <div className="pc-browser-bar" aria-hidden>
          <i />
          <i />
          <i />
          <span>remcard.ru/catalog/org/org_optovikk</span>
        </div>
        <div className="pc-browser-view">
          <iframe
            title="Предпросмотр: каталог продавца на сайте remcard.ru"
            data-testid="pc-site-frame"
            src={previewSrc}
          />
        </div>
      </div>
      <p className="small pc-foot">
        Предпросмотр работает как сайт: можно открывать товары, фильтры и список покупок. Заявки из
        предпросмотра не отправляются. Чтобы изменить состав, скройте или покажите товары во вкладке
        «Товары». Демо: «{SELLER_NAME}».
      </p>
    </div>
  );
}