/**
 * @vitest-environment jsdom
 */
import { useState } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { OrganizationCatalogWizard } from "./OrganizationCatalogWizard";
import type { ProfileDraft } from "@/lib/profile-save";
import type { ProProfileResponse } from "@/lib/types";
import { profileDraftFromProfile } from "@/lib/profile-draft-sync";
import * as catalogUpload from "@/lib/catalog-image-upload";

vi.mock("@/lib/partner-taxonomy", () => ({
  fetchPartnerTaxonomy: vi.fn(async () => ({
    products: [{ kind: "product", id: "doors", label: "Двери" }],
    services: [{ kind: "service", id: "doors", label: "Монтаж дверей" }],
    stages: [{ kind: "stage", id: "L1-7", label: "⚡ Инженерия" }],
  })),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("./OrganizationCatalogPublicBranchSelector", () => ({
  OrganizationCatalogPublicBranchSelector: () => null,
}));

function baseProfile(partnerType: "STORE" | "COMPANY"): ProProfileResponse {
  return {
    organization: {
      id: "org-st",
      name: "Магазин",
      catalogStatus: "DRAFT",
      partnerType,
      branchCount: 1,
      publicCatalogBranchId: "br-1",
      publicCatalogCity: "Краснодар",
      storeCategories: [],
      specializations: [],
    },
    catalogPublication: {
      catalogEntity: "organization",
      isLivePublic: false,
      draftPending: false,
    },
    programs: [],
    workingProfile: {
      productCategoryIds: [],
      serviceSpecializationIds: [],
      navigatorStageIds: [],
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
      partnerType,
      partnerActivities: [partnerType],
      displayName: "Rep",
      city: "Краснодар",
      catalogStatus: "DRAFT",
      publicId: "RC1",
      specializations: [],
      storeCategories: [],
    },
  } as ProProfileResponse;
}

function WizardHarness(props: {
  partnerType: "STORE" | "COMPANY";
  onCatalogTouchedChange: (t: ProfileDraft["catalogTouched"]) => void;
  onCatalogImageUrlChange: (url: string) => void;
  catalogImageUrl: string;
  description: string;
  onDescriptionChange: (v: string) => void;
}) {
  const profile = baseProfile(props.partnerType);
  const draft: ProfileDraft = {
    ...profileDraftFromProfile(profile),
    catalogTouched: {},
    description: props.description,
  };
  const [stageIds, setStageIds] = useState<string[]>(["L1-7"]);
  const [storeCategories] = useState<string[]>(["doors"]);

  return (
    <OrganizationCatalogWizard
      profile={profile}
      draft={{ ...draft, storeCategories, navigatorStageIds: stageIds }}
      partnerType={props.partnerType}
      needsBranchFields={false}
      catalogEditable
      catalogTouched={{}}
      onCatalogTouchedChange={props.onCatalogTouchedChange}
      onProfileUpdated={() => {}}
      organizationName="Магазин"
      onOrganizationNameChange={() => {}}
      catalogCity="Краснодар"
      onCatalogCityChange={() => {}}
      branchAddress=""
      onBranchAddressChange={() => {}}
      catalogImageUrl={props.catalogImageUrl}
      onCatalogImageUrlChange={props.onCatalogImageUrlChange}
      description={props.description}
      onDescriptionChange={props.onDescriptionChange}
      specializations={[]}
      onSpecializationsChange={() => {}}
      storeCategories={storeCategories}
      onStoreCategoriesChange={() => {}}
      website=""
      onWebsiteChange={() => {}}
      telegram=""
      onTelegramChange={() => {}}
      publicEmail=""
      onPublicEmailChange={() => {}}
      publicPhone=""
      onPublicPhoneChange={() => {}}
      workingProductIds={[]}
      workingServiceIds={[]}
      workingStageIds={[]}
      catalogStageIds={stageIds}
      onCatalogStageIdsChange={setStageIds}
      onPullWorkingDirections={() => {}}
    />
  );
}

describe("OrganizationCatalogWizard catalog image upload (STORE/COMPANY step 4)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("clears error on retry, keeps description, sets URL and touched after success", async () => {
    const ui = userEvent.setup();
    const uploadSpy = vi
      .spyOn(catalogUpload, "uploadCatalogImage")
      .mockResolvedValueOnce({ ok: false, error: "Не удалось обработать изображение. Выберите JPG или PNG." })
      .mockResolvedValueOnce({ ok: true, url: "https://cdn.example/org.png" });
    const onUrl = vi.fn();
    const onTouched = vi.fn();
    let description = "Описание черновика";
    render(
      <WizardHarness
        partnerType="COMPANY"
        catalogImageUrl=""
        description={description}
        onDescriptionChange={(v) => {
          description = v;
        }}
        onCatalogImageUrlChange={onUrl}
        onCatalogTouchedChange={onTouched}
      />,
    );
    await ui.click(screen.getByRole("button", { name: "Далее" }));
    await ui.click(screen.getByRole("button", { name: "Далее" }));
    await ui.click(screen.getByRole("button", { name: "Далее" }));
    await waitFor(() =>
      expect(screen.getByTestId("organization-catalog-wizard")).toHaveAttribute("data-catalog-step", "3"),
    );

    const file = new File([new Uint8Array([137, 80, 78, 71])], "a.png", { type: "image/png" });
    const input = screen.getByTestId("organization-catalog-wizard").querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });
    await waitFor(() =>
      expect(screen.getByText("Не удалось обработать изображение. Выберите JPG или PNG.")).toBeInTheDocument(),
    );
    expect(onUrl).not.toHaveBeenCalled();

    fireEvent.change(input, { target: { files: [file] } });
    await waitFor(() => expect(onUrl).toHaveBeenCalledWith("https://cdn.example/org.png"));
    expect(screen.queryByText("Не удалось обработать изображение. Выберите JPG или PNG.")).toBeNull();
    expect(description).toBe("Описание черновика");
    expect(onTouched).toHaveBeenCalled();
    expect(uploadSpy).toHaveBeenCalledTimes(2);
  });

  it("does not clear existing catalog image URL on upload failure", async () => {
    const ui = userEvent.setup();
    vi.spyOn(catalogUpload, "uploadCatalogImage").mockResolvedValue({
      ok: false,
      error: "Не удалось обработать изображение. Выберите JPG или PNG.",
    });
    const onUrl = vi.fn();
    render(
      <WizardHarness
        partnerType="STORE"
        catalogImageUrl="https://cdn.example/previous.png"
        description=""
        onDescriptionChange={() => {}}
        onCatalogImageUrlChange={onUrl}
        onCatalogTouchedChange={() => {}}
      />,
    );
    await ui.click(screen.getByRole("button", { name: "Далее" }));
    await ui.click(screen.getByRole("button", { name: "Далее" }));
    await ui.click(screen.getByRole("button", { name: "Далее" }));
    await waitFor(() =>
      expect(screen.getByTestId("organization-catalog-wizard")).toHaveAttribute("data-catalog-step", "3"),
    );

    const input = screen.getByTestId("organization-catalog-wizard").querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    fireEvent.change(input, {
      target: { files: [new File([new Uint8Array([1, 2, 3])], "bad.png", { type: "image/png" })] },
    });
    await waitFor(() =>
      expect(screen.getByText("Не удалось обработать изображение. Выберите JPG или PNG.")).toBeInTheDocument(),
    );
    expect(onUrl).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Заменить фото" })).toBeInTheDocument();
  });
});
