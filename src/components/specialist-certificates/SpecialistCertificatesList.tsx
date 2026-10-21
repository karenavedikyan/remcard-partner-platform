"use client";

import { Suspense } from "react";
import { AgentCertificatesList } from "@/components/agent-r03/AgentCertificatesList";

export function SpecialistCertificatesList() {
  return (
    <Suspense fallback={<p>Загрузка…</p>}>
      <AgentCertificatesList accessMode="specialist" />
    </Suspense>
  );
}
