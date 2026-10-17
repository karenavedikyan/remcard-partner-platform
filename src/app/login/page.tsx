import { LoginExperience } from "@/components/auth/LoginExperience";
import { sanitizeReturnTo } from "@/lib/auth-flow";

export const dynamic = "force-dynamic";

export default async function LoginPage(
  props: {
    searchParams?: Promise<{
      returnTo?: string;
      reason?: string;
      step?: string;
      mode?: string;
      registration?: string;
    }>;
  }
) {
  const searchParams = await props.searchParams;
  const initialStep = searchParams?.step === "consents" ? "consents" : undefined;
  const initialMode = searchParams?.mode === "admin" ? "admin" : "partner";
  const registrationAgentJoin =
    searchParams?.registration === "agent" ||
    searchParams?.returnTo?.includes("phase=finish") === true;
  return (
    <LoginExperience
      returnTo={sanitizeReturnTo(searchParams?.returnTo)}
      reason={searchParams?.reason}
      initialStep={initialStep}
      initialMode={initialMode}
      registrationAgentJoin={registrationAgentJoin}
    />
  );
}
