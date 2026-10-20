/**
 * Loopback upstream for PARTNERS-SHARED visual/MOCK (no DB).
 * Modes: specialist | agent | specialist_ineligible | store_legacy
 */
import { createServer } from 'node:http';

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
  };
}

export function startPartnersSharedMockBff(state = createPartnersMockState()) {
  const actor = actorForMode(state.mode);
  const partnerships =
    state.mode === 'agent'
      ? remapPartnershipsForProUser(SPEC_PARTNERSHIPS, AGENT_ID, 'Агент Демо')
      : state.mode === 'store_legacy'
        ? []
        : SPEC_PARTNERSHIPS;

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
        actorId: actor.id,
        close: () =>
          new Promise((r) => {
            server.close(() => r());
          }),
      });
    });
    server.on('error', reject);
  });
}
