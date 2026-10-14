import { notFound } from "next/navigation";
import { AgentAppShell } from "@/components/layout/agent/AgentAppShell";
import type { CabinetUiPreferencesResponse } from "@/lib/cabinet-ui-preferences-types";
import { defaultAgentMobileNavKeys } from "@/lib/agent-nav/sections";
import type { AuthUser } from "@/lib/types";

const FIXTURE_USER: AuthUser = {
  id: "agent-fixture",
  displayName: "Агент Демо",
  role: "PRO",
  partnerType: "MASTER",
  publicId: "RC-AGENT-FIX",
};

const PERMITTED = defaultAgentMobileNavKeys([
  "home",
  "partners",
  "wallet",
  "recommendations",
  "scanner",
  "history",
  "notifications",
  "profile",
]);

const FIXTURE_PREFS: CabinetUiPreferencesResponse = {
  contractVersion: "2026-10-14.r01",
  pilotEnabled: true,
  pilotActive: true,
  contextKey: "agent-wallet:fixture",
  version: 1,
  theme: "light",
  mobileNavKeys: defaultAgentMobileNavKeys(PERMITTED),
  permittedKeys: PERMITTED,
  defaultMobileNavKeys: defaultAgentMobileNavKeys(PERMITTED),
};

export default function R01AgentShellFixturePage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return (
    <AgentAppShell user={FIXTURE_USER} incomingCount={2} initialPrefs={FIXTURE_PREFS}>
      <section style={{ minHeight: 240 }}>
        <h1 style={{ fontSize: 28, marginBottom: 8 }}>Главная</h1>
        <p style={{ color: "var(--muted)", fontSize: 14 }}>
          Fixture shell для R01 (без live auth). Содержимое страницы не сравнивается с эталоном.
        </p>
      </section>
    </AgentAppShell>
  );
}
