/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, waitFor, cleanup, act } from "@testing-library/react";
import { ModerationPreviewModal } from "./ModerationPreviewModal";
import type { ModerationOrgDetail } from "@/lib/prof-admin-moderation-org-display";

const { fetchPreview } = vi.hoisted(() => ({ fetchPreview: vi.fn() }));

vi.mock("@/lib/prof-admin-moderation-api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/prof-admin-moderation-api")>();
  return {
    ...actual,
    fetchModerationOrganizationPublicPreview: fetchPreview,
  };
});

vi.mock("./ModerationOrgCatalogFullPreview", () => ({
  ModerationOrgCatalogFullPreview: () => <div data-testid="full-preview-loaded">Preview loaded</div>,
}));

function sampleOrg(overrides: Partial<ModerationOrgDetail> = {}): ModerationOrgDetail {
  return {
    id: "org1",
    name: "Synthetic org",
    partnerType: "COMPANY",
    revisionToken: "rev-org",
    catalogStatus: "PENDING",
    isTestPartner: false,
    submitted: {},
    live: {},
    branches: [],
    publicContacts: [],
    ...overrides,
  } as ModerationOrgDetail;
}

describe("ModerationPreviewModal full preview fetch", () => {
  beforeEach(() => {
    fetchPreview.mockReset();
    fetchPreview.mockResolvedValue({
      organizationRevisionToken: "rev-org",
      branchRevisions: {},
      organization: { publicContacts: [] },
      branches: [],
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("does not refetch when loading state updates after a single mount", async () => {
    fetchPreview.mockImplementation(() => {
      if (fetchPreview.mock.calls.length <= 3) {
        return Promise.resolve({
          organizationRevisionToken: "rev-org",
          branchRevisions: {},
          organization: { publicContacts: [] },
          branches: [],
        });
      }
      return new Promise(() => {});
    });

    render(<ModerationPreviewModal open mode="full" org={sampleOrg()} onClose={() => {}} />);
    await waitFor(() => expect(fetchPreview).toHaveBeenCalled());
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 75));
    });
    expect(fetchPreview.mock.calls.length).toBe(1);
  });

  it("does not refetch on rerender with the same revision key", async () => {
    const org = sampleOrg();
    const { rerender } = render(
      <ModerationPreviewModal open mode="full" org={org} onClose={() => {}} />,
    );
    await waitFor(() => expect(fetchPreview).toHaveBeenCalledTimes(1));

    rerender(
      <ModerationPreviewModal
        open
        mode="full"
        org={{ ...org, name: "Renamed label only" }}
        onClose={() => {}}
      />,
    );
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
    expect(fetchPreview.mock.calls.length).toBe(1);
  });

  it("refetches exactly once when org revision token changes", async () => {
    const org = sampleOrg();
    const { rerender } = render(
      <ModerationPreviewModal open mode="full" org={org} onClose={() => {}} />,
    );
    await waitFor(() => expect(fetchPreview).toHaveBeenCalledTimes(1));

    rerender(
      <ModerationPreviewModal
        open
        mode="full"
        org={sampleOrg({ revisionToken: "rev-org-v2" })}
        onClose={() => {}}
      />,
    );
    await waitFor(() => expect(fetchPreview).toHaveBeenCalledTimes(2));
  });

  it("aborts on close and ignores late response for a new open", async () => {
    let resolveFirst: ((v: unknown) => void) | undefined;
    fetchPreview.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveFirst = resolve;
        }),
    );
    fetchPreview.mockResolvedValue({
      organizationRevisionToken: "rev-2",
      branchRevisions: {},
      organization: { publicContacts: [] },
      branches: [],
    });

    const { rerender } = render(
      <ModerationPreviewModal open mode="full" org={sampleOrg()} onClose={() => {}} />,
    );
    expect(fetchPreview).toHaveBeenCalledTimes(1);

    rerender(<ModerationPreviewModal open={false} mode="full" org={sampleOrg()} onClose={() => {}} />);

    rerender(
      <ModerationPreviewModal
        open
        mode="full"
        org={sampleOrg({ id: "org2", revisionToken: "rev-2" })}
        onClose={() => {}}
      />,
    );
    await waitFor(() => expect(fetchPreview).toHaveBeenCalledTimes(2));
    await waitFor(() =>
      expect(document.querySelector('[data-testid="full-preview-loaded"]')).toBeTruthy(),
    );

    await act(async () => {
      resolveFirst?.({
        organizationRevisionToken: "rev-org",
        branchRevisions: {},
        organization: { name: "Stale must not win" },
        branches: [],
      });
      await new Promise((r) => setTimeout(r, 30));
    });
    expect(document.body.textContent).not.toContain("Stale must not win");
    expect(document.querySelector('[data-testid="full-preview-loaded"]')).toBeTruthy();
  });
});
