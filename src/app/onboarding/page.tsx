import { redirect } from "next/navigation";
import { OnboardingForm } from "@/components/auth/OnboardingForm";
import { sanitizeReturnTo } from "@/lib/auth-flow";
import { fetchRemcardUpstream, getAuthMeServer } from "@/lib/remcard-server";
import type { CabinetReadiness } from "@/lib/cabinet-readiness";
import { hasPendingLoginConsents } from "@/lib/cabinet-readiness";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams?: { returnTo?: string };
}) {
  const cookieHeader = headers().get("cookie");
  const auth = await getAuthMeServer(cookieHeader);
  if (!auth.ok || !auth.data.user) {
    redirect(`/login?returnTo=${encodeURIComponent("/onboarding")}`);
  }
  if (auth.data.user.isBlocked) {
    redirect("/?reason=blocked");
  }

  const readinessResult = await fetchRemcardUpstream<CabinetReadiness>(
    "/api/account/cabinet-readiness",
    { headers: cookieHeader ? { cookie: cookieHeader } : undefined },
  );

  if (readinessResult.ok) {
    const readiness = readinessResult.data;
    if (readiness.isAdmin) {
      redirect("/?reason=role");
    }
    if (hasPendingLoginConsents(readiness)) {
      redirect(
        `/login?${new URLSearchParams({ step: "consents", returnTo: sanitizeReturnTo(searchParams?.returnTo) ?? "/" }).toString()}`,
      );
    }
    if (readiness.canAccessCabinet && !readiness.needsProfileOnboarding) {
      redirect(sanitizeReturnTo(searchParams?.returnTo) ?? "/");
    }
    if (readiness.isEmployee) {
      redirect(sanitizeReturnTo(searchParams?.returnTo) ?? "/");
    }
  }

  return (
    <OnboardingForm
      returnTo={sanitizeReturnTo(searchParams?.returnTo)}
      initialCity={auth.data.user.city}
    />
  );
}
