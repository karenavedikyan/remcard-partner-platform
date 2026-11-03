import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { RemcardApiError } from "@/lib/api-client";
import { neutralCabinetUiPreferencesFallback } from "@/lib/cabinet-ui-preferences-fallback";
import type { CabinetUiPreferencesResponse } from "@/lib/cabinet-ui-preferences-types";

const mocks = vi.hoisted(() => ({
  remcardFetch: vi.fn(),
  pathname: "/",
  refresh: vi.fn(),
}));

vi.mock("@/lib/api-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api-client")>();
  return {
    ...actual,
    remcardFetch: mocks.remcardFetch,
  };
});

vi.mock("next/navigation", () => ({
  usePathname: () => mocks.pathname,
  useRouter: () => ({ refresh: mocks.refresh, push: vi.fn() }),
}));

import { CabinetShellContextProvider } from "@/components/layout/cabinet-shell-context";
import { useCabinetShellPrefsPathRefresh } from "@/hooks/useCabinetShellPrefsPathRefresh";
import { useAgentCabinetUiPrefs } from "@/components/layout/agent/useAgentCabinetUiPrefs";

const v3: CabinetUiPreferencesResponse = {
  contractVersion: "2026-10-14.r01",
  pilotEnabled: true,
  pilotActive: true,
  contextKey: "ctx",
  version: 3,
  theme: "system",
  mobileNavKeys: ["home"],
  permittedKeys: ["home"],
  defaultMobileNavKeys: null,
};

function PrefsPathRefreshProbe() {
  const { applyServerPrefs, applyAuthFailureClear, getApplyGeneration, prefs } =
    useAgentCabinetUiPrefs(v3);
  useCabinetShellPrefsPathRefresh({
    layoutPrefs: v3,
    applyServerPrefs,
    applyAuthFailureClear,
    getApplyGeneration,
  });
  return prefs;
}

function probeWrapper({ children }: { children: React.ReactNode }) {
  return (
    <CabinetShellContextProvider shellContextToken="test">{children}</CabinetShellContextProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.pathname = "/";
});

describe("useAgentCabinetPrefsPathRefresh auth failure", () => {
  it("clears prefs to neutral on HTTP 401", async () => {
    mocks.remcardFetch.mockRejectedValue(new RemcardApiError(401, "denied", null));
    const { result } = renderHook(() => PrefsPathRefreshProbe(), { wrapper: probeWrapper });
    await waitFor(() =>
      expect(result.current).toEqual(neutralCabinetUiPreferencesFallback),
    );
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
  });

  it("keeps prefs on HTTP 403 without refresh", async () => {
    mocks.remcardFetch.mockRejectedValue(new RemcardApiError(403, "denied", null));
    const { result } = renderHook(() => PrefsPathRefreshProbe(), { wrapper: probeWrapper });
    await waitFor(() => expect(mocks.remcardFetch).toHaveBeenCalledTimes(1));
    expect(result.current.version).toBe(3);
    expect(mocks.refresh).not.toHaveBeenCalled();
  });
});
