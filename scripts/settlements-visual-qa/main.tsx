import React from "react";
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

function HubWithCompleted() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (openCompleted) {
      const btn = document.querySelector<HTMLButtonElement>(
        '[data-testid="settlements-completed-history"]',
      );
      btn?.click();
    }
    setReady(true);
  }, []);
  if (!ready && openCompleted) return null;
  return <SettlementsHub />;
}

function SpecialistPartners() {
  return (
    <SpecialistSettlementsWorkspace previewData={masterWalletFixtureData()} scopeKey="qa-partners" />
  );
}

const root = createRoot(document.getElementById("root")!);
let node: React.ReactNode = null;
if (scene.startsWith("hub")) node = openCompleted ? <HubWithCompleted /> : <SettlementsHub />;
else if (scene.startsWith("specialist-partners")) node = <SpecialistPartners />;
else if (scene.startsWith("specialist")) {
  node = <SpecialistSettlementsWorkspace previewData={masterWalletFixtureData()} scopeKey="qa" />;
} else if (scene.startsWith("agent")) node = <AgentReceivablesHub />;

root.render(
  <div data-scene={scene} style={{ padding: 16, maxWidth: scene.includes("375") ? 375 : 1280, margin: "0 auto" }}>
    {node}
  </div>,
);
