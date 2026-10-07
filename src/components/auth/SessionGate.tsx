import { AuthFlow } from "@/components/auth/AuthFlow";
import { sanitizeReturnTo } from "@/lib/auth-flow";

type SessionGateProps = {
  reason?: string;
  returnTo?: string | null;
  initialStep?: "code" | "consents";
};

export function SessionGate({ reason, returnTo, initialStep }: SessionGateProps) {
  return (
    <AuthFlow
      reason={reason}
      returnTo={sanitizeReturnTo(returnTo)}
      initialStep={initialStep}
    />
  );
}
