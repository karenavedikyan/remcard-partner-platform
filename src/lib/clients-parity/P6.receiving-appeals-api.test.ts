import { describe, expect, it } from "vitest";
import {
  fetchReceivingAppealsWorkspace,
  isReceivingAppealsProxyReady,
} from "./receiving-appeals-api";

describe("P6.receiving-appeals-api contract gate", () => {
  it("proxy not ready on production pin — blocked without network", async () => {
    expect(isReceivingAppealsProxyReady()).toBe(false);
    const res = await fetchReceivingAppealsWorkspace();
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.code).toBe("BLOCKED_CONTRACT");
      expect(res.blockerId).toBe("BLK-RECEIVING-APPEALS");
    }
  });
});
