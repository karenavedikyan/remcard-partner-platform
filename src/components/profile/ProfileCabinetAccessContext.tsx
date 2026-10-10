"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { ProfileCabinetAccess } from "@/lib/profile-cabinet-access";

const ProfileCabinetAccessContext = createContext<ProfileCabinetAccess | null>(null);

export function ProfileCabinetAccessProvider({
  value,
  children,
}: {
  value: ProfileCabinetAccess;
  children: ReactNode;
}) {
  const memo = useMemo(() => value, [value]);
  return (
    <ProfileCabinetAccessContext.Provider value={memo}>{children}</ProfileCabinetAccessContext.Provider>
  );
}

export function useProfileCabinetAccess(): ProfileCabinetAccess {
  const ctx = useContext(ProfileCabinetAccessContext);
  if (!ctx) {
    throw new Error("useProfileCabinetAccess must be used within ProfileCabinetAccessProvider");
  }
  return ctx;
}
