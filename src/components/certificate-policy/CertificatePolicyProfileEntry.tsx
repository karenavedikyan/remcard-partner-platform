"use client";

import { useState } from "react";
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
};

export function CertificatePolicyProfileEntry({
  viewerUserId,
  canEditSettings,
  hidden = false,
}: Props) {
  const [open, setOpen] = useState(false);

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
        initialTab={canEditSettings ? "settings" : "incoming"}
      />
  </div>
  );
}