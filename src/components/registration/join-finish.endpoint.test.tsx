import { beforeEach, describe, expect, it, vi } from "vitest";
import { postRegistrationJoinFinish } from "@/lib/registration/join-finish";

vi.mock("@/lib/api-client", () => ({
  remcardFetch: vi.fn().mockResolvedValue({ ok: true, code: "completed", userId: "u", idempotentReplayed: false }),
  RemcardApiError: class RemcardApiError extends Error {},
}));

import { remcardFetch } from "@/lib/api-client";

describe("postRegistrationJoinFinish endpoints", () => {
  beforeEach(() => {
    vi.mocked(remcardFetch).mockClear();
  });

  it("posts agent finish for agent kind", async () => {
    await postRegistrationJoinFinish({
      kind: "agent",
      displayName: "A",
      city: "C",
    });
    expect(remcardFetch).toHaveBeenCalledWith(
      "/api/pro/registration/agent/finish",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("posts join finish for specialist kind", async () => {
    await postRegistrationJoinFinish({
      kind: "specialist",
      displayName: "A",
      city: "C",
    });
    expect(remcardFetch).toHaveBeenCalledWith(
      "/api/pro/registration/join/finish",
      expect.objectContaining({
        method: "POST",
        body: expect.objectContaining({ kind: "specialist" }),
      }),
    );
  });
});
