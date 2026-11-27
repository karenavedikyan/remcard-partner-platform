import { describe, expect, it } from "vitest";
import { parseCabinetBlockedBody } from "./parse-auth-errors";
import { isLaunchContextError } from "./auth-copy";

describe("parseCabinetBlockedBody", () => {
  it("reads message from structured cabinet_blocked JSON", () => {
    const parsed = parseCabinetBlockedBody({
      status: "cabinet_blocked",
      nextStep: "consents",
      message: "Примите согласия на сайте PROF.",
    });
    expect(parsed?.message).toBe("Примите согласия на сайте PROF.");
    expect(parsed?.nextStep).toBe("consents");
  });

  it("falls back to error field then copy", () => {
    const parsed = parseCabinetBlockedBody({
      status: "cabinet_blocked",
      error: "Нужен профиль",
      nextStep: "profile",
    });
    expect(parsed?.message).toBe("Нужен профиль");
  });
});

describe("isLaunchContextError", () => {
  it("detects expired launch copy", () => {
    expect(isLaunchContextError("Срок входа истёк. Закройте и снова откройте мини-приложение.")).toBe(
      true,
    );
  });
});