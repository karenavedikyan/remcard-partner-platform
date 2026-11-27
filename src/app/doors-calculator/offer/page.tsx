import { SessionGate } from "@/components/auth/SessionGate";
import { DoorCalculatorUnavailable } from "@/components/doorCalculator/DoorCalculatorUnavailable";
import { DoorOfferPage } from "@/components/doorCalculator/DoorOfferPage";
import { CabinetShell } from "@/components/layout/CabinetShell";
import { doorCalculatorFeatureVisible } from "@/lib/door-calculator/access";
import { doorOfferPartnerFromProfile } from "@/lib/door-calculator/partner-offer";
import { fetchCabinetPresentationServer } from "@/lib/cabinet-presentation/server";
import { fetchRemcardUpstream } from "@/lib/remcard-server";
import { requireProPageUser } from "@/lib/session";
import type { ProProfileResponse } from "@/lib/types";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

const RETURN_PATH = "/doors-calculator/offer";

export default async function DoorsCalculatorOfferPage() {
  const user = await requireProPageUser(RETURN_PATH);
  if (!user) {
    return <SessionGate reason="session" returnTo={RETURN_PATH} />;
  }

  const cookieHeader = (await headers()).get("cookie");
  const { presentation } = await fetchCabinetPresentationServer({ user, cookieHeader });
  const allowed = doorCalculatorFeatureVisible(presentation);
  if (!allowed) {
    return (
      <CabinetShell returnTo={RETURN_PATH}>
        <DoorCalculatorUnavailable />
      </CabinetShell>
    );
  }

  const profileResult = await fetchRemcardUpstream<ProProfileResponse>("/api/pro/profile", {
    headers: cookieHeader ? { cookie: cookieHeader } : undefined,
  });
  const initialPartner = profileResult.ok ? doorOfferPartnerFromProfile(profileResult.data) : null;

  return (
    <CabinetShell returnTo={RETURN_PATH}>
      <DoorOfferPage context="lk" initialPartner={initialPartner} />
    </CabinetShell>
  );
}