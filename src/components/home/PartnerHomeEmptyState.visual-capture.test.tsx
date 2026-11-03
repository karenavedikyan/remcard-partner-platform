/**
 * Run: CAPTURE_HOME=1 pnpm exec vitest run --config vitest.config.ts src/components/home/PartnerHomeEmptyState.visual-capture.test.tsx
 */
import "@testing-library/jest-dom/vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { readFileSync } from "node:fs";
import { render } from "@testing-library/react";
import { chromium } from "playwright";
import { describe, expect, it } from "vitest";
import { PartnerHomeEmptyState } from "./PartnerHomeEmptyState";

const OUT =
  process.env.HOME_EMPTY_CAPTURE_OUT ??
  join(process.cwd(), "../artifacts/new-partner-empty-home-20261103/screenshots");

const VIEWPORTS = [
  { w: 320, label: "320" },
  { w: 375, label: "375" },
  { w: 768, label: "768" },
  { w: 1440, label: "1440" },
] as const;

const ROLES = ["specialist", "store", "company"] as const;

describe.skipIf(!process.env.CAPTURE_HOME)("PartnerHomeEmptyState visual capture", () => {
  it(
    "writes light/dark PNGs using site theme tokens",
    async () => {
      mkdirSync(OUT, { recursive: true });
      const globals = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");
      const browser = await chromium.launch();

      for (const theme of ["light", "dark"] as const) {
        for (const role of ROLES) {
          document.documentElement.dataset.theme = theme;
          const { container } = render(<PartnerHomeEmptyState role={role} />);
          const injected = Array.from(document.querySelectorAll("style"))
            .map((node) => node.textContent ?? "")
            .join("\n");
          const html = `<!DOCTYPE html><html lang="ru" data-theme="${theme}"><head><meta charset="utf-8"/><style>${globals}</style><style>${injected}</style></head><body style="margin:0;background:var(--bg)">${container.innerHTML}</body></html>`;
          const shellPath = join(OUT, `_shell-${role}-${theme}.html`);
          writeFileSync(shellPath, html);

          for (const vp of VIEWPORTS) {
            const page = await browser.newPage({ viewport: { width: vp.w, height: 900 } });
            await page.goto(`file://${shellPath}`);
            await page.getByTestId("empty-state").waitFor();
            const outPath = join(OUT, `${role}-${theme}-${vp.label}.png`);
            await page.screenshot({ path: outPath, fullPage: true });
            await page.close();
          }
        }
      }

      await browser.close();
      const light = readFileSync(join(OUT, "specialist-light-320.png"));
      const dark = readFileSync(join(OUT, "specialist-dark-320.png"));
      expect(light.equals(dark)).toBe(false);
    },
    120_000,
  );
});
