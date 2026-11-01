import { describe, expect, it } from "vitest";
import { adminTestUserCreateError } from "./adminTestUserCreateError";

describe("test partner create error shown to an administrator", () => {
  it("does not expose transport codes or arbitrary exception details", () => {
    for (const value of ["SERVICE_UNAVAILABLE", "UPSTREAM_ERROR", "fetch failed", "", null, undefined]) {
      expect(adminTestUserCreateError(value)).toBe(
        "Не удалось создать тестового пользователя. Повторите попытку.",
      );
    }
  });
  it("preserves actionable Russian validation feedback", () => {
    expect(adminTestUserCreateError(" Укажите имя партнёра. ")).toBe("Укажите имя партнёра.");
  });
});
