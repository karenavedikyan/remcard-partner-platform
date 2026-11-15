import {
  certificatePolicyDaysWord,
  certificatePolicyPurchaseChip,
} from "@/lib/certificate-policy/format";
import type { CertificatePolicyPublicSummary } from "@/lib/certificate-policy/types";
import styles from "./certificate-policy.module.css";

type Props = {
  summary: Pick<CertificatePolicyPublicSummary, "validityDays" | "purchaseLimit">;
  testId?: string;
};

export function CertificatePolicyCompactChips({ summary, testId }: Props) {
  return (
    <div className={styles.cpChips} data-testid={testId ?? "cp-compact-chips"}>
      <span className={styles.cpChip}>
        {summary.validityDays} {certificatePolicyDaysWord(summary.validityDays)}
      </span>
      <span className={styles.cpChip}>
        {certificatePolicyPurchaseChip(summary.purchaseLimit)}
      </span>
    </div>
  );
}