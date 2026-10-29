"use client";

import { useSyncExternalStore } from "react";
import { AgentPartnerCollection } from "@/components/partners/AgentPartnerCollection";
import {
  activePartnership,
  incomingEmptyAgent,
  incomingWithTerms,
  pendingResponder,
  storeMeId,
} from "./fixtures";

function subscribe(cb: () => void) {
  window.addEventListener("hashchange", cb);
  return () => window.removeEventListener("hashchange", cb);
}

function readScene(): string {
  return window.location.hash.replace(/^#\/?/, "") || "incoming-agent";
}

const SCENES: Record<
  string,
  { title: string; partnerships: typeof incomingEmptyAgent[]; viewMode: "table" | "cards" }
> = {
  "incoming-agent": {
    title: "Входящий пустой запрос агента",
    partnerships: [incomingEmptyAgent],
    viewMode: "table",
  },
  "incoming-invite": {
    title: "Входящее приглашение с условиями",
    partnerships: [{ ...incomingWithTerms, initiatedBy: "agent-harness", proUserId: "agent-harness" }],
    viewMode: "table",
  },
  pending: {
    title: "Ожидание условий (ответ store)",
    partnerships: [pendingResponder],
    viewMode: "table",
  },
  active: {
    title: "Активное партнёрство",
    partnerships: [activePartnership],
    viewMode: "table",
  },
  cards: {
    title: "Карточки",
    partnerships: [incomingEmptyAgent],
    viewMode: "cards",
  },
};

export function HarnessApp() {
  const scene = useSyncExternalStore(subscribe, readScene, () => "incoming-agent");
  const config = SCENES[scene] ?? SCENES["incoming-agent"]!;

  return (
    <div data-testid="partner-row-harness" style={{ padding: 16, maxWidth: 1310, margin: "0 auto" }}>
      <header style={{ marginBottom: 16 }}>
        <p style={{ margin: 0, fontSize: 13, color: "var(--muted)" }}>
          Synthetic component harness — no live API
        </p>
        <h1 style={{ margin: "4px 0 0", fontSize: 22 }}>{config.title}</h1>
      </header>
      <AgentPartnerCollection
        partnerships={config.partnerships}
        meId={storeMeId}
        viewMode={config.viewMode}
        busyId={null}
        onRunAction={() => {}}
        onUpdated={() => {}}
        termRequests={{}}
        onLoadTermRequests={() => {}}
        expandedTermPartnershipId={null}
        selectedIds={new Set()}
        onToggleSelect={() => {}}
        onToggleSelectAll={() => {}}
        page={0}
        pageSize={10}
        totalCount={config.partnerships.length}
        onPageChange={() => {}}
        onPageSizeChange={() => {}}
      />
    </div>
  );
}
