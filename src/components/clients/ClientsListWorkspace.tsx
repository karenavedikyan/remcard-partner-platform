"use client";

import type { ComponentType, ReactNode } from "react";
import { PageHeading } from "@/components/ui/PageHeading";
import { OwnerClientsGate } from "@/components/clients/OwnerClientsGate";
import { ClientsDirectionWorkspace } from "@/components/clients/direction/ClientsDirectionWorkspace";
import {
  useOwnerClientsBusinessPartnerType,
  useOwnerClientsMode,
} from "@/components/clients/OwnerClientsModeContext";
import { businessClientsPageCopy } from "@/lib/business-clients/copy";
import { ClientsPageChromeProvider, useClientsPageChrome } from "@/components/clients/new-partner-empty/clientsPageChrome";
import styles from "@/components/clients/new-partner-empty/clients-list-chrome.module.css";

function ClientsListBody() {
  const mode = useOwnerClientsMode();
  const businessPartnerType = useOwnerClientsBusinessPartnerType();
  const chrome = useClientsPageChrome();
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

  const hideTop = chrome?.hideTopChrome ?? false;

  return (
    <>
      {hideTop ? (
        <h1 className={styles.visuallyHiddenPageTitle}>{heading.title}</h1>
      ) : (
        <PageHeading
          eyebrow={heading.eyebrow}
          title={heading.title}
          description={heading.description}
        />
      )}
      <ClientsDirectionWorkspace accessMode={mode} />
    </>
  );
}

function ClientsListChromeShell({ children }: { children: ReactNode }) {
  const mode = useOwnerClientsMode();
  if (!mode) return <>{children}</>;
  return <ClientsPageChromeProvider accessMode={mode}>{children}</ClientsPageChromeProvider>;
}

type Props = {
  canLinkOnboardingHistory?: boolean;
};

type ProductionOwnerClientsGate = ComponentType<{
  children: ReactNode;
  canLinkOnboardingHistory?: boolean;
}>;

/**
 * Production `57ca4680` `OwnerClientsGate` accepts this prop via `useBusinessSectionDispatch`.
 * R5 gate type is unchanged; cast keeps the patch snippet identical on production apply.
 */
export function ClientsListWorkspace({ canLinkOnboardingHistory }: Props = {}) {
  const Gate = OwnerClientsGate as ProductionOwnerClientsGate;
  return (
    <Gate canLinkOnboardingHistory={canLinkOnboardingHistory}>
      <ClientsListChromeShell>
        <ClientsListBody />
      </ClientsListChromeShell>
    </Gate>
  );
}