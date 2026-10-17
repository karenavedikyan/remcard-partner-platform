import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fetchRemcardUpstream = vi.fn();

vi.mock("@/lib/remcard-server", () => ({
  fetchRemcardUpstream: (...args: unknown[]) => fetchRemcardUpstream(...args),
}));

describe("fetchRegistrationCapabilitiesServer", () => {
  const envBackup = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    fetchRemcardUpstream.mockReset();
    process.env = { ...envBackup };
  });

  afterEach(() => {
    process.env = { ...envBackup };
  });

  it("production + REGISTRATION_SSR_WELCOME=1 does not force welcome when upstream fails", async () => {
    process.env.NODE_ENV = "production";
    process.env.REGISTRATION_SSR_WELCOME = "1";
    fetchRemcardUpstream.mockResolvedValue({ ok: false, status: 503, message: "x", configured: false });

    const { fetchRegistrationCapabilitiesServer } = await import("../capabilities-server");
    const caps = await fetchRegistrationCapabilitiesServer();
    expect(caps.welcomeEnabled).toBe(false);
    expect(caps.agentRegistrationPathEnabled).toBe(false);
  });

  it("development + REGISTRATION_SSR_WELCOME=1 enables welcome when upstream fails", async () => {
    process.env.NODE_ENV = "development";
    process.env.REGISTRATION_SSR_WELCOME = "1";
    fetchRemcardUpstream.mockResolvedValue({ ok: false, status: 503, message: "x", configured: false });

    const { fetchRegistrationCapabilitiesServer } = await import("../capabilities-server");
    const caps = await fetchRegistrationCapabilitiesServer();
    expect(caps.welcomeEnabled).toBe(true);
    expect(caps.agentRegistrationPathEnabled).toBe(true);
  });

  it("development without override uses upstream flags only", async () => {
    process.env.NODE_ENV = "development";
    delete process.env.REGISTRATION_SSR_WELCOME;
    fetchRemcardUpstream.mockResolvedValue({
      ok: true,
      data: {
        contractVersion: "2026-10-17.registration-01",
        welcomeEnabled: false,
        agentRegistrationPathEnabled: true,
        legacyLoginPathEnabled: true,
      },
    });

    const { fetchRegistrationCapabilitiesServer } = await import("../capabilities-server");
    const caps = await fetchRegistrationCapabilitiesServer();
    expect(caps.welcomeEnabled).toBe(false);
    expect(caps.agentRegistrationPathEnabled).toBe(true);
  });

  it("test env + REGISTRATION_SSR_WELCOME=1 does not override successful upstream", async () => {
    process.env.NODE_ENV = "test";
    process.env.REGISTRATION_SSR_WELCOME = "1";
    fetchRemcardUpstream.mockResolvedValue({
      ok: true,
      data: {
        contractVersion: "2026-10-17.registration-01",
        welcomeEnabled: false,
        agentRegistrationPathEnabled: false,
        legacyLoginPathEnabled: true,
      },
    });

    const { fetchRegistrationCapabilitiesServer } = await import("../capabilities-server");
    const caps = await fetchRegistrationCapabilitiesServer();
    expect(caps.welcomeEnabled).toBe(false);
  });
});
