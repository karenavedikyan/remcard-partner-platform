import { describe, expect, it } from "vitest";
import { PARTNERS_HANDSHAKE_PATHS } from "./PartnersHandshakeIcon";

describe("PartnersHandshakeIcon", () => {
  it("matches reference lucide handshake path set", () => {
    expect(PARTNERS_HANDSHAKE_PATHS).toHaveLength(5);
    expect(PARTNERS_HANDSHAKE_PATHS[0]).toBe("m11 17 2 2a1 1 0 1 0 3-3");
  });
});
