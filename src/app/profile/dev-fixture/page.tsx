import { notFound } from "next/navigation";
import { ProfileEditor } from "@/components/profile/ProfileEditor";
import { resolveProfileSectionFromQuery, type ProfileSectionId } from "@/lib/profile-sections";
import type { ProProfileResponse } from "@/lib/types";

/** Fixture UI for H1 screenshots only; route 404 in production builds. */
const FIXTURE_PROFILE: ProProfileResponse = {
  organization: {
    id: "org-fixture",
    name: "Оптовик Юг",
    catalogStatus: "DRAFT",
    partnerType: "STORE",
    branchCount: 3,
    catalogPublished: false,
  },
  programs: [],
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
    partnerType: "STORE",
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

export default async function ProfileDevFixturePage(props: {
  searchParams?: Promise<{ section?: string; moderation?: string; branchId?: string }>;
}) {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const searchParams = await props.searchParams;
  const section: ProfileSectionId = resolveProfileSectionFromQuery({
    section: searchParams?.section,
    moderation: searchParams?.moderation,
    branchId: searchParams?.branchId,
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
      <header style={{ marginBottom: 24 }}>
        <p style={{ fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase", color: "#6c706a" }}>
          Профиль партнёра
        </p>
        <h1 style={{ margin: "8px 0 0", fontSize: 32 }}>Профиль</h1>
        <p style={{ color: "#6c706a", fontSize: 13, marginTop: 8 }}>
          Fixture UI (без сессии) для проверки PROF-H1.
        </p>
      </header>
      <ProfileEditor initial={FIXTURE_PROFILE} section={section} returnTo="/profile/dev-fixture" />
    </main>
  );
}
