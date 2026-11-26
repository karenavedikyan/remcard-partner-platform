import { Suspense } from "react";
import { SessionGate } from "@/components/auth/SessionGate";
import { DoorCalculatorWizard } from "@/components/doorCalculator/DoorCalculatorWizard";
import { DoorCalculatorUnavailable } from "@/components/doorCalculator/DoorCalculatorUnavailable";
import { CabinetShell } from "@/components/layout/CabinetShell";
import { doorCalculatorFeatureVisible } from "@/lib/door-calculator/access";
import { fetchCabinetPresentationServer } from "@/lib/cabinet-presentation/server";
import { requireProPageUser } from "@/lib/session";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

const RETURN_PATH = "/doors-calculator";

export default async function DoorsCalculatorPage() {
  const user = await requireProPageUser(RETURN_PATH);
  if (!user) {
    return <SessionGate reason="session" returnTo={RETURN_PATH} />;
  }

  const cookieHeader = (await headers()).get("cookie");
  const { presentation } = await fetchCabinetPresentationServer({ user, cookieHeader });
  const allowed = doorCalculatorFeatureVisible(presentation);

  return (
    <CabinetShell returnTo={RETURN_PATH}>
      {allowed ? (
        <Suspense
          fallback={
            <p style={{ padding: "1rem 0" }} role="status">
              Загрузка калькулятора дверей…
            </p>
          }
        >
          <DoorCalculatorWizard context="lk" />
        </Suspense>
      ) : (
        <DoorCalculatorUnavailable />
      )}
    </CabinetShell>
  );
}