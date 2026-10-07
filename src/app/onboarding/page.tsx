import { redirect } from "next/navigation";
import { OnboardingForm } from "@/components/auth/OnboardingForm";
import { sanitizeReturnTo } from "@/lib/auth-flow";
import { fetchRemcardUpstream, getAuthMeServer } from "@/lib/remcard-server";
import type { CabinetReadiness } from "@/lib/cabinet-readiness";
import { hasPendingLoginConsents } from "@/lib/cabinet-readiness";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

export default async function OnboardingPage(
  props: {
    searchParams?: Promise<{ returnTo?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const cookieHeader = (await headers()).get("cookie");
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
    if (readiness.isAdmin && !readiness.needsProfileOnboarding) {
      redirect("/?reason=role");
    }
  }

  return (
    <OnboardingForm
      returnTo={sanitizeReturnTo(searchParams?.returnTo)}
      initialCity={auth.data.user.city}
      initialDisplayName={auth.data.user.displayName}
    />
  );
}
