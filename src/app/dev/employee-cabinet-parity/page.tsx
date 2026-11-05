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
import type { ProContextSnapshot } from "@/lib/profile-cabinet-access";
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
  proMasterStoreOrg: {
    user: {
      id: "fixture-pro-master-org",
      displayName: "Синтетический PRO MASTER",
      role: "PRO",
      partnerType: "MASTER",
      partnerActivities: ["MASTER", "AGENT"],
    } satisfies AuthUser,
    proContext: {
      role: "ORG_EMPLOYEE",
      organization: {
        id: "org-store-2",
        name: "Синтетический магазин (PRO staff)",
        partnerType: "STORE",
      },
      branches: [],
      activeBranch: null,
    } satisfies ProContextSnapshot,
  },
};

/** Static chrome preview only — no live upstream metrics/API (coordinator uses SSR synthetic upstream). */
export default async function EmployeeCabinetParityDevPage(props: {
  searchParams?: Promise<{ fixture?: string }>;
}) {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const fixtureKey = (await props.searchParams)?.fixture ?? "storeEmployee";
  const fixture =
    fixtureKey === "companyTeamMember"
      ? FIXTURES.companyTeamMember
      : fixtureKey === "proMasterStoreOrg"
        ? FIXTURES.proMasterStoreOrg
        : FIXTURES.storeEmployee;

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
            description="Статический превью каркаса (без live API)."
          />
          <BusinessOwnerHomeDashboard partnerType={partnerType} homeAccessMode="org-staff-view" />
        </AppShell>
      </CookieConsentProvider>
    </ThemeProvider>
  );
}
