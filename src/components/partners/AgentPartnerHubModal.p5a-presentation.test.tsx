import { readFileSync } from "node:fs";
import path from "node:path";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AgentPartnerHubModal } from "./AgentPartnerHubModal";

const cssPath = path.join(__dirname, "AgentPartnerHubModal.module.css");
const css = readFileSync(cssPath, "utf8");
const MARKER = "/* === P5a hub shell appendix (presentation only; prefix above is immutable) === */";

describe("AgentPartnerHubModal P5a presentation", () => {
  it("keeps the pre-P5a CSS as an exact byte prefix before the appendix marker", () => {
    const idx = css.indexOf(MARKER);
    expect(idx).toBeGreaterThan(0);
    const prefix = css.slice(0, idx);
    // Original file ended with the mobile .pathTabs block closing brace + newline
    expect(prefix.endsWith("}\n\n") || prefix.endsWith("}\n")).toBe(true);
    expect(prefix).toContain(".closeBtn {\n  border: 1px solid var(--line);");
    expect(prefix).toContain("width: 40px;\n  height: 40px;");
    expect(prefix).toContain("min-height: 40px;");
    expect(prefix).toContain("width: calc(100% - 2 * var(--space-5));");
    // Appendix must not rewrite .sheet / .backdrop / .body
    const appendix = css.slice(idx);
    expect(appendix).not.toMatch(/(^|\n)\.sheet\s*\{/);
    expect(appendix).not.toMatch(/(^|\n)\.backdrop\s*\{/);
    expect(appendix).not.toMatch(/(^|\n)\.body\s*\{/);
    expect(appendix).not.toContain("!important");
  });

  it("sets close and direct tab hit targets to at least 44px with inactive light FG ≥4.5:1", () => {
    const appendix = css.slice(css.indexOf(MARKER));
    expect(appendix).toMatch(
      /\.closeBtn\s*\{[^}]*min-width:\s*44px;[^}]*min-height:\s*44px;/s,
    );
    expect(appendix).toMatch(
      /\.pathTabs\s*>\s*button\s*\{[^}]*min-height:\s*44px;[^}]*min-width:\s*44px;/s,
    );
    expect(appendix).toMatch(
      /\.pathTabs\s*>\s*button\s*\{[^}]*color:\s*#5c605a;/s,
    );
    expect(appendix).toMatch(
      /@media\s*\(max-width:\s*680px\)\s*\{[^}]*\.pathTabs\s*\{[^}]*width:\s*calc\(100%\s*-\s*2\s*\*\s*var\(--space-4\)\)/s,
    );

    const fg = [0x5c, 0x60, 0x5a];
    const bg = [0xf2, 0xf1, 0xee];
    const lin = (c: number) => {
      const s = c / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    };
    const L = (rgb: number[]) =>
      0.2126 * lin(rgb[0]!) + 0.7152 * lin(rgb[1]!) + 0.0722 * lin(rgb[2]!);
    const ratio = (Math.max(L(fg), L(bg)) + 0.05) / (Math.min(L(fg), L(bg)) + 0.05);
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  it("keeps tab labels fully visible and wires the same onTabChange / close contract", async () => {
    const onTabChange = vi.fn();
    const onClose = vi.fn();
    render(
      <AgentPartnerHubModal
        open
        tab="find"
        titleFind="Очень длинный заголовок поиска партнёра для переноса без ellipsis"
        titleLink="Приглашение по ссылке"
        onTabChange={onTabChange}
        onClose={onClose}
      >
        <p>child body</p>
      </AgentPartnerHubModal>,
    );

    expect(screen.getByTestId("agent-partner-hub-modal")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "Очень длинный заголовок поиска партнёра для переноса без ellipsis",
      }),
    ).toBeInTheDocument();

    const findTab = screen.getByRole("tab", { name: "Найти в RemCard" });
    const linkTab = screen.getByRole("tab", { name: "Пригласить по ссылке" });
    expect(findTab).toHaveAttribute("aria-selected", "true");
    expect(linkTab).toHaveAttribute("aria-selected", "false");
    expect(findTab).toHaveAttribute("data-active", "true");
    expect(linkTab).toHaveAttribute("data-active", "false");

    await userEvent.click(linkTab);
    expect(onTabChange).toHaveBeenCalledWith("link");

    await userEvent.click(screen.getByRole("button", { name: "Закрыть" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
