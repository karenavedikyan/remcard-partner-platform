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
import { useAgentCabinetUiPrefs } from "@/components/layout/agent/useAgentCabinetUiPrefs";
import { useCabinetShellPrefsPathRefresh } from "@/hooks/useCabinetShellPrefsPathRefresh";
import {
  enrichCabinetUiPreferencesForShell,
  isActiveAgentCabinetContext,
} from "@/lib/agent-nav/root-destination";

type CabinetAppShellClientProps = {
  user: AuthUser;
  incomingCount: number;
  uiPrefs: CabinetUiPreferencesResponse;
  profTestSession?: ProfTestSessionInfo | null;
  shellContextToken: string;
  children: React.ReactNode;
};

export function CabinetAppShellClient(props: CabinetAppShellClientProps) {
  const layoutPrefs = enrichCabinetUiPreferencesForShell(props.uiPrefs);
  const agentBranch = isActiveAgentCabinetContext(layoutPrefs);

  return (
    <CabinetShellContextProvider shellContextToken={props.shellContextToken}>
      {props.profTestSession?.active ? (
        <ProfTestModeBanner session={props.profTestSession} />
      ) : null}
      {agentBranch ? (
        <AgentCabinetShellBranch {...props} layoutPrefs={layoutPrefs} />
      ) : (
        <LegacyCabinetShellBranch {...props} layoutPrefs={layoutPrefs} />
      )}
    </CabinetShellContextProvider>
  );
}

type ShellBranchProps = CabinetAppShellClientProps & {
  layoutPrefs: CabinetUiPreferencesResponse;
};

function LegacyCabinetShellBranch({
  user,
  incomingCount,
  layoutPrefs,
  shellContextToken,
  children,
}: ShellBranchProps) {
  const shell = useCabinetShellContext();
  useCabinetShellPrefsPathRefresh({
    layoutPrefs,
    onAuthFailure: shell?.notifyAuthFailure,
  });

  return (
    <AppShell
      key={shellContextToken}
      user={user}
      incomingCount={incomingCount}
      notificationBell={user.id ? <CabinetShellNotificationBell /> : null}
    >
      {children}
    </AppShell>
  );
}

function AgentCabinetShellBranch({
  user,
  incomingCount,
  layoutPrefs,
  uiPrefs,
  shellContextToken,
  children,
}: ShellBranchProps) {
  const shell = useCabinetShellContext();
  const agentPrefs = useAgentCabinetUiPrefs(uiPrefs);
  useCabinetShellPrefsPathRefresh({
    layoutPrefs,
    applyServerPrefs: agentPrefs.applyServerPrefs,
    applyAuthFailureClear: agentPrefs.applyAuthFailureClear,
    getApplyGeneration: agentPrefs.getApplyGeneration,
    onAuthFailure: shell?.notifyAuthFailure,
  });

  const agentShellKey = `${shellContextToken}:${layoutPrefs.contextKey ?? "none"}:${user.id}`;

  return (
    <AgentAppShell
      key={agentShellKey}
      user={user}
      incomingCount={incomingCount}
      notificationBell={user.id ? <CabinetShellNotificationBell /> : null}
      prefs={agentPrefs.prefs}
      saveMobileNavKeys={agentPrefs.saveMobileNavKeys}
      saveTheme={agentPrefs.saveTheme}
    >
      {children}
    </AgentAppShell>
  );
}

function CabinetShellNotificationBell() {
  const shell = useCabinetShellContext();
  const remountKey = `${shell?.shellContextToken ?? "none"}:${shell?.authFailureEpoch ?? 0}`;
  return <ProfNotificationBell key={remountKey} />;
}
