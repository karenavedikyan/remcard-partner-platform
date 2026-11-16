"use client";

import { useEffect, useState } from "react";
import { fetchCertificatePolicyWorkspace } from "@/lib/certificate-policy/api";
import { formatValidityDays } from "@/lib/partner-directions/direction";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { CertificatePolicyDialog } from "./CertificatePolicyDialog";
import styles from "./certificate-policy.module.css";

type Props = {
  viewerUserId: string;
  /** Owner STORE/COMPANY/MASTER — settings tab; AGENT sees incoming-only. */
  canEditSettings: boolean;
  /** employee hides entry entirely */
  hidden?: boolean;
  /** Partners overview: show the current general validity and purchase limit. */
  showSummary?: boolean;
  onEffectiveTermsChanged?: () => void;
};

export function CertificatePolicyProfileEntry({
  viewerUserId,
  canEditSettings,
  hidden = false,
  showSummary = false,
  onEffectiveTermsChanged,
}: Props) {
  const [open, setOpen] = useState(false);
  const [summary, setSummary] = useState<{ days: string; purchases: string } | null>(null);

  useEffect(() => {
    if (!showSummary || hidden || open) return;
    let cancelled = false;
    void fetchCertificatePolicyWorkspace(viewerUserId).then((res) => {
      if (cancelled || !res.ok) return;
      const { validityDays, purchaseLimit } = res.workspace.general.effective;
      setSummary({ days: formatValidityDays(validityDays), purchases: String(purchaseLimit) });
    });
    return () => {
      cancelled = true;
    };
  }, [hidden, open, showSummary, viewerUserId]);

  if (hidden) return null;

  const dialog = (
    <CertificatePolicyDialog
      open={open}
      onClose={() => setOpen(false)}
      canEditSettings={canEditSettings}
      viewerUserId={viewerUserId}
      onEffectiveTermsChanged={onEffectiveTermsChanged}
      initialTab={canEditSettings ? "settings" : "incoming"}
    />
  );

  if (showSummary) {
    return (
      <div data-testid="cp-profile-entry">
        <section className={styles.dpPolicyEntry} aria-labelledby="dp-policy-title">
          <div className={styles.dpPolicyHeading}>
            <h2 id="dp-policy-title">Общие условия сертификатов</h2>
            <p>Для клиентов, которых направляют к вам партнёры.</p>
          </div>
          {summary ? (
            <dl className={styles.dpPolicySummary} data-testid="cp-entry-summary">
              <div>
                <dt>Срок скидки</dt>
                <dd data-testid="cp-entry-summary-days">{summary.days}</dd>
              </div>
              <div>
                <dt>Покупок</dt>
                <dd data-testid="cp-entry-summary-purchases">{summary.purchases}</dd>
              </div>
            </dl>
          ) : null}
          <button
            type="button"
            className={styles.dpPolicyButton}
            data-testid="cp-open-settings"
            onClick={() => setOpen(true)}
          >
            {canEditSettings ? "Настроить" : "Посмотреть"}
          </button>
        </section>
        {dialog}
      </div>
    );
  }

  return (
  <div data-testid="cp-profile-entry">
      <Panel
        compact
        className={styles.cpProfileEntry}
      >
        <div className={styles.cpPanelTitle}>
          <div>
            <h2>Условия сертификатов</h2>
            <p className="small">
              {canEditSettings
                ? "Срок скидки и число покупок для ваших партнёров."
                : "Срок скидки и число покупок у партнёров."}
            </p>
          </div>
          <Button
            type="button"
            data-testid="cp-open-settings"
            onClick={() => setOpen(true)}
          >
            {canEditSettings ? "Настроить" : "Посмотреть"}
          </Button>
        </div>
      </Panel>
      {dialog}
  </div>
  );
}