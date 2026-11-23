import { describe, expect, it, vi, afterEach } from "vitest";
import { detectMiniAppEmbeddedContext } from "./embedded-context";

describe("detectMiniAppEmbeddedContext", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns default for telegram", () => {
    expect(detectMiniAppEmbeddedContext("telegram")).toBe("default");
  });

  it("returns cross_site_iframe for max inside iframe", () => {
    vi.stubGlobal("window", {
      self: {},
      top: {},
    } as Window & typeof globalThis);
    expect(detectMiniAppEmbeddedContext("max")).toBe("cross_site_iframe");
  });

  it("returns default for max top-level", () => {
    const win = {} as Window & typeof globalThis;
    vi.stubGlobal("window", { self: win, top: win });
    expect(detectMiniAppEmbeddedContext("max")).toBe("default");
  });
});