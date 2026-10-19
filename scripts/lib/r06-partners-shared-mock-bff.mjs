/**
 * Loopback upstream for PARTNERS-SHARED visual/MOCK (no DB).
 */
import { createServer } from 'node:http';

const TAXONOMY = {
  products: [{ kind: 'product', id: 'doors', label: 'Двери' }],
  services: [{ kind: 'service', id: 'design', label: 'Дизайн интерьера' }],
  stages: [{ kind: 'stage', id: 'L1-1', label: '📐 Планирование' }],
};

const DEMO_PARTNERSHIPS = [
  {
    id: 'ps-mock-active-1',
    status: 'ACTIVE',
    initiatedBy: 'mock-spec-1',
    note: null,
    createdAt: '2026-10-01T10:00:00.000Z',
    updatedAt: '2026-10-15T12:00:00.000Z',
    storeUserId: 'mock-store-1',
    proUserId: 'mock-spec-1',
    terms: [
      {
        id: 't1',
        category: 'doors',
        categoryLabel: 'Двери',
        storePercent: 10,
        isExcluded: false,
        minMargin: null,
      },
    ],
    storeUser: {
      id: 'mock-store-1',
      displayName: 'Магазин «Юг»',
      city: 'Краснодар',
      specializations: [],
      storeCategories: ['doors'],
      partnerType: 'STORE',
    },
    proUser: {
      id: 'mock-spec-1',
      displayName: 'Алексей Петров',
      city: 'Краснодар',
      specializations: ['design'],
      storeCategories: [],
      partnerType: 'MASTER',
    },
    listPreference: { personalAlias: null, archivedAt: null },
  },
  {
    id: 'ps-mock-inv-in',
    status: 'PENDING',
    initiatedBy: 'mock-store-2',
    pendingProposedBy: 'mock-store-2',
    note: null,
    createdAt: '2026-10-10T10:00:00.000Z',
    updatedAt: '2026-10-10T10:00:00.000Z',
    storeUserId: 'mock-store-2',
    proUserId: 'mock-spec-1',
    terms: [],
    storeUser: {
      id: 'mock-store-2',
      displayName: 'СтройДом',
      city: 'Сочи',
      specializations: [],
      storeCategories: ['plumbing'],
      partnerType: 'STORE',
    },
    proUser: {
      id: 'mock-spec-1',
      displayName: 'Алексей Петров',
      city: 'Краснодар',
      specializations: ['design'],
      storeCategories: [],
      partnerType: 'MASTER',
    },
    listPreference: null,
  },
  {
    id: 'ps-mock-inv-out',
    status: 'PENDING',
    initiatedBy: 'mock-spec-1',
    note: null,
    createdAt: '2026-10-11T10:00:00.000Z',
    updatedAt: '2026-10-11T10:00:00.000Z',
    storeUserId: 'mock-comp-1',
    proUserId: 'mock-spec-1',
    terms: [],
    storeUser: {
      id: 'mock-comp-1',
      displayName: 'ООО Ремонт+',
      city: 'Краснодар',
      specializations: ['finishing'],
      storeCategories: [],
      partnerType: 'COMPANY',
    },
    proUser: {
      id: 'mock-spec-1',
      displayName: 'Алексей Петров',
      city: 'Краснодар',
      specializations: ['design'],
      storeCategories: [],
      partnerType: 'MASTER',
    },
    listPreference: null,
  },
];

function buildProfile() {
  return {
    organization: null,
    programs: [],
    user: {
      id: 'mock-spec-1',
      publicId: 'RC-MOCK-SPEC',
      displayName: 'Алексей Петров',
      city: 'Краснодар',
      specializations: ['design'],
      role: 'PRO',
      partnerType: 'MASTER',
      description: null,
      catalogStatus: 'DRAFT',
      isPublic: false,
      rejectionReason: null,
      badges: [],
      photoUrl: null,
      storeCategories: [],
      areas: [],
      website: null,
      telegram: null,
      whatsapp: null,
      instagram: null,
      vk: null,
      max: null,
      yandex: null,
      publicEmail: null,
      publicPhone: null,
      showFullName: false,
    },
  };
}

export function createPartnersMockState(mode = 'specialist') {
  return { mode };
}

export function startPartnersSharedMockBff(state = createPartnersMockState()) {
  const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://127.0.0.1');
    const path = url.pathname;
    const send = (status, body) => {
      res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(body));
    };
    try {
      if (path === '/api/health') return send(200, { ok: true });
      if (path === '/api/auth/me' && req.method === 'GET') {
        return send(200, {
          user: {
            id: state.mode === 'agent' ? 'mock-agent-1' : 'mock-spec-1',
            role: 'PRO',
            displayName: state.mode === 'agent' ? 'Агент Демо' : 'Алексей Петров',
            partnerType: 'MASTER',
            isBlocked: false,
          },
        });
      }
      if (path === '/api/account/cabinet-readiness') {
        return send(200, {
          nextStep: 'ready',
          missingConsents: [],
          canAccessCabinet: true,
          needsProfileOnboarding: false,
          isEmployee: false,
          isAdmin: false,
        });
      }
      if (path === '/api/pro/r04/status') {
        const agent = state.mode === 'agent';
        return send(200, {
          contractVersion: 'r04-smoke',
          featureEnabled: true,
          hasAgentActivity: agent,
          eligible: agent,
          userId: agent ? 'mock-agent-1' : 'mock-spec-1',
          ineligibleReason: agent ? null : 'not_agent',
        });
      }
      if (path === '/api/pro/r06/status') {
        const agent = state.mode === 'agent';
        return send(200, {
          contractVersion: 'r06-smoke',
          featureEnabled: true,
          hasSpecialistActivity: !agent,
          eligible: !agent,
          profileComplete: true,
          userId: agent ? 'mock-agent-1' : 'mock-spec-1',
          ineligibleReason: agent ? 'not_specialist' : null,
        });
      }
      if (path === '/api/pro/profile') return send(200, buildProfile());
      if (path === '/api/pro/partner-taxonomy') return send(200, TAXONOMY);
      if (path === '/api/partnership/list') return send(200, { partnerships: DEMO_PARTNERSHIPS });
      if (path.startsWith('/api/partnership/search')) {
        return send(200, {
          partners: [
            {
              id: 'search-1',
              displayName: 'Партнёр из поиска',
              city: 'Краснодар',
              photoUrl: null,
              description: null,
              specializations: ['design'],
              badges: [],
              storeCategories: [],
              branches: [],
              rating: null,
              ratingCount: 0,
              partnershipStatus: null,
            },
          ],
          nextCursor: null,
        });
      }
      if (path === '/api/partnership/link-invite') return send(200, { invites: [] });
      if (path.startsWith('/api/pro/partnership-list-preferences/')) {
        return send(200, {
          preference: { personalAlias: null, archivedAt: null },
        });
      }
      return send(404, { error: 'not_mocked', path });
    } catch (e) {
      send(500, { error: String(e?.message || e) });
    }
  });

  return new Promise((resolve, reject) => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({
        server,
        baseUrl: `http://127.0.0.1:${port}`,
        close: () =>
          new Promise((r) => {
            server.close(() => r());
          }),
      });
    });
    server.on('error', reject);
  });
}
