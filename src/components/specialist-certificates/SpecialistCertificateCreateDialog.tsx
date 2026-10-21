"use client";

import { CertificateCreateForm } from "@/components/recommendations/CertificateCreateForm";

type Props = {
  open: boolean;
  agentClientId?: string;
  onClose: () => void;
};

export function SpecialistCertificateCreateDialog({ open, agentClientId, onClose }: Props) {
  if (!open) return null;
  return (
    <CertificateCreateForm
      issuerUi="specialist"
      presentation="dialog"
      agentClientId={agentClientId}
      onRequestClose={onClose}
    />
  );
}
