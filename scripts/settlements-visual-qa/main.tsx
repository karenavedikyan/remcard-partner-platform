import React, { useEffect } from "react";
import { createRoot } from "react-dom/client";
import { SettlementsHub } from "@/components/settlements/SettlementsHub";
import { SpecialistSettlementsWorkspace } from "@/components/specialist-wallet/SpecialistSettlementsWorkspace";
import { AgentReceivablesHub } from "@/components/agent-r05/AgentReceivablesHub";
import { masterWalletFixtureData } from "@/lib/specialist-settlements/fixture-data";
import "@/app/globals.css";

const params = new URLSearchParams(window.location.search);
const scene = params.get("scene") ?? "hub-overview";
const theme = params.get("theme") ?? "light";
const openCompleted = params.get("completed") === "1";
document.documentElement.dataset.theme = theme === "dark" ? "dark" : "light";

const COMPLETED_HISTORY_SELECTOR = '[data-testid="settlements-completed-history"]';

const qaAuthUser = { id: "qa-settlements", role: "PRO" as const, partnerType: null, displayName: "QA" };

function HubWithCompleted() {
  useEffect(() => {
    if (!openCompleted) return;
    let cancelled = false;
    const openWhenReady = () => {
      if (cancelled) return;
      const btn = document.querySelector<HTMLButtonElement>(COMPLETED_HISTORY_SELECTOR);
      if (btn) {
        btn.click();
        return;
      }
      window.requestAnimationFrame(openWhenReady);
    };
    openWhenReady();
    return () => {
      cancelled = true;
    };
  }, []);

  return <SettlementsHub user={qaAuthUser} />;
}

function SpecialistPartners() {
  return (
    <SpecialistSettlementsWorkspace
      user={qaAuthUser}
      previewData={masterWalletFixtureData()}
      scopeKey="qa-partners"
    />
  );
}

const root = createRoot(document.getElementById("root")!);
let node: React.ReactNode = null;
if (scene.startsWith("hub")) {
  node = openCompleted ? <HubWithCompleted /> : <SettlementsHub user={qaAuthUser} />;
}
else if (scene.startsWith("specialist-partners")) node = <SpecialistPartners />;
else if (scene.startsWith("specialist")) {
  node = (
    <SpecialistSettlementsWorkspace
      user={qaAuthUser}
      previewData={masterWalletFixtureData()}
      scopeKey="qa"
    />
  );
} else if (scene.startsWith("agent")) node = <AgentReceivablesHub />;

root.render(
  <div
    data-scene={scene}
    style={{ padding: 16, maxWidth: scene.includes("375") ? 375 : 1280, margin: "0 auto" }}
  >
    {node}
  </div>,
);
