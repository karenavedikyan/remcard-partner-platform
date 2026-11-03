import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RemcardApiError } from "@/lib/api-client";
import { neutralCabinetUiPreferencesFallback } from "@/lib/cabinet-ui-preferences-fallback";
import type { CabinetUiPreferencesResponse } from "@/lib/cabinet-ui-preferences-types";
import { CabinetShellContextProvider } from "@/components/layout/cabinet-shell-context";
import { useCabinetShellPrefsPathRefresh } from "@/hooks/useCabinetShellPrefsPathRefresh";
import { useAgentCabinetUiPrefs } from "@/components/layout/agent/useAgentCabinetUiPrefs";

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

function legacyPrefs(overrides: Partial<CabinetUiPreferencesResponse> = {}): CabinetUiPreferencesResponse {
  return {
    contractVersion: "2026-10-14.r01",
    pilotEnabled: false,
    pilotActive: false,
    contextKey: null,
    version: 0,
    theme: null,
    mobileNavKeys: null,
    permittedKeys: null,
    defaultMobileNavKeys: null,
    ...overrides,
  };
}

function agentPrefs(overrides: Partial<CabinetUiPreferencesResponse> = {}): CabinetUiPreferencesResponse {
  return legacyPrefs({
    pilotEnabled: true,
    pilotActive: true,
    contextKey: "ctx-a",
    version: 3,
    theme: "system",
    mobileNavKeys: ["home", "clients"],
    permittedKeys: ["home", "clients", "certificates"],
    ...overrides,
  });
}

function wrapper(token = "shell-tok") {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <CabinetShellContextProvider shellContextToken={token}>{children}</CabinetShellContextProvider>
    );
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.pathname = "/";
  mocks.remcardFetch.mockResolvedValue(legacyPrefs());
});

describe("useCabinetShellPrefsPathRefresh", () => {
  it("issues exactly one prefs GET per pathname change on legacy branch", async () => {
    const { rerender } = renderHook(
      () =>
        useCabinetShellPrefsPathRefresh({
          layoutPrefs: legacyPrefs(),
        }),
      { wrapper: wrapper() },
    );
    await waitFor(() => expect(mocks.remcardFetch).toHaveBeenCalledTimes(1));
    mocks.pathname = "/clients";
    rerender();
    await waitFor(() => expect(mocks.remcardFetch).toHaveBeenCalledTimes(2));
  });

  it("refreshes layout once when legacy layout sees pilot flip false to true", async () => {
    mocks.remcardFetch.mockResolvedValue(agentPrefs());
    renderHook(
      () =>
        useCabinetShellPrefsPathRefresh({
          layoutPrefs: legacyPrefs(),
        }),
      { wrapper: wrapper() },
    );
    await waitFor(() => expect(mocks.refresh).toHaveBeenCalledTimes(1));
  });

  it("refreshes layout once when agent layout sees pilot flip true to false", async () => {
    mocks.remcardFetch.mockResolvedValue(legacyPrefs());
    renderHook(
      () =>
        useCabinetShellPrefsPathRefresh({
          layoutPrefs: agentPrefs(),
        }),
      { wrapper: wrapper() },
    );
    await waitFor(() => expect(mocks.refresh).toHaveBeenCalledTimes(1));
  });

  it("refreshes once on contextKey change", async () => {
    mocks.remcardFetch.mockResolvedValue(agentPrefs({ contextKey: "ctx-b" }));
    renderHook(
      () =>
        useCabinetShellPrefsPathRefresh({
          layoutPrefs: agentPrefs({ contextKey: "ctx-a" }),
        }),
      { wrapper: wrapper() },
    );
    await waitFor(() => expect(mocks.refresh).toHaveBeenCalledTimes(1));
  });

  it("applies mobile key changes in place without refresh when branch signature matches", async () => {
    mocks.remcardFetch.mockResolvedValue(
      agentPrefs({ version: 4, mobileNavKeys: ["home", "clients", "certificates"] }),
    );
    const { result } = renderHook(
      () => {
        const agent = useAgentCabinetUiPrefs(agentPrefs());
        useCabinetShellPrefsPathRefresh({
          layoutPrefs: agentPrefs(),
          applyServerPrefs: agent.applyServerPrefs,
          applyAuthFailureClear: agent.applyAuthFailureClear,
          getApplyGeneration: agent.getApplyGeneration,
        });
        return agent.prefs;
      },
      { wrapper: wrapper() },
    );
    await waitFor(() => expect(result.current.mobileNavKeys).toEqual(["home", "clients", "certificates"]));
    expect(mocks.refresh).not.toHaveBeenCalled();
  });

  it("does not refresh when prefs are unchanged", async () => {
    mocks.remcardFetch.mockResolvedValue(agentPrefs());
    renderHook(
      () =>
        useCabinetShellPrefsPathRefresh({
          layoutPrefs: agentPrefs(),
        }),
      { wrapper: wrapper() },
    );
    await waitFor(() => expect(mocks.remcardFetch).toHaveBeenCalledTimes(1));
    expect(mocks.refresh).not.toHaveBeenCalled();
  });

  it("does not loop refresh for the same layout/fresh signature pair", async () => {
    mocks.remcardFetch.mockResolvedValue(agentPrefs({ contextKey: "ctx-b" }));
    const { rerender } = renderHook(
      () =>
        useCabinetShellPrefsPathRefresh({
          layoutPrefs: agentPrefs({ contextKey: "ctx-a" }),
        }),
      { wrapper: wrapper() },
    );
    await waitFor(() => expect(mocks.refresh).toHaveBeenCalledTimes(1));
    rerender();
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
  });

  it.each([401, 403])("legacy branch refreshes on HTTP %i without in-memory prefs", async (status) => {
    mocks.remcardFetch.mockRejectedValue(new RemcardApiError(status, "denied", null));
    renderHook(
      () =>
        useCabinetShellPrefsPathRefresh({
          layoutPrefs: legacyPrefs(),
        }),
      { wrapper: wrapper() },
    );
    await waitFor(() => expect(mocks.refresh).toHaveBeenCalled());
  });

  it.each([401, 403])("agent branch force-clears prefs on HTTP %i", async (status) => {
    mocks.remcardFetch.mockRejectedValue(new RemcardApiError(status, "denied", null));
    const { result } = renderHook(
      () => {
        const agent = useAgentCabinetUiPrefs(agentPrefs({ version: 5 }));
        useCabinetShellPrefsPathRefresh({
          layoutPrefs: agentPrefs({ version: 5 }),
          applyServerPrefs: agent.applyServerPrefs,
          applyAuthFailureClear: agent.applyAuthFailureClear,
          getApplyGeneration: agent.getApplyGeneration,
        });
        return agent.prefs;
      },
      { wrapper: wrapper() },
    );
    await waitFor(() => expect(result.current).toEqual(neutralCabinetUiPreferencesFallback));
  });
});
