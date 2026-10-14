"use client";

import type { AuthUser } from "@/lib/types";
import { ProfNotificationBell } from "@/components/notifications";
import { AppShell } from "@/components/layout/AppShell";
import { AgentAppShell } from "@/components/layout/agent/AgentAppShell";
import type { CabinetUiPreferencesResponse } from "@/lib/cabinet-ui-preferences-types";

type CabinetAppShellClientProps = {
  user: AuthUser;
  incomingCount: number;
  uiPrefs: CabinetUiPreferencesResponse;
  children: React.ReactNode;
};

export function CabinetAppShellClient({
  user,
  incomingCount,
  uiPrefs,
  children,
}: CabinetAppShellClientProps) {
  const bell = user.id ? <ProfNotificationBell /> : null;

  if (uiPrefs.pilotActive && uiPrefs.permittedKeys && uiPrefs.mobileNavKeys) {
    return (
      <AgentAppShell
        user={user}
        incomingCount={incomingCount}
        notificationBell={bell}
        initialPrefs={uiPrefs}
      >
        {children}
      </AgentAppShell>
    );
  }

  return (
    <AppShell user={user} incomingCount={incomingCount} notificationBell={bell}>
      {children}
    </AppShell>
  );
}
