"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { OwnerClientsAccessMode } from "@/components/clients/OwnerClientsModeContext";
import { parseReceivingAppealIdFromSearch } from "@/lib/clients-parity/receiving-appeal-routes";
import type { ClientsParityDirection } from "@/lib/clients-parity/types";
import { ClientsDirectionWorkspace } from "./ClientsDirectionWorkspace";

type Props = {
  accessMode: OwnerClientsAccessMode;
};

function initialDirection(params: URLSearchParams): ClientsParityDirection {
  const raw = params.get("direction")?.trim();
  if (raw === "receiving" || raw === "incoming") return "incoming";
  if (raw === "at-partners" || raw === "observer") return "at-partners";
  return "incoming";
}

export function ClientsDirectionWorkspaceWithQuery({ accessMode }: Props) {
  const searchParams = useSearchParams();
  const appealId = parseReceivingAppealIdFromSearch(searchParams);
  const [forcedDirection] = useState<ClientsParityDirection>(() =>
    initialDirection(searchParams),
  );

  useEffect(() => {
    if (!appealId) return;
    const el = document.querySelector('[data-testid="clients-direction-workspace"]');
    el?.setAttribute("data-ca-receiving-appeal-id", appealId);
  }, [appealId]);

  return (
    <>
      {appealId ? (
        <p
          data-testid="ca-clients-receiving-return-hint"
          className="meta"
          data-ca-receiving-appeal-id={appealId}
        >
          Возврат к обращению {appealId}. Карточка откроется после публикации receiving workspace (P6).
        </p>
      ) : null}
      <ClientsDirectionWorkspace accessMode={accessMode} initialDirection={forcedDirection} />
    </>
  );
}
