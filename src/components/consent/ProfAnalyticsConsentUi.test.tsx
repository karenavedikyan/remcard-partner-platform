import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CookieConsentProvider } from "@/contexts/CookieConsentContext";
import {
  ProfAnalyticsConsentAgreementChoice,
  ProfAnalyticsConsentProfileSetting,
} from "./ProfAnalyticsConsentUi";

const cssPath = join(import.meta.dirname, "ProfAnalyticsConsentUi.module.css");

describe("ProfAnalyticsConsentUi compact presentation", () => {
  it("uses compact inset styles without hero panel blocks", () => {
    const css = readFileSync(cssPath, "utf8");
    expect(css).not.toMatch(/\.profileBlock|\.agreementBlock|\.title\s*\{/);
    expect(css).toMatch(/\.secondarySave:focus-visible/);
    expect(css).toMatch(/font-size:\s*max\(12px/);
    expect(css).toMatch(/min-height:\s*44px/);
  });

  it("keeps optional analytics on auth agreements as a checkbox row with Подробнее", () => {
    render(
      <ProfAnalyticsConsentAgreementChoice enabled onChange={() => undefined} />,
    );
    expect(screen.queryByRole("heading", { name: /аналитика кабинета/i })).toBeNull();
    expect(screen.getByRole("checkbox", { name: /необязательно/i })).toBeInTheDocument();
    expect(screen.getByText("Сохраняется только в этом браузере, между устройствами не синхронизируется.")).toBeInTheDocument();
    expect(screen.getByText("Подробнее")).toBeInTheDocument();
  });

  it("shows profile save only when draft differs or decision is pending", () => {
    render(
      <CookieConsentProvider>
        <ProfAnalyticsConsentProfileSetting />
      </CookieConsentProvider>,
    );
    expect(screen.getByRole("button", { name: "Сохранить" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /аналитика кабинета/i })).toBeNull();
  });
});
