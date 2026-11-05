import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { BusinessOwnerHomeDashboard } from "@/components/home/BusinessOwnerHomeDashboard";
import { PageHeading } from "@/components/ui/PageHeading";
import { CookieConsentProvider } from "@/contexts/CookieConsentContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { resolveCabinetPresentation } from "@/lib/cabinet-presentation/resolve";
import {
  companyOrgEmployeeContext,
  storeOrgEmployeeContext,
} from "@/lib/cabinet-presentation/test-fixtures";
import type { AuthUser } from "@/lib/types";

const FIXTURES = {
  storeEmployee: {
    user: {
      id: "fixture-store-employee",
      displayName: "Синтетический сотрудник",
      role: "CLIENT",
      partnerType: null,
      partnerActivities: [],
    } satisfies AuthUser,
    proContext: storeOrgEmployeeContext,
  },
  companyTeamMember: {
    user: {
      id: "fixture-company-team",
      displayName: "Синтетический участник",
      role: "CLIENT",
      partnerType: null,
      partnerActivities: [],
    } satisfies AuthUser,
    proContext: companyOrgEmployeeContext,
  },
} as const;

/** Native smoke: employee vs owner shell parity with strictly synthetic GET /api/pro/context shapes. */
export default async function EmployeeCabinetParityDevPage(props: {
  searchParams?: Promise<{ fixture?: string }>;
}) {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const fixtureKey = (await props.searchParams)?.fixture ?? "storeEmployee";
  const fixture =
    fixtureKey === "companyTeamMember" ? FIXTURES.companyTeamMember : FIXTURES.storeEmployee;

  const presentation = resolveCabinetPresentation({
    user: fixture.user,
    proContext: fixture.proContext,
    contextReady: true,
    contextHttpStatus: 200,
  });
  const partnerType = presentation.workplacePartnerType ?? "STORE";
  const eyebrow = partnerType === "STORE" ? "Магазин" : "Компания";

  return (
    <ThemeProvider>
      <CookieConsentProvider>
        <AppShell user={fixture.user} presentation={presentation} incomingCount={0}>
          <PageHeading
            eyebrow={eyebrow}
            title="Ваш кабинет"
            description="Синтетический превью: сотрудник организации с тем же каркасом, что у владельца."
          />
          <BusinessOwnerHomeDashboard partnerType={partnerType} />
        </AppShell>
      </CookieConsentProvider>
    </ThemeProvider>
  );
}
