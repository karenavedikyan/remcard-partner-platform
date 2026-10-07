import { AuthFlow } from "@/components/auth/AuthFlow";
import { sanitizeReturnTo } from "@/lib/auth-flow";

export const dynamic = "force-dynamic";

export default async function LoginPage(
  props: {
    searchParams?: Promise<{ returnTo?: string; reason?: string; step?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const initialStep = searchParams?.step === "consents" ? "consents" : undefined;
  return (
    <AuthFlow
      returnTo={sanitizeReturnTo(searchParams?.returnTo)}
      reason={searchParams?.reason}
      initialStep={initialStep}
    />
  );
}
