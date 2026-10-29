"use client";

import { useEffect, useMemo, useState } from "react";
import { AgentR04ListToolbar } from "@/components/partners/AgentR04ListToolbar";
import { PartnerInviteWizard } from "@/components/partners/prototype-v1/PartnerInviteWizard";
import { PartnerRepairPathNav } from "@/components/partners/prototype-v1/PartnerRepairPathNav";
import type { PartnerSearchResult, ProProfileResponse } from "@/lib/types";

const meProfile: ProProfileResponse = {
  user: {
    id: "me",
    publicId: "ME",
    displayName: "Алексей",
    city: "Краснодар",
    specializations: ["painting"],
    role: "PRO",
    partnerType: "MASTER",
    partnerActivities: ["SERVICE"],
    description: null,
    catalogStatus: "APPROVED",
    isPublic: true,
    rejectionReason: null,
    badges: [],
    photoUrl: null,
    storeCategories: [],
    areas: [],
    website: null,
    telegram: null,
    whatsapp: null,
    instagram: null,
    vk: null,
    max: null,
    yandex: null,
    publicEmail: null,
    publicPhone: null,
    showFullName: true,
  },
  organization: null,
  programs: [],
};

const target: PartnerSearchResult = {
  id: "store-1",
  displayName: "Дом материалов",
  city: "Краснодар",
  photoUrl: null,
  description: "LOCAL FIXTURE — не live данные",
  specializations: [],
  badges: [],
  storeCategories: ["doors", "paint"],
  partnerType: "STORE",
  partnerTypeLabel: "Магазин",
  branches: [],
  rating: null,
  ratingCount: 0,
  partnershipStatus: null,
  workingProductLabels: ["Двери", "Краска"],
  workingStageLabels: ["Черновая отделка", "Чистовая отделка"],
  publishedTerms: [
    { category: "doors", categoryLabel: "Двери", poolPercent: 12, storePercent: 12 },
    { category: "paint", categoryLabel: "Краска", poolPercent: 8, storePercent: 8 },
  ],
};

const stages = Array.from({ length: 12 }, (_, i) => ({
  kind: "stage" as const,
  id: `L1-${i + 1}`,
  label: `Этап ${i + 1}`,
}));

function readScene() {
  if (typeof window === "undefined") return "toolbar";
  return window.location.hash.replace(/^#\/?/, "") || "toolbar";
}

export function HarnessApp() {
  const [scene, setScene] = useState(readScene);
  const [viewMode, setViewMode] = useState<"list" | "cards">("list");
  const [filters, setFilters] = useState({
    search: "",
    archiveView: "active" as "active" | "archive" | "hidden",
    partnerType: "" as "" | "agent" | "specialist" | "store" | "company",
    specialization: "",
    stageId: "",
    city: "",
    sort: "updated_desc" as "updated_desc" | "name_asc",
  });

  useEffect(() => {
    const onHash = () => setScene(readScene());
    window.addEventListener("hashchange", onHash);
    onHash();
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const facets = useMemo(
    () => ({
      total: 4,
      byStage: Object.fromEntries(stages.map((s, i) => [s.id, i === 3 ? 0 : 1])),
      byProduct: { doors: 2, paint: 1 },
      byService: { painting: 1 },
    }),
    [],
  );

  return (
    <div style={{ padding: 16, maxWidth: 1100, margin: "0 auto" }} data-testid="partners-proto-harness">
      <p style={{ fontSize: 12, color: "#666" }}>LOCAL FIXTURE · partners-prototype-v1 · scene={scene}</p>
      {scene === "toolbar" ? (
        <AgentR04ListToolbar
          count={2}
          searchQuery={filters.search}
          onSearchQueryChange={(q) => setFilters((f) => ({ ...f, search: q }))}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          archiveView={filters.archiveView}
          onArchiveViewChange={(v) => setFilters((f) => ({ ...f, archiveView: v }))}
          partnerType={filters.partnerType}
          specialization={filters.specialization}
          stageId={filters.stageId}
          city={filters.city}
          sort={filters.sort}
          onPartnerTypeChange={(v) => setFilters((f) => ({ ...f, partnerType: v }))}
          onSpecializationChange={(v) => setFilters((f) => ({ ...f, specialization: v }))}
          onStageChange={(v) => setFilters((f) => ({ ...f, stageId: v }))}
          onCityChange={(v) => setFilters((f) => ({ ...f, city: v }))}
          onSortChange={(v) => setFilters((f) => ({ ...f, sort: v }))}
          onResetFilters={() =>
            setFilters({
              search: "",
              archiveView: "active",
              partnerType: "",
              specialization: "",
              stageId: "",
              city: "",
              sort: "updated_desc",
            })
          }
          taxonomyResetKey={0}
          chips={[]}
        />
      ) : null}
      {scene === "repair-path" ? (
        <PartnerRepairPathNav
          stages={stages}
          products={[
            { kind: "product", id: "doors", label: "Двери" },
            { kind: "product", id: "paint", label: "Краска" },
          ]}
          services={[{ kind: "service", id: "painting", label: "Покраска" }]}
          facets={facets}
          selectedStageId={filters.stageId}
          selectedSpecialization={filters.specialization}
          onStageChange={(stageId) =>
            setFilters((f) => ({ ...f, stageId, specialization: "" }))
          }
          onSpecializationChange={(specialization) =>
            setFilters((f) => ({ ...f, specialization }))
          }
        />
      ) : null}
      {scene === "wizard" ? (
        <PartnerInviteWizard
          target={target}
          meProfile={meProfile}
          onClose={() => undefined}
          onSent={() => undefined}
          disableSubmit
        />
      ) : null}
    </div>
  );
}
