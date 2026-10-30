/** @vitest-environment jsdom */
/**
 * A3b: presentation-only table/cards/dense skins.
 * Client.tsx and MetricsBar stay frozen at 5dde; baseline CSS rules stay prefix-identical.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: React.PropsWithChildren<{ href: string } & Record<string, unknown>>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const api = vi.hoisted(() => ({
  fetchPartnerRegistry: vi.fn(),
  previewPartnerLifecycle: vi.fn(),
  applyPartnerLifecycle: vi.fn(),
}));

vi.mock("@/lib/prof-admin-partners-api", () => api);

import { AdminPartnersRegistryList } from "./AdminPartnersRegistryList";
import { AdminPartnersDenseRegistryList } from "./AdminPartnersDenseRegistryList";
import { VIEW_MODE_STORAGE_KEY } from "./adminPartnersRegistryConstants";
import styles from "./AdminPartners.module.css";

const ROOT = __dirname;
const CLIENT = path.join(ROOT, "AdminPartnersClient.tsx");
const METRICS = path.join(ROOT, "AdminPartnersMetricsBar.tsx");
const CSS = path.join(ROOT, "AdminPartners.module.css");
const LIST = path.join(ROOT, "AdminPartnersRegistryList.tsx");
const DENSE = path.join(ROOT, "AdminPartnersDenseRegistryList.tsx");

/** Published compose tip 5dde51c Client + MetricsBar freeze. */
const CLIENT_SHA =
  "824fdd297749627a3306919240b1a389d4fdeb8ae3b345e7268a7eab851da4f3";
const METRICS_SHA =
  "f999d067cbd3b1cbf51b889e13608ea5517efaf70829a2b5a208da29478862ae";
/** Baseline CSS module bytes before A3b additive appendix (5dde tip). */
const CSS_PREFIX_SHA =
  "e4dadc2d3a3f33b7f9bbc81e5b0775ee46ea9e562b131a16c2da0e949ac30138";

function sha256(buf: string | Buffer) {
  return createHash("sha256").update(buf).digest("hex");
}

const row = {
  id: "p1",
  displayName: "ООО «Строительно-монтажное объединение Южный берег»",
  partnerType: "COMPANY",
  partnerKind: "company" as const,
  registrationLabel: "ACTIVE" as const,
  catalogVisibility: "VISIBLE" as const,
  city: "Краснодар-очень-длинное-название",
  organizationName: "Южный берег",
  lifecycle: null,
  partnershipCounts: { active: 2, invited: 1, pending: 0, paused: 0, ended: 0, total: 3 },
  publicCatalogLinks: [
    { path: "/c/1", label: "Карточка 1" },
    { path: "/c/2", label: "Карточка 2" },
  ],
  organizations: [{ id: "o1", name: "Org One" }],
  partnerSearchVisibility: {
    visible: true,
    reasonCode: "ok",
    reasonLabel: "",
    adminOverride: "AUTO" as const,
  },
};

function listProps(overrides: Record<string, unknown> = {}) {
  return {
    viewMode: "table" as const,
    items: [row],
    loading: false,
    selectedIds: new Map(),
    pageSelectState: "none" as const,
    onTogglePageSelect: vi.fn(),
    onToggleRow: vi.fn(),
    selectionBlocked: false,
    singleSelected: null,
    onSelectSingle: vi.fn(),
    onToggleExpand: vi.fn(),
    onCloseSingle: vi.fn(),
    reason: "",
    onReasonChange: vi.fn(),
    pendingPreview: null,
    onCancelPreview: vi.fn(),
    onRequestPreview: vi.fn(),
    onConfirmApply: vi.fn(),
    isApplyingSingle: false,
    interactionsDisabled: false,
    headerSelectRef: { current: null },
    cardsPageSelectRef: { current: null },
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.removeItem(VIEW_MODE_STORAGE_KEY);
  api.fetchPartnerRegistry.mockResolvedValue({ items: [row], total: 1, nextCursor: null, facets: null });
});

describe("A3b source preservation (5dde whitelist)", () => {
  it("keeps AdminPartnersClient.tsx and MetricsBar.tsx byte-identical to 5dde", () => {
    expect(sha256(readFileSync(CLIENT))).toBe(CLIENT_SHA);
    expect(sha256(readFileSync(METRICS))).toBe(METRICS_SHA);
  });

  it("keeps baseline CSS rules as an unchanged prefix; only additive A3b appendix follows", () => {
    const src = readFileSync(CSS, "utf8");
    const marker = "/* ==========================================================================\n   A3b:";
    const idx = src.indexOf(marker);
    expect(idx).toBeGreaterThan(0);
    // Collapse blank lines inserted before the appendix so prefix matches 5dde file bytes.
    let prefix = src.slice(0, idx);
    while (prefix.endsWith("\n\n")) prefix = prefix.slice(0, -1);
    expect(sha256(prefix)).toBe(CSS_PREFIX_SHA);
    // Original protected compact / dense / badge rules remain verbatim in prefix
    expect(prefix).toContain(".tableCompact th { padding: 10px 12px; vertical-align: middle; }");
    expect(prefix).toContain(".denseStatusLine {");
    expect(prefix).toMatch(/font-size: 0\.8125rem/);
    expect(prefix).toContain(".partnerCard {");
    expect(prefix).toContain(".registry[data-mobile-dense] {");
    expect(prefix).toMatch(/\.registry\[data-mobile-dense\] \{\s*gap: var\(--space-2\);/);
    // Appendix scopes skins
    const appendix = src.slice(idx);
    expect(appendix).toContain(".registryTableSkin");
    expect(appendix).toContain(".registryCardsSkin");
    expect(appendix).toContain(".registryDenseSkin");
    expect(appendix).not.toMatch(/(^|\n)\.table\s*\{/);
    expect(appendix).not.toMatch(/(^|\n)\.badge\s*\{/);
    expect(appendix).not.toMatch(/(^|\n)\.field\s*\{/);
    expect(appendix).not.toMatch(/(^|\n)\.heading\s*\{/);
  });

  it("only adds presentation classNames/wrappers in list components (no callback/API changes)", () => {
    const list = readFileSync(LIST, "utf8");
    const dense = readFileSync(DENSE, "utf8");
    expect(list).toContain("registryTableSkin");
    expect(list).toContain("registryCardsSkin");
    expect(list).toContain("registryRowIdentity");
    expect(list).toContain("registryCardStatus");
    expect(dense).toContain("registryDenseSkin");
    expect(dense).toContain("registryDenseIdentity");
    expect(dense).toContain("registryDenseStatus");
    expect(list).not.toMatch(/fetchPartnerRegistry|router\.push/);
    expect(dense).not.toMatch(/fetchPartnerRegistry|router\.push/);
    // Callbacks still wired
    expect(list).toContain("onSelectSingle(row)");
    expect(list).toContain("onToggleRow(row)");
    expect(dense).toContain("onToggleExpand(row)");
    expect(dense).toContain("onToggleRow(row)");
  });

  it("requires metadata/status labels under skins to be at least 14px (--text-sm)", () => {
    const src = readFileSync(CSS, "utf8");
    const appendix = src.slice(src.indexOf("A3b:"));
    expect(appendix).toMatch(/\.registryRowStatus \.badge[\s\S]*?font-size:\s*var\(--text-sm\)/);
    expect(appendix).toMatch(/\.registryCardStatus \.badge[\s\S]*?font-size:\s*var\(--text-sm\)/);
    expect(appendix).toMatch(/\.registryDenseSkin \.denseMeta[\s\S]*?font-size:\s*var\(--text-sm\)/);
    expect(appendix).toMatch(/\.registryDenseSkin \.denseStatusLine[\s\S]*?font-size:\s*var\(--text-sm\)/);
    expect(appendix).toMatch(
      /\.registry\[data-mobile-dense\] \.registryDenseSkin \.denseStatusLine[\s\S]*?font-size:\s*var\(--text-sm\)/,
    );
  });

  it("does not inherit font/line-height onto management/detail via skin roots or broad td", () => {
    const appendix = readFileSync(CSS, "utf8").slice(
      readFileSync(CSS, "utf8").indexOf("A3b:"),
    );
    // No root font/line-height on table/card/dense skin wrappers
    expect(appendix).not.toMatch(/\.registryTableSkin\s*\{[^}]*font-size/);
    expect(appendix).not.toMatch(/\.registryTableSkin\s*\{[^}]*line-height/);
    expect(appendix).not.toMatch(/\.registryCardsSkin\s*\{[^}]*font-size/);
    expect(appendix).not.toMatch(/\.registryDenseSkin\s*\{[^}]*font-size/);
    // Broad td selector removed; only direct compactRow children
    expect(appendix).not.toMatch(/\.registryTableSkin\.tableCompact td\s*\{/);
    expect(appendix).toMatch(
      /\.registryTableSkin\.tableCompact > tbody > tr\.compactRow > td\s*\{/,
    );
    // No new managementRow / denseDetail frame overrides in appendix
    expect(appendix).not.toMatch(/managementRow/);
    expect(appendix).not.toMatch(/\.registryDenseSkin \.denseDetail\s*\{/);
  });

  it("forces dense name full wrap without line-clamp truncation under the skin", () => {
    const appendix = readFileSync(CSS, "utf8").slice(
      readFileSync(CSS, "utf8").indexOf("A3b:"),
    );
    const nameBlock = appendix.match(/\.registryDenseSkin \.denseName\s*\{[^}]+\}/)?.[0] ?? "";
    expect(nameBlock).toMatch(/display:\s*block/);
    expect(nameBlock).toMatch(/-webkit-line-clamp:\s*unset/);
    expect(nameBlock).toMatch(/overflow:\s*visible/);
    expect(nameBlock).toMatch(/overflow-wrap:\s*anywhere/);
    expect(nameBlock).not.toMatch(/-webkit-line-clamp:\s*[0-9]/);
  });

  it("sizes upper collaboration nodes to --text-sm on compactRow and card section only", () => {
    const appendix = readFileSync(CSS, "utf8").slice(
      readFileSync(CSS, "utf8").indexOf("A3b:"),
    );
    expect(appendix).toMatch(
      /\.registryTableSkin > tbody > tr\.compactRow \.collaborationPrimary \.badge[\s\S]*?font-size:\s*var\(--text-sm\)/,
    );
    expect(appendix).toMatch(
      /\.registryTableSkin > tbody > tr\.compactRow \.collaborationAdminSetting[\s\S]*?font-size:\s*var\(--text-sm\)/,
    );
    expect(appendix).toMatch(
      /\.registryTableSkin > tbody > tr\.compactRow \.collaborationReason[\s\S]*?font-size:\s*var\(--text-sm\)/,
    );
    expect(appendix).toMatch(
      /\.registryTableSkin > tbody > tr\.compactRow \.collaborationCountsLine[\s\S]*?font-size:\s*var\(--text-sm\)/,
    );
    expect(appendix).toMatch(
      /\.registryTableSkin > tbody > tr\.compactRow \.collaborationCountLink[\s\S]*?font-size:\s*var\(--text-sm\)/,
    );
    expect(appendix).toMatch(
      /\.registryCardsSkin \.partnerCard > \.cardCollaboration > \.cardCollaborationTitle[\s\S]*?font-size:\s*var\(--text-sm\)/,
    );
    expect(appendix).toMatch(
      /\.registryCardsSkin \.partnerCard > \.cardCollaboration \.collaborationAdminSetting[\s\S]*?font-size:\s*var\(--text-sm\)/,
    );
    // Must not style frozen management / detail collaboration via broad roots
    expect(appendix).not.toMatch(/\.registryDenseSkin \.denseDetail[\s\S]{0,80}collaboration/);
    expect(appendix).not.toMatch(/managementRow[\s\S]{0,80}collaboration/);
  });

  it("softens scoped hover/focus/selected backgrounds and constrains dense top grids", () => {
    const appendix = readFileSync(CSS, "utf8").slice(
      readFileSync(CSS, "utf8").indexOf("A3b:"),
    );
    expect(appendix).toMatch(
      /\.registryTableSkin > tbody > tr\.compactRow:hover\s*\{[^}]*color-mix\(in srgb, var\(--surface\) 94%, var\(--ink\)\)/,
    );
    expect(appendix).toMatch(
      /\.registryTableSkin > tbody > tr\.compactRow:focus-within\s*\{[^}]*color-mix\(in srgb, var\(--surface\) 94%, var\(--primary\)\)/,
    );
    expect(appendix).toMatch(
      /\.registryCardsSkin \.partnerCard\[data-selected\]\s*\{[^}]*color-mix\(in srgb, var\(--surface\) 94%, var\(--primary\)\)/,
    );
    expect(appendix).toMatch(
      /\.registryDenseSkin \.denseItem\[data-selected\]\s*\{[^}]*color-mix\(in srgb, var\(--surface\) 94%, var\(--primary\)\)/,
    );
    // Rejected darker mixes must not return
    expect(appendix).not.toMatch(/var\(--offset\) 88%, var\(--ink\)/);
    expect(appendix).not.toMatch(/var\(--surface\) 90%, var\(--primary\)/);
    expect(appendix).not.toMatch(/var\(--surface\) 92%, var\(--primary\)/);
    // Dense top identity/main constrained; detail left alone
    expect(appendix).toMatch(
      /\.registryDenseSkin \.denseMain\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/,
    );
    expect(appendix).toMatch(
      /\.registryDenseSkin \.registryDenseIdentity\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/,
    );
    expect(appendix).toMatch(/\.registryDenseSkin \.denseMeta\s*\{[^}]*overflow-wrap:\s*anywhere/);
    expect(appendix).toMatch(/\.registryDenseSkin \.denseMeta\s*\{[^}]*word-break:\s*break-word/);
    expect(appendix).not.toMatch(/\.registryDenseSkin \.denseDetail\s*\{/);
  });
});

describe("A3b list presentation (behavior preserved)", () => {
  it("renders table with eight columns, skin marker, and same action callbacks", async () => {
    const onSelectSingle = vi.fn();
    const onToggleRow = vi.fn();
    render(
      <AdminPartnersRegistryList
        {...listProps({ onSelectSingle, onToggleRow })}
      />,
    );
    const table = screen.getByRole("table", { name: "Реестр партнёров" });
    expect(table.className).toContain(styles.registryTableSkin);
    expect(table.className).toContain(styles.tableCompact);
    const headers = within(table).getAllByRole("columnheader").map((th) => th.textContent?.trim());
    expect(headers).toEqual([
      "",
      "Имя",
      "Тип",
      "Город / организация",
      "Регистрация",
      "Каталог",
      "Сотрудничество",
      "Доступ",
    ]);
    expect(screen.getByText(row.displayName!)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Действия" }));
    expect(onSelectSingle).toHaveBeenCalledWith(row);
    fireEvent.click(screen.getByRole("checkbox", { name: /Выбрать ООО/ }));
    expect(onToggleRow).toHaveBeenCalledWith(row);
  });

  it("renders cards skin with identity/status markers and unchanged delete/actions", async () => {
    const onSelectSingle = vi.fn();
    const { container } = render(
      <AdminPartnersRegistryList {...listProps({ viewMode: "cards", onSelectSingle })} />,
    );
    expect(container.querySelector(`.${styles.registryCardsSkin}`)).toBeTruthy();
    expect(container.querySelector(`.${styles.registryCardIdentity}`)).toBeTruthy();
    expect(container.querySelector(`.${styles.registryCardStatus}`)).toBeTruthy();
    expect(screen.getByRole("heading", { name: row.displayName!, level: 3 })).toBeTruthy();
    expect(screen.getByText("Активный")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Удалить" }));
    expect(onSelectSingle).toHaveBeenCalledWith(row);
  });

  it("renders dense skin with expand-on-name and checkbox that does not expand", async () => {
    const user = userEvent.setup();
    const onToggleExpand = vi.fn();
    const onToggleRow = vi.fn();
    const base = listProps();
    const { container } = render(
      <AdminPartnersDenseRegistryList
        items={base.items}
        loading={base.loading}
        selectedIds={base.selectedIds}
        pageSelectState={base.pageSelectState}
        onTogglePageSelect={base.onTogglePageSelect}
        onToggleRow={onToggleRow}
        singleSelected={base.singleSelected}
        onToggleExpand={onToggleExpand}
        onCloseSingle={base.onCloseSingle}
        reason={base.reason}
        onReasonChange={base.onReasonChange}
        pendingPreview={base.pendingPreview}
        onCancelPreview={base.onCancelPreview}
        onRequestPreview={base.onRequestPreview}
        onConfirmApply={base.onConfirmApply}
        isApplyingSingle={base.isApplyingSingle}
        interactionsDisabled={base.interactionsDisabled}
        pageSelectRef={{ current: null }}
      />,
    );
    expect(container.querySelector(`.${styles.registryDenseSkin}`)).toBeTruthy();
    expect(container.querySelector(`.${styles.registryDenseIdentity}`)).toBeTruthy();
    expect(container.querySelector(`.${styles.registryDenseStatus}`)).toBeTruthy();
    expect(screen.getByText(/Каталог:/)).toBeTruthy();
    await user.click(screen.getByRole("checkbox", { name: /Выбрать ООО/ }));
    expect(onToggleRow).toHaveBeenCalledWith(row);
    expect(onToggleExpand).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: /ООО «Строительно-монтажное/ }));
    expect(onToggleExpand).toHaveBeenCalledWith(row);
  });
});
