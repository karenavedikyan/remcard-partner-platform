"use client";

import { AgentClientDetail } from "@/components/agent-r03/AgentClientDetail";
import { PageHeading } from "@/components/ui/PageHeading";
import { OwnerClientsGate } from "@/components/clients/OwnerClientsGate";
import {
  useOwnerClientsBusinessPartnerType,
  useOwnerClientsMode,
} from "@/components/clients/OwnerClientsModeContext";
import { businessClientsPageCopy } from "@/lib/business-clients/copy";

function ClientDetailBody({ clientId }: { clientId: string }) {
  const mode = useOwnerClientsMode();
  const businessPartnerType = useOwnerClientsBusinessPartnerType();
  if (!mode) return null;
  const businessHeading =
    mode === "business" && businessPartnerType
      ? businessClientsPageCopy(businessPartnerType)
      : null;
  return (
    <>
      {mode === "agent" ? (
        <PageHeading eyebrow="Клиент" title="Карточка клиента" />
      ) : businessHeading ? (
        <PageHeading
          eyebrow={businessHeading.eyebrow}
          title="Карточка клиента"
          description={businessHeading.description}
        />
      ) : (
        <PageHeading
          eyebrow="Специалист"
          title="Клиенты"
          description="Контакты, заметки, сертификаты и покупки клиента."
        />
      )}
      <AgentClientDetail clientId={clientId} accessMode={mode} />
    </>
  );
}

export function ClientDetailWorkspace({ clientId }: { clientId: string }) {
  return (
    <OwnerClientsGate>
      <ClientDetailBody clientId={clientId} />
    </OwnerClientsGate>
  );
}
