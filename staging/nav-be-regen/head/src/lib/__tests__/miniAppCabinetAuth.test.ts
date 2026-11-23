import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mockProfCabinet = vi.fn();
const mockEmbedded = vi.fn();
const mockCabinetAccess = vi.fn();

vi.mock('@/lib/proAuth', () => ({
  getProfCabinetUser: (...args: unknown[]) => mockProfCabinet(...args),
}));

vi.mock('@/lib/miniAppEmbeddedAuth', () => ({
  resolveProfUserFromEmbeddedToken: (...args: unknown[]) => mockEmbedded(...args),
}));

vi.mock('@/lib/cabinetAccess', () => ({
  assertCabinetProfAccess: (...args: unknown[]) => mockCabinetAccess(...args),
}));

describe('getProfCabinetUserForMiniApp', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCabinetAccess.mockResolvedValue({ ok: true });
  });

  it('prefers first-party prof session', async () => {
    const sessionUser = { id: 'from-session' };
    mockProfCabinet.mockResolvedValue(sessionUser);
    const { getProfCabinetUserForMiniApp } = await import('@/lib/miniAppCabinetAuth');
    const user = await getProfCabinetUserForMiniApp(new NextRequest('http://localhost'), 'max');
    expect(user).toBe(sessionUser);
    expect(mockEmbedded).not.toHaveBeenCalled();
  });

  it('does not accept embedded token without cabinet access', async () => {
    mockProfCabinet.mockResolvedValue(null);
    mockEmbedded.mockResolvedValue({ id: 'embedded' });
    mockCabinetAccess.mockResolvedValue({ ok: false });
    const { getProfCabinetUserForMiniApp } = await import('@/lib/miniAppCabinetAuth');
    const user = await getProfCabinetUserForMiniApp(new NextRequest('http://localhost'), 'max');
    expect(user).toBeNull();
  });

  it('accepts embedded token when cabinet access passes', async () => {
    const embeddedUser = { id: 'embedded' };
    mockProfCabinet.mockResolvedValue(null);
    mockEmbedded.mockResolvedValue(embeddedUser);
    const { getProfCabinetUserForMiniApp } = await import('@/lib/miniAppCabinetAuth');
    const user = await getProfCabinetUserForMiniApp(new NextRequest('http://localhost'), 'max');
    expect(user).toBe(embeddedUser);
  });
});