import { notFound } from "next/navigation";
import { ProfileEditor } from "@/components/profile/ProfileEditor";
import { PageHeading } from "@/components/ui/PageHeading";
import { ownerProfileCabinetAccess } from "@/lib/profile-cabinet-access";
import {
  isModerationDeepLink,
  resolveProfileSectionFromQuery,
  type ProfileSectionId,
} from "@/lib/profile-sections";
import type { ProProfileResponse } from "@/lib/types";

function buildFixtureProfile(partnerType: "STORE" | "COMPANY"): ProProfileResponse {
  const isCompany = partnerType === "COMPANY";
  return {
  organization: {
    id: "org-fixture",
    name: isCompany ? "СтройКомпания Юг" : "Магазин Юг",
    catalogStatus: "DRAFT",
    partnerType,
    branchCount: isCompany ? 1 : 3,
    catalogPublished: false,
  },
  programs: [],
  workingProfile: {
    productCategoryIds: ["doors"],
    serviceSpecializationIds: ["plumbing"],
    navigatorStageIds: ["L1-7"],
    primaryDirection: { kind: "product", id: "doors" },
    effectiveProductCategoryIds: ["doors"],
    effectiveServiceSpecializationIds: ["plumbing"],
    partnerSearchVisible: false,
    partnerSearchOptIn: false,
    partnerSearchOptInExplicit: false,
    workingDirectionsTouched: true,
    partnerWorkMode: "BOTH",
    areas: ["Краснодар, Анапа, Новороссийск"],
    partnershipContactName: "Алексей",
    partnershipContactPhone: null,
    partnershipContactEmail: "partner@example.com",
  },
  catalogPublication: {
    catalogEntity: "organization",
    isLivePublic: false,
    draftPending: false,
    published: {
      description: null,
      specializations: [],
      storeCategories: ["doors", "plumbing"],
      website: null,
      telegram: null,
      publicEmail: null,
      publicPhone: null,
    },
  },
  user: {
    id: "u-fixture",
    publicId: "RC-DEMO",
    displayName: "Алексей Петров",
    city: "Краснодар",
    specializations: [],
    role: "PRO",
    partnerType,
    partnerActivities: [partnerType],
    description: null,
    catalogStatus: "DRAFT",
    isPublic: false,
    rejectionReason: null,
    badges: [],
    photoUrl: null,
    storeCategories: ["doors", "plumbing"],
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
}

export default async function ProfileDevFixturePage(props: {
  searchParams?: Promise<{
    section?: string;
    moderation?: string;
    branchId?: string;
    partnerType?: string;
    wizard?: string;
  }>;
}) {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const searchParams = await props.searchParams;
  const query = {
    section: searchParams?.section,
    moderation: searchParams?.moderation,
    branchId: searchParams?.branchId,
  };
  const section: ProfileSectionId = resolveProfileSectionFromQuery(query);
  const moderationSection = isModerationDeepLink(query);
  const partnerTypeParam = searchParams?.partnerType?.toUpperCase();
  const partnerType: "STORE" | "COMPANY" =
    partnerTypeParam === "COMPANY" ? "COMPANY" : "STORE";
  const fixtureProfile = buildFixtureProfile(partnerType);

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
      <PageHeading
        eyebrow="Профиль партнёра"
        title="Профиль"
        description="Fixture UI (без сессии): рабочий профиль STORE/COMPANY и каталог RemCard."
      />
      <ProfileEditor
        initial={fixtureProfile}
        cabinetAccess={ownerProfileCabinetAccess()}
        section={section}
        moderationSection={moderationSection}
        returnTo="/profile/dev-fixture"
      />
    </main>
  );
}
