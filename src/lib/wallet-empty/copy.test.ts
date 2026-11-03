import { describe, expect, it } from "vitest";
import { walletEmptyCopy, walletEmptyPrimaryHref } from "./copy";

describe("walletEmptyCopy", () => {
  it("uses seller copy for store and company", () => {
    expect(walletEmptyCopy("store").title).toBe("Кошелёк: кому и сколько");
    expect(walletEmptyCopy("company").primaryCta).toBe("Проверить сертификат");
  });

  it("uses earner copy for agent and specialist", () => {
    expect(walletEmptyCopy("agent").title).toBe("Здесь будут ваши начисления");
    expect(walletEmptyCopy("specialist").steps[2]?.title).toBe("Сумма в кошельке");
  });

  it("maps CTAs to existing routes only", () => {
    expect(walletEmptyPrimaryHref("store")).toBe("/scanner");
    expect(walletEmptyPrimaryHref("agent")).toBe("/certificates/new");
    expect(walletEmptyPrimaryHref("specialist")).toBe("/recommendations/new");
  });
});
