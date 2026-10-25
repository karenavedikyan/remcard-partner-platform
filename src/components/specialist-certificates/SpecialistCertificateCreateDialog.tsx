"use client";

import { CertificateCreateForm } from "@/components/recommendations/CertificateCreateForm";
import type { StoreCertificate } from "@/lib/certificate-types";
import type { IssuerCertificatesApiMode } from "@/lib/business-owner-certificates/issuer-api";

type Props = {
  open: boolean;
  agentClientId?: string;
  issuerListApi?: IssuerCertificatesApiMode;
  onClose: () => void;
  onCertificateCreated?: (certificate: StoreCertificate) => void;
  onListRefresh?: () => void;
};

export function SpecialistCertificateCreateDialog({
  open,
  agentClientId,
  issuerListApi = "specialist",
  onClose,
  onCertificateCreated,
  onListRefresh,
}: Props) {
  if (!open) return null;
  return (
    <CertificateCreateForm
      issuerUi="specialist"
      issuerListApi={issuerListApi}
      presentation="dialog"
      agentClientId={agentClientId}
      onRequestClose={onClose}
      onCertificateCreated={onCertificateCreated}
      onListRefresh={onListRefresh}
    />
  );
}
