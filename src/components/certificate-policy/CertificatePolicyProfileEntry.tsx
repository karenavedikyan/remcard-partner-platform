"use client";

import { useEffect, useState } from "react";
import { fetchCertificatePolicyWorkspace } from "@/lib/certificate-policy/api";
import { formatPurchaseLimit, formatValidityDays } from "@/lib/partner-directions/direction";
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
  const [summary, setSummary] = useState<string | null>(null);

  useEffect(() => {
    if (!showSummary || hidden || open) return;
    let cancelled = false;
    void fetchCertificatePolicyWorkspace(viewerUserId).then((res) => {
      if (cancelled || !res.ok) return;
      const { validityDays, purchaseLimit } = res.workspace.general.effective;
      setSummary(`${formatValidityDays(validityDays)} · ${formatPurchaseLimit(purchaseLimit)}`);
    });
    return () => {
      cancelled = true;
    };
  }, [hidden, open, showSummary, viewerUserId]);

  if (hidden) return null;

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
            {summary ? (
              <p className="small" data-testid="cp-entry-summary">
                Сейчас для всех: {summary}
              </p>
            ) : null}
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
      <CertificatePolicyDialog
        open={open}
        onClose={() => setOpen(false)}
        canEditSettings={canEditSettings}
        viewerUserId={viewerUserId}
        onEffectiveTermsChanged={onEffectiveTermsChanged}
        initialTab={canEditSettings ? "settings" : "incoming"}
      />
  </div>
  );
}