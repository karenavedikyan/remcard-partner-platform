"use client";

import { CertificateCreateForm } from "@/components/recommendations/CertificateCreateForm";
import type { StoreCertificate } from "@/lib/certificate-types";

type Props = {
  open: boolean;
  agentClientId?: string;
  onClose: () => void;
  onCertificateCreated?: (certificate: StoreCertificate) => void;
  onListRefresh?: () => void;
};

export function SpecialistCertificateCreateDialog({
  open,
  agentClientId,
  onClose,
  onCertificateCreated,
  onListRefresh,
}: Props) {
  if (!open) return null;
  return (
    <CertificateCreateForm
      issuerUi="specialist"
      presentation="dialog"
      agentClientId={agentClientId}
      onRequestClose={onClose}
      onCertificateCreated={onCertificateCreated}
      onListRefresh={onListRefresh}
    />
  );
}
