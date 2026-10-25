"use client";

import { AgentClientsList } from "@/components/agent-r03/AgentClientsList";
import { PageHeading } from "@/components/ui/PageHeading";
import { OwnerClientsGate } from "@/components/clients/OwnerClientsGate";
import {
  useOwnerClientsBusinessPartnerType,
  useOwnerClientsMode,
} from "@/components/clients/OwnerClientsModeContext";
import { businessClientsPageCopy } from "@/lib/business-clients/copy";

function ClientsListBody() {
  const mode = useOwnerClientsMode();
  const businessPartnerType = useOwnerClientsBusinessPartnerType();
  if (!mode) return null;
  const heading =
    mode === "business" && businessPartnerType
      ? businessClientsPageCopy(businessPartnerType)
      : {
          eyebrow: mode === "specialist" ? "Специалист" : "АГЕНТ",
          title: "Клиенты",
          description: "Клиенты, с которыми вы работаете в кабинете.",
        };
  return (
    <>
      <PageHeading
        eyebrow={heading.eyebrow}
        title={heading.title}
        description={heading.description}
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
