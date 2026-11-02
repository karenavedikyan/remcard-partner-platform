"use client";

import Link from "next/link";
import type { AgentCertificateRow } from "@/lib/agent-r03/types";
import { certificatePurchaseStatusLabel } from "@/lib/agent-r03/certificatePurchaseStatus";
import styles from "./agent-r03.module.css";

export function CertificatePurchaseLink({ cert, detailBasePath = "/certificates" }: {
  cert: AgentCertificateRow; detailBasePath?: string;
}) {
  return cert.hasOrders ? (
    <Link className={`${styles.purchasePill} ${styles.purchaseOpenLink}`}
      href={`${detailBasePath}/${encodeURIComponent(cert.id)}#certificate-purchases`}>
      {certificatePurchaseStatusLabel(cert)} · Подробнее
    </Link>
  ) : <span className={styles.purchasePill}>{certificatePurchaseStatusLabel(cert)}</span>;
}
