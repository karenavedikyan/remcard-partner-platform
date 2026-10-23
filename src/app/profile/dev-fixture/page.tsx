import { notFound } from "next/navigation";
import { ProfileEditor } from "@/components/profile/ProfileEditor";
import { PageHeading } from "@/components/ui/PageHeading";
import { DevProfileFixtureChrome } from "./DevProfileFixtureChrome";
import { ownerProfileCabinetAccess } from "@/lib/profile-cabinet-access";
import {
  isModerationDeepLink,
  resolveProfileSectionFromQuery,
  type ProfileSectionId,
} from "@/lib/profile-sections";
import type { ProProfileResponse } from "@/lib/types";

function buildFixtureProfile(
  partnerType: "STORE" | "COMPANY",
  options: { noOrg?: boolean; catalogStatus?: string },
): ProProfileResponse {
  const catalogStatus =
    options.catalogStatus === "PENDING" ? "PENDING" : ("DRAFT" as const);
  const isCompany = partnerType === "COMPANY";
  const branchCount = isCompany ? 1 : 3;
  const publicCatalogBranchId = isCompany ? "branch-co-1" : "branch-st-1";
  const publicCatalogCity = "Краснодар";
  return {
    organization: options.noOrg
      ? null
      : {
          id: "org-fixture",
          name: isCompany ? "СтройКомпания Юг" : "Магазин Юг",
          catalogStatus,
          partnerType,
          branchCount,
          catalogPublished: false,
          publicCatalogBranchId,
          publicCatalogCity,
          storeCategories: ["doors", "plumbing"],
          specializations: ["plumbing"],
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
      partnershipContactPhone: "+79001112233",
      partnershipContactEmail: "partner@example.com",
    },
    catalogPublication: {
      catalogEntity: "organization",
      isLivePublic: false,
      draftPending: false,
      published: {
        description:
          "Монтаж и сервисное обслуживание входных дверей премиум-класса с выездом по городу и области.",
        specializations: ["plumbing"],
        storeCategories: ["doors", "plumbing"],
        website: "https://shop-south.example",
        telegram: "@shop_south",
        publicEmail: "catalog@shop-south.example",
        publicPhone: "+79001234567",
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
      catalogStatus,
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
    wizardStep?: string;
    noOrg?: string;
    catalogStatus?: string;
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
  const noOrg = searchParams?.noOrg === "1";
  const catalogStatusParam = searchParams?.catalogStatus?.toUpperCase();
  const fixtureProfile = buildFixtureProfile(partnerType, {
    noOrg,
    catalogStatus: catalogStatusParam,
  });

  const body = (
    <>
      <PageHeading
        eyebrow="Профиль партнёра"
        title="Профиль"
        description="Dev-fixture в полном CabinetShell: STORE/COMPANY профиль и каталог RemCard."
      />
      <ProfileEditor
        initial={fixtureProfile}
        cabinetAccess={ownerProfileCabinetAccess()}
        section={section}
        moderationSection={moderationSection}
        returnTo="/profile"
      />
    </>
  );

  return (
    <DevProfileFixtureChrome partnerType={partnerType}>{body}</DevProfileFixtureChrome>
  );
}
