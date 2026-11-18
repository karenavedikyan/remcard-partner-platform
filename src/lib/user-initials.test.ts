import { describe, expect, it } from "vitest";
import { userInitials } from "./user-initials";

describe("userInitials", () => {
  it("ignores tokens without letters, so «QA18 · M1 · sel2» is not «Q·»", () => {
    expect(userInitials("QA18 · M1 · sel2")).toBe("QM");
    expect(userInitials("K1 - head")).toBe("KH");
    expect(userInitials("· - —")).toBe("П");
  });

  it("keeps ordinary names working", () => {
    expect(userInitials("Иван Петров")).toBe("ИП");
    expect(userInitials("Иван")).toBe("ИВ");
    expect(userInitials("  ")).toBe("П");
    expect(userInitials(null)).toBe("П");
  });

  it("skips leading punctuation inside a token", () => {
    expect(userInitials("(Иван) «Петров»")).toBe("ИП");
  });
});
