/**
 * In-memory loopback upstream for R06 catalog-prefill browser smoke (no PostgreSQL).
 * Mirrors GET catalog display name provenance used by navigator.
 */
import { createServer } from 'node:http';

const TAXONOMY = {
  products: [{ kind: 'product', id: 'doors', label: 'Двери' }],
  services: [
    { kind: 'service', id: 'design', label: 'Дизайн интерьера' },
    { kind: 'service', id: 'planning', label: 'Планирование' },
    { kind: 'service', id: 'finishing', label: 'Чистовая отделка' },
  ],
  stages: [
    { kind: 'stage', id: 'L1-0', label: '🔍 Диагностика' },
    { kind: 'stage', id: 'L1-1', label: '📐 Планирование' },
    { kind: 'stage', id: 'L1-9', label: '🎨 Чистовая' },
    { kind: 'stage', id: 'L1-11', label: '✅ Приёмка' },
  ],
};

function resolveCatalogDisplayName(state) {
  const draft = state.catalogDraft;
  const working = (state.workingDisplayName || state.displayName || '').trim();
  const live = (state.registrationDisplayName || '').trim();

  if (draft && Object.prototype.hasOwnProperty.call(draft, 'catalogDisplayName')) {
    const staged = draft.catalogDisplayName;
    return {
      catalogDisplayName: staged == null ? null : String(staged).trim() || null,
      catalogDisplayNameSource: 'staged_draft',
    };
  }
  const touched = draft?.catalogTouched ?? {};
  if (touched.catalogDisplayName === true || touched.catalogPublicName === true) {
    return { catalogDisplayName: live || null, catalogDisplayNameSource: 'live_public' };
  }
  if (state.isPublic && state.catalogStatus === 'APPROVED') {
    return { catalogDisplayName: live || null, catalogDisplayNameSource: 'live_public' };
  }
  if (working) {
    return { catalogDisplayName: working, catalogDisplayNameSource: 'working_profile' };
  }
  return { catalogDisplayName: live || null, catalogDisplayNameSource: 'live_public' };
}

export function createMockBffState() {
  return {
    registrationDisplayName: 'Старое регистрационное имя',
    displayName: 'Старое регистрационное имя',
    workingDisplayName: null,
    city: 'Krasnodar',
    workingCity: null,
    catalogStatus: 'DRAFT',
    isPublic: false,
    catalogDraft: null,
    workingServices: [],
    workingStages: [],
    partnershipContactPhone: null,
    partnershipContactEmail: null,
    partnerWorkMode: null,
    profileFinished: false,
    specialistDraft: {
      contractVersion: 'r06-smoke',
      featureEnabled: true,
      step: 1,
      version: 1,
      hasDraft: true,
      profileComplete: false,
      payload: {
        displayName: '',
        city: '',
        specialistKind: '',
        serviceSpecializationIds: [],
        navigatorStageIds: [],
        partnershipContactPhone: '',
      },
      savedProfile: {},
    },
    lastPatchCatalog: null,
  };
}

function buildProfileJson(state) {
  const workingName = (state.workingDisplayName || state.displayName || '').trim();
  const nameResolved = resolveCatalogDisplayName(state);
  const stagedSpecializations =
    state.catalogDraft?.specializations !== undefined
      ? state.catalogDraft.specializations
      : state.workingServices;
  const editFields = {
    catalogDisplayName: state.registrationDisplayName,
    catalogCity: state.city,
    description: null,
    specializations: stagedSpecializations,
    storeCategories: [],
    website: null,
    telegram: state.catalogDraft?.telegram ?? null,
    publicEmail: state.catalogDraft?.publicEmail ?? null,
    publicPhone: state.catalogDraft?.publicPhone ?? null,
    showFullName: false,
    photoUrl: null,
    navigatorStageIds: state.catalogDraft?.navigatorStageIds ?? state.workingStages,
    catalogDraftPending: Boolean(state.catalogDraft && Object.keys(state.catalogDraft).length > 0),
    catalogTouched: state.catalogDraft?.catalogTouched,
  };

  return {
    organization: null,
    programs: [],
    catalogPublication: {
      catalogEntity: 'user',
      isLivePublic: false,
      draftPending: editFields.catalogDraftPending,
      published: {
        description: null,
        specializations: [],
        storeCategories: [],
        website: null,
        telegram: null,
        publicEmail: null,
        publicPhone: null,
      },
    },
    workingProfile: {
      productCategoryIds: [],
      serviceSpecializationIds: state.workingServices,
      navigatorStageIds: state.workingStages,
      effectiveProductCategoryIds: [],
      effectiveServiceSpecializationIds: state.workingServices,
      effectiveNavigatorStageIds: state.workingStages,
      primaryDirection: null,
      partnerSearchVisible: false,
      partnerSearchOptIn: false,
      partnerSearchOptInExplicit: false,
      workingDirectionsTouched: state.profileFinished,
      partnerWorkMode: state.partnerWorkMode,
      areas: [],
      partnershipContactName: null,
      partnershipContactPhone: state.partnershipContactPhone,
      partnershipContactEmail: state.partnershipContactEmail,
    },
    user: {
      id: 'mock-spec-1',
      publicId: 'RC-MOCK-SPEC',
      displayName: workingName || state.displayName,
      city: state.workingCity || state.city,
      catalogDisplayName: nameResolved.catalogDisplayName,
      catalogDisplayNameSource: nameResolved.catalogDisplayNameSource,
      catalogCity: state.city,
      specializations: stagedSpecializations,
      role: 'PRO',
      partnerType: 'MASTER',
      partnerActivities: [],
      description: null,
      catalogStatus: state.catalogStatus,
      isPublic: state.isPublic,
      rejectionReason: null,
      badges: [],
      photoUrl: null,
      storeCategories: [],
      areas: [],
      website: null,
      telegram: editFields.telegram,
      whatsapp: null,
      instagram: null,
      vk: null,
      max: null,
      yandex: null,
      publicEmail: editFields.publicEmail,
      publicPhone: editFields.publicPhone,
      showFullName: false,
      catalogDraftPending: editFields.catalogDraftPending,
      catalogDraft: state.catalogDraft
        ? {
            navigatorStageIds: editFields.navigatorStageIds ?? [],
            ...(editFields.catalogTouched ? { catalogTouched: editFields.catalogTouched } : {}),
          }
        : { navigatorStageIds: state.workingStages },
    },
  };
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw.trim()) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

export function startCatalogPrefillMockBff(state = createMockBffState()) {
  const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://127.0.0.1');
    const path = url.pathname;
    try {
      if (path === '/api/health') {
        sendJson(res, 200, { ok: true });
        return;
      }
      if (path === '/api/auth/me' && req.method === 'GET') {
        sendJson(res, 200, {
          user: {
            id: 'mock-spec-1',
            role: 'PRO',
            displayName: state.workingDisplayName || state.displayName,
            partnerType: 'MASTER',
            isBlocked: false,
          },
        });
        return;
      }
      if (path === '/api/account/cabinet-readiness' && req.method === 'GET') {
        sendJson(res, 200, {
          nextStep: 'ready',
          missingConsents: [],
          canAccessCabinet: true,
          needsProfileOnboarding: false,
          needsProfileCompletion: false,
          isEmployee: false,
          isAdmin: false,
          catalogStatus: 'DRAFT',
        });
        return;
      }
      if (path === '/api/pro/agent-profile/status' && req.method === 'GET') {
        sendJson(res, 200, {
          featureEnabled: false,
          eligible: false,
          profileComplete: false,
        });
        return;
      }
      if (path === '/api/pro/context' && req.method === 'GET') {
        sendJson(res, 200, {
          role: 'PRO',
          branches: [],
          activeBranch: null,
          organization: null,
          teamCapabilities: {
            canOpenTeamSection: false,
            canFetchEmployeesOverview: false,
            canManageEmployeesByBranchId: {},
          },
        });
        return;
      }
      if (path === '/api/pro/moderation-notes' && req.method === 'GET') {
        sendJson(res, 200, { notes: [] });
        return;
      }
      if (path === '/api/pro/r06/status' && req.method === 'GET') {
        sendJson(res, 200, {
          contractVersion: 'r06-smoke',
          featureEnabled: true,
          hasSpecialistActivity: true,
          eligible: true,
          profileComplete: state.profileFinished,
          userId: 'mock-spec-1',
          ineligibleReason: null,
        });
        return;
      }
      if (path === '/api/pro/partner-taxonomy' && req.method === 'GET') {
        sendJson(res, 200, TAXONOMY);
        return;
      }
      if (path === '/api/pro/profile' && req.method === 'GET') {
        sendJson(res, 200, buildProfileJson(state));
        return;
      }
      if (path === '/api/pro/profile' && req.method === 'PATCH') {
        const body = await readJson(req);
        state.lastPatchCatalog = body;
        if (
          body.catalogDisplayName !== undefined ||
          body.catalogTouched ||
          body.catalogNavigatorStageIds ||
          body.specializations !== undefined
        ) {
          state.catalogDraft = {
            ...(state.catalogDraft ?? {}),
            ...(body.catalogDisplayName !== undefined
              ? {
                  catalogDisplayName:
                    body.catalogDisplayName === '' ? null : body.catalogDisplayName,
                }
              : {}),
            ...(body.catalogNavigatorStageIds !== undefined
              ? { navigatorStageIds: body.catalogNavigatorStageIds }
              : {}),
            ...(body.specializations !== undefined
              ? { specializations: body.specializations }
              : {}),
            ...(body.catalogTouched ? { catalogTouched: body.catalogTouched } : {}),
            ...(body.telegram !== undefined ? { telegram: body.telegram } : {}),
            ...(body.publicPhone !== undefined ? { publicPhone: body.publicPhone } : {}),
            ...(body.publicEmail !== undefined ? { publicEmail: body.publicEmail } : {}),
          };
        }
        if (body.city !== undefined) state.city = body.city;
        sendJson(res, 200, { user: buildProfileJson(state).user });
        return;
      }
      if (path === '/api/pro/specialist-profile/draft' && req.method === 'GET') {
        sendJson(res, 200, state.specialistDraft);
        return;
      }
      if (path === '/api/pro/specialist-profile/draft' && req.method === 'PATCH') {
        const body = await readJson(req);
        const nextVersion = (state.specialistDraft.version ?? 0) + 1;
        const payload = { ...state.specialistDraft.payload, ...(body.payload ?? {}) };
        const step = body.step ?? state.specialistDraft.step;
        state.specialistDraft = {
          ...state.specialistDraft,
          version: nextVersion,
          step: body.mode === 'advance' ? Math.min(3, step + 1) : step,
          payload,
          hasDraft: true,
        };
        sendJson(res, 200, state.specialistDraft);
        return;
      }
      if (path === '/api/pro/specialist-profile/finish' && req.method === 'POST') {
        const p = state.specialistDraft.payload ?? {};
        state.workingDisplayName = (p.displayName || '').trim() || state.displayName;
        state.workingCity = (p.city || '').trim() || state.city;
        state.workingServices = [...(p.serviceSpecializationIds ?? [])];
        state.workingStages = [...(p.navigatorStageIds ?? [])];
        state.partnershipContactPhone = p.partnershipContactPhone?.trim() || null;
        state.partnershipContactEmail = p.partnershipContactEmail?.trim() || null;
        state.partnerWorkMode = p.partnerWorkMode || 'ON_SITE';
        state.profileFinished = true;
        state.specialistDraft.profileComplete = true;
        state.specialistDraft.savedProfile = { ...p };
        sendJson(res, 200, { ok: true, contractVersion: 'r06-smoke' });
        return;
      }
      sendJson(res, 404, { error: 'not_found', path, method: req.method });
    } catch (e) {
      sendJson(res, 500, { error: String(e instanceof Error ? e.message : e) });
    }
  });

  return new Promise((resolve, reject) => {
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({
        server,
        baseUrl: `http://127.0.0.1:${port}`,
        state,
        close: () =>
          new Promise((r) => {
            server.close(() => r(undefined));
          }),
      });
    });
  });
}
