"use client";

import type { AuthUser } from "@/lib/types";
import { ProfNotificationBell } from "@/components/notifications";
import { AppShell } from "@/components/layout/AppShell";
import { AgentAppShell } from "@/components/layout/agent/AgentAppShell";
import type { CabinetUiPreferencesResponse } from "@/lib/cabinet-ui-preferences-types";
import { ProfTestModeBanner } from "@/components/layout/ProfTestModeBanner";
import type { ProfTestSessionInfo } from "@/lib/types";
import {
  CabinetShellContextProvider,
  useCabinetShellContext,
} from "@/components/layout/cabinet-shell-context";

type CabinetAppShellClientProps = {
  user: AuthUser;
  incomingCount: number;
  uiPrefs: CabinetUiPreferencesResponse;
  profTestSession?: ProfTestSessionInfo | null;
  shellContextToken: string;
  children: React.ReactNode;
};

export function CabinetAppShellClient({
  user,
  incomingCount,
  uiPrefs,
  profTestSession,
  shellContextToken,
  children,
}: CabinetAppShellClientProps) {
  const banner =
    profTestSession?.active ? <ProfTestModeBanner session={profTestSession} /> : null;

  const agentShellKey = `${shellContextToken}:${uiPrefs.contextKey ?? "none"}:${user.id}`;
  const legacyShellKey = shellContextToken;

  if (uiPrefs.pilotActive && uiPrefs.permittedKeys && uiPrefs.mobileNavKeys) {
    return (
      <CabinetShellContextProvider shellContextToken={shellContextToken}>
        {banner}
        <AgentAppShell
          key={agentShellKey}
          user={user}
          incomingCount={incomingCount}
          notificationBell={user.id ? <CabinetShellNotificationBell /> : null}
          initialPrefs={uiPrefs}
        >
          {children}
        </AgentAppShell>
      </CabinetShellContextProvider>
    );
  }

  return (
    <CabinetShellContextProvider shellContextToken={shellContextToken}>
      {banner}
      <AppShell
        key={legacyShellKey}
        user={user}
        incomingCount={incomingCount}
        notificationBell={user.id ? <CabinetShellNotificationBell /> : null}
      >
        {children}
      </AppShell>
    </CabinetShellContextProvider>
  );
}

function CabinetShellNotificationBell() {
  const shell = useCabinetShellContext();
  const remountKey = `${shell?.shellContextToken ?? "none"}:${shell?.authFailureEpoch ?? 0}`;
  return <ProfNotificationBell key={remountKey} />;
}
