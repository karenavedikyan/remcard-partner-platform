import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CabinetUiPreferencesResponse } from "@/lib/cabinet-ui-preferences-types";

const remcardFetch = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api-client", () => ({
  remcardFetch,
  RemcardApiError: class RemcardApiError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  },
}));

import { useAgentCabinetUiPrefs } from "@/components/layout/agent/useAgentCabinetUiPrefs";

const v3: CabinetUiPreferencesResponse = {
  contractVersion: "2026-10-14.r01",
  pilotEnabled: true,
  pilotActive: true,
  contextKey: "a",
  version: 3,
  theme: "system",
  mobileNavKeys: ["home"],
  permittedKeys: ["home"],
  defaultMobileNavKeys: null,
};

const v4: CabinetUiPreferencesResponse = {
  ...v3,
  version: 4,
  mobileNavKeys: ["home", "clients"],
  permittedKeys: ["home", "clients"],
};

const v5: CabinetUiPreferencesResponse = {
  ...v4,
  version: 5,
  theme: "dark",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useAgentCabinetUiPrefs monotonic apply", () => {
  it("does not regress when GET resolves after PATCH success", async () => {
    remcardFetch.mockResolvedValueOnce(v4);
    const { result } = renderHook(() => useAgentCabinetUiPrefs(v3));

    await act(async () => {
      await result.current.saveMobileNavKeys(["home", "clients"]);
    });
    expect(result.current.prefs.version).toBe(4);

    act(() => {
      result.current.applyServerPrefs(v3);
    });
    expect(result.current.prefs.version).toBe(4);
    expect(result.current.prefs.mobileNavKeys).toEqual(["home", "clients"]);
  });

  it("applies GET with higher version", async () => {
    const { result } = renderHook(() => useAgentCabinetUiPrefs(v3));
    act(() => {
      result.current.applyServerPrefs(v4);
    });
    expect(result.current.prefs.permittedKeys).toEqual(["home", "clients"]);
  });

  it("rehydrates from newer initial prop after refresh", async () => {
    const { result, rerender } = renderHook(
      ({ initial }) => useAgentCabinetUiPrefs(initial),
      { initialProps: { initial: v3 } },
    );
    rerender({ initial: v4 });
    await waitFor(() => expect(result.current.prefs.version).toBe(4));
  });

  it("does not override theme PATCH with stale GET", async () => {
    let resolvePatch!: (value: CabinetUiPreferencesResponse) => void;
    remcardFetch.mockReturnValueOnce(
      new Promise((res) => {
        resolvePatch = res;
      }),
    );
    const { result } = renderHook(() => useAgentCabinetUiPrefs(v3));

    const patchPromise = act(async () => result.current.saveTheme("dark"));
    act(() => {
      result.current.applyServerPrefs(v3);
    });

    await act(async () => {
      resolvePatch(v5);
      await patchPromise;
    });
    expect(result.current.prefs.theme).toBe("dark");
    expect(result.current.prefs.version).toBe(5);
  });
});
