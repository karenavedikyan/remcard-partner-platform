"use client";

import { useSearchParams } from "next/navigation";
import { CertificateCreateForm } from "@/components/recommendations/CertificateCreateForm";

export function RecommendationCreateWithClient() {
  const searchParams = useSearchParams();
  const clientId = searchParams.get("clientId")?.trim() || undefined;
  return <CertificateCreateForm agentClientId={clientId} successHrefBase="/recommendations" />;
}
