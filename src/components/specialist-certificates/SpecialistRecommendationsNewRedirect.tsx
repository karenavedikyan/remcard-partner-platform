"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export function SpecialistRecommendationsNewRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const params = new URLSearchParams();
    params.set("create", "1");
    const clientId = searchParams.get("clientId")?.trim();
    if (clientId) params.set("clientId", clientId);
    router.replace(`/recommendations?${params.toString()}`);
  }, [router, searchParams]);

  return <p>Загрузка…</p>;
}
