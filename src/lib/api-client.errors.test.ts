import { describe, expect, it } from "vitest";
import { remcardApiErrorMessage } from "./api-client";

describe("remcardApiErrorMessage", () => {
  it("uses JSON error body when present", () => {
    expect(remcardApiErrorMessage(500, "", { error: "Сбой создания" })).toBe("Сбой создания");
  });

  it("falls back when body and statusText are blank", () => {
    expect(remcardApiErrorMessage(500, "  ", null)).toBe("Ошибка сервера (500)");
  });

  it("uses statusText when body empty", () => {
    expect(remcardApiErrorMessage(502, "Bad Gateway", null)).toBe("Bad Gateway");
  });
});
