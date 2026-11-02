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
document.documentElement.dataset.theme = theme === "dark" ? "dark" : "light";

const root = createRoot(document.getElementById("root")!);
let node: React.ReactNode = null;
if (scene.startsWith("hub")) node = <SettlementsHub />;
else if (scene.startsWith("specialist")) {
  node = <SpecialistSettlementsWorkspace previewData={masterWalletFixtureData()} scopeKey="qa" />;
} else if (scene.startsWith("agent")) node = <AgentReceivablesHub />;

root.render(
  <div data-scene={scene} style={{ padding: 16, maxWidth: scene.includes("375") ? 375 : 1280, margin: "0 auto" }}>
    {node}
  </div>,
);
