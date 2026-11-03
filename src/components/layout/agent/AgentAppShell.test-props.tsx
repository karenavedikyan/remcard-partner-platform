"use client";

import { AgentAppShell } from "@/components/layout/agent/AgentAppShell";
import { useAgentCabinetUiPrefs } from "@/components/layout/agent/useAgentCabinetUiPrefs";
import type { CabinetUiPreferencesResponse } from "@/lib/cabinet-ui-preferences-types";
import type { AuthUser } from "@/lib/types";
import type { ReactNode } from "react";

/** Test/dev helper: wires live prefs state without CabinetAppShellClient path refresh. */
export function AgentAppShellWithPrefsState({
  user,
  initialPrefs,
  children,
}: {
  user: AuthUser;
  initialPrefs: CabinetUiPreferencesResponse;
  children: ReactNode;
}) {
  const agentPrefs = useAgentCabinetUiPrefs(initialPrefs);
  return (
    <AgentAppShell
      user={user}
      prefs={agentPrefs.prefs}
      saveMobileNavKeys={agentPrefs.saveMobileNavKeys}
      saveTheme={agentPrefs.saveTheme}
    >
      {children}
    </AgentAppShell>
  );
}
