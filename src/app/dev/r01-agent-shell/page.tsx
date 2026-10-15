import { notFound } from "next/navigation";
import { AgentAppShell } from "@/components/layout/agent/AgentAppShell";
import type { CabinetUiPreferencesResponse } from "@/lib/cabinet-ui-preferences-types";
import { defaultAgentMobileNavKeys } from "@/lib/agent-nav/sections";
import type { AuthUser } from "@/lib/types";
import type { ThemePreference } from "@/lib/theme-preference";
import { R01AgentShellFixtureBoot } from "./R01AgentShellFixtureBoot";

const FIXTURE_USER: AuthUser = {
  id: "agent-fixture",
  displayName: "Агент Демо",
  role: "PRO",
  partnerType: "MASTER",
  publicId: "RC-AGENT-FIX",
};

const FULL_PERMITTED = [
  "home",
  "partners",
  "wallet",
  "recommendations",
  "scanner",
  "history",
  "notifications",
  "profile",
] as const;

function parseTheme(value: string | undefined): ThemePreference {
  if (value === "dark" || value === "light" || value === "system") return value;
  return "light";
}

export default async function R01AgentShellFixturePage(props: {
  searchParams?: Promise<{ theme?: string }>;
}) {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const searchParams = await props.searchParams;
  const theme = parseTheme(searchParams?.theme);

  const FIXTURE_PREFS: CabinetUiPreferencesResponse = {
    contractVersion: "2026-10-14.r01",
    pilotEnabled: true,
    pilotActive: true,
    contextKey: "agent-wallet:fixture",
    version: 1,
    theme,
    mobileNavKeys: defaultAgentMobileNavKeys(FULL_PERMITTED),
    permittedKeys: [...FULL_PERMITTED],
    defaultMobileNavKeys: defaultAgentMobileNavKeys(FULL_PERMITTED),
  };

  const resolvedTheme = theme === "dark" ? "dark" : "light";

  return (
    <>
      <script
        dangerouslySetInnerHTML={{
          __html: `document.documentElement.setAttribute('data-theme','${resolvedTheme}');try{localStorage.setItem('remcard-theme','${theme}');}catch(e){}`,
        }}
      />
      <R01AgentShellFixtureBoot theme={theme} />
      <AgentAppShell user={FIXTURE_USER} incomingCount={2} initialPrefs={FIXTURE_PREFS}>
        <section style={{ minHeight: 120 }}>
          <p style={{ color: "var(--muted)", fontSize: 14, margin: 0 }}>
            Fixture shell для R01 (без live auth). Контент страницы вне scope сравнения.
          </p>
        </section>
      </AgentAppShell>
    </>
  );
}
