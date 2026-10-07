import { redirect } from "next/navigation";
import { OnboardingForm } from "@/components/auth/OnboardingForm";
import { sanitizeReturnTo } from "@/lib/auth-flow";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams?: { returnTo?: string };
}) {
  const user = await getSessionUser();
  if (!user) {
    redirect(`/login?returnTo=${encodeURIComponent("/onboarding")}`);
  }
  if (user.isBlocked) {
    redirect("/?reason=blocked");
  }
  if (user.role === "PRO") {
    redirect(sanitizeReturnTo(searchParams?.returnTo) ?? "/");
  }

  return (
    <OnboardingForm
      returnTo={sanitizeReturnTo(searchParams?.returnTo)}
    />
  );
}
