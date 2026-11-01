/** @vitest-environment jsdom */
/**
 * A18a: queue status pills + empty/error panels; detail A18a CSS appendix pins.
 * Preview engine / confirm handlers unchanged.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const nav = vi.hoisted(() => ({
  params: new URLSearchParams(),
  push: vi.fn((url: string) => {
    const q = url.includes("?") ? url.slice(url.indexOf("?") + 1) : "";
    nav.params = new URLSearchParams(q);
  }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: nav.push }),
  useSearchParams: () => nav.params,
}));

const api = vi.hoisted(() => ({
  fetchModerationQueue: vi.fn(),
}));

vi.mock("@/lib/prof-admin-moderation-api", () => api);

import { AdminModerationClient } from "./AdminModerationClient";

const ROOT = path.join(__dirname);
const QUEUE_CSS = path.join(ROOT, "AdminModeration.module.css");
const PARTNER_CSS = path.join(ROOT, "partners/[id]/PartnerModerationDetail.module.css");
const ORG_CSS = path.join(ROOT, "organizations/[id]/OrganizationModerationDetail.r1.module.css");

function sha256(text: string | Buffer) {
  return createHash("sha256").update(text).digest("hex");
}

function a18aQueueRegion(cssText: string): string {
  const start = cssText.indexOf("A18a:");
  expect(start).toBeGreaterThanOrEqual(0);
  return cssText.slice(start);
}

const queuePayload = {
  items: [
    {
      id: "u1",
      entityKind: "user" as const,
      title: "A18a Partner Queue",
      publicId: "RC-A18A",
      city: "Краснодар",
      catalogStatus: "PENDING",
      partnerType: "MASTER",
      isTestPartner: false,
      updatedAt: "2026-11-01T10:00:00.000Z",
    },
  ],
  counts: { totalPending: 1, users: 1, organizations: 0, branches: 0, reviews: 0 },
};

describe("A18a queue presentation", () => {
  beforeEach(() => {
    nav.params = new URLSearchParams();
    api.fetchModerationQueue.mockReset();
    api.fetchModerationQueue.mockResolvedValue(queuePayload);
  });

  it("pins A18a appendix in queue CSS with R1-like status pill", () => {
    const appendix = a18aQueueRegion(readFileSync(QUEUE_CSS, "utf8"));
    expect(appendix).toMatch(/\.statusPill\s*\{/);
    expect(appendix).toMatch(/data-catalog-status="PENDING"/);
    expect(appendix).toMatch(/\.emptyPanel/);
    expect(appendix).toMatch(/\.errorPanel/);
    expect(appendix).not.toMatch(/previewDialog/);
  });

  it("pins A18a detail appendix on org and partner CSS without preview selectors", () => {
    for (const file of [PARTNER_CSS, ORG_CSS]) {
      const appendix = readFileSync(file, "utf8").slice(readFileSync(file, "utf8").indexOf("A18a:"));
      expect(appendix).toMatch(/\.reviewSection/);
      expect(appendix).toMatch(/\.actionsRow/);
      expect(appendix).not.toMatch(/\.previewFooter/);
    }
  });

  it("renders catalog status as pill in table and mobile card", async () => {
    render(<AdminModerationClient />);
    await waitFor(() =>
      expect(document.querySelector('[data-catalog-status="PENDING"]')).toBeTruthy(),
    );
    const pill = document.querySelector('[data-catalog-status="PENDING"]');
    expect(pill?.className).toContain("statusPill");
  });

  it("shows empty panel", async () => {
    api.fetchModerationQueue.mockResolvedValue({
      items: [],
      counts: { totalPending: 0, users: 0, organizations: 0, branches: 0, reviews: 0 },
    });
    render(<AdminModerationClient />);
    await waitFor(() => expect(screen.getByText(/Заявок по фильтру нет/)).toBeTruthy());
  });

  it("shows error panel with retry", async () => {
    const { RemcardApiError } = await import("@/lib/api-client");
    api.fetchModerationQueue.mockRejectedValue(new RemcardApiError("network", 500));
    render(<AdminModerationClient />);
    await waitFor(() => expect(screen.getByText(/Не удалось загрузить очередь/)).toBeTruthy());
    const calls = api.fetchModerationQueue.mock.calls.length;
    fireEvent.click(screen.getByRole("button", { name: "Повторить" }));
    await waitFor(() => expect(api.fetchModerationQueue.mock.calls.length).toBeGreaterThan(calls));
  });
});
