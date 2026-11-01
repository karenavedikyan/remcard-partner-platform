import { moderationCatalogStatusLabel } from "@/lib/prof-admin-moderation-org-display";
import type { ModerationOrgDetail } from "@/lib/prof-admin-moderation-org-display";
import type { ModerationPartnerDetail } from "@/lib/prof-admin-moderation-partner-display";

type OrgStyles = {
  section: string;
  metaLine: string;
  dataGrid: string;
  prose: string;
  historyList: string;
  historyItem: string;
};

type PartnerStyles = OrgStyles;

export function OrganizationModerationHistorySection({
  org,
  styles,
}: {
  org: ModerationOrgDetail;
  styles: OrgStyles;
}) {
  return (
    <section className={styles.section} aria-label="История проверки">
      <h2>История проверки</h2>
      <p className={styles.metaLine}>
        Лента прошлых решений в этой карточке недоступна. Ниже — текущий статус модерации и данные
        отправленной заявки.
      </p>
      <dl className={styles.dataGrid}>
        <dt>Текущий статус</dt>
        <dd>{moderationCatalogStatusLabel(org.catalogStatus)}</dd>
      </dl>
    </section>
  );
}

function formatNoteWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString("ru-RU");
  } catch {
    return iso;
  }
}

export function PartnerModerationHistorySection({
  partner,
  styles,
}: {
  partner: ModerationPartnerDetail;
  styles: PartnerStyles;
}) {
  const notes = partner.moderationNotes ?? [];
  const hasReason = Boolean(partner.rejectionReason?.trim());
  const hasNotes = notes.length > 0;

  return (
    <section className={styles.section} aria-label="История проверки">
      <h2>История проверки</h2>
      {hasReason ? (
        <>
          <p className={styles.metaLine}>Последняя причина отказа</p>
          <p className={styles.prose} title={partner.rejectionReason ?? undefined}>
            {partner.rejectionReason}
          </p>
        </>
      ) : null}
      {hasNotes ? (
        <ul className={styles.historyList}>
          {notes.map((n) => (
            <li key={n.id} className={styles.historyItem}>
              <p className={styles.prose} title={n.comment}>
                {n.comment}
              </p>
              <p className={styles.metaLine}>
                {formatNoteWhen(n.createdAt)}
                {n.resolvedAt ? ` · закрыто ${formatNoteWhen(n.resolvedAt)}` : " · открыта"}
              </p>
            </li>
          ))}
        </ul>
      ) : null}
      {!hasReason && !hasNotes ? (
        <p className={styles.metaLine}>
          Записей о прошлых решениях пока нет. В карточке показаны текущий статус и отправленная
          заявка.
        </p>
      ) : null}
      <dl className={styles.dataGrid}>
        <dt>Текущий статус</dt>
        <dd>{moderationCatalogStatusLabel(partner.catalogStatus)}</dd>
      </dl>
    </section>
  );
}
