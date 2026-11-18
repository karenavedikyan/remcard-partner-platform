"use client";

import type { AuthUser } from "@/lib/types";
import { ProfNotificationBell } from "@/components/notifications";
import { AppShell } from "@/components/layout/AppShell";
import { AgentAppShell } from "@/components/layout/agent/AgentAppShell";
import type { CabinetUiPreferencesResponse } from "@/lib/cabinet-ui-preferences-types";
import { ProfTestModeBanner } from "@/components/layout/ProfTestModeBanner";
import type { ProfTestSessionInfo } from "@/lib/types";
import type { CabinetPresentationSnapshot } from "@/lib/cabinet-presentation/types";
import { workspaceTypeCaption } from "@/lib/cabinet-presentation/workplace-kind";
import { CabinetPresentationProvider } from "@/components/layout/CabinetPresentationContext";
import { CabinetPresentationRefreshListener } from "@/components/layout/CabinetPresentationRefreshListener";
import { shouldUseAgentPilotCabinetShell } from "@/lib/agent-nav/root-destination";
import { agentEmployeeUiPrefs, shouldUseAgentEmployeeShell } from "@/lib/agent-nav/employee-nav";
import { resolveWorkspaceOrganizationName } from "@/lib/cabinet-presentation/resolve";

type CabinetAppShellClientProps = {
  user: AuthUser;
  presentation: CabinetPresentationSnapshot;
  incomingCount: number;
  uiPrefs: CabinetUiPreferencesResponse;
  profTestSession?: ProfTestSessionInfo | null;
  children: React.ReactNode;
};

export function CabinetAppShellClient({
  user,
  presentation,
  incomingCount,
  uiPrefs,
  profTestSession,
  children,
}: CabinetAppShellClientProps) {
  const bell = user.id ? <ProfNotificationBell /> : null;
  const banner =
    profTestSession?.active ? <ProfTestModeBanner session={profTestSession} /> : null;

  const wrapped = (node: React.ReactNode) => (
    <CabinetPresentationProvider value={presentation}>
      <CabinetPresentationRefreshListener />
      {node}
    </CabinetPresentationProvider>
  );

  if (shouldUseAgentPilotCabinetShell(uiPrefs, presentation)) {
    return wrapped(
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
      </>,
    );
  }

  if (shouldUseAgentEmployeeShell(presentation)) {
    const employeePrefs = agentEmployeeUiPrefs(presentation.proContext);
    return wrapped(
      <>
        {banner}
        <AgentAppShell
          key={`employee:${user.id}`}
          user={user}
          incomingCount={incomingCount}
          notificationBell={bell}
          initialPrefs={employeePrefs}
          workspace={{
            title:
              resolveWorkspaceOrganizationName(presentation.proContext) ??
              presentation.workspaceOrganizationName ??
              user.displayName?.trim() ??
              "Агент",
            hint: workspaceTypeCaption({
              workplaceKind: presentation.workplaceKind,
              proContext: presentation.proContext,
            }),
            roleLabel: presentation.sessionRoleLabel,
          }}
        >
          {children}
        </AgentAppShell>
      </>,
    );
  }

  return wrapped(
    <>
      {banner}
      <AppShell
        user={user}
        presentation={presentation}
        incomingCount={incomingCount}
        notificationBell={bell}
      >
        {children}
      </AppShell>
    </>,
  );
}
