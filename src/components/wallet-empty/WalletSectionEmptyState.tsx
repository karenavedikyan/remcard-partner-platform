import {
  walletEmptyCopy,
  walletEmptyPrimaryHref,
} from "@/lib/wallet-empty/copy";
import type { WalletEmptyAudienceRole } from "@/lib/wallet-empty/types";
import { WalletEmptyIcon } from "./WalletEmptyIcons";
import { OnboardingStepItem } from "@/components/onboarding-step/OnboardingStepItem";
import styles from "./wallet-empty.module.css";

type Props = {
  role: WalletEmptyAudienceRole;
  /** When `true`, seller steps may link to `/history`. Omitted/false → static (safe). */
  canLinkOnboardingHistory?: boolean;
};

export function WalletSectionEmptyState({ role, canLinkOnboardingHistory }: Props) {
  const copy = walletEmptyCopy(role, {
    canLinkReadOnlyHistory: canLinkOnboardingHistory,
  });
  const href = walletEmptyPrimaryHref(role);

  return (
    <section
      className={styles.root}
      data-testid="wallet-empty-state"
      data-wallet-empty-role={role}
      aria-labelledby="wallet-empty-title"
    >
      <div className={styles.hero}>
        <div className={styles.card} aria-hidden>
          <div className={styles.cardTop}>
            <span className={styles.cardBrand}>
              Rem<em>Card</em>
            </span>
            <span className={styles.cardChip} />
          </div>
          <div className={styles.cardSum}>0 ₽</div>
          <div className={styles.cardFoot}>
            <span>{copy.cardFootLabel}</span>
            <span className={styles.cardLabel}>Карта партнёра</span>
          </div>
        </div>
        <div className={styles.heroText}>
          <span className={styles.kicker}>{copy.kicker}</span>
          <h2 className={styles.title} id="wallet-empty-title">
            {copy.title}
          </h2>
          <p className={styles.lead}>{copy.lead}</p>
          <div className={styles.actions}>
            <a
              href={href}
              className={styles.ctaLink}
              data-testid="wallet-empty-primary-cta"
            >
              {copy.primaryCta}
            </a>
          </div>
        </div>
      </div>
      <ol className={styles.steps}>
        {copy.steps.map((step, index) => (
          <li className={styles.step} key={step.title}>
            <OnboardingStepItem
              index={index}
              title={step.title}
              note={step.note}
              action={step.action}
              stepNumClassName={styles.stepNum}
              iconWrapClassName={styles.stepIco}
              iconSlot={<WalletEmptyIcon name={step.icon} />}
            />
          </li>
        ))}
      </ol>
      <p className={styles.foot}>
        Раздел заполнится сам, когда появятся первые данные.
      </p>
    </section>
  );
}
