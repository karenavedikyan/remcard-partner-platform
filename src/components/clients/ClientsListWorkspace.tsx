"use client";

import { PageHeading } from "@/components/ui/PageHeading";
import { OwnerClientsGate } from "@/components/clients/OwnerClientsGate";
import { ClientsDirectionWorkspace } from "@/components/clients/direction/ClientsDirectionWorkspace";
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
      : mode === "agent"
        ? {
            eyebrow: "АГЕНТ",
            title: "Мои клиенты у партнёров",
            description: "Направленные клиенты и статусы у принимающих партнёров.",
          }
        : {
            eyebrow: "Специалист",
            title: "Клиенты",
            description: "Клиенты у вас и направления к партнёрам.",
          };
  return (
    <>
      <PageHeading
        eyebrow={heading.eyebrow}
        title={heading.title}
        description={heading.description}
      />
      <ClientsDirectionWorkspace accessMode={mode} />
    </>
  );
}

type Props = {
  canLinkOnboardingHistory?: boolean;
};

export function ClientsListWorkspace({ canLinkOnboardingHistory }: Props = {}) {
  return (
    <OwnerClientsGate canLinkOnboardingHistory={canLinkOnboardingHistory}>
      <ClientsListBody />
    </OwnerClientsGate>
  );
}
