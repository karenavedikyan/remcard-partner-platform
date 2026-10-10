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
    expect(resolveProfNotificationTarget("/pro/partners?tab=incoming")).toBe(
      "/partners?tab=incoming",
    );
    expect(resolveProfNotificationTarget("/store/partners#section")).toBe("/partners#section");
  });

  it("maps trusted absolute navigator partner URLs to cabinet /partners", () => {
    expect(resolveProfNotificationTarget("https://remcard.ru/pro/partners")).toBe("/partners");
    expect(resolveProfNotificationTarget("https://www.remcard.ru/store/partners?x=1")).toBe(
      "/partners?x=1",
    );
    expect(resolveProfNotificationTarget("https://prof.remcard.ru/pro/partners")).toBe("/partners");
  });

  it("keeps other allowed cabinet destinations", () => {
    expect(resolveProfNotificationTarget("/scanner")).toBe("/scanner");
    expect(resolveProfNotificationTarget("/profile/branches")).toBe("/profile/branches");
    expect(resolveProfNotificationTarget("/invite/abc123")).toBe("/invite/abc123");
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
