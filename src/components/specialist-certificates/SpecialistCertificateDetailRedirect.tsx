"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function SpecialistCertificateDetailRedirect({ certificateId }: { certificateId: string }) {
  const router = useRouter();
  useEffect(() => {
    router.replace(`/recommendations?certificate=${encodeURIComponent(certificateId)}`);
  }, [certificateId, router]);
  return <p>Загрузка…</p>;
}
