import { notFound } from "next/navigation";
import { PartnersHub } from "@/components/partners/PartnersHub";
import type { ProProfileResponse } from "@/lib/types";

const FIXTURE_PROFILE: ProProfileResponse = {
  organization: {
    id: "org-fixture",
    name: "Оптовик Юг",
    catalogStatus: "APPROVED",
    partnerType: "STORE",
    branchCount: 2,
    storeCategories: ["doors"],
    specializations: [],
  },
  programs: [],
  user: {
    id: "u-fixture-partners",
    publicId: "RC-PARTNERS-DEMO",
    displayName: "Алексей Петров",
    city: "Краснодар",
    specializations: [],
    role: "PRO",
    partnerType: "STORE",
    description: null,
    catalogStatus: "APPROVED",
    isPublic: true,
    rejectionReason: null,
    badges: [],
    photoUrl: null,
    storeCategories: ["doors"],
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

export default function PartnersDevFixturePage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return (
    <main
      style={{
        boxSizing: "border-box",
        width: "100%",
        maxWidth: 1310,
        minWidth: 0,
        margin: "0 auto",
        padding: "24px clamp(16px, 4vw, 32px)",
      }}
    >
      <header style={{ marginBottom: 24 }}>
        <h1 style={{ margin: "8px 0 0", fontSize: 32 }}>Партнёры (fixture)</h1>
      </header>
      <PartnersHub meId="u-fixture-partners" initialProfile={FIXTURE_PROFILE} />
    </main>
  );
}
