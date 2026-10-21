"use client";

import { AgentClientDetail } from "@/components/agent-r03/AgentClientDetail";
import { PageHeading } from "@/components/ui/PageHeading";
import { OwnerClientsGate } from "@/components/clients/OwnerClientsGate";
import { useOwnerClientsMode } from "@/components/clients/OwnerClientsModeContext";

function ClientDetailBody({ clientId }: { clientId: string }) {
  const mode = useOwnerClientsMode();
  if (!mode) return null;
  return (
    <>
      {mode === "agent" ? (
        <PageHeading eyebrow="Клиент" title="Карточка клиента" />
      ) : (
        <PageHeading
          eyebrow="СПЕЦИАЛИСТ"
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
