"use client";

import type { AuthUser } from "@/lib/types";
import { ProfNotificationBell } from "@/components/notifications";
import { AppShell } from "@/components/layout/AppShell";

type CabinetAppShellClientProps = {
  user: AuthUser;
  incomingCount: number;
  children: React.ReactNode;
};

export function CabinetAppShellClient({
  user,
  incomingCount,
  children,
}: CabinetAppShellClientProps) {
  return (
    <AppShell
      user={user}
      incomingCount={incomingCount}
      notificationBell={user.id ? <ProfNotificationBell /> : null}
    >
      {children}
    </AppShell>
  );
}
