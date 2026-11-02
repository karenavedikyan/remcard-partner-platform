/**
 * Real component screenshots (not prototype reference).
 * Run from remcard-partner-platform:
 *   PARTNER_CARD_VISUAL=1 PARTNER_CARD_VISUAL_OUT=/path/to/screenshots/implementation \
 *     pnpm exec vitest run src/components/partners/PartnerSearchResultCard.partner-wallet-20261103-visual.test.tsx
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { render } from "@testing-library/react";
import { chromium, type Page } from "playwright";
import { describe, expect, it, vi } from "vitest";
import type { PartnerSearchResult } from "@/lib/types";
import { PartnerSearchResultCard } from "./PartnerSearchResultCard";
import { PartnerFindDirectoryDetailShell } from "./PartnerFindDirectoryDetailShell";

vi.mock("@/components/partners/PartnerSearchResultInlineTerms", () => ({
  PartnerSearchResultInlineTerms: () => (
    <div data-testid="agent-inline-terms" style={{ minHeight: 48 }}>
      Условия для агентов · 12%
    </div>
  ),
}));

vi.mock("@/lib/auth-config", () => ({
  getLegalSiteUrl: () => "https://remcard.ru",
}));

const OUT_DIR =
  process.env.PARTNER_CARD_VISUAL_OUT ||
  path.join(__dirname, "../../../../artifacts/partner-wallet-20261103/partner-card/screenshots/implementation");

const partner = (): PartnerSearchResult => ({
  id: "visual-open-store",
  displayName: "Студия света «Север»",
  city: "Краснодар",
  photoUrl: null,
  description: "Поставки и монтаж освещения для частных и коммерческих объектов.",
  specializations: [],
  badges: [],
  storeCategories: [],
  branches: [],
  rating: null,
  ratingCount: 0,
  partnershipStatus: null,
  partnerType: "STORE",
  partnerTypeLabel: "Магазин",
  isPublic: true,
  workingProductLabels: ["Освещение", "Электротовары", "Кабель"],
  workingServiceLabels: ["Монтаж"],
  workingStageLabels: ["Инженерия", "Черновая", "Чистовая", "Приёмка"],
});

function shellCss(): string {
  const globals = readFileSync(path.join(__dirname, "../../app/globals.css"), "utf8");
  const card = readFileSync(path.join(__dirname, "PartnerSearchResultCard.module.css"), "utf8");
  const detail = readFileSync(path.join(__dirname, "PartnerFindDirectoryDetailShell.module.css"), "utf8");
  const button = readFileSync(path.join(__dirname, "../ui/Button.module.css"), "utf8");
  return `${globals}\n${button}\n${card}\n${detail}`;
}

async function mountHtml(page: Page, html: string, theme: "light" | "dark") {
  await page.setContent(
    `<!DOCTYPE html><html data-theme="${theme}"><head><meta charset="utf-8"/><style>${shellCss()}</style></head><body style="margin:0;padding:16px;background:var(--bg,#f6f5f2);color:var(--ink,#1a1a1a)"><div id="root">${html}</div></body></html>`,
    { waitUntil: "domcontentloaded" },
  );
}

describe.skipIf(!process.env.PARTNER_CARD_VISUAL)("partner-wallet-20261103 implementation visuals", () => {
  it(
    "captures rendered card and detail at 1440/375/320 in light and dark",
    async () => {
      mkdirSync(OUT_DIR, { recursive: true });
      const cardOpen = render(
        <PartnerSearchResultCard
          partner={partner()}
          title={partner().displayName}
          showPublishedTerms
          inviteDisabled={false}
          onInvite={() => undefined}
          onDetail={() => undefined}
        />,
      ).container.innerHTML;

      const cardActive = render(
        <PartnerSearchResultCard
          partner={{ ...partner(), partnershipStatus: "ACTIVE" }}
          title={partner().displayName}
          showPublishedTerms={false}
          inviteDisabled={false}
          onInvite={() => undefined}
          onDetail={() => undefined}
        />,
      ).container.innerHTML;

      const detailOpen = render(
        <PartnerFindDirectoryDetailShell partner={partner()} onBack={() => {}} onInvite={() => {}} />,
      ).container.innerHTML;

      const browser = await chromium.launch();
      const contexts: { w: number; h: number; tag: string }[] = [
        { w: 1440, h: 900, tag: "1440" },
        { w: 375, h: 812, tag: "375" },
        { w: 320, h: 568, tag: "320" },
      ];

      for (const theme of ["light", "dark"] as const) {
        for (const { w, h, tag } of contexts) {
          const page = await browser.newPage({ viewport: { width: w, height: h } });
          await mountHtml(page, cardOpen, theme);
          await page.screenshot({ path: path.join(OUT_DIR, `card-open-${tag}-${theme}.png`) });
          await mountHtml(page, cardActive, theme);
          await page.screenshot({ path: path.join(OUT_DIR, `card-active-detail-link-${tag}-${theme}.png`) });
          await mountHtml(page, detailOpen, theme);
          await page.screenshot({ path: path.join(OUT_DIR, `detail-open-${tag}-${theme}.png`) });
          await page.close();
        }
      }

      await browser.close();
      writeFileSync(
        path.join(OUT_DIR, "manifest.json"),
        `${JSON.stringify({ outDir: OUT_DIR, viewports: contexts, themes: ["light", "dark"] }, null, 2)}\n`,
      );
      expect(readFileSync(path.join(OUT_DIR, "card-open-375-light.png")).byteLength).toBeGreaterThan(1000);
    },
    120_000,
  );
});
