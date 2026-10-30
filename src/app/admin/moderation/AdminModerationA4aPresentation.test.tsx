/** @vitest-environment jsdom */
/**
 * A4a: presentation-only moderation queue header + filter toolbar.
 * Client / queue behavior / child routes stay frozen at 7c7d38a.
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
import styles from "./AdminModeration.module.css";

const ROOT = path.join(__dirname);
const CLIENT = path.join(ROOT, "AdminModerationClient.tsx");
const CSS = path.join(ROOT, "AdminModeration.module.css");

/** 7c7d38a freeze pins */
const CLIENT_SHA =
  "810dc2f20e021b15b3173e8113ca483f0cc3a26bcd071c0dd2a0c8df3c8ffef9";
const CSS_PREFIX_SHA =
  "1455e6ffd90a4e48b96d74b88a5f965d91a2c9ec710891065c43d3f3eefba75a";
const CSS_PREFIX_BYTES = 2375;

function sha256(text: string | Buffer) {
  return createHash("sha256").update(text).digest("hex");
}

const queuePayload = {
  items: [
    {
      id: "u1",
      entityKind: "user",
      title: "Партнёр Тест",
      publicId: "RC-1",
      city: "Москва",
      catalogStatus: "PENDING",
      partnerType: "MASTER",
      isTestPartner: false,
      updatedAt: "2026-10-30T10:00:00.000Z",
    },
  ],
  counts: { totalPending: 3, users: 2, organizations: 1, branches: 0 },
};

describe("A4a source preservation (7c7d whitelist)", () => {
  it("keeps AdminModerationClient.tsx byte-identical to 7c7d38a", () => {
    expect(sha256(readFileSync(CLIENT))).toBe(CLIENT_SHA);
  });

  it("keeps baseline CSS as an unchanged prefix; only A4a appendix follows", () => {
    const css = readFileSync(CSS);
    expect(css.subarray(0, CSS_PREFIX_BYTES).byteLength).toBe(CSS_PREFIX_BYTES);
    expect(sha256(css.subarray(0, CSS_PREFIX_BYTES))).toBe(CSS_PREFIX_SHA);
    expect(css.includes("A4a:")).toBe(true);
  });

  it("scopes appendix to title/summary/toolbar direct controls only", () => {
    const appendix = readFileSync(CSS, "utf8").slice(
      readFileSync(CSS, "utf8").indexOf("A4a:"),
    );
    expect(appendix).toMatch(/\.title\s*\{/);
    expect(appendix).toMatch(
      /--moderation-a4a-text-xl:\s*clamp\(1\.5rem,\s*1\.3rem \+ 0\.45vw,\s*1\.875rem\)/,
    );
    expect(appendix).toMatch(/font-weight:\s*800/);
    expect(appendix).toMatch(/line-height:\s*1\.25/);
    expect(appendix).toMatch(/\.summary\s*\{/);
    expect(appendix).toMatch(/\.summary strong\s*\{/);
    expect(appendix).toMatch(/\.toolbar\s*\{/);
    expect(appendix).toMatch(/border:\s*1px solid var\(--line/);
    expect(appendix).toMatch(/\.toolbar > \.search/);
    expect(appendix).toMatch(/\.toolbar > \.select/);
    expect(appendix).toMatch(/\.toolbar > button/);
    expect(appendix).toMatch(/min-height:\s*44px/);
    expect(appendix).toMatch(/font-size:\s*var\(--text-sm/);
    expect(appendix).toMatch(/:focus-visible/);
    // Must not restyle queue/detail surfaces in the appendix
    expect(appendix).not.toMatch(/\.tableWrap\s*\{/);
    expect(appendix).not.toMatch(/\.table\s*\{/);
    expect(appendix).not.toMatch(/\.cards\s*\{/);
    expect(appendix).not.toMatch(/\.card\s*\{/);
    expect(appendix).not.toMatch(/\.error\s*\{/);
    expect(appendix).not.toMatch(/\.empty\s*\{/);
    expect(appendix).not.toMatch(/\.page\s*\{/);
    expect(appendix).not.toMatch(/!important/);
  });
});

describe("A4a presentation (behavior preserved)", () => {
  beforeEach(() => {
    nav.params = new URLSearchParams();
    nav.push.mockClear();
    api.fetchModerationQueue.mockReset();
    api.fetchModerationQueue.mockResolvedValue(queuePayload);
  });

  it("renders title, summary counts, and existing toolbar controls with skin classes", async () => {
    render(<AdminModerationClient />);
    const h1 = await screen.findByRole("heading", { name: "Модерация каталога", level: 1 });
    expect(h1.className).toContain(styles.title);
    await waitFor(() => expect(screen.getByText(/Ожидает решения:/)).toBeTruthy());
    expect(screen.getByText("3")).toBeTruthy();
    expect(screen.getByText(/партнёры 2/)).toBeTruthy();
    expect(screen.getByPlaceholderText("Поиск по имени или ID").className).toContain(styles.search);
    expect(screen.getByDisplayValue("Все типы").className).toContain(styles.select);
    expect(screen.getByRole("button", { name: "Обновить" })).toBeTruthy();
    expect(document.querySelector(`.${styles.toolbar}`)).toBeTruthy();
  });

  it("keeps Enter search and select URL push semantics", async () => {
    render(<AdminModerationClient />);
    await screen.findByRole("heading", { name: "Модерация каталога", level: 1 });
    const search = screen.getByPlaceholderText("Поиск по имени или ID");
    fireEvent.change(search, { target: { value: "  альфа  " } });
    fireEvent.keyDown(search, { key: "Enter" });
    expect(nav.push).toHaveBeenCalledWith("/admin/moderation?q=%D0%B0%D0%BB%D1%8C%D1%84%D0%B0");

    fireEvent.change(screen.getByDisplayValue("Все типы"), { target: { value: "organization" } });
    expect(nav.push).toHaveBeenCalledWith(expect.stringContaining("entityKind=organization"));
  });

  it("keeps refresh calling the same read-only load", async () => {
    render(<AdminModerationClient />);
    await waitFor(() => expect(api.fetchModerationQueue).toHaveBeenCalled());
    const calls = api.fetchModerationQueue.mock.calls.length;
    fireEvent.click(screen.getByRole("button", { name: "Обновить" }));
    await waitFor(() => expect(api.fetchModerationQueue.mock.calls.length).toBeGreaterThan(calls));
  });
});
