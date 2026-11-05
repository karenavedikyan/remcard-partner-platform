"use client";

import { AppShell } from "@/components/layout/AppShell";
import { cabinetPresentationFixture } from "@/lib/cabinet-presentation/test-fixtures";
import { ThemeProvider } from "@/contexts/ThemeContext";
import type { AuthUser } from "@/lib/types";

type Props = {
  partnerType: "STORE" | "COMPANY";
  children: React.ReactNode;
};

export function DevProfileFixtureChrome({ partnerType, children }: Props) {
  const user: AuthUser = {
    id: "u-fixture",
    publicId: "RC-DEMO",
    displayName: "Алексей Петров",
    role: "PRO",
    city: "Краснодар",
    partnerType,
    partnerActivities: [partnerType],
  };

  return (
    <ThemeProvider>
      <AppShell
        user={user}
        presentation={cabinetPresentationFixture(user)}
        incomingCount={0}
        notificationBell={null}
      >
        {children}
      </AppShell>
    </ThemeProvider>
  );
}
