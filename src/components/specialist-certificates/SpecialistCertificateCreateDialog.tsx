"use client";

import { CertificateCreateForm } from "@/components/recommendations/CertificateCreateForm";

type Props = {
  open: boolean;
  agentClientId?: string;
  onClose: () => void;
  onCertificateCreated?: (certificate: import("@/lib/certificate-types").StoreCertificate) => void;
};

export function SpecialistCertificateCreateDialog({
  open,
  agentClientId,
  onClose,
  onCertificateCreated,
}: Props) {
  if (!open) return null;
  return (
    <CertificateCreateForm
      issuerUi="specialist"
      presentation="dialog"
      agentClientId={agentClientId}
      onRequestClose={onClose}
      onCertificateCreated={onCertificateCreated}
    />
  );
}
