"use client";

import { useState } from "react";
import { displayCategoryLabel } from "@/lib/category-display";
import { masterDirectionLabel } from "@/lib/master-direction-label";
import { partnerTypeLabel } from "@/lib/profile-overview-display";
import {
  moderationPartnerItemKindLabel,
  moderationPartnerSubmittedStageLabels,
} from "@/lib/prof-admin-moderation-partner-display";
import { CatalogCategoryAvatar } from "@/components/profile/CatalogCategoryAvatar";
import styles from "../../organizations/[id]/OrganizationModerationDetail.module.css";

export type ModerationPartnerPublicPreviewPayload = {
  previewLimitation: string;
  partnerRevisionToken?: string;
  isTestPartner: boolean;
  navigatorStageIds: string[];
  profile: {
    publicName: string;
    city: string | null;
    description: string | null;
    avatarUrl: string | null;
    categories: string[];
    partnerType: string | null;
    publicContacts: { kind: string; label: string; value: string; href: string }[];
  };
  services: {
    id: string;
    title: string;
    description: string | null;
    city: string;
    itemKind: string;
    images: string[];
  }[];
  portfolioItems: {
    id: string;
    title: string | null;
    description: string | null;
    images: string[];
  }[];
};

function SafePreviewImage({
  src,
  alt,
  className,
  testId,
}: {
  src: string;
  alt: string;
  className?: string;
  testId?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (failed || !src.trim()) {
    return (
      <div className={styles.photoFallback} aria-hidden data-testid={testId ? `${testId}-fallback` : undefined}>
        Нет фото
      </div>
    );
  }
  return (
    <div className={styles.photoWrap}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className={className ?? styles.photoThumb}
        data-testid={testId}
        onError={() => setFailed(true)}
      />
      <a className={styles.photoZoomLink} href={src} target="_blank" rel="noopener noreferrer">
        Увеличить
      </a>
    </div>
  );
}

export function ModerationPartnerCatalogFullPreview({
  data,
}: {
  data: ModerationPartnerPublicPreviewPayload;
}) {
  const p = data.profile;
  const stages = moderationPartnerSubmittedStageLabels(data.navigatorStageIds);
  const categoryLabels = p.categories.map((c) =>
    p.partnerType === "MASTER" ? masterDirectionLabel(c) || displayCategoryLabel(c) : displayCategoryLabel(c),
  );

  return (
    <div data-testid="moderation-partner-full-preview" className={styles.fullPreviewRoot}>
      <p className={styles.previewLimitation}>{data.previewLimitation}</p>
      <div className={styles.fullPreviewHero}>
        <CatalogCategoryAvatar
          size="compact"
          imageUrl={p.avatarUrl}
          categories={p.categories}
          partnerType={p.partnerType}
        />
        <div>
          <h3 className={styles.fullPreviewTitle}>{p.publicName}</h3>
          <p className={styles.metaLine}>{partnerTypeLabel(p.partnerType ?? "")}</p>
          {p.city ? <p className={styles.metaLine}>Город: {p.city}</p> : null}
          {data.isTestPartner ? <span className={styles.badgeTest}>Тестовый партнёр</span> : null}
          {stages.length ? (
            <p className={styles.metaLine}>Этапы ремонта: {stages.join(" · ")}</p>
          ) : null}
        </div>
      </div>

      {p.description ? <p className={styles.fullPreviewDesc}>{p.description}</p> : null}

      {categoryLabels.length ? (
        <p className={styles.metaLine}>Направления: {categoryLabels.join(", ")}</p>
      ) : null}

      {p.publicContacts.length ? (
        <section className={styles.fullPreviewContacts}>
          <h4 className={styles.fullPreviewSectionTitle}>Связаться (отправленная заявка)</h4>
          <ul>
            {p.publicContacts.map((c) => (
              <li key={`${c.kind}-${c.href}`}>
                {c.label}: {c.value}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {data.services.length ? (
        <section>
          <h4 className={styles.fullPreviewSectionTitle}>Услуги и товары</h4>
          <div className={styles.fullPreviewBranches}>
            {data.services.map((s) => (
              <article key={s.id} className={styles.fullPreviewBranch} data-testid="moderation-partner-preview-service">
                {s.images[0] ? (
                  <SafePreviewImage
                    src={s.images[0]}
                    alt={s.title}
                    testId="moderation-partner-preview-service-image"
                  />
                ) : null}
                <div>
                  <p className={styles.fullPreviewBranchAddress}>{s.title}</p>
                  <p className={styles.metaLine}>
                    {moderationPartnerItemKindLabel(s.itemKind)} · {s.city}
                  </p>
                  {s.description ? <p className={styles.metaLine}>{s.description}</p> : null}
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {data.portfolioItems.length ? (
        <section>
          <h4 className={styles.fullPreviewSectionTitle}>Портфолио</h4>
          <div className={styles.previewMediaGrid}>
            {data.portfolioItems.map((item) =>
              item.images.map((src, idx) => (
                <div key={`${item.id}-${idx}`} data-testid="moderation-partner-preview-portfolio-item">
                  <SafePreviewImage
                    src={src}
                    alt={item.title ?? "Портфолио"}
                    testId="moderation-partner-preview-portfolio-image"
                  />
                  {item.title ? <p className={styles.metaLine}>{item.title}</p> : null}
                  {item.description ? <p className={styles.metaLine}>{item.description}</p> : null}
                </div>
              )),
            )}
          </div>
        </section>
      ) : null}
    </div>
  );
}
