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

type Props = {
  searchParams: Promise<{ role?: string }>;
};

export default async function CatalogDevFixturePage({ searchParams }: Props) {
  if (process.env.NODE_ENV === "production" || !partner1cCatalogFeatureEnabled()) {
    notFound();
  }

  const { role } = await searchParams;
  const employee = role === "employee";
  const models = employee ? stripCostFromModels(buildPartnerModels(optovikFixtureProducts())) : buildPartnerModels(optovikFixtureProducts());

  const snap = snapshotForAudience({
    ...fetchPartnerCatalogSnapshot(null),
    manage: !employee,
    models,
    publication: defaultPublicationState(),
  });

  return (
    <main style={{ maxWidth: 1310, margin: "0 auto", padding: "24px 16px" }}>
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