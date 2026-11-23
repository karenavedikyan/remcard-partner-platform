import type { MiniAppActionId } from "@/lib/mini-app/types";
import { walletEmptyCopy } from "@/lib/wallet-empty/copy";
import type { WalletEmptyAudienceRole } from "@/lib/wallet-empty/types";
import styles from "./mini-app.module.css";

const leads: Record<WalletEmptyAudienceRole, string> = {
  company: "Здесь появятся начисления вашей компании и суммы к выплате партнёрам.",
  store: "После покупки по сертификату здесь появится бонус, начисленный партнёру магазина.",
  specialist: "Здесь появятся начисления за покупки клиентов по вашим рекомендациям.",
  agent: "Здесь появятся ваши вознаграждения за покупки клиентов по выданным сертификатам.",
};

export function MiniAppWalletEmpty({
  role, identifierLine, primaryActionId, onPrimaryAction, onOpenProfSettlements, profLinkLabel,
}: {
  role: WalletEmptyAudienceRole;
  identifierLine?: string | null;
  primaryActionId: MiniAppActionId | null;
  onPrimaryAction?: (action: MiniAppActionId) => void;
  onOpenProfSettlements: () => void;
  profLinkLabel: string;
}) {
  const copy = walletEmptyCopy(role);
  return (
    <section className={styles.mwEmptyRoot} data-testid="mini-wallet-empty">
      <div className={styles.mwEmptyHero}>
        <div className={styles.mwEmptyCard}>
          <div className={styles.mwEmptyCardBrand}>remcard.</div>
          <div className={styles.mwEmptyCardSum}>0 ₽</div>
          <div className={styles.mwEmptyCardFoot}><span>{identifierLine}</span><span>{copy.cardFootLabel}</span></div>
        </div>
        <div className={styles.mwEmptyHeroText}>
          <span className={styles.mwEmptyKicker}>{copy.kicker}</span>
          <h2 className={styles.mwEmptyTitle}>{copy.title}</h2>
          <p className={styles.mwEmptyLead}>{leads[role]}</p>
        </div>
      </div>
      <ol className={styles.mwEmptySteps}>
        {copy.steps.map((step, index) => (
          <li key={step.title} className={styles.mwEmptyStep}>
            <span className={styles.mwEmptyStepNum}>{index + 1}</span>
            <span className={styles.mwEmptyStepBody}><strong>{step.title}</strong>{step.note}</span>
          </li>
        ))}
      </ol>
      {primaryActionId && onPrimaryAction ? (
        <button className={styles.primaryBtn} type="button" onClick={() => onPrimaryAction(primaryActionId)}>
          {copy.primaryCta}
        </button>
      ) : null}
      <button className={styles.secondaryBtn} type="button" onClick={onOpenProfSettlements}>
        {profLinkLabel}
      </button>
    </section>
  );
}
