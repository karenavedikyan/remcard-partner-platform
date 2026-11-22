import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadMessengerBridge, resetMessengerBridgeLoaderForTests } from "./bridge-loader";

describe("loadMessengerBridge cold load", () => {
  beforeEach(() => {
    resetMessengerBridgeLoaderForTests();
    document.querySelectorAll("script[id^='mini-app-']").forEach((el) => el.remove());
  });

  afterEach(() => {
    resetMessengerBridgeLoaderForTests();
    vi.restoreAllMocks();
  });

  it("deduplicates in-flight loads for the same platform", async () => {
    let appendCount = 0;
    const origAppend = document.head.appendChild.bind(document.head);
    vi.spyOn(document.head, "appendChild").mockImplementation((node) => {
      if (node instanceof HTMLScriptElement && node.id === "mini-app-telegram-bridge") {
        appendCount += 1;
      }
      return origAppend(node);
    });

    const p1 = loadMessengerBridge("telegram", { timeoutMs: 500 });
    const p2 = loadMessengerBridge("telegram", { timeoutMs: 500 });
    expect(p1).toBe(p2);

    const script = document.getElementById("mini-app-telegram-bridge") as HTMLScriptElement;
    expect(script).toBeTruthy();
    script.dispatchEvent(new Event("load"));

    const [r1, r2] = await Promise.all([p1, p2]);
    expect(r1).toEqual({ ok: true });
    expect(r2).toEqual({ ok: true });
    expect(appendCount).toBe(1);
  });

  it("waits on an existing loading script without clobbering handlers", async () => {
    const script = document.createElement("script");
    script.id = "mini-app-max-bridge";
    script.dataset.loading = "1";
    document.head.appendChild(script);

    const late = loadMessengerBridge("max", { timeoutMs: 500 });
    script.dispatchEvent(new Event("load"));
    script.dataset.loaded = "1";
    delete script.dataset.loading;

    await expect(late).resolves.toEqual({ ok: true });
  });
});