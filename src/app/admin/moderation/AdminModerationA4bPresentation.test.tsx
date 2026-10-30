/** @vitest-environment jsdom */
/**
 * A4b: presentation-only moderation queue table rows + phone cards.
 * Client / A4a header / filters / child routes stay frozen at ffbc93b.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

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
import styles from "./AdminModeration.module.css";

const ROOT = path.join(__dirname);
const CLIENT = path.join(ROOT, "AdminModerationClient.tsx");
const CSS = path.join(ROOT, "AdminModeration.module.css");

const CLIENT_SHA =
  "810dc2f20e021b15b3173e8113ca483f0cc3a26bcd071c0dd2a0c8df3c8ffef9";
const A4A_COMPLETE_PREFIX_BYTES = 8112;
const A4A_COMPLETE_PREFIX_SHA =
  "633ac78ae95a8bf423d7f455f72073e20714aeaa8a13ebb9396883c4ae7c91cc";

function sha256(text: string | Buffer) {
  return createHash("sha256").update(text).digest("hex");
}

function a4bAppendixRegion(cssText: string): string {
  const start = cssText.indexOf("A4b:");
  expect(start).toBeGreaterThanOrEqual(0);
  return cssText.slice(start);
}

const queuePayload = {
  items: [
    {
      id: "u1",
      entityKind: "user" as const,
      title:
        "ООО «ОченьдлинноенепрерывноеимябезпробеловдляпроверкипереносаXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX»",
      publicId: "RC-PUBLIC-ID-VERYLONGTOKEN-WITHOUT-BREAKS-0123456789ABCDEF",
      city: "Санкт-Петербург-очень-длинный-город",
      catalogStatus: "PENDING",
      partnerType: "MASTER",
      isTestPartner: true,
      updatedAt: "2026-10-30T10:00:00.000Z",
    },
    {
      id: "b1",
      entityKind: "branch" as const,
      organizationId: "org-1",
      organizationName: "Организация-с-очень-длинным-непрерывным-названием-ABCDEFGHIJKLMNOP",
      title: "Филиал длинный",
      publicId: "RC-B-1",
      city: "Казань",
      catalogStatus: "PENDING",
      partnerType: "COMPANY",
      isTestPartner: false,
      updatedAt: "2026-10-30T09:00:00.000Z",
    },
  ],
  counts: { totalPending: 2, users: 1, organizations: 0, branches: 1 },
};

describe("A4b source preservation (ffbc whitelist)", () => {
  it("keeps AdminModerationClient.tsx byte-identical", () => {
    expect(sha256(readFileSync(CLIENT))).toBe(CLIENT_SHA);
  });

  it("keeps accepted A4a CSS tip as unchanged 8112-byte prefix; A4b appendix follows", () => {
    const css = readFileSync(CSS);
    expect(sha256(css.subarray(0, A4A_COMPLETE_PREFIX_BYTES))).toBe(A4A_COMPLETE_PREFIX_SHA);
    expect(css.includes("A4b:")).toBe(true);
    expect(css.indexOf("A4b:")).toBeGreaterThanOrEqual(A4A_COMPLETE_PREFIX_BYTES);
  });

  it("scopes A4b appendix to queue table/card nodes only", () => {
    const appendix = a4bAppendixRegion(readFileSync(CSS, "utf8"));
    expect(appendix).toMatch(/\.tableWrap\s*\{/);
    expect(appendix).toMatch(/\.table\s*\{/);
    expect(appendix).toMatch(/table-layout:\s*fixed/);
    expect(appendix).toMatch(/min-width:\s*640px/);
    expect(appendix).toMatch(/\.table > thead > tr > th/);
    expect(appendix).toMatch(/\.table > tbody > tr > td/);
    expect(appendix).toMatch(/padding:\s*12px 16px/);
    expect(appendix).toMatch(/\.table > tbody > tr > td > a/);
    expect(appendix).toMatch(/font-weight:\s*650/);
    expect(appendix).toMatch(/\.table > tbody > tr > td > \.badgeTest/);
    expect(appendix).toMatch(/\.table > tbody > tr > td > \.subMeta/);
    expect(appendix).toMatch(/\.cards\s*>\s*\.card|\.cards > \.card/);
    expect(appendix).toMatch(/\.cardTitle > a/);
    expect(appendix).toMatch(/\.cardTitle > \.subMeta/);
    expect(appendix).toMatch(/\.card > p\.subMeta/);
    expect(appendix).toMatch(/overflow-wrap:\s*anywhere/);
    expect(appendix).toMatch(/:focus-visible/);
    expect(appendix).not.toMatch(/-webkit-line-clamp/);
    expect(appendix).not.toMatch(/text-overflow:\s*ellipsis/);
    expect(appendix).not.toMatch(/\.page\s*\{/);
    expect(appendix).not.toMatch(/\.title\s*\{/);
    expect(appendix).not.toMatch(/\.toolbar\s*\{/);
    expect(appendix).not.toMatch(/\.error\s*\{/);
    expect(appendix).not.toMatch(/\.empty\s*\{/);
    expect(appendix).not.toMatch(/^\s*\.subMeta\s*\{/m);
    expect(appendix).not.toMatch(/^\s*\.badgeTest\s*\{/m);
    expect(appendix).not.toMatch(/!important/);
  });
});

describe("A4b presentation (behavior preserved)", () => {
  beforeEach(() => {
    nav.params = new URLSearchParams("status=PENDING");
    nav.push.mockClear();
    api.fetchModerationQueue.mockReset();
    api.fetchModerationQueue.mockResolvedValue(queuePayload);
  });

  it("keeps five table columns and card payload without partnerType on phone meta", async () => {
    render(<AdminModerationClient />);
    await waitFor(() => expect(screen.getAllByTestId("moderation-queue-card").length).toBe(2));

    const headers = screen.getAllByRole("columnheader").map((h) => h.textContent);
    expect(headers).toEqual(["Объект", "Тип", "Город", "Статус", "Обновлено"]);

    const link = screen.getAllByRole("link").find((a) =>
      (a.textContent || "").includes("Оченьдлинноенепрерывноеимя"),
    );
    expect(link).toBeTruthy();
    expect(link!.getAttribute("href")).toContain("/admin/moderation/partners/u1");
    expect(link!.getAttribute("href")).toContain("status=PENDING");
    // Identity remains a Link, not a row/card wrapper
    expect(link!.closest("tr") || link!.closest("[data-testid='moderation-queue-card']")).toBeTruthy();
    expect(link!.tagName).toBe("A");

    expect(screen.getAllByText("TEST").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/RC-PUBLIC-ID-VERYLONGTOKEN/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Организация-с-очень-длинным/).length).toBeGreaterThan(0);

    // Phone cards: entity · status and city · date — still no partnerType line
    const cards = screen.getAllByTestId("moderation-queue-card");
    for (const card of cards) {
      const text = card.textContent || "";
      expect(text).not.toMatch(/Специалист|Магазин|Компания/);
    }

    // Branch keeps organizationId route with branch query key
    const branchLink = screen.getAllByRole("link").find((a) => a.textContent === "Филиал длинный");
    expect(branchLink?.getAttribute("href")).toContain("/admin/moderation/organizations/org-1");
    expect(branchLink?.getAttribute("href")).toContain("branch=b1");
  });

  it("exposes queue skin classes used by A4b appendix", async () => {
    render(<AdminModerationClient />);
    await waitFor(() => expect(screen.getByRole("table")).toBeTruthy());
    expect(document.querySelector(`.${styles.tableWrap}`)).toBeTruthy();
    expect(document.querySelector(`.${styles.table}`)).toBeTruthy();
    expect(document.querySelector(`.${styles.cards}`)).toBeTruthy();
    expect(document.querySelector(`.${styles.cardTitle}`)).toBeTruthy();
    expect(document.querySelector(`.${styles.badgeTest}`)).toBeTruthy();
    expect(document.querySelectorAll(`.${styles.subMeta}`).length).toBeGreaterThan(0);
  });
});
