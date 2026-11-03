import {
  walletEmptyCopy,
  walletEmptyPrimaryHref,
} from "@/lib/wallet-empty/copy";
import type { WalletEmptyAudienceRole } from "@/lib/wallet-empty/types";
import { WalletEmptyIcon } from "./WalletEmptyIcons";
import styles from "./wallet-empty.module.css";

type Props = {
  role: WalletEmptyAudienceRole;
};

export function WalletSectionEmptyState({ role }: Props) {
  const copy = walletEmptyCopy(role);
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
            <span className={styles.cardNum}>•••• 0000</span>
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
            <span className={styles.stepNum}>{index + 1}</span>
            <span className={styles.stepIco}>
              <WalletEmptyIcon name={step.icon} />
            </span>
            <div>
              <strong>{step.title}</strong>
              <small>{step.note}</small>
            </div>
          </li>
        ))}
      </ol>
      <p className={styles.foot}>
        Раздел заполнится сам, когда появятся первые данные.
      </p>
    </section>
  );
}
