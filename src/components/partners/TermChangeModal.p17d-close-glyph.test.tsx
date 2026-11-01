import { readFileSync } from "node:fs";
import path from "node:path";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { resetBodyScrollLockForTests } from "@/lib/dialog-focus";
import { TermChangeModal } from "./TermChangeModal";

/**
 * P17d: GAP-P18-TERM-CLOSE-GLYPH — R1 Lucide SVG `x`, not text `×`.
 * Measured frozen: svg box 20×20, stroke-width 1.7; button 44×46 preserved.
 */
describe("TermChangeModal P17d close glyph SVG", () => {
  const css = readFileSync(
    path.join(process.cwd(), "src/components/partners/TermChangeModal.module.css"),
    "utf8",
  );
  const tsx = readFileSync(
    path.join(process.cwd(), "src/components/partners/TermChangeModal.tsx"),
    "utf8",
  );

  afterEach(() => {
    resetBodyScrollLockForTests();
  });

  it("source uses Lucide x paths and does not render text ×", () => {
    expect(tsx).toMatch(/data-lucide=["']x["']/);
    expect(tsx).toMatch(/<path d="M18 6 6 18"/);
    expect(tsx).toMatch(/<path d="m6 6 12 12"/);
    expect(tsx).toMatch(/viewBox=["']0 0 24 24["']/);
    expect(tsx).toMatch(/aria-hidden=["']true["']/);
    expect(tsx).not.toMatch(/>\s*×\s*</);
  });

  it("CSS pins computed 20×20 icon with stroke-width 1.7 inside 44×46 close", () => {
    expect(css).toMatch(/\.closeBtn\s*\{[^}]*width:\s*44px/s);
    expect(css).toMatch(/\.closeBtn\s*\{[^}]*height:\s*46px/s);
    expect(css).toMatch(/\.closeBtn\s*\{[^}]*padding:\s*12px/s);
    expect(css).toMatch(/\.closeBtn\s*\{[^}]*border-radius:\s*10px/s);
    expect(css).toMatch(/\.closeBtn\s*\{[^}]*line-height:\s*1\.6/s);
    expect(css).toMatch(/\.closeIcon\s*\{[^}]*width:\s*20px/s);
    expect(css).toMatch(/\.closeIcon\s*\{[^}]*height:\s*20px/s);
    expect(css).toMatch(/\.closeIcon\s*\{[^}]*stroke-width:\s*1\.7/s);
    expect(css).toMatch(/\.closeIcon\s*\{[^}]*pointer-events:\s*none/s);
  });

  it("rendered close has SVG glyph, no × text, decorative aria-hidden", () => {
    render(
      <TermChangeModal open title="Предложить изменение условий" onClose={() => {}}>
        <span>body</span>
      </TermChangeModal>,
    );
    const close = screen.getByTestId("term-change-close");
    expect(close).toHaveAttribute("aria-label", "Закрыть");
    expect(close.textContent?.replace(/\s/g, "")).not.toContain("×");
    const svg = close.querySelector("svg");
    expect(svg).toBeTruthy();
    expect(svg).toHaveAttribute("data-lucide", "x");
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).toHaveAttribute("viewBox", "0 0 24 24");
    const paths = [...(svg?.querySelectorAll("path") ?? [])].map((p) => p.getAttribute("d"));
    expect(paths).toEqual(["M18 6 6 18", "m6 6 12 12"]);
    // SVG must not become an extra tab stop
    expect(svg?.getAttribute("tabindex")).toBeNull();
  });
});
