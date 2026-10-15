"use client";

import type { AuthUser } from "@/lib/types";
import { ProfNotificationBell } from "@/components/notifications";
import { AppShell } from "@/components/layout/AppShell";
import { AgentAppShell } from "@/components/layout/agent/AgentAppShell";
import type { CabinetUiPreferencesResponse } from "@/lib/cabinet-ui-preferences-types";
import { ProfTestModeBanner } from "@/components/layout/ProfTestModeBanner";
import type { ProfTestSessionInfo } from "@/lib/types";

type CabinetAppShellClientProps = {
  user: AuthUser;
  incomingCount: number;
  uiPrefs: CabinetUiPreferencesResponse;
  profTestSession?: ProfTestSessionInfo | null;
  children: React.ReactNode;
};

export function CabinetAppShellClient({
  user,
  incomingCount,
  uiPrefs,
  profTestSession,
  children,
}: CabinetAppShellClientProps) {
  const bell = user.id ? <ProfNotificationBell /> : null;
  const banner =
    profTestSession?.active ? <ProfTestModeBanner session={profTestSession} /> : null;

  if (uiPrefs.pilotActive && uiPrefs.permittedKeys && uiPrefs.mobileNavKeys) {
    return (
      <>
        {banner}
        <AgentAppShell
          key={`${uiPrefs.contextKey ?? "none"}:${user.id}`}
          user={user}
          incomingCount={incomingCount}
          notificationBell={bell}
          initialPrefs={uiPrefs}
        >
          {children}
        </AgentAppShell>
      </>
    );
  }

  return (
    <>
      {banner}
      <AppShell user={user} incomingCount={incomingCount} notificationBell={bell}>
        {children}
      </AppShell>
    </>
  );
}
