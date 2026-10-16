"use client";

import Link from "next/link";
import type { AgentClientRow } from "@/lib/agent-r03/types";
import { formatPhoneForDisplay } from "@/lib/contact-phone-display";
import {
  clientPurchaseStatusLabel,
  clientRowDetail,
  clientRowMobileSubtitle,
} from "@/lib/agent-r03/clientListRow";
import { RecordRowActions, type RecordRowAction } from "./RecordRowActions";
import styles from "./agent-r03.module.css";

type Props = {
  client: AgentClientRow;
  archived: boolean;
  selected: boolean;
  onSelectChange: (checked: boolean) => void;
  actions: RecordRowAction[];
};

export function AgentR03MobileClientRow({
  client,
  archived,
  selected,
  onSelectChange,
  actions,
}: Props) {
  return (
    <article
      className={styles.mobileRecord}
      data-testid="agent-client-mobile-row"
      data-parity-client-id={client.id}
    >
      <div className={styles.mobileRecordTop}>
        <label className={styles.selectCol}>
          <input
            type="checkbox"
            checked={selected}
            onChange={(e) => onSelectChange(e.target.checked)}
          />
        </label>
        <div className={styles.mobileRecordMain}>
          <Link href={`/clients/${client.id}`} className={styles.mobileRecordTitle}>
            {client.displayName}
          </Link>
          <p className={styles.meta}>{clientRowMobileSubtitle(client)}</p>
          <p className={styles.meta}>{clientRowDetail(client)}</p>
        </div>
      </div>
      <div className={styles.mobileRecordFooter}>
        <span className={styles.purchasePill}>
          {clientPurchaseStatusLabel(client, archived)}
        </span>
        <RecordRowActions
          ariaLabel="Действия с клиентом"
          actions={actions}
          variant="mobileFooter"
        />
      </div>
    </article>
  );
}
