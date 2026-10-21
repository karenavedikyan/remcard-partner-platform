"use client";

import { useSearchParams } from "next/navigation";
import { CertificateCreateForm } from "@/components/recommendations/CertificateCreateForm";

export function RecommendationCreateWithClient({
  issuerUi = "default",
}: {
  issuerUi?: "default" | "specialist";
}) {
  const searchParams = useSearchParams();
  const clientId = searchParams.get("clientId")?.trim() || undefined;
  return (
    <CertificateCreateForm
      agentClientId={clientId}
      successHrefBase="/recommendations"
      issuerUi={issuerUi}
    />
  );
}
