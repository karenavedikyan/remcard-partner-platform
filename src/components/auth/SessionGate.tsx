import { AuthFlow } from "@/components/auth/AuthFlow";
import { sanitizeReturnTo } from "@/lib/auth-flow";
import { CabinetShellIdentityReporter } from "@/components/layout/CabinetShellIdentityReporter";
import { peekCabinetSession } from "@/lib/session";
import { computeCabinetShellContextToken } from "@/lib/cabinet-shell-context-token";

type SessionGateProps = {
  reason?: string;
  returnTo?: string | null;
  initialStep?: "code" | "consents";
  /** When true, reconciler sees identity "none" (session loss) even if peek still has a user. */
  shellContextTokenNone?: boolean;
};

export async function SessionGate({
  reason,
  returnTo,
  initialStep,
  shellContextTokenNone,
}: SessionGateProps) {
  const user = await peekCabinetSession();
  const freshShellContextToken = shellContextTokenNone
    ? "none"
    : await computeCabinetShellContextToken(user);

  return (
    <>
      <CabinetShellIdentityReporter freshShellContextToken={freshShellContextToken} />
      <AuthFlow
        reason={reason}
        returnTo={sanitizeReturnTo(returnTo)}
        initialStep={initialStep}
      />
    </>
  );
}
