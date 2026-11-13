/**
 * Partner «Клиенты» API/schema contract inventory (P2 coordinator).
 * K8 (`remcard-navigator`) owns implementation drafts; nothing here is READY until
 * routes exist, proxy allowlisted, and prod DB migration applied with user approval.
 */

import { CLIENTS_APPEAL_SYSTEM_STAGE } from "./types";

export const CLIENTS_PARITY_PROTOTYPE_SHA = "3dc31836cd18d9209c20097f18b906dd276f7af6";

/**
 * Observer list scope — prototype `ownReferredAppeals()` @ client-appeals.js ~2217.
 * No new privacy rule: cite prototype only. Receiving lifecycle is separate (~969–1034).
 */
export const CLIENTS_OBSERVER_REFERRER_LIST_SCOPE = {
  prototypeFn: "ownReferredAppeals",
  prototypeLine: 2217,
  predicates: [
    "referrerPartnerId === REFERRER_VIEWER.id (referrerProUserId === session viewer)",
    "hasCertificateFlow(appeal) — originKind CERTIFICATE",
    "PARTNERS[receivingPartnerId] known (receiving principal resolvable)",
  ],
  explicitNonFilters: [
    "receiver archivedAt / deletedAt MUST NOT exclude referrer observer row",
    "receiving list bucket active|archive|trash — incoming-only via appealInBucket",
  ],
  personalOverlay: {
    prototypeModule: "observer-personal-list.js",
    filterFn: "filterObserverAppeals → observerPersonalBucket(s, a) === observerPersonalState(s).bucket",
    meaning: "Observer archive/trash is per-viewer overlay; independent of receiver CRM lifecycle",
  },
  auth: "Existing R03/R06 / ownerClients referrer eligibility only — no broader access",
} as const;

/**
 * Observer detail timeline — prototype `publicReferrerTimeline` @ ~2333–2338.
 * UI heading: «Хронология (без внутренних заметок партнёра)» (~2549).
 */
export const CLIENTS_OBSERVER_PUBLIC_TIMELINE = {
  prototypeFns: ["isPublicReferrerHistoryEntry", "publicHistoryLine", "publicReferrerTimeline"],
  prototypeLines: "2299–2338",
  k8Owner: "canonical helper from persisted history rows (K8 in progress)",
  k2Consumer: "GET /api/pro/referred-appeals/:id maps via K8 helper — not raw DB text",
  p4WireType: "ObserverPublicTimelineEvent[] in types.ts",
  wireFields: ["at", "text"],
  forbiddenOnObserverWire: ["authorLabel", "actorUserId", "reason", "id", "privateNotes"],
  rejectInternalPatterns:
    "/служебн|заметк|архив|корзин|скрыто|перемещено|вручную/i on entry.text; bulk group edits except /^этап изменён:/i",
  allowPatterns: [
    "^этап изменён:",
    "^статус:",
    "создано обращение по сертификату",
    "refusal with entry.reason",
    "^оплачено",
    "^отгружено",
    "^возврат",
  ],
  normalizedLines: [
    "Этап: {label} from этап изменён",
    "Отказ: {reason}",
    "Оплачено",
    "Отгружено",
    "Возврат",
    "Создано обращение по сертификату",
  ],
  mustNotUse: [
    "K1 GET detail history[] as observer timeline",
    "PartnerClientAppealHistoryEvent.text unfiltered on observer API",
    "Receiver deletedAt filter hiding referrer detail (K2 @ 78ce748d)",
  ],
} as const;

/** P4 / K2 GET detail target envelope (read-only). */
export const CLIENTS_OBSERVER_DETAIL_HTTP_CONTRACT = {
  route: "GET /api/pro/referred-appeals/:appealId",
  owner: "K2",
  authGate: "requireObserverReferredAppealsRead; referrerProUserId === viewer; originKind CERTIFICATE",
  listRowScope: CLIENTS_OBSERVER_REFERRER_LIST_SCOPE,
  response200: {
    appeal: "ClientAppealObserverReadDto (no privateNotes/clientContact)",
    receivingPartner: "ObserverReceivingPartnerMetaWire target",
    timeline: "ObserverPublicTimelineEvent[] — CLIENTS_OBSERVER_PUBLIC_TIMELINE",
    purchase: "{ amountKopecks, note } | null — referrer-facing purchase read, not bonus payout",
  },
  receivingDetailForbidden:
    "Never alias /api/pro/client-appeals/:id history to observer detail — receiving keeps authorLabel + full text",
  k2GapAt78ce748d: {
    deletedAtFilter: "where.deletedAt: null drops row when receiver trashed — violates ownReferredAppeals",
    timelineLeak: "maps history select text without publicHistoryLine filter",
  },
} as const;

/**
 * Receiving partner identity — frozen 2026-11-13 after Root + specialistR06Eligibility review.
 * K8 revises additive schema/contract only; P2 inventory coordinates one DTO.
 */
export const CLIENTS_RECEIVING_IDENTITY = {
  prototypeKey: "receivingPartnerId",
  trustedColumn: "receivingPartnerUserId",
  meaning: "User.id of receiving partner principal authorized via requireOwnerClientsContext",
  optionalScope: ["receivingOrganizationId", "receivingBranchId"],
  retractedRule: "P2 prior blanket map receivingPartnerId → Branch.id only",
  soloSpecialist: {
    source: "src/lib/specialistR06Eligibility.ts @ navigator",
    eligibleWhen:
      "feature on, not blocked, not employee, no owned Organization, userHasSpecialistActivity, not employed_view",
    ineligibleReasons: ["org_owner", "employee", "employed_view", "not_specialist"],
    receivingScope: "no mandatory org/branch — optional null on appeal row",
  },
  agent: "principalAgentObserverOnly — receiving CRM forbidden; observer read only",
  businessOwner: "may bind optional org/branch when owned scope exists",
  orgWorkplaceCrm:
    "list may resolve authorized owner principal for CRM reads; observer personal writes = session viewerUserId only (never org list owner proxy)",
  settingsScopeKey: "receivingPartnerUserId — prototype partnerSettings[receivingPartnerId]",
  activeAppealPredicate:
    "isActiveAppealStage @ 6f09c23e; cert unique (certificateId, receivingPartnerUserId) stage-only filter (GAP-K8-L lifecycle)",
  k8IdentityTip: "6f09c23e41ae7ea16a691dc9372bbaf70934cc88",
  k8AssemblyTip: "0f4fe83359491012c76597fa31ad10fa2a5e0a29",
  k1Tip: "5a51d7b71f72d665af033b33cfed9bfa5634ed39",
  k2ListTip: "3c6ccc197bd565dba57feca81c42af48869ef62e",
  k2AssemblyTip: "df8ed8a524492ddad098beb3f9bf6f909017fbc4",
  k5Tip: "6c4444879d5651679c969b8009b3f39d05302c43",
} as const;

export const CLIENTS_ACTIVE_CERTIFICATE_SLOT = {
  naturalKey: "(certificateId, receivingPartnerUserId)",
  k8CanonicalIndex:
    "PartnerClientAppeal_active_certificate_principal_uidx @ 6f09c23e — stageKey NOT IN sys_refused, sys_return",
  stageFilter: "matches isActiveAppealStage (terminal stages only)",
  lifecycleGap:
    "GAP-K8-L: receiving archive/trash vs prototype findActiveAppeal — index ignores archivedAt/deletedAt",
} as const;

/**
 * Read-only purchase projection — client purchase recognition, not partner bonus payout.
 * @see appealPurchaseProjection.ts @ K8 1894569a + FINANCIAL_READ_PROJECTION.md
 */
export const CLIENTS_PURCHASE_READ_SEMANTICS = {
  blockerId: "BLK-CLIENTS-PURCHASE-READ",
  owner: "K8",
  k8Module: "projectAppealPurchaseFields",
  k8CanonicalSha: "1894569ab27179e46f75ce7416dfcc0ca452ab94",
  currentMapping: {
    paidAmountKopecks:
      "kopecksFromAmount(Order.totalAmount) when orderCountsAsClientPurchase(Order.status) — agentClientPurchaseRules",
    paidAt: "always null until Order stores client payment timestamp (never RewardPayment.resolvedAt)",
    purchaseOrderId: "PartnerClientAppeal.orderId",
  },
  k2Assembly78ce748d: {
    module: "observerPurchaseProjection.ts — lifecycle line gross kopecks interim mirror",
    divergence: "K2 not yet importing K8 appealPurchaseProjection.ts — amounts/dates may differ until Root merge",
  },
  p2Position:
    "P6/P3 display uses K8 canonical after merge; no new settlement rules in partner prep",
  status: "PARTIAL_K8_1894569a_K2_DIVERGES",
} as const;
export const CLIENTS_PARITY_PRODUCTION_BASE_SHA = "57ca4680892ae16c62fc38d0ad2ccb6a404dbd79";
export const CLIENTS_NAVIGATOR_PREP_BASE_SHA = "8137ddd1ae5bad880fa28df34bab04e460bf2bdd";
export const CLIENTS_NAVIGATOR_PROFILE_SELECT_SHA = "89fb8e073c39c8dbd329996940b85c6a86751868";

/** Parallel navigator tips accepted for contract inventory (source prep only — not prod release). */
export const CLIENTS_NAVIGATOR_FIXED_ASSEMBLY = {
  k8: "0f4fe83359491012c76597fa31ad10fa2a5e0a29",
  k1: "5a51d7b71f72d665af033b33cfed9bfa5634ed39",
  k2: "df8ed8a524492ddad098beb3f9bf6f909017fbc4",
  k5: "6c4444879d5651679c969b8009b3f39d05302c43",
  k8ContractModule: "src/lib/clientAppeals/contract.ts",
  k8ReceivingList: "src/lib/clientAppeals/receivingList.ts",
  k1RouteTree: "src/app/api/pro/client-appeals/**",
  crossOwnerWireDoc: "src/lib/clientAppeals/CROSS_OWNER_WIRE.md",
  crossOwnerWireStale:
    "CROSS_OWNER_WIRE @ 1894569a still documents K2 72193c78 items + Branch.id — superseded by P2 inventory + K2 list @ 3c6ccc19 / assembly @ 78ce748d",
  p2ReceivingHandoff: "audit/remcard-parallel-20261113/P2/K1-83f279e8-receiving-envelope-handoff.md",
} as const;

/**
 * K8 navigator canonical module (CANDIDATE — not accepted release).
 * Do not duplicate DTOs in partner-platform; mirror via adapter types only.
 */
export const CLIENTS_K8_SOURCE_OF_TRUTH = {
  status: "DRAFT_K8_CANDIDATE",
  navigatorBranch: "cursor/remcard-k8-acceptance-20261113",
  assemblyK8Sha: CLIENTS_NAVIGATOR_FIXED_ASSEMBLY.k8,
  handoffCommitSha: "16253b84c3d0d35ad0978cb2bde1ccad1d725141",
  schemaCoreCommitSha: "6f09c23e41ae7ea16a691dc9372bbaf70934cc88",
  priorSchemaCoreCommitSha: "e11f7e59e6759bf3f67eb1829f7cff0e006de73e",
  k1HttpTipSha: CLIENTS_NAVIGATOR_FIXED_ASSEMBLY.k1,
  k2AssemblyTipSha: CLIENTS_NAVIGATOR_FIXED_ASSEMBLY.k2,
  k1IdentityCommitSha: "f722a164fed0cbbb0315f30237e1568ebf340d69",
  k5IdentityCommitSha: CLIENTS_NAVIGATOR_FIXED_ASSEMBLY.k5,
  k1ReceivingDoc: "src/lib/clientAppeals/K1_RECEIVING_API.md",
  k1ReceivingApiSurface: "src/lib/clientAppeals/k1ReceivingApi.ts",
  k2ObserverDoc: "src/lib/clientAppeals/K2_OBSERVER_API.md",
  k2HttpObserverActualSha: "3c6ccc197bd565dba57feca81c42af48869ef62e",
  k2HttpStaleSha: "72193c7853df8291a5b7956059d574b834cdbce7",
  canonicalModule: "src/lib/clientAppeals/contract.ts",
  handoffDoc: "src/lib/clientAppeals/HANDOFF.md",
  migrationDraft: "prisma/migrations/20261113203000_client_appeals/migration.sql",
  partnerInventoryPaths: [
    "src/lib/clients-parity/contracts.ts",
    "src/lib/clients-parity/types.ts",
  ],
  auditReconcile: "audit/remcard-parallel-20261113/P2/K8-e11f7e59-list-response-reconcile-20261113.md",
  identityCorrectionHandoff:
    "audit/remcard-parallel-20261113/P2/K8-receiving-identity-correction-20261113.md",
  k2EnvelopeReconcile: "audit/remcard-parallel-20261113/P2/K8-6f09c23e-k2-3c6ccc19-reconcile-20261113.md",
} as const;

/**
 * One canonical list envelope per layer — K8 lib receiving stays `{ items }`; K2 HTTP uses `{ appeals }`.
 * P3 maps K2 `appeals`/`partners`/`personalMeta` → `ObserverAppealsLoadResult` (never stale `items` @ 72193c78).
 */
export const CLIENTS_LIST_RESPONSE_CONTRACT = {
  k8LibReceiving: {
    owner: "K1/K8",
    fn: "listReceivingAppeals",
    shape: "{ items: ClientAppealRecord[], nextCursor: string | null }",
    forbiddenAliases: ["appeals"],
    doc: CLIENTS_K8_SOURCE_OF_TRUTH.k1ReceivingDoc,
  },
  k8LibObserver: {
    owner: "K2/K8",
    fn: "listObserverReferrerAppeals",
    shape: "{ items: ClientAppealRecord[], nextCursor: string | null }",
    forbiddenAliases: ["appeals"],
    include: "APPEAL_RECORD_LIST_INCLUDE + mapPartnerClientAppealToRecord",
    doc: CLIENTS_K8_SOURCE_OF_TRUTH.k2ObserverDoc,
  },
  k2HttpObserverActual: {
    owner: "K2",
    route: "GET /api/pro/referred-appeals",
    commitSha: "3c6ccc197bd565dba57feca81c42af48869ef62e",
    shape:
      "{ appeals, partners, personalMeta, page, limit, total, hasMore, empty }",
    appealWire: "ClientAppealObserverReadDto[] via toObserverAppealDto(mapPartnerClientAppealToRecord)",
    partnersWire: "ObserverReceivingPartnerSummary[] — GAP-K8-P: still distinct receivingBranchId",
    personalMetaWire: "Record<appealId, ObserverPersonalMetaDto | null> per-row overlay join",
    purchaseReadGap: "BLK-CLIENTS-PURCHASE-READ — mirror uses order.totalAmount, not K8 projection",
  },
  k2HttpObserverStale72193c78: {
    shape: "{ items, page, limit, total, hasMore, empty }",
    status: "SUPERSEDED by k2HttpObserverActual",
  },
  partnerP3Normalized: {
    owner: "P3 list fetch (+ field rename via OBSERVER_APPEAL_ADAPTER_MAP)",
    shape: "{ appeals, partners, personalMeta?, page?, limit?, total?, hasMore? }",
    acceptsAliases: {
      personalMeta: ["personalOverlays"],
    },
    mapsFromK2Http3c6ccc19: {
      appeals: "passthrough → ObserverReferredAppeal field renames",
      partners: "passthrough → ObserverPartnerMeta (needs receivingPartnerUserId on wire — GAP-K8-O)",
      personalMeta: "passthrough; null per appealId means no overlay row",
      pagination: "page, limit, total, hasMore",
    },
    k8LibNote: "K8 lib list remains { items, nextCursor } — HTTP envelope above is K2-only",
    type: "ObserverAppealsLoadResult ok branch in types.ts",
  },
  k1HttpReceivingActual: {
    owner: "K1",
    route: "GET /api/pro/client-appeals",
    commitSha: CLIENTS_NAVIGATOR_FIXED_ASSEMBLY.k1,
    shape: "{ appeals, nextCursor, bucket, tab, principal, access, readOnly }",
    rowDto: "ClientAppealRecord via mapPartnerClientAppealToRecord @ K8 recordMap",
    queryActual: "archived=1 | active(default), q, limit, cursor",
    queryTarget:
      "bucket=active|archive|trash, sourceFilter=all|manual|cert, stageKey, search q, cursor, take — @ K8 receivingList.buildReceivingListWhere",
    accessGap: "RESOLVED_5a51d7b7 — buildReceivingAccessEnvelope",
    bucketGap: "RESOLVED_5a51d7b7 — parseReceivingListQuery bucket + sourceFilter + stageKey",
  },
  k1HttpReceivingTargetP6: {
    owner: "P6 + K1",
    shape:
      "{ appeals, nextCursor, tab, bucket, sourceFilter?, stageKey?, access, readOnly }",
    accessType: "ReceivingAppealsAccessWire in types.ts",
    libAlign: "K8 listReceivingAppeals returns items[] — HTTP uses appeals alias for prototype parity",
  },
} as const;

/**
 * Receiving CRM HTTP — live K1 @ 83f279e8 vs K8 primitives @ 1894569a.
 * Paths are `/api/pro/client-appeals` (no `/receiving` suffix). P1/P6 proxy must match.
 */
export const CLIENTS_RECEIVING_HTTP_CONTRACT = {
  prefix: "/api/pro/client-appeals",
  stagePatchPath: "PATCH /api/pro/client-appeals/:id/stage",
  forbiddenInventions: [
    "POST /api/pro/client-appeals/:id/stage",
    "/api/pro/client-appeals/receiving/**",
    "settings keyed by organizationId only @ stale K1_RECEIVING_API prose",
  ],
  listGet: CLIENTS_LIST_RESPONSE_CONTRACT.k1HttpReceivingActual,
  listTarget: CLIENTS_LIST_RESPONSE_CONTRACT.k1HttpReceivingTargetP6,
  detailGet: {
    path: "GET /api/pro/client-appeals/:id",
    response200: "{ appeal, revision, history, workingStages, refusalReasons, readOnly }",
    historyWire: "authorLabel (map to prototype author in P6)",
  },
  stagePatch: {
    path: "PATCH /api/pro/client-appeals/:id/stage",
    body: "{ stageKey | stageId, expectedRevision?, refusedReason?, shippedAt? }",
    response200: "{ appeal, revision }",
    errors: "404; 403 FOREIGN_APPEAL; 409 APPEAL_REVISION_CONFLICT; 422 transition code",
    k8Primitive: "updateReceivingAppealWorkingStage + canTransitionToStage @ k1ReceivingApi",
    prototypeRef: "applyStageChangeCabinet / canTransitionTo — not POST stage",
  },
  batchPost: {
    path: "POST /api/pro/client-appeals/batch",
    bodyActual: "{ ids[], action: archive | unarchive | bulk-edit, stageKey?, note?, appendNote? }",
    responseActual: "{ updated, failures?: [{ id, code }] }",
    bodyTargetLifecycle:
      "action archive | delete | unarchive | restore — maps K8 applyReceivingBulkLifecycle kinds",
    responseTarget: "{ updatedIds, skippedIds?, failures: [{ id, code }] }",
    gap: "GAP-K1-HTTP-BATCH-LIFECYCLE — delete(trash) + restore not on HTTP batch @ 83f279e8",
  },
  workingStages: {
    path: "/api/pro/client-appeals/working-stages",
    get200: "{ settings: ClientAppealPartnerSettingsRecord }",
    settingsKey: "receivingPartnerUserId @ unique (K8 settingsRepository)",
    postBody: "{ kind: workingStage | refusalReason, label? | reason?, expectedVersion? }",
    patchBody: "{ id, label?, restore?: true, expectedVersion? }",
    deleteQuery: "?stageId=&expectedVersion=",
    post200: "{ settings, version }",
    k8Note: "K8 savePartnerAppealSettings atomic version — K1 HTTP uses mutatePartnerWorkingStages operations",
  },
  manualPost: {
    path: "POST /api/pro/client-appeals",
    body: "{ clientDisplayName | displayName, manualSourceKey | sourceKey, interest?, clientCity?, clientContact? }",
    response201: "{ appeal }",
  },
  profilePatch: {
    path: "PATCH /api/pro/client-appeals/:appealId",
    owner: "K1",
    body: "AppealProfilePatchInput — clientDisplayName|clientName, manualSourceKey|manualChannel, privateNotes, …",
    forbidden: "stageKey/stageId/paidAmountKopecks on this route",
    response200: "{ appeal, revision }",
  },
  certificateEntry: {
    path: "POST /api/pro/client-appeals/certificate-entry",
    body: "{ promoCode }",
    p6Alias: "certificateCode → promoCode",
    response: "{ valid: true, outcome, appeal } | { valid: false, reason } @ 200",
    k8CreateOpts: "createCertificateAppealIfNoneActive(data, { createdHistoryEvent? }) @ K8 0f4fe833",
  },
  p1AllowlistPatterns: [
    "^/api/pro/client-appeals$",
    "^/api/pro/client-appeals/[\\w-]+$",
    "^/api/pro/client-appeals/[\\w-]+/stage$",
    "^/api/pro/client-appeals/batch$",
    "^/api/pro/client-appeals/working-stages$",
    "^/api/pro/client-appeals/certificate-entry$",
  ],
  p6Owner: "receiving-appeals-api.ts @ 06f7e6bb — must import mappers from types.ts; no invented list envelope",
  p6WireAuditTip: "06f7e6bb",
  detailPatchGap: {
    p6Current: "PATCH /api/pro/client-appeals/:id — not exported on K1 @ 83f279e8",
    k1StageRoute: "PATCH /api/pro/client-appeals/:id/stage",
    k1ScopedDetailPatch: "assigned — P1 allowlist only after K1 exports route",
    gapId: "GAP-P6-DETAIL-PATCH-PATH",
  },
  pagination: {
    k1DefaultLimit: 25,
    k1MaxLimit: 50,
    queryKeys: ["limit", "cursor", "archived", "q"],
    targetQueryKeys: ["limit", "cursor", "bucket", "sourceFilter", "stageKey", "q"],
    p6Requirement:
      "Pass limit/cursor on GET; merge pages via nextCursor — no single-page local filter as full list",
  },
} as const;

/** Root parallel tips (read-only); P2 inventory @ cursor/2-06bf. */
export const CLIENTS_PARTNER_OWNER_TIPS = {
  p1: "2b2b32b8",
  p2: "9f7c3755",
  p3: "b85efb54",
  p4: "1850d088",
  p5: "6a72f353",
  p6: "4dca7af7",
} as const;

/**
 * Prototype partner overlay vs K8 persistence — do not claim implemented without schema/API.
 * @see client-appeals.js manualChannelsFor / payCategoriesFor / addWorkspaceChannel
 */
export const CLIENTS_PROTOTYPE_PARTNER_OVERLAY = {
  manualChannels: {
    prototype:
      "partnerOverlay.manualChannels[] + MANUAL_CHANNEL_OPTIONS (phone,messenger,visit,ads,other) + custom { key, label }",
    prototypeFn: "manualChannelsFor",
    k8Persisted: "manualSourceKey on appeal row only — contract ClientAppealManualSourceKey",
    k1SettingsApi: "working-stages handles workingStages/refusalReasons — NOT custom channel catalog",
    p6Status: "SOURCE_GAP — display built-in options; custom channel CRUD is in-memory prototype only until K8 additive settings",
    financeChange: "PROHIBITED_IN_CLIENTS_PREP",
  },
  payCategories: {
    prototype:
      "partnerOverlay.payCategories[] + profilePayCategories(config) for purchase/accrual UI",
    prototypeFn: "payCategoriesFor / renderPayCategoryOptions",
    k8Persisted: "NOT in PartnerClientAppealPartnerSettings @ 0f4fe833",
    existingProd: "Store order / wallet reward categories — separate financial APIs",
    p6Status: "DISPLAY_ONLY_OR_OUT_OF_SCOPE — purchase form categories come from profile/catalog APIs, not client-appeals list",
    financeChange: "PROHIBITED — no new settlement in Clients prep",
  },
  workingStagesRefusalReasons: {
    prototype: "partnerSettings[receivingPartnerId].workingStages + refusalReasons",
    k8Persisted: "PartnerClientAppealPartnerSettings @ receivingPartnerUserId",
    k1Wire: "GET/POST/PATCH/DELETE /api/pro/client-appeals/working-stages",
  },
} as const;

/** P6 @ 4dca7af7 — Root-reviewed wire defects vs K1 @ 5a51d7b7 (P6 fixes via types.ts mappers). */
export const RECEIVING_P6_WIRE_DEFECTS = {
  p6Tip: "4dca7af7",
  k1Tip: "5a51d7b71f72d665af033b33cfed9bfa5634ed39",
  bucketNotTab: {
    defect: "P6 filters local bucket using row.bucket; list wire uses top-level `bucket` + constant `tab: incoming`",
    fix: "Pass `bucket` query on GET; use response.bucket; do not treat tab as bucket",
  },
  stageKeyNotLabel: {
    defect: "P6 status filter compares stage display labels; K1 filters `stageKey` id on server",
    fix: "Filter query stageKey=id; UI label via workingStages + SYSTEM stage map only",
  },
  wireFieldNames: {
    defect: "P6 UI expects clientName/stageId; K1 DTO uses clientDisplayName/stageKey",
    fix: "mapReceivingAppealWireToUiRow",
  },
  listEnvelope: {
    defect: "P6 merged kpis/settings/principal into one GET",
    k1Actual:
      "{ appeals, nextCursor, bucket, tab, principal, access, readOnly }",
    fix: "normalizeK1ReceivingListHttp + separate GET working-stages",
  },
  settingsVersion: {
    defect: "P6 expects bare settings object",
    k1Get: "{ settings } (version inside settings row)",
    k1Mutate: "{ settings, version }",
    fix: "unwrapK1WorkingStagesResponse; use settings.version for optimistic lock",
  },
  certificateEntry: {
    defect: "P6 POST certificateCode",
    k1Body: "{ promoCode }",
    k1Invalid: "200 { valid: false, reason } — not transport error",
    fix: "map certificateCode → promoCode; handle valid:false",
  },
  detailShape: {
    defect: "P6 nests history under appeal or omits revision",
    k1Get: "top-level { appeal, revision, history, workingStages, refusalReasons, ...access }",
    fix: "normalizeK1ReceivingDetailHttp",
  },
  patchRouting: {
    defect: "P6 PATCH /:id with stageId/paidAmount for stage changes",
    k1ProfilePatch: "PATCH /:id — CRM fields only (parseAppealProfilePatch)",
    k1StagePatch: "PATCH /:id/stage — stageKey + refusedReason + shippedAt",
    immutableOnProfilePatch: "stageKey, paidAmountKopecks, orderId, … — APPEAL_FIELD_IMMUTABLE",
    p1Proxy: "GET+PATCH /client-appeals/:id @ 2b2b32b8",
  },
} as const;

/**
 * K1 server field names → P6 UI row (prototype Appeal typedef).
 * P6 `receiving-appeals-api.ts` MUST use `mapReceivingAppealWireToUiRow` — no ad-hoc renames.
 */
export const RECEIVING_APPEAL_K1_TO_UI_MAP = {
  clientDisplayName: "clientName",
  stageKey: "stageId",
  referrerProUserId: "referrerPartnerId",
  receivingPartnerUserId: "receivingPartnerId",
  purchaseOrderId: "purchaseId",
  paidAmountKopecks: "paidAmount",
  manualSourceKey: "sourceKey",
  originKindManual: "manualEntry=true when MANUAL",
  originKindCert: "manualEntry=false; certificateId required",
} as const;

/** P6 form → K1 POST /api/pro/client-appeals body @ 83f279e8. */
export const RECEIVING_MANUAL_POST_UI_TO_K1_MAP = {
  clientName: "clientDisplayName",
  manualChannel: "manualSourceKey",
  p6WrongBody: "{ clientName, manualChannel } sent raw without map",
  k1AcceptedAliases: ["displayName", "sourceKey"],
} as const;

/** P6 stage patch → K1 PATCH .../:id/stage (not PATCH .../:id). */
export const RECEIVING_STAGE_PATCH_UI_TO_K1_MAP = {
  uiStageId: "stageKey",
  uiBodyWrongPath: "PATCH /api/pro/client-appeals/:id",
  k1Path: "PATCH /api/pro/client-appeals/:id/stage",
  expectedRevision: "expectedRevision on wire (appeal row updatedAt ms)",
} as const;

/**
 * List/load split — actual K1 vs P6 @ 06f7e6bb mistaken merged envelope.
 */
export const RECEIVING_K1_P6_LIST_WIRE_CONTRACT = {
  k1ListActual5a51d7b7:
    "{ appeals, nextCursor, bucket, tab: incoming, principal, access, readOnly }",
  k1ListLegacy83f279e8: "{ appeals, nextCursor, tab, readOnly }",
  k1ListTarget: "5a51d7b7 shape — query bucket|sourceFilter|stageKey|cursor|limit",
  separateLoads: {
    settings: "GET /api/pro/client-appeals/working-stages → { settings }",
    kpis: "NOT on list wire @ 83f279e8 — P6 derives from loaded page only until K1 adds aggregation",
  },
  p6Mistake06f7e6bb:
    "ReceivingAppealsListResponse expects kpis/settings/access/principal on single GET list — wrong",
  p6Fix:
    "coerce from K1ReceivingListHttpActual + parallel settings GET + mapK1AccessWireToP6Gates when access lands",
  settingsWireUnwrap: "working-stages returns { settings } — not bare ReceivingPartnerSettings at root",
  mapperModule: "types.ts mapReceivingAppealWireToUiRow, normalizeK1ReceivingListHttp, mapReceivingUiManualCreateToK1Post",
  handoff: "audit/remcard-parallel-20261113/P2/P6-K1-wire-map-handoff.md",
} as const;

/** Navigator routes that exist in source @ 2026-11-13 — inventory authority over P5/P2 rename drafts. */
export const CLIENTS_NAVIGATOR_ACTUAL_HTTP = {
  assembly: CLIENTS_NAVIGATOR_FIXED_ASSEMBLY,
  k8IdentitySha: "6f09c23e41ae7ea16a691dc9372bbaf70934cc88",
  k1HttpTipSha: CLIENTS_NAVIGATOR_FIXED_ASSEMBLY.k1,
  k1IdentitySha: "f722a164fed0cbbb0315f30237e1568ebf340d69",
  k2ListActualSha: "3c6ccc197bd565dba57feca81c42af48869ef62e",
  k2AssemblyTipSha: CLIENTS_NAVIGATOR_FIXED_ASSEMBLY.k2,
  k5PersonalSha: CLIENTS_NAVIGATOR_FIXED_ASSEMBLY.k5,
  observerList: {
    method: "GET",
    path: "/api/pro/referred-appeals",
    owner: "K2",
    response200:
      "{ appeals, partners, personalMeta, page, limit, total, hasMore, empty }",
    listScope: "CLIENTS_OBSERVER_REFERRER_LIST_SCOPE — no deletedAt on appeal row",
    errors: "401 UNAUTHORIZED; 403 OBSERVER_REFERRER_INELIGIBLE; 400 OBSERVER_LIST_BAD_QUERY; 503 OBSERVER_APPEALS_SCHEMA_UNAVAILABLE",
    notBlockedContract: "Explicit 401/403/404 are HTTP outcomes, not partner BLOCKED_CONTRACT",
  },
  observerDetail: {
    method: "GET",
    path: "/api/pro/referred-appeals/:appealId",
    owner: "K2",
    contractRef: "CLIENTS_OBSERVER_DETAIL_HTTP_CONTRACT",
    response200:
      "{ appeal, receivingPartner, timeline: ObserverPublicTimelineEvent[], purchase? }",
  },
  personalMetaPatch: {
    method: "PATCH",
    path: "/api/pro/referred-appeals/:appealId/personal-meta",
    owner: "K5",
    bodyKeys: ["expectedVersion?", "alias?", "tag?", "note?", "action?", "target?"],
    actionValues: "move | restore (field edits when action omitted)",
    targetValues: "archived | trash when action=move",
    response200: "{ meta: PersonalMetaProjection }",
    projectionFields: ["appealId", "alias", "tag", "note", "bucket", "version", "updatedAt"],
    errors:
      "401; 403 CSRF|OBSERVER_PERSONAL_INELIGIBLE; 400 VALIDATION; 404 NOT_FOUND; 409 VERSION_CONFLICT|BUCKET_LOCKED; 503 PERSISTENCE_UNAVAILABLE",
  },
  personalBatch: {
    method: "POST",
    path: "/api/pro/referred-appeals/personal-batch",
    owner: "K5",
    bodyKeys: ["action", "ids", "target?", "tag?", "mode?", "expectedVersions?"],
    actionValues: "move | restore | setTag",
    modeValues: "atomic | best_effort",
    response200:
      "{ action, mode, processedCount, skippedCount, processed: PersonalMetaProjection[], skipped: { appealId, reason }[] }",
  },
  p1ProxyAllowlistOwner: "P1",
  p1MustAllowPatterns: [
    "^/api/pro/referred-appeals$",
    "^/api/pro/referred-appeals/[\\w-]+/personal-meta$",
    "^/api/pro/referred-appeals/personal-batch$",
  ],
  p5WrongPathsReject: [
    "PATCH /api/pro/client-appeals/:appealId/personal-overlay",
    "POST /api/pro/client-appeals/personal-overlay/batch",
  ],
  p5WrongCommit: "518f6dd8c14f43c93354bf00be297e5093abd90f",
  p5CorrectCommit: "a7b111d28f7f83c81244fd401b7ed8c288e1a1ef",
  p5PersonalClientModule: "src/lib/clients-parity/observer-personal-api.ts",
} as const;

/** Profile publication ≠ whole «Клиенты» acceptance (Root @ 89fb8e073c39…). */
export const CLIENTS_PROFILE_PUBLISHED_NOT_SECTION_READY = {
  profileSelectSha: CLIENTS_NAVIGATOR_PROFILE_SELECT_SHA,
  meaning: "Navigator profile slice published; observer list/proxy/personal persist still blocked",
} as const;

/**
 * Parallel track file ownership — P2 is sole editor of contracts.ts + types.ts inventory.
 * Root integrates selected paths per owner tip only.
 */
export const CLIENTS_PARALLEL_FILE_OWNERSHIP = {
  p2Exclusive: ["src/lib/clients-parity/contracts.ts", "src/lib/clients-parity/types.ts"],
  p1: ["src/lib/remcard-proxy.ts", "assembly wiring for Clients routes only"],
  p3: [
    "src/lib/clients-parity/fetch-observer-appeals.ts",
    "observer list/workspace/filter/stats UI paths",
  ],
  p3MustImport: [
    "@/lib/clients-parity/observer-personal-api — owned by P5 @ a7b111d2; P3 must not commit competing client",
  ],
  p4: [
    "observer detail UI — timeline from ObserverPublicTimelineEvent[] only",
    "no receiving history wire; see CLIENTS_OBSERVER_DETAIL_HTTP_CONTRACT",
  ],
  p5: [
    "src/lib/clients-parity/observer-personal-api.ts",
    "personal/bulk observer UI components",
  ],
  p6: [
    "src/lib/clients-parity/receiving-appeals-api.ts",
    "receiving workspace/list/form/stages — never observer stats/filter/detail",
  ],
  p7: ["Clients section CSS only"],
  handoffAudit: "audit/remcard-parallel-20261113/P2/P2-CROSS-OWNER-HANDOFF-20261113.md",
} as const;

/**
 * K5 persistence vs wire projection for prototype trash/restore.
 * @see applyTrashMove / applyRestore @ navigator K5 draft
 */
export const CLIENTS_K5_BEFORE_TRASH_SEMANTICS = {
  serverColumn: "beforeTrashBucket",
  moveToTrash: "applyTrashMove sets beforeTrashBucket from prior bucket",
  restore: "applyRestore reads beforeTrashBucket when current bucket is trash",
  wirePersonalMetaProjection: "PersonalMetaProjection JSON omits beforeTrash — GAP-K5-I",
  wireListPersonalMeta: "ObserverPersonalMetaDto on list join omits beforeTrash until K2/K5 expose",
  p5MapProjectionToPartnerMeta: "maps bucket only; version omitted on list meta until list DTO adds it",
  p5AfterRestore: "must refresh meta.version from PATCH `{ meta }` response — do not infer restore bucket client-side",
  prototypeRef: "observer-personal-list.js restore from trash",
} as const;

/** K2 `partners[]` @ 3c6ccc19 vs target principal cards (GAP-K8-P). */
export const CLIENTS_OBSERVER_PARTNER_WIRE = {
  targetWire: "ObserverReceivingPartnerMetaWire — key receivingPartnerUserId",
  k2ActualInterim: "distinct receivingBranchId + receivingOrganizationId + displayName/city/category",
  p3UiCardKey: "receivingPartnerUserId (from appeal rows); do not treat Branch.id as partner id",
  p3DisplayRule: "show solo receiving User without Branch when receivingBranchId null",
  adapterMap: "OBSERVER_PARTNER_META_ADAPTER_MAP",
} as const;

/** K5 `PersonalMetaProjection` → prototype `ObserverPersonalMeta` (map key = meta.appealId). */
export const OBSERVER_K5_META_PROJECTION_MAP = {
  alias: "alias",
  tag: "tag",
  note: "note",
  bucket: "bucket",
  version: "version",
  updatedAt: "updatedAt",
  beforeTrash: "UNRESOLVED — not in K5 projection JSON (GAP-K5-I)",
} as const;

/** P5 batch `op` names are NOT navigator wire — map to K5 `action` before HTTP. */
export const OBSERVER_P5_TO_K5_BATCH_ACTION = {
  "set-tag": "setTag",
  "set-bucket": "move",
  restore: "restore",
} as const;

export const CLIENTS_SECTION_OWNERS = {
  navigatorK2List: "K2",
  navigatorK5Personal: "K5",
  partnerProxyAllowlist: "P1",
  partnerListFetchAdapter: "P3",
  partnerPersonalHttpClient: "P5",
  partnerUi: "P6",
  contractInventory: "P2",
} as const;

/** Root review @ 629de67e; gaps A–D closed @ e11f7e59 — not accepted production release. */
export const CLIENTS_K8_UNRESOLVED_GAPS = [
  {
    id: "GAP-K8-A",
    owner: "K8",
    topic:
      "repository.ts: P2002 catch + findFirst inside same $transaction after failed INSERT (aborted PG tx)",
    status: "RESOLVED_e11f7e59",
    requiredFix: "resolveCertificateCreateRace outside aborted tx",
  },
  {
    id: "GAP-K8-B",
    owner: "K8",
    topic:
      "eligibility.ts: canObserverListIncludeAppeal uses ownerUserId only; org workplace must require viewerUserId === eligible principal === referrerProUserId",
    status: "RESOLVED_e11f7e59",
  },
  {
    id: "GAP-K8-C",
    owner: "K8",
    topic:
      "resolveAppealAccess: optional options default principalAgentObserverOnly=false — receiving must not silently grant when context omitted",
    status: "RESOLVED_e11f7e59",
    requiredFix: "TrustedAppealAccessContext required (access.ts)",
  },
  {
    id: "GAP-K8-D",
    owner: "K8",
    topic:
      "dto.ts: Omit/spread blacklist; need explicit observer allowlist matching ObserverAppealK2WireDto in types.ts",
    status: "RESOLVED_e11f7e59",
    requiredFix: "ClientAppealObserverReadDto + toObserverAppealDto allowlist",
  },
  {
    id: "GAP-K8-E",
    owner: "K8+K1",
    topic:
      "PartnerClientAppealPartnerSettings keyed by organizationId vs prototype partnerSettings[receivingPartnerId]",
    status: "SUPERSEDED_20261113",
    p2AdapterRule: "Use receivingPartnerUserId per CLIENTS_RECEIVING_IDENTITY",
  },
  {
    id: "GAP-K8-J",
    owner: "K8",
    topic:
      "PartnerClientAppeal requires receivingOrganizationId + receivingBranchId NOT NULL — blocks eligible solo specialist (no owned org)",
    status: "RESOLVED_6f09c23e",
    requiredFix: "receivingPartnerUserId NOT NULL; org/branch nullable in migration.sql",
  },
  {
    id: "GAP-K8-K",
    owner: "K8+K1",
    topic:
      "Receiving CRM / certificate create paths require owned org+branch — incompatible with solo specialist receiving",
    status: "RESOLVED_f722a164",
    requiredFix: "receivingPartnerUserId principal scope in K1 receiving paths",
  },
  {
    id: "GAP-K8-L",
    owner: "K8",
    topic:
      "Active certificate partial unique uses archivedAt + branch; prototype findActiveAppeal vs receiving archive/trash buckets",
    status: "UNRESOLVED",
    requiredFix: "Align slot predicate with prototype before archive/trash allows duplicate active referral",
  },
  {
    id: "GAP-K8-M",
    owner: "K2",
    topic:
      "Observer list/by-partner filters receivingBranchId — must filter/group by receivingPartnerUserId",
    status: "SUPERSEDED_BY_GAP-K8-P",
  },
  {
    id: "GAP-K8-F",
    owner: "K2",
    topic:
      "GET /api/pro/referred-appeals @72193c78: Prisma select paidAmountKopecks — column does not exist",
    status: "RESOLVED_3c6ccc19",
    requiredFix: "mapPartnerClientAppealToRecord + order include",
  },
  {
    id: "GAP-K8-G",
    owner: "K2",
    topic: "K2 HTTP list missing appeals/partners/personalMeta envelope",
    status: "RESOLVED_3c6ccc19",
    requiredFix: "GET returns appeals, partners, personalMeta @ route.ts",
  },
  {
    id: "GAP-K8-N",
    owner: "K8+K1+K2",
    topic:
      "BLK-CLIENTS-PURCHASE-READ: unify client purchase projection across K8 @1894569a and K2 @78ce748d",
    status: "PARTIAL_1894569a",
    requiredFix: "K2 imports K8 appealPurchaseProjection; P6 reads paidAt null gap until Order timestamp exists",
  },
  {
    id: "GAP-K1-HTTP-ACCESS",
    owner: "K1",
    topic: "GET list/detail omit ReceivingAppealsAccessWire (principal ids, accessMode, readOnly only partial)",
    status: "RESOLVED_5a51d7b7",
    requiredFix: "buildReceivingAccessEnvelope on list+detail — map via mapK1AccessWireToP6Gates",
  },
  {
    id: "GAP-K1-HTTP-BUCKET",
    owner: "K1",
    topic: "List query archived=1 vs K8 bucket active|archive|trash + sourceFilter + stageKey",
    status: "RESOLVED_5a51d7b7",
    requiredFix: "parseReceivingListQuery + response.bucket — P6 must not use tab as bucket",
  },
  {
    id: "GAP-K1-HTTP-BATCH-LIFECYCLE",
    owner: "K1",
    topic: "Batch HTTP lacks delete(trash) + restore; partial failures not aligned with K8 applyReceivingBulkLifecycle",
    status: "UNRESOLVED",
    requiredFix: "POST batch actions archive|delete|unarchive|restore with per-id outcomes",
  },
  {
    id: "GAP-P6-DETAIL-PATCH-PATH",
    owner: "P6+P1+K1",
    topic:
      "P6 @ 4dca7af7 conflates CRM PATCH with stage/finance on PATCH .../:id — K1 @ 5a51d7b7 splits profile vs /stage",
    status: "PARTIAL_K1_DONE_P6_UNRESOLVED",
    requiredFix:
      "P6: profile mapReceivingUiProfilePatchToK1 → PATCH :id; stage mapReceivingUiStageIdToK1StagePatch → PATCH :stage; P1 proxy @ 2b2b32b8",
  },
  {
    id: "GAP-P6-CERT-PROMOCODE",
    owner: "P6",
    topic: "certificate-entry POST sends certificateCode; K1 requires promoCode @ 5a51d7b7",
    status: "UNRESOLVED",
    requiredFix: "mapReceivingUiCertificateCodeToK1Promo; handle 200 { valid: false, reason }",
  },
  {
    id: "GAP-P6-STAGE-LABEL-FILTER",
    owner: "P6",
    topic: "Client-side status filter compares stage labels; list query must send stageKey id",
    status: "UNRESOLVED",
    requiredFix: "RECEIVING_P6_WIRE_DEFECTS.stageKeyNotLabel — filter by sys_* + workingStages[].id",
  },
  {
    id: "GAP-P6-LIST-PAGINATION",
    owner: "P6",
    topic: "Workspace loads first 25 rows then client-side filter/bulk-all — violates cursor pagination contract",
    status: "UNRESOLVED",
    requiredFix: "GET with limit/cursor; fetch next pages; server bucket/source when K1 query lands",
  },
  {
    id: "GAP-P6-LIST-ENVELOPE",
    owner: "P6",
    topic: "coerceK1ClientAppealsListPayload expects kpis/settings/access on list JSON",
    status: "UNRESOLVED",
    requiredFix: "RECEIVING_K1_P6_LIST_WIRE_CONTRACT — split loads + mappers from types.ts",
  },
  {
    id: "GAP-K8-CROSS-WIRE-STALE",
    owner: "K8",
    topic: "CROSS_OWNER_WIRE.md cites K2 72193c78 items + Branch.id partner cards",
    status: "UNRESOLVED",
    requiredFix: "K8 doc points to 3c6ccc19 appeals envelope + receivingPartnerUserId (P2 inventory authoritative until K8 edits)",
  },
  {
    id: "GAP-K2-OBSERVER-DELETED-AT",
    owner: "K2",
    topic:
      "List/detail where deletedAt: null hides appeal from referrer when receiver moved row to receiving trash",
    status: "UNRESOLVED",
    requiredFix:
      "Observer queries scope referrerProUserId + certificate only — ignore receiver deletedAt/archivedAt for inclusion",
  },
  {
    id: "GAP-K2-OBSERVER-TIMELINE-RAW",
    owner: "K2+K8",
    topic: "Detail GET maps PartnerClientAppealHistoryEvent.text without publicReferrerTimeline filter",
    status: "PARTIAL_df8ed8a5",
    requiredFix:
      "K2 @ df8ed8a5 projectObserverPublicHistory — verify wire is ObserverPublicTimelineEvent[] only end-to-end",
  },
  {
    id: "GAP-K8-PUBLIC-TIMELINE",
    owner: "K8",
    topic:
      "Persisted history → prototype isPublicReferrerHistoryEntry/publicHistoryLine in shared module for K1 audit + K2 observer",
    status: "PARTIAL_0f4fe833",
    requiredFix:
      "K8 referrerPublicHistory @ 0f4fe833; K1 certificate create uses { createdHistoryEvent? } — do not duplicate in P2",
  },
  {
    id: "GAP-K8-MANUAL-CHANNELS-CUSTOM",
    owner: "K8+K1",
    topic: "Prototype addWorkspaceChannel / manualChannels[] — no persisted custom channel catalog",
    status: "UNRESOLVED",
    requiredFix: "CLIENTS_PROTOTYPE_PARTNER_OVERLAY.manualChannels — built-in manualSourceKey only until schema",
  },
  {
    id: "GAP-K8-PAY-CATEGORIES",
    owner: "K8+profile",
    topic: "Prototype payCategories / profilePayCategories — not in client-appeals settings API",
    status: "OUT_OF_SCOPE_FINANCE",
    requiredFix: "DISPLAY_ONLY — existing store/order category APIs; no Clients prep settlement change",
  },
  {
    id: "GAP-K8-O",
    owner: "K2",
    topic:
      "observerK8Mirror ClientAppealObserverReadDto omits receivingPartnerUserId; optional org/branch still required strings",
    status: "UNRESOLVED",
    requiredFix: "Import K8 contract.ts + dto after merge; align with 6f09c23e",
  },
  {
    id: "GAP-K8-P",
    owner: "K2",
    topic: "partners[] built via distinct receivingBranchId — not receivingPartnerUserId principal cards",
    status: "UNRESOLVED",
    requiredFix: "distinct + summary keyed by receivingPartnerUserId + User profile metadata",
  },
  {
    id: "GAP-K8-H",
    owner: "K2",
    topic:
      "Inventory target `/api/pro/client-appeals/observer` vs actual `GET /api/pro/referred-appeals` @72193c78",
    status: "UNRESOLVED",
    requiredFix: "P1 allowlists actual paths now; optional alias route later — do not block on rename",
  },
  {
    id: "GAP-P5-518f6dd8",
    owner: "P5",
    topic:
      "observer-personal-api.ts calls personal-overlay routes and expects `{ overlay }` — paths do not exist on navigator",
    status: "RESOLVED_a7b111d2",
    requiredFix:
      "P3/P4 import observer-personal-api.ts @ a7b111d2; never duplicate HTTP client",
  },
  {
    id: "GAP-K5-I",
    owner: "K5+K2+P5",
    topic:
      "beforeTrashBucket persisted on move; restore uses it server-side; list + PATCH projections omit beforeTrash on wire",
    status: "UNRESOLVED",
    requiredFix:
      "Expose beforeTrash on list personalMeta or document client refresh-only restore; map version on meta after PATCH",
  },
] as const;

export const CLIENTS_K8_OPEN_GAPS = CLIENTS_K8_UNRESOLVED_GAPS.filter(
  (g) => g.status === "UNRESOLVED",
);

export const CLIENTS_PARTNER_SETTINGS_SCOPE = {
  prototype: "partnerSettings[receivingPartnerId] keyed by receiving principal User.id",
  k8Target: "PartnerClientAppealPartnerSettings.receivingPartnerUserId @unique",
  k8DraftWrong: "PartnerClientAppealPartnerSettings.organizationId @unique @ e11f7e59 migration",
  p2Decision: "RESOLVED @ 6f09c23e — settings.receivingPartnerUserId @unique",
  appealRowAnchor: "receivingPartnerUserId required; receivingOrganizationId/receivingBranchId optional",
} as const;

/** Stable P3/P5 adapter: K2 allowlist DTO → ObserverReferredAppeal field renames only. */
export const OBSERVER_APPEAL_ADAPTER_MAP = {
  id: "id",
  clientDisplayName: "clientName",
  stageKey: "stageId",
  referrerProUserId: "referrerPartnerId",
  receivingPartnerUserId: "receivingPartnerId",
  receivingBranchId: "receivingBranchId",
  receivingOrganizationId: "receivingOrganizationId",
  orderId: "purchaseId",
  paidAmountKopecks: "paidAmount",
  createdAt: "referralAt",
  manualSourceKey: "manualEntry",
  originKind: "manualEntry",
} as const;

export const OBSERVER_PARTNER_META_ADAPTER_MAP = {
  receivingPartnerUserId: "id",
  displayName: "name",
  city: "city",
  category: "category",
  receivingOrganizationId: "receivingOrganizationId",
  receivingBranchId: "receivingBranchId",
} as const;

/** Navigator actual observer + personal routes @ K2/K5 drafts (not a deprecated alias). */
export const CLIENTS_NAVIGATOR_REFERRED_APPEALS_PREFIX = "/api/pro/referred-appeals";

/** @deprecated typo guard — use CLIENTS_NAVIGATOR_REFERRED_APPEALS_PREFIX */
export const CLIENTS_DEPRECATED_ROUTE_PREFIX = CLIENTS_NAVIGATOR_REFERRED_APPEALS_PREFIX;

export type ContractRouteStatus =
  | "NOT_IMPLEMENTED"
  | "DRAFT_K8"
  | "IMPLEMENTED_UNVERIFIED"
  | "READY";

export type ClientsCanonicalRoute = {
  method: string;
  path: string;
  blockerId: string;
  status: ContractRouteStatus;
  owner: "K1" | "K2" | "K5" | "P5" | "P6";
  authGate: string;
  notes?: string;
};

export const CLIENTS_CANONICAL_ROUTES: ClientsCanonicalRoute[] = [
  {
    method: "GET",
    path: "/api/pro/client-appeals/observer",
    blockerId: "BLK-OBSERVER-REFERRED",
    status: "NOT_IMPLEMENTED",
    owner: "K2",
    authGate:
      "GAP-K8-1: align with ownerClientsAccess principal eligibility + referrerProUserId === viewer; resolveAppealAccess observer; read-only",
    notes:
      "200: items[], receivingPartners[] by User.id, personalMeta?. P3 → appeals/partners.",
  },
  {
    method: "GET",
    path: "/api/pro/client-appeals/observer/:appealId",
    blockerId: "BLK-OBSERVER-REFERRED",
    status: "NOT_IMPLEMENTED",
    owner: "K2",
    authGate: "referrer row scope; must not write",
    notes: "200: appeal + history[]; strip privateNotes/clientContact.",
  },
  {
    method: "GET",
    path: "/api/pro/client-appeals/observer/by-branch/:receivingBranchId",
    blockerId: "BLK-OBSERVER-REFERRED",
    status: "NOT_IMPLEMENTED",
    owner: "K2",
    authGate: "same as list; branch id not client-supplied partner guess",
  },
  {
    method: "PATCH",
    path: "/api/pro/referred-appeals/:appealId/personal-meta",
    blockerId: "BLK-OBSERVER-PERSONAL-PERSIST",
    status: "DRAFT_K8",
    owner: "K5",
    authGate: "session viewerUserId + CSRF + requireOwnerClientsListContext; row referrerProUserId === viewer",
    notes:
      "Actual @86ac3e35: body expectedVersion?, alias?, tag?, note?, action? move|restore, target?; 200 { meta }. P1 proxy only.",
  },
  {
    method: "POST",
    path: "/api/pro/referred-appeals/personal-batch",
    blockerId: "BLK-OBSERVER-PERSONAL-PERSIST",
    status: "DRAFT_K8",
    owner: "K5",
    authGate: "same as personal-meta",
    notes:
      "Actual @86ac3e35: action move|restore|setTag, ids[], mode atomic|best_effort, expectedVersions?; 200 processed/skipped counts.",
  },
  {
    method: "GET",
    path: "/api/pro/referred-appeals",
    blockerId: "BLK-OBSERVER-REFERRED",
    status: "DRAFT_K8",
    owner: "K2",
    authGate: "requireObserverReferredAppealsRead @72193c78",
    notes:
      "200: appeals, partners, personalMeta, pagination @3c6ccc19; GAP-K8-O/P/N remain.",
  },
  {
    method: "GET",
    path: "/api/pro/client-appeals",
    blockerId: "BLK-RECEIVING-APPEALS",
    status: "DRAFT_K8",
    owner: "K1",
    authGate:
      "requireReceivingAppealsListContext @ 83f279e8; agent 403 CLIENT_APPEALS_AGENT_OBSERVER_ONLY",
    notes:
      "200: appeals, nextCursor, bucket, tab, principal, access, readOnly @ 5a51d7b7. Query bucket|sourceFilter|stageKey.",
  },
  {
    method: "POST",
    path: "/api/pro/client-appeals",
    blockerId: "BLK-RECEIVING-APPEALS",
    status: "DRAFT_K8",
    owner: "K1",
    authGate: "requireReceivingAppealsWriteContext; reject posted partner ids",
    notes: "201: { appeal } manual create",
  },
  {
    method: "GET",
    path: "/api/pro/client-appeals/:appealId",
    blockerId: "BLK-RECEIVING-APPEALS",
    status: "DRAFT_K8",
    owner: "K1",
    authGate: "same list context; readOnly on org workplace",
    notes:
      "200: appeal, revision, history, workingStages, refusalReasons top-level + access @ 5a51d7b7 — normalizeK1ReceivingDetailHttp",
  },
  {
    method: "PATCH",
    path: "/api/pro/client-appeals/:appealId",
    blockerId: "BLK-RECEIVING-APPEALS",
    status: "DRAFT_K8",
    owner: "K1",
    authGate: "requireReceivingAppealsWriteContext; parseAppealProfilePatch — no stageKey on body",
    notes: "CRM profile PATCH only — P1 proxy GET+PATCH @ 2b2b32b8",
  },
  {
    method: "PATCH",
    path: "/api/pro/client-appeals/:appealId/stage",
    blockerId: "BLK-RECEIVING-APPEALS",
    status: "DRAFT_K8",
    owner: "K1",
    authGate: "write context; expectedRevision optimistic lock",
    notes: "Body stageKey + refusedReason + shippedAt — not POST stage",
  },
  {
    method: "POST",
    path: "/api/pro/client-appeals/batch",
    blockerId: "BLK-RECEIVING-APPEALS",
    status: "DRAFT_K8",
    owner: "K1",
    authGate: "write context",
    notes: "GAP-K1-HTTP-BATCH-LIFECYCLE vs prototype delete/restore",
  },
  {
    method: "GET",
    path: "/api/pro/client-appeals/working-stages",
    blockerId: "BLK-RECEIVING-APPEALS",
    status: "DRAFT_K8",
    owner: "K1",
    authGate: "list/write per method",
    notes: "200: { settings } keyed by receivingPartnerUserId",
  },
  {
    method: "POST",
    path: "/api/pro/client-appeals/working-stages",
    blockerId: "BLK-RECEIVING-APPEALS",
    status: "DRAFT_K8",
    owner: "K1",
    authGate: "write context",
    notes: "kind workingStage | refusalReason",
  },
  {
    method: "PATCH",
    path: "/api/pro/client-appeals/working-stages",
    blockerId: "BLK-RECEIVING-APPEALS",
    status: "DRAFT_K8",
    owner: "K1",
    authGate: "write context",
    notes: "rename-stage or restore-stage",
  },
  {
    method: "DELETE",
    path: "/api/pro/client-appeals/working-stages",
    blockerId: "BLK-RECEIVING-APPEALS",
    status: "DRAFT_K8",
    owner: "K1",
    authGate: "write context",
    notes: "archive-stage via ?stageId=",
  },
];

export const CLIENTS_DECISIONS = [
  {
    id: "D1",
    topic: "appealId",
    p2Position:
      "Opaque string id in API (K8 candidate: cuid). Dedup natural key (certificateId + receivingBranchId) inside transactions — GAP-K8-3.",
    k8MustPublish: "appeal id + active uniqueness constraint",
  },
  {
    id: "D2",
    topic: "stageId",
    p2Position: `System stages MUST use prototype ids: ${Object.values(CLIENTS_APPEAL_SYSTEM_STAGE).join(", ")}. Custom stages: workingStages[].id per receivingPartnerUserId (prototype receivingPartnerId).`,
    k8MustPublish: "Order/cert → stageId mapping table; no renaming to short new/paid in JSON",
  },
  {
    id: "D3",
    topic: "observer read auth",
    p2Position:
      "Principal agent/specialist per ownerClientsAccess — NOT only BranchEmployee.canViewOwnOperations (GAP-K8-1). Referrer = referrerProUserId. Receiving uses canManageLeads on branch. No new permission bits.",
    k8MustPublish: "requireClientAppealsObserverContext aligned with existing gates",
  },
  {
    id: "D4",
    topic: "personal overlay",
    p2Position:
      "Dedicated store keyed (viewerUserId, appealId). Fields match observer-personal-list.js incl. beforeTrash. No AgentClient PATCH substitute.",
    k8MustPublish: "Prisma model + PATCH/batch routes (migration draft only until prod approval)",
  },
  {
    id: "D5",
    topic: "receiving client-appeals",
    p2Position:
      "Separate resource from /api/leads and /api/pro/requests; includes workingStages + history append semantics from client-appeals.js.",
    k8MustPublish: "client-appeals CRUD + working-stages",
  },
  {
    id: "D6",
    topic: "partner proxy",
    p2Position:
      "P1 alone edits `remcard-proxy.ts` allowlist for navigator paths. P3 list adapter + P5 HTTP client map wire; not proxy ownership.",
    k8MustPublish: "Stable referred-appeals paths before P1 allowlist merge",
  },
  {
    id: "D7",
    topic: "forbidden wiring",
    p2Position:
      "Never map personal-meta save or observer list to GET/PATCH /api/pro/agent-clients* or partnership-list-preferences.",
    k8MustPublish: "contract tests rejecting owner CRM paths for observer overlay",
  },
] as const;

export const CLIENTS_FORBIDDEN_SUBSTITUTES = [
  "PATCH /api/pro/agent-clients/:id",
  "POST /api/pro/agent-clients/batch",
  "PATCH /api/certificate/:code/alias",
  "GET/PATCH /api/pro/partnership-list-preferences/:partnershipId",
  "GET /api/leads",
  "GET /api/pro/requests",
] as const;

export type ContractBlocker = {
  id: string;
  requirementIds: string[];
  summary: string;
  missingApi: string[];
  evidence: string;
  implementationStatus: "NOT_IMPLEMENTED" | "PREP_AUTHORIZED_20261113";
};

export const CLIENTS_CONTRACT_BLOCKERS: ContractBlocker[] = [
  {
    id: "BLK-RECEIVING-APPEALS",
    requirementIds: [
      "C07",
      "C08",
      "C09",
      "C10",
      "C11",
      "C12",
      "C13",
      "C14",
      "C15",
      "C16",
      "C17",
      "C18",
      "C19",
      "C20",
      "C21",
      "C22",
      "C23",
      "C24",
    ],
    summary: "Принимающий CRM «Клиенты у меня» (обращения, этапы, аналитика, покупка).",
    missingApi: CLIENTS_CANONICAL_ROUTES.filter((r) => r.blockerId === "BLK-RECEIVING-APPEALS").map(
      (r) => `${r.method} ${r.path}`,
    ),
    evidence:
      "K8 fc33 migration draft only; no K1 HTTP routes; GAP-K8-2 working-stages",
    implementationStatus: "PREP_AUTHORIZED_20261113",
  },
  {
    id: "BLK-OBSERVER-REFERRED",
    requirementIds: [
      "C26",
      "C27",
      "C28",
      "C29",
      "C30",
      "C31",
      "C32",
      "C33",
      "C34",
      "C39",
      "C40",
      "C41",
    ],
    summary: "«Мои клиенты у партнёров»: направленные обращения, партнёрские сводки и деталь.",
    missingApi: CLIENTS_CANONICAL_ROUTES.filter((r) => r.blockerId === "BLK-OBSERVER-REFERRED").map(
      (r) => `${r.method} ${r.path}`,
    ),
    evidence:
      "K8 core lib only; K2 routes missing; fetch-observer-appeals BLOCKED; GAP-K8-1 GAP-K8-5",
    implementationStatus: "PREP_AUTHORIZED_20261113",
  },
  {
    id: "BLK-OBSERVER-PERSONAL-PERSIST",
    requirementIds: ["C35", "C36", "C37", "C38"],
    summary: "Личные alias/метка/заметка/корзина наблюдателя с сохранением после reload.",
    missingApi: CLIENTS_CANONICAL_ROUTES.filter(
      (r) => r.blockerId === "BLK-OBSERVER-PERSONAL-PERSIST",
    ).map((r) => `${r.method} ${r.path}`),
    evidence:
      "PartnerClientAppealPersonalOverlay in fc33 draft; K5 routes missing; UI notifyPersistenceBlock.",
    implementationStatus: "PREP_AUTHORIZED_20261113",
  },
];

export function blockerForRequirement(requirementId: string): ContractBlocker | undefined {
  return CLIENTS_CONTRACT_BLOCKERS.find((b) => b.requirementIds.includes(requirementId));
}

export function routesForBlocker(blockerId: string): ClientsCanonicalRoute[] {
  return CLIENTS_CANONICAL_ROUTES.filter((r) => r.blockerId === blockerId);
}
