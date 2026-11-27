import { notFound } from "next/navigation";
import { Partner1cCatalogWorkspace } from "@/components/partner-1c-catalog/Partner1cCatalogWorkspace";
import {
  fetchPartnerCatalogSnapshot,
  snapshotForAudience,
  stripCostFromModels,
} from "@/lib/partner-1c-catalog/api";
import { defaultPublicationState } from "@/lib/partner-1c-catalog/models";
import { buildPartnerModels } from "@/lib/partner-1c-catalog/models";
import { optovikFixtureProducts } from "@/lib/partner-1c-catalog/fixtures";
import { partner1cCatalogFeatureEnabled } from "@/lib/partner-1c-catalog/constants";
import { emptyCatalogListUiAccess } from "@/lib/partner-1c-catalog/catalog-access";
import {
  adaptNavigatorCabinetModelDetail,
  fixtureNavigatorCabinetModelDetailWithApiBranches,
} from "@/lib/partner-1c-catalog/navigator-model-detail";
import { catalogBranchesFromNavigator } from "@/lib/partner-1c-catalog/branches";
import type { NavigatorCabinetBranchOption, NavigatorCabinetModelDetail } from "@/lib/partner-1c-catalog/navigator-types";
import meta3 from "@/lib/partner-1c-catalog/fixtures/cabinet-meta-branches-real.json";
import meta10 from "@/lib/partner-1c-catalog/fixtures/cabinet-meta-branches-real-10.json";
import realDetail3 from "@/lib/partner-1c-catalog/fixtures/cabinet-model-detail-real-3branches.json";
import realDetail10 from "@/lib/partner-1c-catalog/fixtures/cabinet-model-detail-real-10branches.json";

type Props = {
  searchParams: Promise<{ role?: string; branchStock?: string; model?: string; branchSet?: string }>;
};

export default async function CatalogDevFixturePage({ searchParams }: Props) {
  if (process.env.NODE_ENV === "production" || !partner1cCatalogFeatureEnabled()) {
    notFound();
  }

  const { role, branchStock, model: modelId, branchSet } = await searchParams;
  const employee = role === "employee";
  let models = employee
    ? stripCostFromModels(buildPartnerModels(optovikFixtureProducts()))
    : buildPartnerModels(optovikFixtureProducts());

  const baseSnap = fetchPartnerCatalogSnapshot(null);
  let branches = baseSnap.branches;
  let publication = baseSnap.publication;

  const realMeta: NavigatorCabinetBranchOption[] | null =
    branchSet === "real3"
      ? (meta3 as NavigatorCabinetBranchOption[])
      : branchSet === "real10"
        ? (meta10 as NavigatorCabinetBranchOption[])
        : null;
  if (realMeta) {
    branches = catalogBranchesFromNavigator(realMeta);
    publication = defaultPublicationState(branches.map((b) => b.id));
  }

  const captureBranchStock =
    branchStock === "known" || branchStock === "unknown" ? branchStock : null;
  const openId = modelId?.trim() || "p004";
  if (branchSet === "real3" || branchSet === "real10") {
    const dto = (branchSet === "real3" ? realDetail3 : realDetail10) as NavigatorCabinetModelDetail;
    const detailed = adaptNavigatorCabinetModelDetail(dto, { manage: !employee });
    models = models.map((m) => (m.id === openId ? detailed : m));
  } else if (captureBranchStock) {
    const dto = fixtureNavigatorCabinetModelDetailWithApiBranches(captureBranchStock);
    const detailed = adaptNavigatorCabinetModelDetail(dto, { manage: !employee });
    models = models.map((m) => (m.id === openId ? detailed : m));
  }

  const access = emptyCatalogListUiAccess(employee ? "employee-fixture" : "owner-fixture");
  access.canSeeOwnerEconomics = !employee;
  const snap = snapshotForAudience({
    ...baseSnap,
    manage: !employee,
    models,
    branches,
    publication,
    access,
  });

  return (
    <main style={{ maxWidth: 1310, margin: "0 auto", padding: "24px 16px", overflowX: "clip" }}>
      <header style={{ marginBottom: 16 }}>
        <h1 style={{ margin: "8px 0" }}>Каталог (fixture)</h1>
        <p className="muted" style={{ margin: 0 }}>
          {employee ? "Сотрудник" : "Владелец"} · ?role=employee для вида сотрудника
        </p>
      </header>
      <Partner1cCatalogWorkspace snapshot={snap} />
    </main>
  );
}