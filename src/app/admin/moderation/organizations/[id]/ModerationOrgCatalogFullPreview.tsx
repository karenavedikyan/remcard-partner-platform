"use client";

import { useMemo } from "react";
import { displayCategoryLabel } from "@/lib/category-display";
import { masterDirectionLabel } from "@/lib/master-direction-label";
import { moderationSubmittedStageLabels } from "@/lib/prof-admin-moderation-org-display";
import { partnerTypeLabel } from "@/lib/profile-overview-display";
import { CatalogCategoryAvatar } from "@/components/profile/CatalogCategoryAvatar";
import styles from "./OrganizationModerationDetail.module.css";

export type ModerationPublicPreviewPayload = {
  previewLimitation: string;
  isTestPartner: boolean;
  organization: {
    id: string;
    name: string;
    logoUrl: string | null;
    description: string | null;
    website: string | null;
    phone: string | null;
    email: string | null;
    telegram: string | null;
    partnerType: string;
    storeCategories: string[];
    specializations: string[];
    catalogNavigatorStageIds: string[];
    publicContacts: { type: string; label?: string | null; value: string; url?: string | null }[];
  };
  branches: {
    id: string;
    city: string;
    address: string;
    workingHours: string | null;
    description: string | null;
    photoUrl: string | null;
    phone: string | null;
    email: string | null;
    storeCategories: string[];
    specializations: string[];
  }[];
  cityOrder: string[];
};

export function ModerationOrgCatalogFullPreview({ data }: { data: ModerationPublicPreviewPayload }) {
  const org = data.organization;
  const byCity = useMemo(() => {
    const map = new Map<string, typeof data.branches>();
    for (const b of data.branches) {
      const c = b.city.trim() || "Город не указан";
      if (!map.has(c)) map.set(c, []);
      map.get(c)!.push(b);
    }
    return map;
  }, [data.branches]);

  const cities = data.cityOrder.length ? data.cityOrder : Array.from(byCity.keys());
  const stageLabels = moderationSubmittedStageLabels(org.catalogNavigatorStageIds);

  return (
    <div className={styles.fullPreviewRoot} data-testid="moderation-catalog-full-preview">
      <p className={styles.previewLimitation}>{data.previewLimitation}</p>
      <div className={styles.fullPreviewHero}>
        <CatalogCategoryAvatar
          size="compact"
          imageUrl={org.logoUrl}
          categories={
            org.storeCategories.length > 0 ? org.storeCategories : org.specializations
          }
          partnerType={org.partnerType}
        />
        <div>
          <h3 className={styles.fullPreviewTitle}>{org.name}</h3>
          <p className={styles.metaLine}>{partnerTypeLabel(org.partnerType)}</p>
          {data.isTestPartner ? <span className={styles.badgeTest}>Тестовый партнёр</span> : null}
          {stageLabels.length ? (
            <p className={styles.metaLine}>Этапы: {stageLabels.join(" · ")}</p>
          ) : null}
          <p className={styles.metaLine}>
            Сеть · {data.branches.length}{" "}
            {data.branches.length === 1 ? "филиал" : "филиала"} · {cities.length}{" "}
            {cities.length === 1 ? "город" : "города"}
          </p>
        </div>
      </div>

      {org.description ? <p className={styles.fullPreviewDesc}>{org.description}</p> : null}

      <section className={styles.fullPreviewContacts}>
        <h4 className={styles.fullPreviewSectionTitle}>Связаться (только просмотр)</h4>
        <p className={styles.metaLine}>
          В каталоге здесь кнопки связи; в админ-предпросмотре показаны только публичные значения заявки.
        </p>
        <ul className={styles.diffList}>
          {org.phone ? <li>Телефон: {org.phone}</li> : null}
          {org.email ? <li>Email: {org.email}</li> : null}
          {org.telegram ? <li>Telegram: {org.telegram}</li> : null}
          {org.website ? <li>Сайт: {org.website}</li> : null}
          {org.publicContacts.map((c, i) => (
            <li key={`${c.type}-${i}`}>
              {c.label || c.type}: {c.value}
            </li>
          ))}
        </ul>
      </section>

      {org.storeCategories.length || org.specializations.length ? (
        <p className={styles.metaLine}>
          {org.storeCategories.length
            ? `Товары: ${org.storeCategories.map((k) => displayCategoryLabel(k)).join(", ")}`
            : null}
          {org.specializations.length
            ? ` · Услуги: ${org.specializations.map((k) => masterDirectionLabel(k)).join(", ")}`
            : null}
        </p>
      ) : null}

      <div className={styles.fullPreviewBranches}>
        {cities.map((city) => {
          const list = byCity.get(city) ?? [];
          return (
            <section key={city}>
              <h4 className={styles.fullPreviewSectionTitle}>
                {city} ({list.length})
              </h4>
              {list.map((b) => {
                const cats = (b.storeCategories.length ? b.storeCategories : b.specializations)
                  .slice(0, 8)
                  .map((k) =>
                    b.storeCategories.length ? displayCategoryLabel(k) : masterDirectionLabel(k),
                  )
                  .join(", ");
                return (
                  <article key={b.id} className={styles.fullPreviewBranch}>
                    <CatalogCategoryAvatar
                      size="compact"
                      imageUrl={b.photoUrl}
                      categories={
                        b.storeCategories.length > 0 ? b.storeCategories : b.specializations
                      }
                      partnerType={org.partnerType}
                    />
                    <div>
                      <p className={styles.fullPreviewBranchAddress}>{b.address}</p>
                      {b.workingHours ? <p className={styles.metaLine}>Часы: {b.workingHours}</p> : null}
                      {b.phone ? <p className={styles.metaLine}>Тел: {b.phone}</p> : null}
                      {cats ? <p className={styles.metaLine}>{cats}</p> : null}
                    </div>
                  </article>
                );
              })}
            </section>
          );
        })}
      </div>
    </div>
  );
}
