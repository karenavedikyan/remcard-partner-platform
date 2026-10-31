"use client";

import { PartnersHub } from "@/components/partners/PartnersHub";
import type { ProProfileResponse } from "@/lib/types";
import { AgentPartnerHubModal } from "@/components/partners/AgentPartnerHubModal";

const profile: ProProfileResponse = {
  organization: null,
  programs: [],
  user: {
    id: "agent-harness",
    publicId: "RC-H",
    displayName: "Agent Harness",
    city: "Краснодар",
    specializations: [],
    role: "PRO",
    partnerType: "COMPANY",
    partnerActivities: ["AGENT"],
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
    showFullName: false,
  },
};

export function HarnessApp() {
  return (
    <div data-testid="p5b-search-harness" style={{ minHeight: "100vh", padding: 12 }}>
      <p style={{ margin: "0 0 8px", fontSize: 12, color: "var(--muted)" }}>
        P5b search-results harness — fail-closed synthetic fixture, no live mutations
      </p>
      <AgentPartnerHubModal
        open
        tab="find"
        titleFind="Найти партнёра"
        titleLink="Пригласить по ссылке"
        onTabChange={() => {}}
        onClose={() => {}}
      >
        <PartnersHub
          meId="agent-harness"
          initialProfile={profile}
          variant="agent-r04"
          agentModalSurface="find"
          partnersAudience="agent-r04"
        />
      </AgentPartnerHubModal>
    </div>
  );
}
