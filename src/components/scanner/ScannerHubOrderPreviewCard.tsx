"use client";

import { useMemo } from "react";
import { PartnerClientCertificateCard } from "@/components/recommendations/PartnerClientCertificateCard";
import { resolveCertificatePageUrl } from "@/lib/certificate-url";
import { buildIssuedCertificatePreview } from "@/lib/certificate-issued-preview";
import { orderPreviewToStoreCertificate } from "@/lib/order-preview-certificate";
import type { OrderPreviewAllowed } from "@/lib/order-types";

type Props = {
  preview: OrderPreviewAllowed;
  operationCode: string;
};

/** Certificate column card during scanner order preview (branded red card; policy snapshots add per-recipient rows). */
export function ScannerHubOrderPreviewCard({ preview, operationCode }: Props) {
  const issuedPreview = useMemo(() => {
    const cert = orderPreviewToStoreCertificate(preview, operationCode);
    const pageUrl = resolveCertificatePageUrl(cert);
    return buildIssuedCertificatePreview(cert, cert.promoCode, pageUrl);
  }, [preview, operationCode]);

  if (issuedPreview.kind === "policy-dark") {
    return (
      <PartnerClientCertificateCard
        model={issuedPreview.model}
        presentation="scanner"
        policyRows={issuedPreview.rows}
      />
    );
  }

  return (
    <PartnerClientCertificateCard model={issuedPreview.model} presentation="scanner" />
  );
}