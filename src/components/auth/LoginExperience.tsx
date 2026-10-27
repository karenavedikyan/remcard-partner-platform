"use client";

import { AuthFlow } from "@/components/auth/AuthFlow";
import { AdminLoginAccessory } from "@/components/auth/AdminLoginAccessory";
import type { AuthFlowStep } from "@/lib/auth-flow";
import styles from "./auth.module.css";

export type AdminCapabilitiesState = "pending" | "enabled" | "disabled" | "error";

type Props = {
  returnTo?: string | null;
  reason?: string;
  initialStep?: AuthFlowStep;
  initialMode?: "partner" | "admin";
  registrationAgentJoin?: boolean;
};

export function LoginExperience({
  returnTo,
  reason,
  initialStep,
  initialMode = "partner",
  registrationAgentJoin,
}: Props) {
  return (
    <div className={styles.loginEntryShell}>
      <AuthFlow
        returnTo={initialMode === "admin" ? null : returnTo}
        reason={reason}
        initialStep={initialStep}
        registrationAgentJoin={registrationAgentJoin}
        checkSessionOnMount={initialMode !== "admin"}
        layout="full"
      />
      <AdminLoginAccessory returnTo={returnTo} autoOpen={initialMode === "admin"} />
    </div>
  );
}
