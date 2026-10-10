import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { resolveProfNotificationTarget } from "./prof-notification-target";

describe("resolveProfNotificationTarget", () => {
  const env = process.env;

  beforeEach(() => {
    process.env = { ...env, NEXT_PUBLIC_APP_URL: "https://prof.remcard.ru" };
  });

  afterEach(() => {
    process.env = env;
  });

  it("maps legacy partner routes to /partners preserving query and hash", () => {
    expect(resolveProfNotificationTarget("/pro/partners")).toBe("/partners");
    expect(resolveProfNotificationTarget("/store/partners")).toBe("/partners");
    expect(resolveProfNotificationTarget("/pro/partners/")).toBe("/partners");
    expect(resolveProfNotificationTarget("/pro/partners?tab=incoming")).toBe(
      "/partners?tab=incoming",
    );
    expect(resolveProfNotificationTarget("/store/partners#section")).toBe("/partners#section");
  });

  it("rejects legacy partner paths with unknown suffixes", () => {
    expect(resolveProfNotificationTarget("/pro/partners/extra")).toBeNull();
    expect(resolveProfNotificationTarget("/store/partners/foo/bar")).toBeNull();
    expect(resolveProfNotificationTarget("https://remcard.ru/pro/partners/legacy-id")).toBeNull();
  });

  it("maps trusted absolute navigator partner URLs to cabinet /partners", () => {
    expect(resolveProfNotificationTarget("https://remcard.ru/pro/partners")).toBe("/partners");
    expect(resolveProfNotificationTarget("https://www.remcard.ru/store/partners?x=1")).toBe(
      "/partners?x=1",
    );
    expect(resolveProfNotificationTarget("https://prof.remcard.ru/pro/partners")).toBe("/partners");
  });

  it("keeps allowed static and dynamic cabinet destinations", () => {
    expect(resolveProfNotificationTarget("/scanner")).toBe("/scanner");
    expect(resolveProfNotificationTarget("/invite/abc123")).toBe("/invite/abc123");
    expect(resolveProfNotificationTarget("/history/accruals/acc-1")).toBe("/history/accruals/acc-1");
    expect(resolveProfNotificationTarget("/history/purchases/pur-2")).toBe(
      "/history/purchases/pur-2",
    );
    expect(resolveProfNotificationTarget("/recommendations/rec-3")).toBe("/recommendations/rec-3");
  });

  it("rejects non-existent subpaths and dev fixtures", () => {
    expect(resolveProfNotificationTarget("/profile/branches")).toBeNull();
    expect(resolveProfNotificationTarget("/partners/dev-fixture")).toBeNull();
    expect(resolveProfNotificationTarget("/partners/anything")).toBeNull();
  });

  it("rejects self notification list links and unknown paths", () => {
    expect(resolveProfNotificationTarget("/notifications")).toBeNull();
    expect(resolveProfNotificationTarget("/notifications?unread=1")).toBeNull();
    expect(resolveProfNotificationTarget("/pro/unknown")).toBeNull();
    expect(resolveProfNotificationTarget(null)).toBeNull();
    expect(resolveProfNotificationTarget("")).toBeNull();
  });

  it("rejects untrusted external URLs", () => {
    expect(resolveProfNotificationTarget("https://evil.example/pro/partners")).toBeNull();
    expect(resolveProfNotificationTarget("javascript:alert(1)")).toBeNull();
    expect(resolveProfNotificationTarget("//evil.example/path")).toBeNull();
  });
});
