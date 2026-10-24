"use client";

import { displayCategoryLabel } from "@/lib/category-display";
import { moderationPartnerSubmittedStageLabels } from "@/lib/prof-admin-moderation-partner-display";
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
  services: { id: string; title: string; city: string; itemKind: string }[];
  portfolioItems: { id: string; title: string | null; images: string[] }[];
};

export function ModerationPartnerCatalogFullPreview({
  data,
}: {
  data: ModerationPartnerPublicPreviewPayload;
}) {
  const p = data.profile;
  const stages = moderationPartnerSubmittedStageLabels(data.navigatorStageIds);

  return (
    <div data-testid="moderation-partner-full-preview" className={styles.previewFull}>
      <p className={styles.metaLine}>{data.previewLimitation}</p>
      <h3 className={styles.dialogTitle}>{p.publicName}</h3>
      {p.city ? <p className={styles.metaLine}>Город: {p.city}</p> : null}
      {p.description ? <p>{p.description}</p> : null}
      {p.categories.length ? (
        <p className={styles.metaLine}>
          Категории: {p.categories.map((c) => displayCategoryLabel(c)).join(", ")}
        </p>
      ) : null}
      {stages.length ? (
        <p className={styles.metaLine}>Этапы ремонта: {stages.join(", ")}</p>
      ) : null}
      {p.publicContacts.length ? (
        <ul className={styles.contactList}>
          {p.publicContacts.map((c) => (
            <li key={`${c.kind}-${c.href}`}>
              {c.label}: {c.value}
            </li>
          ))}
        </ul>
      ) : null}
      {data.services.length ? (
        <section>
          <h4 className={styles.dialogTitle}>Услуги и товары</h4>
          <ul>
            {data.services.map((s) => (
              <li key={s.id}>
                {s.title} ({s.itemKind}) · {s.city}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {data.portfolioItems.length ? (
        <section>
          <h4 className={styles.dialogTitle}>Портфолио</h4>
          <ul>
            {data.portfolioItems.map((item) => (
              <li key={item.id}>{item.title ?? "Без названия"}</li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
