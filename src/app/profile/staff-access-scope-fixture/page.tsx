import { notFound } from "next/navigation";
import { ProfileEditor } from "@/components/profile/ProfileEditor";
import { deriveProfileCabinetAccess } from "@/lib/profile-cabinet-access";
import { resolveProfileSectionFromQuery } from "@/lib/profile-sections";
import type { ProProfileResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

/** Synthetic staff-scope UI (fixture data only; for smoke / QA). */
const STAFF_PROFILE: ProProfileResponse = {
  organization: {
    id: "org-scope-fixture",
    name: "ОПТОВИК",
    catalogStatus: "DRAFT",
    partnerType: "STORE",
    branchCount: 6,
  },
  programs: [],
  user: {
    id: "u-scope-fixture",
    publicId: "RC-SCOPE-FIX",
    displayName: "Scope Staff",
    city: "Краснодар",
    specializations: [],
    role: "CLIENT",
    partnerType: null,
    description: null,
    catalogStatus: "DRAFT",
    isPublic: false,
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

const BRANCHES = Array.from({ length: 6 }, (_, i) => ({
  id: `b${i}`,
  name: i === 0 ? "ОПТОВИК" : `F${i + 1}`,
  city: "Краснодар",
  address: i === 0 ? "ул. 40 лет Победы, 168" : `ул. ${i}`,
}));

export default async function StaffAccessScopeFixturePage(props: {
  searchParams?: Promise<{ section?: string }>;
}) {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const searchParams = await props.searchParams;
  const section = resolveProfileSectionFromQuery({ section: searchParams?.section });

  const cabinetAccess = deriveProfileCabinetAccess({
    profile: STAFF_PROFILE,
    proContext: {
      role: "BRANCH_EMPLOYEE",
      organization: { id: "org-scope-fixture", name: "ОПТОВИК" },
      membershipKind: "HEAD_OFFICE",
      membershipPosition: "Менеджер",
      branches: BRANCHES,
      activeBranch: BRANCHES[0]!,
      teamCapabilities: {
        canOpenTeamSection: false,
        canFetchEmployeesOverview: false,
        canManageEmployeesByBranchId: {},
      },
    },
    contextReady: true,
  });

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
      <ProfileEditor
        initial={STAFF_PROFILE}
        cabinetAccess={cabinetAccess}
        section={section}
        moderationSection={false}
        returnTo="/profile/staff-access-scope-fixture"
      />
    </main>
  );
}
