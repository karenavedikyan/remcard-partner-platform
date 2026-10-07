import { LoginForm } from "@/components/auth/LoginForm";
import { sanitizeReturnTo } from "@/lib/auth-flow";

type SessionGateProps = {
  reason?: string;
  returnTo?: string | null;
};

export function SessionGate({ reason, returnTo }: SessionGateProps) {
  return <LoginForm reason={reason} returnTo={sanitizeReturnTo(returnTo)} />;
}
