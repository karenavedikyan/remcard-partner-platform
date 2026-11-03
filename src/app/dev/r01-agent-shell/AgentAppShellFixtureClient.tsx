"use client";

import { AgentAppShell } from "@/components/layout/agent/AgentAppShell";
import { useAgentCabinetUiPrefs } from "@/components/layout/agent/useAgentCabinetUiPrefs";
import type { CabinetUiPreferencesResponse } from "@/lib/cabinet-ui-preferences-types";
import type { AuthUser } from "@/lib/types";

type AgentAppShellFixtureClientProps = {
  user: AuthUser;
  incomingCount: number;
  initialPrefs: CabinetUiPreferencesResponse;
  fixturePathname?: string;
  children: React.ReactNode;
};

export function AgentAppShellFixtureClient({
  user,
  incomingCount,
  initialPrefs,
  fixturePathname,
  children,
}: AgentAppShellFixtureClientProps) {
  const agentPrefs = useAgentCabinetUiPrefs(initialPrefs);
  return (
    <AgentAppShell
      user={user}
      incomingCount={incomingCount}
      prefs={agentPrefs.prefs}
      saveMobileNavKeys={agentPrefs.saveMobileNavKeys}
      saveTheme={agentPrefs.saveTheme}
      fixturePathname={fixturePathname}
    >
      {children}
    </AgentAppShell>
  );
}
