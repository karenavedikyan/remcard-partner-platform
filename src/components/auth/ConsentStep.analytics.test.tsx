import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { URL as NodeURL } from "node:url";
import { CookieConsentProvider } from "@/contexts/CookieConsentContext";
import { COOKIE_CONSENT_HTTP, COOKIE_CONSENT_KEY, makeRejectAllConsent } from "@/lib/cookie-consent";
import { ConsentStep } from "./ConsentStep";
import type { ConsentRequirement } from "@/lib/cabinet-readiness";

const requirements = [
  { kind: "PERSONAL_DATA", legalDocumentId: "qa-privacy", version: "1", url: "/privacy", status: "missing" as const },
  { kind: "TERMS", legalDocumentId: "qa-terms", version: "1", url: "/terms", status: "missing" as const },
];
const analyticsName = /разрешить учёт посещений/i;
function show(onSubmit = vi.fn().mockResolvedValue(true), reqs: ConsentRequirement[] = requirements) {
  return render(
    <CookieConsentProvider>
      <ConsentStep requirements={reqs} error="" loading={false} onSubmit={onSubmit} onRetryReadiness={() => undefined} />
    </CookieConsentProvider>,
  );
}
async function acceptRequired() {
  const ui = userEvent.setup();
  await ui.click(screen.getByRole("checkbox", { name: /я принимаю обработку/i }));
  await ui.click(screen.getByRole("checkbox", { name: /я принимаю пользовательское/i }));
  await ui.click(screen.getByRole("button", { name: "Продолжить" }));
}
beforeEach(() => {
  localStorage.clear();
  document.cookie = `${COOKIE_CONSENT_HTTP}=;path=/;max-age=0`;
});
describe("Analytics choice accompanies legal agreements, not provider login", () => {
  it("shows an optional pre-checked draft but does not pre-accept legal documents or analytics", async () => {
    const submit = vi.fn();
    show(submit);
    expect(await screen.findByRole("checkbox", { name: analyticsName })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: /я принимаю обработку/i })).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: /я принимаю пользовательское/i })).not.toBeChecked();
    expect(screen.getByRole("button", { name: "Продолжить" })).toBeDisabled();
    expect(localStorage.getItem(COOKIE_CONSENT_KEY)).toBeNull();
    expect(document.cookie).not.toContain("analytics");
    expect(submit).not.toHaveBeenCalled();
  });
  it("waits for successful legal submission before persisting analytics and keeps the submit lock", async () => {
    let finish!: (ok: boolean) => void;
    const submit = vi.fn(() => new Promise<boolean>(resolve => { finish = resolve; }));
    show(submit);
    await screen.findByRole("checkbox", { name: analyticsName });
    await acceptRequired();
    expect(submit).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(COOKIE_CONSENT_KEY)).toBeNull();
    fireEvent.submit(screen.getByRole("button", { name: "Продолжить" }).closest("form")!);
    expect(submit).toHaveBeenCalledTimes(1);
    await act(async () => finish(true));
    await waitFor(() => expect(localStorage.getItem(COOKIE_CONSENT_KEY)).toContain('"analytics":true'));
    expect(localStorage.getItem(COOKIE_CONSENT_KEY)).toContain('"marketing":false');
  });
  it("allows continuing with analytics unchecked", async () => {
    const submit = vi.fn().mockResolvedValue(true);
    show(submit);
    await userEvent.click(await screen.findByRole("checkbox", { name: analyticsName }));
    await acceptRequired();
    expect(submit).toHaveBeenCalledWith(new Set(["PERSONAL_DATA:qa-privacy", "TERMS:qa-terms"]));
    await waitFor(() => expect(localStorage.getItem(COOKIE_CONSENT_KEY)).toContain('"analytics":false'));
  });
  it("preserves an existing rejection instead of resetting it to pre-checked", async () => {
    const previous = makeRejectAllConsent();
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(previous));
    show();
    await waitFor(() => expect(screen.getByRole("checkbox", { name: analyticsName })).not.toBeChecked());
    expect(JSON.parse(localStorage.getItem(COOKIE_CONSENT_KEY)!)).toEqual(previous);
    await acceptRequired();
    await waitFor(() => expect(localStorage.getItem(COOKIE_CONSENT_KEY)).toContain('"analytics":false'));
  });
  it.each([false, undefined])("does not save analytics when submission does not succeed: %s", async result => {
    show(vi.fn().mockResolvedValue(result));
    await screen.findByRole("checkbox", { name: analyticsName });
    await acceptRequired();
    expect(localStorage.getItem(COOKIE_CONSENT_KEY)).toBeNull();
    expect(document.cookie).not.toContain("analytics");
  });
  it("does not save analytics after a thrown submission failure", async () => {
    show(vi.fn().mockRejectedValue(new Error("QA failed")));
    await screen.findByRole("checkbox", { name: analyticsName });
    await acceptRequired();
    expect(await screen.findByRole("alert")).toHaveTextContent("Не удалось сохранить");
    expect(localStorage.getItem(COOKIE_CONSENT_KEY)).toBeNull();
  });
  it("does not show an analytics choice without available legal documents", () => {
    show(vi.fn(), [{ ...requirements[0], legalDocumentId: null }]);
    expect(screen.queryByRole("checkbox", { name: analyticsName })).toBeNull();
  });
  it("removes the old standalone block from the provider/code screen", () => {
    const source = readFileSync(new NodeURL("./AuthFlow.tsx", import.meta.url), "utf8");
    expect(source.includes("ProfAnalyticsConsentLoginBlock")).toBe(false);
  });
});
