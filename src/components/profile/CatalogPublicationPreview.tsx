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
      <span className={styles.pill}>Предпросмотр · не опубликовано</span>
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
      {(model.serviceLabels.length > 0 || model.stageLabels.length > 0) && (
        <div className={styles.chipRow}>
          {model.serviceLabels.map((label) => (
            <span key={`svc-${label}`} className={styles.chip}>
              Услуга: {label}
            </span>
          ))}
          {model.stageLabels.map((label) => (
            <span key={`stg-${label}`} className={styles.chip}>
              Этап: {label}
            </span>
          ))}
        </div>
      )}
      {(model.publicPhone || model.publicEmail || model.telegram || model.website) && (
        <ul className={styles.contacts}>
          {model.publicPhone ? <li>Телефон: {model.publicPhone}</li> : null}
          {model.publicEmail ? <li>Email: {model.publicEmail}</li> : null}
          {model.telegram ? <li>Telegram: {model.telegram}</li> : null}
          {model.website ? <li>Сайт: {model.website}</li> : null}
        </ul>
      )}
      <p className={styles.note}>
        Такой состав данных будет виден клиентам после одобрения модерации.
      </p>
    </div>
  );
}
