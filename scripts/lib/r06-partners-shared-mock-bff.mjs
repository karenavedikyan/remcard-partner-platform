/**
 * Loopback upstream for PARTNERS-SHARED visual/MOCK (no DB).
 * Modes: specialist | agent | specialist_ineligible | store_legacy
 */
import { createServer } from 'node:http';

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw || '{}';
}

const TAXONOMY = {
  products: [{ kind: 'product', id: 'doors', label: 'Двери' }],
  services: [{ kind: 'service', id: 'design', label: 'Дизайн интерьера' }],
  stages: [{ kind: 'stage', id: 'L1-1', label: '📐 Планирование' }],
};

const SPEC_ID = 'mock-spec-1';
const AGENT_ID = 'mock-agent-1';
const STORE_OWNER_ID = 'mock-store-owner-1';

/** Template partnerships for specialist actor (proUserId = SPEC_ID). */
const SPEC_PARTNERSHIPS = [
  {
    id: 'ps-mock-active-1',
    status: 'ACTIVE',
    initiatedBy: SPEC_ID,
    note: null,
    createdAt: '2026-10-01T10:00:00.000Z',
    updatedAt: '2026-10-15T12:00:00.000Z',
    storeUserId: 'mock-store-1',
    proUserId: SPEC_ID,
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
      id: SPEC_ID,
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
    proUserId: SPEC_ID,
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
      id: SPEC_ID,
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
    initiatedBy: SPEC_ID,
    note: null,
    createdAt: '2026-10-11T10:00:00.000Z',
    updatedAt: '2026-10-11T10:00:00.000Z',
    storeUserId: 'mock-comp-1',
    proUserId: SPEC_ID,
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
      id: SPEC_ID,
      displayName: 'Алексей Петров',
      city: 'Краснодар',
      specializations: ['design'],
      storeCategories: [],
      partnerType: 'MASTER',
    },
    listPreference: null,
  },
];

function remapPartnershipsForProUser(rows, proUserId, displayName) {
  return rows.map((row) => {
    const next = structuredClone(row);
    next.proUserId = proUserId;
    next.proUser = { ...next.proUser, id: proUserId, displayName };
    if (next.initiatedBy === SPEC_ID) next.initiatedBy = proUserId;
    return next;
  });
}

function actorForMode(mode) {
  if (mode === 'agent') {
    return {
      id: AGENT_ID,
      displayName: 'Агент Демо',
      partnerType: 'MASTER',
    };
  }
  if (mode === 'store_legacy') {
    return {
      id: STORE_OWNER_ID,
      displayName: 'Владелец магазина',
      partnerType: 'STORE',
    };
  }
  return {
    id: SPEC_ID,
    displayName: 'Алексей Петров',
    partnerType: 'MASTER',
  };
}

function buildProfile(actor) {
  const isStore = actor.partnerType === 'STORE';
  return {
    organization: isStore
      ? {
          id: 'org-mock-store',
          name: 'Магазин «Юг»',
          catalogStatus: 'APPROVED',
          partnerType: 'STORE',
          branchCount: 1,
          storeCategories: ['doors'],
          specializations: [],
        }
      : null,
    programs: [],
    user: {
      id: actor.id,
      publicId: isStore ? 'RC-MOCK-STORE' : 'RC-MOCK-MASTER',
      displayName: actor.displayName,
      city: 'Краснодар',
      specializations: isStore ? [] : ['design'],
      role: 'PRO',
      partnerType: actor.partnerType,
      description: null,
      catalogStatus: isStore ? 'APPROVED' : 'DRAFT',
      isPublic: isStore,
      rejectionReason: null,
      badges: [],
      photoUrl: null,
      storeCategories: isStore ? ['doors'] : [],
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

function r06Payload(mode, actorId) {
  if (mode === 'agent') {
    return {
      contractVersion: 'r06-smoke',
      featureEnabled: true,
      hasSpecialistActivity: false,
      eligible: false,
      profileComplete: true,
      userId: actorId,
      ineligibleReason: 'not_specialist',
    };
  }
  if (mode === 'specialist_ineligible') {
    return {
      contractVersion: 'r06-smoke',
      featureEnabled: true,
      hasSpecialistActivity: true,
      eligible: false,
      profileComplete: true,
      userId: actorId,
      ineligibleReason: 'employee',
    };
  }
  if (mode === 'store_legacy') {
    return {
      contractVersion: 'r06-smoke',
      featureEnabled: true,
      hasSpecialistActivity: false,
      eligible: false,
      profileComplete: false,
      userId: actorId,
      ineligibleReason: 'not_specialist',
    };
  }
  return {
    contractVersion: 'r06-smoke',
    featureEnabled: true,
    hasSpecialistActivity: true,
    eligible: true,
    profileComplete: true,
    userId: actorId,
    ineligibleReason: null,
  };
}

function defaultMockClients(mode) {
  if (mode === 'agent') {
    return [
      {
        id: 'mock-agent-client-1',
        displayName: 'Иван Агентский',
        phone: null,
        email: null,
        city: 'Москва',
        need: null,
        note: 'Legacy task',
        archivedAt: null,
        createdAt: '2026-10-01T10:00:00.000Z',
        updatedAt: '2026-10-12T10:00:00.000Z',
        certificateCount: 1,
        hasPurchases: false,
      },
    ];
  }
  return [
    {
      id: 'mock-spec-client-1',
      displayName: 'Анна Клиентова',
      phone: '+79001234567',
      email: 'anna@example.mock',
      city: 'Краснодар',
      need: 'Дизайн кухни',
      note: 'Планирует ремонт весной',
      archivedAt: null,
      createdAt: '2026-10-01T10:00:00.000Z',
      updatedAt: '2026-10-15T12:00:00.000Z',
      certificateCount: 2,
      hasPurchases: true,
    },
    {
      id: 'mock-spec-client-empty',
      displayName: 'Пустой Контакт',
      phone: null,
      email: null,
      city: null,
      need: null,
      note: null,
      archivedAt: null,
      createdAt: '2026-10-02T10:00:00.000Z',
      updatedAt: '2026-10-02T10:00:00.000Z',
      certificateCount: 0,
      hasPurchases: false,
    },
  ];
}

function enrichOrdinaryIssuerCertDto(cert) {
  const storeName = cert.partnerStoreName ?? 'Магазин «Юг»';
  const discount = cert.discountPercent ?? 4.7;
  return {
    ...cert,
    partnerOffers: cert.partnerOffers ?? [
      {
        storeName,
        storeUserId: 'mock-store-visual-1',
        categories: [
          {
            category: 'doors',
            categoryLabel: cert.categorySummary ?? 'Двери',
            discountPercent: discount,
            issuerBonusPercent: 5,
            agentBonusPercent: null,
          },
        ],
      },
    ],
    terms: cert.terms ?? [
      {
        partnerName: storeName,
        categoryName: cert.categorySummary ?? 'Двери',
        discountPercent: discount,
        issuerBonusPercent: 5,
        agentBonusPercent: null,
      },
    ],
    certificateUrl: cert.certificateUrl ?? 'https://remcard.test/c/demo',
  };
}

function collectIssuerCertificateRows(state) {
  ensureClientsState(state);
  const byId = new Map();
  for (const list of state.clientCerts.values()) {
    for (const cert of list) {
      byId.set(cert.id, enrichOrdinaryIssuerCertDto(cert));
    }
  }
  for (const raw of state.createdCerts) {
    if (!byId.has(raw.id)) {
      byId.set(raw.id, enrichOrdinaryIssuerCertDto({
        id: raw.id,
        promoCode: raw.promoCode,
        displayCode: raw.displayCode ?? raw.promoCode,
        qrCode: raw.qrCode,
        status: raw.status ?? 'ACTIVE',
        validUntil: null,
        maxUsages: 1,
        usageCount: 0,
        createdAt: raw.createdAt ?? new Date().toISOString(),
        userAlias: raw.userAlias ?? raw.title ?? null,
        title: raw.title ?? raw.userAlias ?? 'Сертификат',
        directionLabel: null,
        partnerStoreName: 'Магазин «Юг»',
        partnerCount: 1,
        categorySummary: 'Двери',
        discountPercent: 10,
        archivedInWorkspace: false,
        hasOrders: false,
        agentClient: raw.agentClientId
          ? state.clients.get(raw.agentClientId)
            ? {
                id: raw.agentClientId,
                displayName: state.clients.get(raw.agentClientId).displayName,
              }
            : null
          : null,
        issuerKindSnapshot: null,
        certificateUrl: 'https://remcard.test/c/demo',
      }));
    }
  }
  return [...byId.values()];
}

function ensureClientsState(state) {
  if (!state.clients) {
    state.clients = new Map(defaultMockClients(state.mode).map((c) => [c.id, { ...c }]));
    state.clientCerts = new Map([
      [
        'mock-spec-client-1',
        [
          {
            id: 'mock-cert-1',
            promoCode: 'DEMO1',
            displayCode: 'RC-DEMO-1',
            qrCode: 'qr-demo-1',
            status: 'ACTIVE',
            validUntil: null,
            maxUsages: 1,
            usageCount: 0,
            createdAt: '2026-10-10T10:00:00.000Z',
            userAlias: 'Кухня · скидки',
            title: 'Кухня · скидки',
            directionLabel: null,
            partnerStoreName: 'Магазин «Юг»',
            partnerCount: 1,
            categorySummary: 'Двери',
            discountPercent: 10,
            archivedInWorkspace: false,
            hasOrders: true,
            agentClient: { id: 'mock-spec-client-1', displayName: 'Анна Клиентова' },
            issuerKindSnapshot: null,
          },
        ],
      ],
    ]);
    state.clientPurchases = new Map([
      [
        'mock-spec-client-1',
        [
          {
            id: 'mock-order-1',
            createdAt: '2026-10-11T10:00:00.000Z',
            status: 'CONFIRMED',
            statusLabel: 'Подтверждена',
            countsAsPurchase: true,
            totalAmount: 125000,
            partnerName: 'Магазин «Юг»',
            certificateId: 'mock-cert-1',
            lineSummary: 'Двери',
          },
          {
            id: 'mock-order-2',
            createdAt: '2026-10-09T10:00:00.000Z',
            status: 'CANCELLED',
            statusLabel: 'Отменена',
            countsAsPurchase: false,
            totalAmount: 45000,
            partnerName: 'Магазин «Юг»',
            certificateId: 'mock-cert-1',
            lineSummary: 'Плитка',
          },
        ],
      ],
    ]);
    state.clientSeq = 100;
    state.createdCerts = [
      {
        id: 'mock-cert-visual-edit',
        promoCode: 'VIS-EDIT',
        displayCode: 'С-VIS-EDIT',
        qrCode: 'qr-visual-edit',
        status: 'ACTIVE',
        validUntil: null,
        maxUsages: 1,
        usageCount: 0,
        createdAt: '2026-10-12T10:00:00.000Z',
        userAlias: 'Визуальный сертификат',
        title: 'Визуальный сертификат',
        directionLabel: 'Двери',
        partnerStoreName: 'Магазин «Юг»',
        partnerCount: 1,
        categorySummary: 'Двери',
        discountPercent: 4.7,
        archivedInWorkspace: false,
        hasOrders: false,
        agentClient: null,
        issuerKindSnapshot: 'SPECIALIST',
        partnerOffers: [
          {
            storeName: 'Магазин «Юг»',
            storeUserId: 'mock-store-visual-1',
            categories: [
              {
                category: 'doors',
                categoryLabel: 'Двери',
                discountPercent: 4.7,
                issuerBonusPercent: 5.3,
                agentBonusPercent: null,
              },
            ],
          },
        ],
      },
    ];
  }
}

export function createPartnersMockState(mode = 'specialist') {
  return {
    mode,
    preferences: new Map(),
    searchFailOnce: false,
    searchCalls: 0,
    linkInvites: [],
    inviteCounter: 0,
    preferencePatchFailIds: new Set(),
    discussionInvites: [],
    discussionInviteCounter: 0,
    clients: null,
    clientCerts: null,
    clientPurchases: null,
    clientSeq: 0,
    createdCerts: [],
    clientsForceEmpty: false,
    clientsListGetFail: false,
  };
}

export function startPartnersSharedMockBff(state = createPartnersMockState()) {
  const partnerships =
    state.mode === 'agent'
      ? remapPartnershipsForProUser(SPEC_PARTNERSHIPS, AGENT_ID, 'Агент Демо')
      : state.mode === 'store_legacy'
        ? []
        : SPEC_PARTNERSHIPS;

  const server = createServer(async (req, res) => {
    const actor = actorForMode(state.mode);
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
            id: actor.id,
            role: 'PRO',
            displayName: actor.displayName,
            partnerType: actor.partnerType,
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
          userId: actor.id,
          ineligibleReason: agent ? null : 'not_agent',
        });
      }
      if (path === '/api/pro/r06/status') {
        return send(200, r06Payload(state.mode, actor.id));
      }
      if (path === '/api/pro/context' && req.method === 'GET') {
        return send(200, { organization: null, activeBranch: null });
      }
      if (path === '/api/store/certificate/available-partners' && req.method === 'GET') {
        return send(200, {
          certificateRecommendationIssuerReady: true,
          certificateRecommendationIssuerMissing: [],
          partners: [
            {
              partnershipId: 'mock-partnership-visual-1',
              storeUserId: 'mock-store-visual-1',
              storeName: 'Кафе Партнёр',
              city: 'Москва',
              isSelfScan: false,
              programReady: true,
              categories: [
                {
                  category: 'food',
                  categoryLabel: 'Кухня',
                  poolPercent: 5,
                  discountPercent: 3,
                  issuerPercent: 2,
                },
              ],
            },
          ],
          selfScanPartner: null,
        });
      }
      if (path === '/api/pro/r03/status') {
        const agent = state.mode === 'agent';
        return send(200, {
          contractVersion: 'r03-smoke',
          featureEnabled: true,
          hasAgentActivity: agent,
          eligible: agent,
          userId: actor.id,
          ineligibleReason: agent ? null : 'not_agent',
        });
      }
      ensureClientsState(state);
      if (path === '/api/pro/agent-clients' && req.method === 'GET') {
        if (state.clientsListGetFail) {
          state.clientsListGetFail = false;
          return send(503, { error: 'mock_clients_list_unavailable' });
        }
        const url = new URL(req.url || '', 'http://127.0.0.1');
        const archived = url.searchParams.get('archived') === 'true';
        const q = (url.searchParams.get('q') || '').trim().toLowerCase();
        let rows = state.clientsForceEmpty
          ? []
          : [...state.clients.values()].filter((c) =>
              archived ? Boolean(c.archivedAt) : !c.archivedAt,
            );
        if (q) {
          rows = rows.filter((c) =>
            [c.displayName, c.city, c.need, c.note, c.phone, c.email]
              .filter(Boolean)
              .some((v) => String(v).toLowerCase().includes(q)),
          );
        }
        const activeCount = [...state.clients.values()].filter((c) => !c.archivedAt).length;
        const archivedCount = [...state.clients.values()].filter((c) => c.archivedAt).length;
        return send(200, {
          clients: rows,
          nextCursor: null,
          totalShown: rows.length,
          page: 1,
          pageSize: 25,
          totalCount: rows.length,
          totalPages: 1,
          activeCount,
          archivedCount,
          hasNextPage: false,
          hasPrevPage: false,
          sort: 'updated_desc',
        });
      }
      if (path === '/api/pro/specialist-issuer-certificates' && req.method === 'GET') {
        if (state.mode !== 'specialist') {
          return send(403, { error: 'SPECIALIST_ISSUER_INELIGIBLE' });
        }
        if (state.certificatesListGetFail) {
          return send(503, { error: 'mock_certificates_list_unavailable' });
        }
        const url = new URL(req.url || '', 'http://127.0.0.1');
        const archived = url.searchParams.get('archived') === 'true';
        const q = (url.searchParams.get('q') || '').trim().toLowerCase();
        let rows = state.certificatesForceEmpty ? [] : collectIssuerCertificateRows(state);
        if (archived) {
          rows = rows.filter((c) => c.archivedInWorkspace);
        } else {
          rows = rows.filter((c) => !c.archivedInWorkspace);
        }
        if (q) {
          rows = rows.filter((c) =>
            [c.title, c.userAlias, c.promoCode, c.partnerStoreName, c.categorySummary]
              .filter(Boolean)
              .some((v) => String(v).toLowerCase().includes(q)),
          );
        }
        const activeCount = collectIssuerCertificateRows(state).filter((c) => !c.archivedInWorkspace)
          .length;
        const archivedCount = collectIssuerCertificateRows(state).filter((c) => c.archivedInWorkspace)
          .length;
        return send(200, {
          certificates: rows,
          nextCursor: null,
          totalShown: rows.length,
          page: 1,
          pageSize: 25,
          totalCount: rows.length,
          totalPages: 1,
          activeCount,
          archivedCount,
          hasNextPage: false,
          hasPrevPage: false,
          sort: url.searchParams.get('sort') || 'created_desc',
        });
      }
      const specIssuerCertMatch = path.match(/^\/api\/pro\/specialist-issuer-certificates\/([^/]+)$/);
      if (specIssuerCertMatch && state.mode === 'specialist') {
        const certId = decodeURIComponent(specIssuerCertMatch[1]);
        const rows = collectIssuerCertificateRows(state);
        const cert = rows.find((c) => c.id === certId);
        if (!cert) return send(404, { error: 'Не найдено' });
        if (req.method === 'GET') {
          return send(200, { certificate: cert });
        }
        if (req.method === 'PATCH') {
          const body = JSON.parse(await readBody(req));
          if (body.action === 'archive') cert.archivedInWorkspace = true;
          if (body.action === 'restore') cert.archivedInWorkspace = false;
          if (body.action === 'cancel') {
            if (cert.hasOrders || cert.usageCount > 0) {
              return send(409, { error: 'CERT_HAS_OPERATIONS', code: 'CERT_HAS_OPERATIONS' });
            }
            cert.status = 'CANCELLED';
          }
          if (body.userAlias != null) {
            cert.userAlias = body.userAlias;
            cert.title = body.userAlias || cert.title;
          }
          if (body.action === 'updateDiscounts' && Array.isArray(body.updates)) {
            for (const upd of body.updates) {
              for (const offer of cert.partnerOffers ?? []) {
                if (offer.storeUserId !== upd.storeUserId) continue;
                for (const cat of offer.categories ?? []) {
                  if (cat.category === upd.category) {
                    cat.discountPercent = upd.discountPercent;
                    if (cat.issuerBonusPercent != null) {
                      cat.issuerBonusPercent = Math.max(
                        0,
                        Math.round((10 - upd.discountPercent) * 10) / 10,
                      );
                    }
                  }
                }
              }
            }
            return send(200, { certificate: cert });
          }
          return send(200, { ok: true, certificate: cert });
        }
        if (req.method === 'DELETE') {
          if (cert.hasOrders) {
            return send(409, { error: 'CERT_HAS_USAGE', code: 'CERT_HAS_USAGE' });
          }
          for (const [clientId, list] of state.clientCerts.entries()) {
            state.clientCerts.set(
              clientId,
              list.filter((c) => c.id !== certId),
            );
          }
          state.createdCerts = state.createdCerts.filter((c) => c.id !== certId);
          return send(200, { ok: true });
        }
      }
      if (path === '/api/pro/agent-clients' && req.method === 'POST') {
        const body = JSON.parse(await readBody(req));
        state.clientSeq += 1;
        const id = `mock-client-new-${state.clientSeq}`;
        const row = {
          id,
          displayName: body.displayName,
          phone: body.phone ?? null,
          email: body.email ?? null,
          city: body.city ?? null,
          need: body.need ?? null,
          note: body.note ?? null,
          archivedAt: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          certificateCount: 0,
          hasPurchases: false,
        };
        state.clients.set(id, row);
        state.clientCerts.set(id, []);
        state.clientPurchases.set(id, []);
        return send(201, { client: row });
      }
      const clientDetailMatch = path.match(/^\/api\/pro\/agent-clients\/([^/]+)$/);
      if (clientDetailMatch) {
        const clientId = decodeURIComponent(clientDetailMatch[1]);
        const row = state.clients.get(clientId);
        if (!row) return send(404, { error: 'Не найдено' });
        if (req.method === 'GET') {
          const certs = state.clientCerts.get(clientId) ?? [];
          const purchases = state.clientPurchases.get(clientId) ?? [];
          const purchaseCount = purchases.filter((p) => p.countsAsPurchase).length;
          const lastCertificateAt = certs[0]?.createdAt ?? null;
          return send(200, {
            client: { ...row, purchaseCount, lastCertificateAt },
            certificates: certs,
            purchases,
          });
        }
        if (req.method === 'PATCH') {
          const body = JSON.parse(await readBody(req));
          const next = { ...row, updatedAt: new Date().toISOString() };
          if (body.displayName != null) next.displayName = body.displayName;
          if ('phone' in body) next.phone = body.phone;
          if ('email' in body) next.email = body.email;
          if ('city' in body) next.city = body.city;
          if ('need' in body) next.need = body.need;
          if ('note' in body) next.note = body.note;
          if (body.action === 'archive') next.archivedAt = new Date().toISOString();
          if (body.action === 'restore') next.archivedAt = null;
          state.clients.set(clientId, next);
          return send(200, { client: next });
        }
      }
      if (path === '/api/store/certificate' && req.method === 'POST') {
        const body = JSON.parse(await readBody(req));
        const agentClientId = body.agentClientId?.trim() || null;
        if (state.mode !== 'specialist' && state.mode !== 'agent') {
          return send(403, { error: 'Forbidden' });
        }
        if (agentClientId && !state.clients.has(agentClientId)) {
          return send(400, { error: 'Клиент не найден' });
        }
        const certId = `mock-created-cert-${state.createdCerts.length + 1}`;
        const cert = {
          id: certId,
          promoCode: `NEW${state.createdCerts.length + 1}`,
          displayCode: `RC-NEW-${state.createdCerts.length + 1}`,
          qrCode: `qr-new-${state.createdCerts.length + 1}`,
          status: 'ACTIVE',
          createdAt: new Date().toISOString(),
          userAlias: 'Новый сертификат',
          title: 'Новый сертификат',
          agentClientId,
        };
        state.createdCerts.push(cert);
        if (agentClientId) {
          const client = state.clients.get(agentClientId);
          const list = state.clientCerts.get(agentClientId) ?? [];
          list.unshift({
            id: certId,
            promoCode: cert.promoCode,
            displayCode: cert.displayCode,
            qrCode: cert.qrCode,
            status: 'ACTIVE',
            validUntil: null,
            maxUsages: 1,
            usageCount: 0,
            createdAt: cert.createdAt,
            userAlias: cert.userAlias,
            title: cert.title,
            directionLabel: null,
            partnerStoreName: 'Магазин «Юг»',
            partnerCount: 1,
            categorySummary: 'Двери',
            discountPercent: 10,
            archivedInWorkspace: false,
            hasOrders: false,
            agentClient: client
              ? { id: client.id, displayName: client.displayName }
              : null,
            issuerKindSnapshot: null,
          });
          state.clientCerts.set(agentClientId, list);
          client.certificateCount = list.length;
          state.clients.set(agentClientId, client);
        }
        return send(201, { id: certId, certificate: cert });
      }
      if (path === '/api/pro/profile') return send(200, buildProfile(actor));
      if (path === '/api/pro/partner-taxonomy') return send(200, TAXONOMY);
      if (path === '/api/partnership/list') {
        const withPrefs = partnerships.map((p) => {
          const key = `${actor.id}:${p.id}`;
          const pref = state.preferences.get(key);
          if (!pref) return p;
          return { ...p, listPreference: pref };
        });
        let active = 0;
        let archive = 0;
        let hidden = 0;
        for (const row of withPrefs) {
          const pref = row.listPreference;
          const isHidden = Boolean(pref?.hiddenAt);
          const isArchive = Boolean(pref?.archivedAt);
          if (isHidden) hidden += 1;
          else if (isArchive) archive += 1;
          else active += 1;
        }
        const url = new URL(req.url || '', 'http://127.0.0.1');
        const visibility = url.searchParams.get('listVisibility');
        const filtered =
          visibility === 'hidden'
            ? withPrefs.filter((row) => Boolean(row.listPreference?.hiddenAt))
            : visibility === 'archive'
              ? withPrefs.filter(
                  (row) =>
                    Boolean(row.listPreference?.archivedAt) && !row.listPreference?.hiddenAt,
                )
              : visibility === 'active'
                ? withPrefs.filter(
                    (row) =>
                      !row.listPreference?.hiddenAt && !row.listPreference?.archivedAt,
                  )
                : withPrefs;
        return send(200, {
          partnerships: filtered,
          listCounts: { active, archive, hidden },
          listVisibility: visibility || 'all',
        });
      }
      if (path.startsWith('/api/partnership/search')) {
        state.searchCalls += 1;
        if (state.searchFailOnce) {
          state.searchFailOnce = false;
          return send(500, { error: 'mock_search_fail' });
        }
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
      if (path === '/api/partnership/link-invite' && req.method === 'GET') {
        return send(200, { invites: state.linkInvites });
      }
      if (path === '/api/partnership/link-invite' && req.method === 'POST') {
        const chunks = [];
        for await (const chunk of req) chunks.push(chunk);
        const body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
        const terms = Array.isArray(body.terms) ? body.terms : [];
        const activeTerms = terms.filter((t) => t && !t.isExcluded);
        if (activeTerms.length === 0) {
          return send(400, { error: 'Укажите хотя бы одну категорию или подтвердите общие условия' });
        }
        state.inviteCounter += 1;
        const token = `mock-token-${state.inviteCounter}`;
        const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
        const inviteId = `link-mock-${state.inviteCounter}`;
        const previewPath = `/invite/link/${token}`;
        const row = {
          id: inviteId,
          status: 'PENDING',
          expiresAt,
          createdAt: new Date().toISOString(),
          acceptedAt: null,
          intendedPartnerType: body.intendedPartnerType ?? null,
          note: body.note ?? null,
          partnershipId: null,
          terms: activeTerms.map((t) => ({
            category: t.category,
            categoryLabel: t.categoryLabel ?? t.category,
            storePercent: t.storePercent ?? 10,
            isExcluded: false,
          })),
        };
        state.linkInvites.unshift(row);
        return send(200, { inviteId, token, expiresAt, previewPath });
      }
      if (path.startsWith('/api/partnership/link-invite/') && req.method === 'DELETE') {
        const id = path.split('/').pop();
        state.linkInvites = state.linkInvites.filter((i) => i.id !== id);
        return send(200, { ok: true });
      }
      if (path.startsWith('/api/partnership/') && req.method === 'PATCH') {
        const partnershipId = path.replace('/api/partnership/', '').split('/')[0];
        const row = partnerships.find((p) => p.id === partnershipId);
        if (!row) return send(404, { error: 'not_found' });
        const chunks = [];
        for await (const chunk of req) chunks.push(chunk);
        const body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
        if (body.action === 'accept_pending' && row.status === 'PENDING') {
          row.status = 'ACTIVE';
          row.updatedAt = new Date().toISOString();
        } else if (body.action === 'reject_pending') {
          row.status = 'REJECTED';
        } else if (body.action === 'cancel_pending') {
          row.status = 'CANCELLED';
        }
        return send(200, { partnership: row });
      }
      if (path === '/api/partnership/invite' && req.method === 'POST') {
        const chunks = [];
        for await (const chunk of req) chunks.push(chunk);
        const body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
        state.inviteCounter += 1;
        const created = {
          id: `ps-mock-new-${state.inviteCounter}`,
          status: 'PENDING',
          initiatedBy: actor.id,
          note: body.note ?? null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          storeUserId: body.targetUserId,
          proUserId: actor.id,
          terms: body.terms ?? [],
          storeUser: {
            id: body.targetUserId,
            displayName: 'Партнёр из поиска',
            city: 'Краснодар',
            specializations: [],
            storeCategories: [],
            partnerType: 'STORE',
          },
          proUser: buildProfile(actor).user,
          listPreference: null,
        };
        partnerships.push(created);
        return send(200, { partnership: created });
      }
      if (path.startsWith('/api/pro/partnership-list-preferences/') && req.method === 'GET') {
        const partnershipId = path.split('/').pop();
        const owned = partnerships.find(
          (p) => p.proUserId === actor.id || p.storeUserId === actor.id,
        );
        if (!owned || owned.id !== partnershipId) {
          return send(404, { error: 'Не найдено' });
        }
        const key = `${actor.id}:${partnershipId}`;
        const pref = state.preferences.get(key) ?? null;
        return send(200, {
          preference: pref
            ? {
                personalAlias: pref.personalAlias,
                archivedAt: pref.archivedAt,
                hiddenAt: pref.hiddenAt ?? null,
              }
            : null,
        });
      }
      if (path.startsWith('/api/pro/partnership-list-preferences/') && req.method === 'PATCH') {
        const partnershipId = path.split('/').pop();
        const row = partnerships.find((p) => p.id === partnershipId);
        if (!row || (row.proUserId !== actor.id && row.storeUserId !== actor.id)) {
          return send(404, { error: 'Не найдено' });
        }
        const chunks = [];
        for await (const chunk of req) chunks.push(chunk);
        const body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
        if (state.preferencePatchFailIds.has(partnershipId)) {
          return send(500, { error: 'mock_preference_patch_fail' });
        }
        const key = `${actor.id}:${partnershipId}`;
        const prev = state.preferences.get(key) ?? {
          personalAlias: null,
          archivedAt: null,
          hiddenAt: null,
        };
        const next = {
          personalAlias:
            body.personalAlias !== undefined ? body.personalAlias : prev.personalAlias,
          archivedAt:
            body.archived === true
              ? new Date().toISOString()
              : body.archived === false
                ? null
                : prev.archivedAt,
          hiddenAt:
            body.hidden === true
              ? prev.hiddenAt ?? new Date().toISOString()
              : body.hidden === false
                ? null
                : prev.hiddenAt,
        };
        state.preferences.set(key, next);
        row.listPreference = next;
        return send(200, { preference: next });
      }
      if (path === '/api/partnership/discussion-invite' && req.method === 'GET') {
        return send(200, { invites: state.discussionInvites });
      }
      if (path === '/api/partnership/discussion-invite' && req.method === 'POST') {
        const chunks = [];
        for await (const chunk of req) chunks.push(chunk);
        const body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
        const recipientLabel = String(body.recipientLabel ?? '').trim();
        const cooperationSubject = String(body.cooperationSubject ?? '').trim();
        if (!recipientLabel || !cooperationSubject) {
          return send(400, { error: 'Заполните имя и предмет сотрудничества' });
        }
        state.discussionInviteCounter += 1;
        const token = `mock-discussion-${state.discussionInviteCounter}`;
        const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
        const inviteId = `disc-mock-${state.discussionInviteCounter}`;
        state.discussionInvites.unshift({
          id: inviteId,
          token,
          inviterId: actor.id,
          joinedByUserId: null,
          recipientLabel,
          cooperationSubject,
          status: 'PENDING',
          role: 'author',
          expiresAt,
          createdAt: new Date().toISOString(),
          joinedAt: null,
          canProposeTerms: false,
        });
        return send(200, {
          inviteId,
          token,
          expiresAt,
          previewPath: `/invite/discussion/${token}`,
        });
      }
      if (path.startsWith('/api/partnership/discussion-invite/public/') && req.method === 'GET') {
        const token = decodeURIComponent(path.split('/').pop() || '');
        const row = state.discussionInvites.find((i) => i.token === token);
        if (!row) return send(200, { status: 'NOT_FOUND', viewerRole: 'anonymous' });
        const viewerRole =
          row.inviterId === actor.id
            ? 'inviter'
            : row.joinedByUserId === actor.id
              ? 'participant'
              : 'other';
        if (row.status === 'ACCEPTED' || row.status === 'JOINED') {
          const status =
            viewerRole === 'inviter' || viewerRole === 'participant' ? 'JOINED' : 'UNAVAILABLE';
          return send(200, {
            status,
            viewerRole: viewerRole === 'other' ? 'other' : viewerRole,
            inviteId: viewerRole === 'inviter' || viewerRole === 'participant' ? row.id : undefined,
            canJoin: false,
            inviter: { displayName: actor.displayName, partnerType: actor.partnerType, city: 'Краснодар' },
            recipientLabel: row.recipientLabel,
            cooperationSubject: row.cooperationSubject,
            expiresAt: row.expiresAt,
          });
        }
        if (row.status === 'PENDING' && viewerRole === 'inviter') {
          return send(200, {
            status: 'PENDING',
            viewerRole: 'inviter',
            canJoin: false,
            inviter: { displayName: actor.displayName, partnerType: actor.partnerType, city: 'Краснодар' },
            recipientLabel: row.recipientLabel,
            cooperationSubject: row.cooperationSubject,
            expiresAt: row.expiresAt,
          });
        }
        return send(200, {
          status: row.status === 'REVOKED' ? 'REVOKED' : row.status === 'EXPIRED' ? 'EXPIRED' : 'PENDING',
          viewerRole: viewerRole === 'other' ? 'other' : 'anonymous',
          canJoin: row.status === 'PENDING',
          inviter: { displayName: actor.displayName, partnerType: actor.partnerType, city: 'Краснодар' },
          recipientLabel: row.recipientLabel,
          cooperationSubject: row.cooperationSubject,
          expiresAt: row.expiresAt,
        });
      }
      if (path === '/api/partnership/discussion-invite/join' && req.method === 'POST') {
        const chunks = [];
        for await (const chunk of req) chunks.push(chunk);
        const body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
        const token = String(body.token ?? '').trim();
        const row = state.discussionInvites.find((i) => i.token === token);
        if (!row) return send(404, { error: 'Ссылка не найдена' });
        if (row.inviterId === actor.id) {
          return send(403, { error: 'Нельзя принять собственное приглашение', code: 'SELF_INVITE' });
        }
        if (row.status === 'REVOKED') return send(410, { error: 'Приглашение отозвано', code: 'REVOKED' });
        if (row.status === 'JOINED' || row.status === 'ACCEPTED') {
          if (row.joinedByUserId === actor.id) {
            return send(200, {
              ok: true,
              inviteId: row.id,
              alreadyJoined: true,
              redirectPath: `/partners?discussion=${encodeURIComponent(row.id)}`,
            });
          }
          return send(409, { error: 'Приглашение уже принято другим участником', code: 'RECIPIENT_TAKEN' });
        }
        row.status = 'JOINED';
        row.joinedByUserId = actor.id;
        row.joinedAt = new Date().toISOString();
        row.canProposeTerms = true;
        row.role = 'participant';
        const author = state.discussionInvites.find((i) => i.id === row.id);
        if (author) author.canProposeTerms = true;
        return send(200, {
          ok: true,
          inviteId: row.id,
          alreadyJoined: false,
          redirectPath: `/partners?discussion=${encodeURIComponent(row.id)}`,
        });
      }
      if (
        path.startsWith('/api/partnership/discussion-invite/') &&
        !path.includes('/public/') &&
        path !== '/api/partnership/discussion-invite/join' &&
        req.method === 'DELETE'
      ) {
        const id = path.split('/').pop();
        const row = state.discussionInvites.find((i) => i.id === id && i.inviterId === actor.id);
        if (!row) return send(404, { error: 'Не найдено' });
        if (row.status !== 'PENDING') return send(409, { error: 'Приглашение уже закрыто' });
        row.status = 'REVOKED';
        return send(200, { ok: true });
      }
      if (
        path.startsWith('/api/partnership/discussion-invite/') &&
        !path.includes('/public/') &&
        path !== '/api/partnership/discussion-invite/join' &&
        req.method === 'GET'
      ) {
        const id = path.split('/').pop();
        const row = state.discussionInvites.find(
          (i) =>
            i.id === id && (i.inviterId === actor.id || i.joinedByUserId === actor.id),
        );
        if (!row) return send(404, { error: 'Не найдено' });
        const role = row.inviterId === actor.id ? 'author' : 'participant';
        const counterpartyUserId = role === 'author' ? row.joinedByUserId : row.inviterId;
        return send(200, {
          context: {
            id: row.id,
            recipientLabel: row.recipientLabel,
            cooperationSubject: row.cooperationSubject,
            status: row.status === 'JOINED' ? 'JOINED' : row.status,
            role,
            counterpartyUserId: counterpartyUserId || 'mock-store-1',
            counterpartyDisplayName: row.recipientLabel,
            counterpartyCity: 'Краснодар',
            counterpartyPartnerType: 'STORE',
            counterpartyStoreCategories: ['doors'],
            counterpartySpecializations: [],
            counterpartyOrganizationName: null,
            counterpartyOrganizationLogoUrl: null,
            counterpartyOrganizationPartnerType: null,
            counterpartyPhotoUrl: null,
            counterpartyBadges: [],
            counterpartyBranches: [],
            canProposeTerms: Boolean(row.canProposeTerms && counterpartyUserId),
          },
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
        state,
        actorId: actorForMode(state.mode).id,
        close: () =>
          new Promise((r) => {
            server.close(() => r());
          }),
      });
    });
    server.on('error', reject);
  });
}
