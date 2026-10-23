"use client";

import { buildCatalogPreviewModel } from "@/lib/catalog-public-preview";
import type { ProfileDraft } from "@/lib/profile-save";
import type { ProProfileResponse } from "@/lib/types";
import { CatalogCategoryAvatar } from "./CatalogCategoryAvatar";
import legacyStyles from "./CatalogPublicationPreview.module.css";
import businessStyles from "./CatalogPublicationPreview.business.module.css";
import specialistStyles from "./CatalogPublicationPreview.specialist.module.css";

export type CatalogPublicationPreviewVariant = "default" | "specialist" | "business";

type CatalogPublicationPreviewProps = {
  profile: ProProfileResponse;
  draft: ProfileDraft;
  /** Legacy catalog (store/company/master via ProfileCatalogSection) uses default. */
  variant?: CatalogPublicationPreviewVariant;
};

function LegacyCatalogPublicationPreview({
  profile,
  draft,
}: CatalogPublicationPreviewProps) {
  const model = buildCatalogPreviewModel(profile, draft);
  const legacyPhone = draft.publicPhone.trim();

  return (
    <div className={legacyStyles.card} data-testid="catalog-public-preview">
      <div className={legacyStyles.header}>
        <CatalogCategoryAvatar
          imageUrl={model.imageUrl}
          categories={model.categoriesForAvatar}
          partnerType={model.partnerType}
        />
        <div>
          <h3 className={legacyStyles.title}>{model.publicName}</h3>
          <p className={legacyStyles.meta}>{model.city || "Город не указан"}</p>
        </div>
      </div>
      {model.description ? <p className={legacyStyles.desc}>{model.description}</p> : null}
      {model.productLabels.length ? (
        <p className={legacyStyles.tags}>Товары: {model.productLabels.join(", ")}</p>
      ) : null}
      {model.serviceLabels.length ? (
        <p className={legacyStyles.tags}>Услуги: {model.serviceLabels.join(", ")}</p>
      ) : null}
      {(legacyPhone || model.publicEmail || model.telegram || model.website) && (
        <ul className={legacyStyles.contacts}>
          {legacyPhone ? <li>Тел: {legacyPhone}</li> : null}
          {model.publicEmail ? <li>Email: {model.publicEmail}</li> : null}
          {model.telegram ? <li>Telegram: {model.telegram}</li> : null}
          {model.website ? <li>Сайт: {model.website}</li> : null}
        </ul>
      )}
      <p className={legacyStyles.note}>
        Предпросмотр карточки для remcard.ru (без публичной ссылки).
      </p>
    </div>
  );
}

function BusinessCatalogPublicationPreview({ profile, draft }: CatalogPublicationPreviewProps) {
  const model = buildCatalogPreviewModel(profile, draft);
  const styles = businessStyles;

  return (
    <div
      className={styles.card}
      data-testid="catalog-public-preview"
      data-catalog-preview-variant="business"
    >
      <span className={styles.pill}>Предпросмотр · не опубликовано</span>
      <div className={styles.header}>
        <CatalogCategoryAvatar
          size="compact"
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
      {(model.productLabels.length > 0 || model.serviceLabels.length > 0) && (
        <div className={styles.chipRow}>
          {model.productLabels.map((label) => (
            <span key={`p-${label}`} className={styles.chip}>
              Товар: {label}
            </span>
          ))}
          {model.serviceLabels.map((label) => (
            <span key={`s-${label}`} className={styles.chip}>
              Услуга: {label}
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
        Такой состав данных будет виден клиентам после одобрения модерации. Сохранение черновика не
        публикует карточку.
      </p>
    </div>
  );
}

function SpecialistCatalogPublicationPreview({
  profile,
  draft,
}: CatalogPublicationPreviewProps) {
  const model = buildCatalogPreviewModel(profile, draft);
  const styles = specialistStyles;

  return (
    <div
      className={styles.card}
      data-testid="catalog-public-preview"
      data-catalog-preview-variant="specialist"
    >
      <span className={styles.pill}>Предпросмотр · не опубликовано</span>
      <div className={styles.header}>
        <CatalogCategoryAvatar
          size="compact"
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

export function CatalogPublicationPreview({
  variant = "default",
  ...props
}: CatalogPublicationPreviewProps) {
  if (variant === "specialist") {
    return <SpecialistCatalogPublicationPreview {...props} />;
  }
  if (variant === "business") {
    return <BusinessCatalogPublicationPreview {...props} />;
  }
  return <LegacyCatalogPublicationPreview {...props} />;
}
