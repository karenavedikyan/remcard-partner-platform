"use client";

import { buildCatalogPreviewModel } from "@/lib/catalog-public-preview";
import type { ProfileDraft } from "@/lib/profile-save";
import type { ProProfileResponse } from "@/lib/types";
import { CatalogCategoryAvatar } from "./CatalogCategoryAvatar";
import styles from "./CatalogPublicationPreview.module.css";

type CatalogPublicationPreviewProps = {
  profile: ProProfileResponse;
  draft: ProfileDraft;
};

export function CatalogPublicationPreview({ profile, draft }: CatalogPublicationPreviewProps) {
  const model = buildCatalogPreviewModel(profile, draft);

  return (
    <div className={styles.card} data-testid="catalog-public-preview">
      <div className={styles.header}>
        <CatalogCategoryAvatar
          imageUrl={model.imageUrl}
          categories={model.categoriesForAvatar}
          partnerType={model.partnerType}
        />
        <div>
          <h3 className={styles.title}>{model.publicName}</h3>
          <p className={styles.meta}>{model.city || "Город не указан"}</p>
        </div>
      </div>
      {model.description ? <p className={styles.desc}>{model.description}</p> : null}
      {model.productLabels.length ? (
        <p className={styles.tags}>Товары: {model.productLabels.join(", ")}</p>
      ) : null}
      {model.serviceLabels.length ? (
        <p className={styles.tags}>Услуги: {model.serviceLabels.join(", ")}</p>
      ) : null}
      {(model.publicPhone || model.publicEmail || model.telegram || model.website) && (
        <ul className={styles.contacts}>
          {model.publicPhone ? <li>Тел: {model.publicPhone}</li> : null}
          {model.publicEmail ? <li>Email: {model.publicEmail}</li> : null}
          {model.telegram ? <li>Telegram: {model.telegram}</li> : null}
          {model.website ? <li>Сайт: {model.website}</li> : null}
        </ul>
      )}
      <p className={styles.note}>Предпросмотр карточки для remcard.ru (без публичной ссылки).</p>
    </div>
  );
}
