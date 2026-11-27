import { SessionGate } from "@/components/auth/SessionGate";
import { CabinetShell } from "@/components/layout/CabinetShell";
import { Partner1cCatalogWorkspace } from "@/components/partner-1c-catalog/Partner1cCatalogWorkspace";
import { fetchCabinetPresentationServer } from "@/lib/cabinet-presentation/server";
import {
  fetchPartnerCatalogSnapshotLive,
  snapshotForAudience,
} from "@/lib/partner-1c-catalog/api";
import { canViewPartner1cCatalog } from "@/lib/partner-1c-catalog/gate";
import { partner1cCatalogNavVisible } from "@/lib/partner-1c-catalog/gate";
import { requireProPageUser } from "@/lib/session";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

const RETURN_PATH = "/catalog";

export default async function CatalogPage() {
  const user = await requireProPageUser(RETURN_PATH);
  if (!user) {
    return <SessionGate reason="session" returnTo={RETURN_PATH} />;
  }

  const cookieHeader = (await headers()).get("cookie");
  const { presentation } = await fetchCabinetPresentationServer({ user, cookieHeader });
  const allowed =
    partner1cCatalogNavVisible(presentation) &&
    canViewPartner1cCatalog(presentation.proContext);

  const snap = snapshotForAudience(
    await fetchPartnerCatalogSnapshotLive(presentation.proContext, cookieHeader),
  );

  return (
    <CabinetShell returnTo={RETURN_PATH}>
      {allowed ? (
        <Partner1cCatalogWorkspace snapshot={snap} />
      ) : (
        <p style={{ padding: "1rem 0" }} role="status">
          Раздел «Каталог» недоступен для этого кабинета. Включите флаг PARTNER_1C_CATALOG_ENABLED и
          право catalog для сотрудника.
        </p>
      )}
    </CabinetShell>
  );
}