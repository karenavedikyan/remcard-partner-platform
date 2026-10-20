"use client";

import { AgentClientsList } from "@/components/agent-r03/AgentClientsList";
import { PageHeading } from "@/components/ui/PageHeading";
import { OwnerClientsGate } from "@/components/clients/OwnerClientsGate";
import { useOwnerClientsMode } from "@/components/clients/OwnerClientsModeContext";

function ClientsListBody() {
  const mode = useOwnerClientsMode();
  if (!mode) return null;
  return (
    <>
      <PageHeading
        eyebrow={mode === "specialist" ? "Специалист" : "АГЕНТ"}
        title="Клиенты"
        description="Клиенты, с которыми вы работаете в кабинете."
      />
      <AgentClientsList accessMode={mode} />
    </>
  );
}

export function ClientsListWorkspace() {
  return (
    <OwnerClientsGate>
      <ClientsListBody />
    </OwnerClientsGate>
  );
}
