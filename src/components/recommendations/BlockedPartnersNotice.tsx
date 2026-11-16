import Link from "next/link";
import type { BlockedPartner, BlockedPartnerNextStep } from "@/lib/certificate-types";
import styles from "./recommendations.module.css";

type Props = {
  partners: BlockedPartner[];
  /** Search/invite entry used when no concrete agreement row exists yet. */
  inviteHref: string;
};

const NEXT_STEP_LABEL: Record<BlockedPartnerNextStep, string | null> = {
  invite_reciprocal: "Предложить встречное партнёрство",
  review_pending: "Открыть приглашение",
  resume_partnership: "Возобновить сотрудничество",
  reinvite: "Пригласить снова",
  review_terms: "Пересмотреть условия",
  none: null,
};

export function blockedPartnerHref(partner: BlockedPartner, inviteHref: string): string {
  if (partner.nextStep === "invite_reciprocal" || partner.nextStep === "reinvite") {
    return inviteHref;
  }
  const rowId = partner.partnershipId ?? partner.reversePartnershipId;
  return rowId ? `/partners?terms=${encodeURIComponent(rowId)}` : "/partners";
}

/** Partners that exist but cannot receive your certificates yet, each with a reason and a next step. */
export function BlockedPartnersNotice({ partners, inviteHref }: Props) {
  if (partners.length === 0) return null;
  return (
    <section className={styles.notice} data-testid="certificate-blocked-partners" aria-label="Недоступные партнёры">
      <strong>Пока недоступны для выдачи</strong>
      <ul>
        {partners.map((partner) => {
          const label = NEXT_STEP_LABEL[partner.nextStep];
          return (
            <li
              key={`${partner.partnerUserId}:${partner.partnershipId ?? partner.reversePartnershipId ?? "none"}`}
              data-testid={`certificate-blocked-${partner.partnerUserId}`}
              data-reason={partner.reason}
            >
              <strong>{partner.storeName}</strong>
              <p className={styles.meta}>{partner.message}</p>
              {label ? (
                <Link href={blockedPartnerHref(partner, inviteHref)} className={styles.termsLink}>
                  {label}
                </Link>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
