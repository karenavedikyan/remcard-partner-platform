/**
 * @vitest-environment jsdom
 */
import { useEffect, useState } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { SpecialistCatalogWizard } from "./SpecialistCatalogWizard";
import type { ProfileDraft } from "@/lib/profile-save";
import type { ProProfileResponse } from "@/lib/types";
import { profileDraftFromProfile } from "@/lib/profile-draft-sync";
import * as catalogUpload from "@/lib/catalog-image-upload";

vi.mock("@/lib/partner-taxonomy", () => ({
  fetchPartnerTaxonomy: vi.fn(async () => ({
    products: [],
    services: [{ kind: "service", id: "doors", label: "Монтаж дверей" }],
    stages: [{ kind: "stage", id: "L1-7", label: "⚡ Инженерия" }],
  })),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

function baseProfile(): ProProfileResponse {
  return {
    catalogPublication: {
      catalogEntity: "user",
      isLivePublic: false,
      draftPending: false,
    },
    programs: [],
    workingProfile: {
      productCategoryIds: [],
      serviceSpecializationIds: ["doors"],
      navigatorStageIds: ["L1-7"],
      primaryDirection: null,
      effectiveProductCategoryIds: [],
      effectiveServiceSpecializationIds: [],
      effectiveNavigatorStageIds: [],
      partnerSearchVisible: false,
      partnerSearchOptIn: false,
      partnerSearchOptInExplicit: false,
      workingProductDirectionsTouched: false,
      workingServiceDirectionsTouched: false,
      workingNavigatorStagesTouched: false,
      partnerWorkMode: null,
      areas: [],
      partnershipContactName: null,
      partnershipContactPhone: null,
      partnershipContactEmail: null,
    },
    user: {
      id: "u1",
      role: "PRO",
      partnerType: "SPECIALIST",
      partnerActivities: ["SPECIALIST"],
      displayName: "Spec",
      city: "Краснодар",
      catalogStatus: "DRAFT",
      publicId: "RC9",
      specializations: ["doors"],
      storeCategories: [],
    },
  } as ProProfileResponse;
}

function WizardHarness(props: {
  catalogImageUrl: string;
  onCatalogImageUrlChange: (url: string) => void;
  catalogEditable?: boolean;
}) {
  const profile = baseProfile();
  const draft: ProfileDraft = profileDraftFromProfile(profile);
  const [stageIds, setStageIds] = useState<string[]>(["L1-7"]);
  const [services, setServices] = useState<string[]>(["doors"]);
  const [imageUrl, setImageUrl] = useState(props.catalogImageUrl);

  useEffect(() => {
    setImageUrl(props.catalogImageUrl);
  }, [props.catalogImageUrl]);

  return (
    <SpecialistCatalogWizard
      profile={profile}
      draft={{ ...draft, navigatorStageIds: stageIds, specializations: services }}
      catalogEditable={props.catalogEditable ?? true}
      catalogTouched={{}}
      onCatalogTouchedChange={() => {}}
      onProfileUpdated={() => {}}
      catalogPublicName="Мастер"
      onCatalogPublicNameChange={() => {}}
      catalogCity="Краснодар"
      onCatalogCityChange={() => {}}
      showFullName={false}
      onShowFullNameChange={() => {}}
      catalogImageUrl={imageUrl}
      onCatalogImageUrlChange={(url) => {
        setImageUrl(url);
        props.onCatalogImageUrlChange(url);
      }}
      description=""
      onDescriptionChange={() => {}}
      specializations={services}
      onSpecializationsChange={setServices}
      catalogStageIds={stageIds}
      onCatalogStageIdsChange={setStageIds}
      website=""
      onWebsiteChange={() => {}}
      telegram=""
      onTelegramChange={() => {}}
      publicEmail=""
      onPublicEmailChange={() => {}}
      publicPhone=""
      onPublicPhoneChange={() => {}}
      onPullWorkingDirections={() => {}}
      workingServiceIds={[]}
      workingStageIds={[]}
    />
  );
}

async function goToPhotoStep(ui: ReturnType<typeof userEvent.setup>) {
  await ui.click(screen.getByRole("button", { name: "Далее" }));
  await ui.click(screen.getByRole("button", { name: "Далее" }));
  await ui.click(screen.getByRole("button", { name: "Далее" }));
  await waitFor(() =>
    expect(screen.getByTestId("specialist-catalog-wizard")).toHaveAttribute("data-catalog-step", "3"),
  );
}

describe("SpecialistCatalogWizard photo attachment preview", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("shows thumbnail and status for existing catalogImageUrl after upload success", async () => {
    const ui = userEvent.setup();
    vi.spyOn(catalogUpload, "uploadCatalogImage").mockResolvedValue({
      ok: true,
      url: "https://cdn.example/spec.png",
    });
    const onUrl = vi.fn();
    render(
      <WizardHarness catalogImageUrl="" onCatalogImageUrlChange={onUrl} />,
    );
    await goToPhotoStep(ui);
    expect(screen.queryByTestId("catalog-wizard-photo-attached")).toBeNull();

    const input = screen.getByTestId("specialist-catalog-wizard").querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    const file = new File([new Uint8Array([1])], "s.png", { type: "image/png" });
    await userEvent.upload(input, file);

    await waitFor(() => expect(onUrl).toHaveBeenCalledWith("https://cdn.example/spec.png"));
    expect(screen.getByText("Фото прикреплено")).toBeInTheDocument();
    expect(screen.getByTestId("catalog-wizard-photo-thumb")).toHaveAttribute(
      "src",
      "https://cdn.example/spec.png",
    );
  });

  it("shows saved URL on photo step without new upload", async () => {
    const ui = userEvent.setup();
    render(
      <WizardHarness
        catalogImageUrl="https://cdn.example/existing-spec.png"
        onCatalogImageUrlChange={() => {}}
      />,
    );
    await goToPhotoStep(ui);
    expect(screen.getByTestId("catalog-wizard-photo-thumb")).toHaveAttribute(
      "src",
      "https://cdn.example/existing-spec.png",
    );
    expect(screen.getByRole("button", { name: "Убрать фото" })).toBeInTheDocument();
  });
});
