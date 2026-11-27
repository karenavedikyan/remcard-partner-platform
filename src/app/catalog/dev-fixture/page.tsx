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

type Props = {
  searchParams: Promise<{ role?: string; branchStock?: string; model?: string }>;
};

export default async function CatalogDevFixturePage({ searchParams }: Props) {
  if (process.env.NODE_ENV === "production" || !partner1cCatalogFeatureEnabled()) {
    notFound();
  }

  const { role, branchStock, model: modelId } = await searchParams;
  const employee = role === "employee";
  let models = employee
    ? stripCostFromModels(buildPartnerModels(optovikFixtureProducts()))
    : buildPartnerModels(optovikFixtureProducts());

  const captureBranchStock =
    branchStock === "known" || branchStock === "unknown" ? branchStock : null;
  if (captureBranchStock) {
    const dto = fixtureNavigatorCabinetModelDetailWithApiBranches(captureBranchStock);
    const detailed = adaptNavigatorCabinetModelDetail(dto, { manage: !employee });
    const openId = modelId?.trim() || "p004";
    models = models.map((m) => (m.id === openId ? detailed : m));
  }

  const access = emptyCatalogListUiAccess(employee ? "employee-fixture" : "owner-fixture");
  access.canSeeOwnerEconomics = !employee;
  const snap = snapshotForAudience({
    ...fetchPartnerCatalogSnapshot(null),
    manage: !employee,
    models,
    publication: defaultPublicationState(),
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