"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  postReceivingAppealOrderLink,
  resolveReceivingScannerCertificateEntryGate,
  submitReceivingCertificateEntry,
  RECEIVING_SCANNER_CRM_READ_ONLY_NOTICE,
  type ReceivingAppealOrderLinkResult,
  type ReceivingAppealsListResponse,
  type ReceivingPrincipalAccess,
} from "@/lib/clients-parity/receiving-appeals-api";
import {
  loadReceivingAppealScannerContext,
  loadScannerOrdinaryAppealBinding,
  parseScannerAppealParam,
  receivingCertificateMatchesPreview,
  saveScannerOrdinaryAppealBinding,
  scannerAppealInputSignature,
  type ReceivingAppealScannerContext,
  type ScannerAppealParam,
  type ScannerOrdinaryAppealBindingV1,
} from "@/lib/scanner/receiving-appeal-handoff";
import type { StoreOrderAttemptRecord } from "@/lib/store-order-attempt";
import type { OrderPreviewAllowed } from "@/lib/order-types";

export type ReceivingAppealLinkPhase =
  | "idle"
  | "pending"
  | "linking"
  | "linked"
  | "failed"
  | "conflict";

type FrozenSubmitScope = { appealId: string; revision: number; loadGen: number; idempotencyKey: string };

type AdoptedAppealBinding = { appealId: string; certCode: string; branchKey: string };

type CertificateEntryGate =
  | Pick<ReceivingAppealsListResponse, "readOnly" | "access">
  | ReceivingPrincipalAccess;

function resolveParam(input: ScannerAppealParam | string | null | undefined): ScannerAppealParam {
  if (input !== null && typeof input === "object" && "mode" in input) {
    return input;
  }
  return parseScannerAppealParam(input);
}

function initialContext(param: ScannerAppealParam): ReceivingAppealScannerContext {
  if (param.mode === "invalid") {
    return { status: "invalid_param", message: "Некорректный идентификатор обращения в URL." };
  }
  if (param.mode === "scoped") {
    return { status: "loading", appealId: param.appealId };
  }
  return { status: "idle" };
}

const LINK_SCOPE_LOST_MESSAGE =
  "Покупка создана, но привязка к обращению недоступна: нет доверенного контекста исходной попытки (повтор проверки или смена обращения).";

const SCANNER_BINDING_REVISION_CONFLICT =
  "Версия обращения изменилась после сохранения привязки. Обновите карточку в CRM и повторите.";

function branchCapabilityCacheKey(branchId?: string): string {
  return branchId?.trim() || "__none__";
}

export type PrepareOrderAttemptScopeOpts = {
  userId: string;
  certCode: string;
  branchId?: string;
};

export type EnsureOrdinaryAppealArgs = {
  promoCode: string;
  branchId?: string;
  previewRequestId: number;
  signal?: AbortSignal;
  isStale: () => boolean;
};

export type RestoreOrdinaryAppealArgs = {
  userId: string;
  record: StoreOrderAttemptRecord;
  signal?: AbortSignal;
  isStale: () => boolean;
};

export function useReceivingAppealScannerHandoff(input: ScannerAppealParam | string | null | undefined) {
  const paramSignature = scannerAppealInputSignature(input);
  const param = useMemo(() => resolveParam(input), [paramSignature]);
  const urlAppealId = param.mode === "scoped" ? param.appealId : null;

  const [adoptedAppealId, setAdoptedAppealId] = useState<string | null>(null);
  const adoptedBindingRef = useRef<AdoptedAppealBinding | null>(null);
  const [certEntryError, setCertEntryError] = useState("");
  const [certEntryPending, setCertEntryPending] = useState(false);
  const [crmReadOnlyNotice, setCrmReadOnlyNotice] = useState("");
  const [crmGateRetryError, setCrmGateRetryError] = useState("");
  const [crmWriteCapable, setCrmWriteCapable] = useState<boolean | null>(null);
  const crmEntryGateRef = useRef<CertificateEntryGate | null>(null);
  const crmCapableByBranchRef = useRef<Map<string, boolean>>(new Map());
  const gateResolveGen = useRef(0);
  const [legacyUncertainRestore, setLegacyUncertainRestore] = useState(false);

  const effectiveAppealId = urlAppealId ?? adoptedAppealId;
  const ordinaryAppealRequired = param.mode === "none";
  const ordinaryAppealIntegrationRequired =
    ordinaryAppealRequired && crmWriteCapable === true && !legacyUncertainRestore;

  const [context, setContext] = useState<ReceivingAppealScannerContext>(() => initialContext(param));
  const loadGen = useRef(0);
  const linkGen = useRef(0);
  const certEntryGen = useRef(0);
  const linkInFlight = useRef(false);
  const scopeRef = useRef<string | null>(effectiveAppealId);
  scopeRef.current = effectiveAppealId;
  const revisionRef = useRef(0);
  const contextRef = useRef(context);
  contextRef.current = context;
  const frozenSubmitByKeyRef = useRef<Map<string, FrozenSubmitScope>>(new Map());
  const activeSubmitScopeRef = useRef<FrozenSubmitScope | null>(null);

  const [linkPhase, setLinkPhase] = useState<ReceivingAppealLinkPhase>("idle");
  const [linkError, setLinkError] = useState("");
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);
  const [linkedOrderId, setLinkedOrderId] = useState<string | null>(null);
  const linkScopeRef = useRef<{ appealId: string; orderId: string; revision: number; linkGen: number } | null>(
    null,
  );

  const finishCertEntryPending = useCallback((gen: number) => {
    if (gen === certEntryGen.current) {
      setCertEntryPending(false);
    }
  }, []);

  const resetLinkState = useCallback(() => {
    linkGen.current += 1;
    linkInFlight.current = false;
    linkScopeRef.current = null;
    activeSubmitScopeRef.current = null;
    setLinkPhase("idle");
    setLinkError("");
    setPendingOrderId(null);
    setLinkedOrderId(null);
  }, []);

  const hydrateFrozenSubmitScope = useCallback(
    (binding: ScannerOrdinaryAppealBindingV1) => {
      const frozen: FrozenSubmitScope = {
        appealId: binding.appealId,
        revision: binding.revision,
        loadGen: loadGen.current,
        idempotencyKey: binding.idempotencyKey,
      };
      frozenSubmitByKeyRef.current.set(binding.idempotencyKey, frozen);
      activeSubmitScopeRef.current = frozen;
      revisionRef.current = binding.revision;
    },
    [],
  );

  const adoptAppealContext = useCallback(
    async (
      appealId: string,
      certCode: string,
      branchKey: string,
      opts: { gen: number; isStale: () => boolean; expectedRevision?: number },
    ): Promise<{ ok: true } | { ok: false; message: string }> => {
      adoptedBindingRef.current = { appealId, certCode, branchKey };
      scopeRef.current = appealId;
      setAdoptedAppealId(appealId);
      setCertEntryError("");
      const detailGen = ++loadGen.current;
      setContext({ status: "loading", appealId });
      const next = await loadReceivingAppealScannerContext(appealId);
      if (opts.isStale() || opts.gen !== certEntryGen.current || detailGen !== loadGen.current) {
        return { ok: false, message: "Контекст обращения устарел." };
      }
      if (adoptedBindingRef.current?.appealId !== appealId) {
        return { ok: false, message: "Контекст обращения устарел." };
      }
      setContext(next);
      if (next.status === "ready") {
        if (
          opts.expectedRevision !== undefined &&
          next.revision !== opts.expectedRevision
        ) {
          const message = SCANNER_BINDING_REVISION_CONFLICT;
          setCertEntryError(message);
          return { ok: false, message };
        }
        revisionRef.current = opts.expectedRevision ?? next.revision;
        setLegacyUncertainRestore(false);
        return { ok: true };
      }
      const message =
        next.status === "forbidden" ||
        next.status === "not_found" ||
        next.status === "blocked" ||
        next.status === "error"
          ? next.message
          : "Не удалось подготовить обращение для покупки.";
      setCertEntryError(message);
      return { ok: false, message };
    },
    [],
  );

  const resolveCrmWriteForBranch = useCallback(
    async (
      branchId: string | undefined,
      opts: { signal?: AbortSignal; isStale: () => boolean },
    ): Promise<boolean | null> => {
      const cacheKey = branchCapabilityCacheKey(branchId);
      if (crmCapableByBranchRef.current.has(cacheKey)) {
        const cached = crmCapableByBranchRef.current.get(cacheKey) === true;
        setCrmWriteCapable(cached);
        return cached;
      }
      if (opts.signal?.aborted || opts.isStale()) {
        return null;
      }
      const gen = ++gateResolveGen.current;
      const gate = await resolveReceivingScannerCertificateEntryGate({
        branchId,
        signal: opts.signal,
      });
      if (opts.signal?.aborted || opts.isStale() || gen !== gateResolveGen.current) {
        return null;
      }
      if (!gate.ok) {
        if (gate.code === "READ_ONLY") {
          crmCapableByBranchRef.current.set(cacheKey, false);
          setCrmWriteCapable(false);
          crmEntryGateRef.current = null;
          setCrmReadOnlyNotice(gate.message || RECEIVING_SCANNER_CRM_READ_ONLY_NOTICE);
          setCrmGateRetryError("");
          setLegacyUncertainRestore(true);
          return false;
        }
        setCrmGateRetryError(gate.message);
        setCrmReadOnlyNotice("");
        setCertEntryError(gate.retryable ? "" : gate.message);
        return null;
      }
      crmCapableByBranchRef.current.set(cacheKey, true);
      setCrmWriteCapable(true);
      crmEntryGateRef.current = gate.gate;
      setCrmReadOnlyNotice("");
      setCrmGateRetryError("");
      return true;
    },
    [],
  );

  useEffect(() => {
    adoptedBindingRef.current = null;
    setAdoptedAppealId(null);
    setCertEntryError("");
    setCertEntryPending(false);
    setCrmReadOnlyNotice("");
    setCrmGateRetryError("");
    setLegacyUncertainRestore(false);
    setCrmWriteCapable(null);
    crmEntryGateRef.current = null;
    crmCapableByBranchRef.current.clear();
    gateResolveGen.current += 1;
    resetLinkState();
    if (param.mode === "invalid") {
      frozenSubmitByKeyRef.current.clear();
    }
    setContext(initialContext(param));
    if (param.mode !== "scoped") {
      return;
    }
    const appealId = param.appealId;
    const gen = ++loadGen.current;
    void loadReceivingAppealScannerContext(appealId).then((next) => {
      if (gen !== loadGen.current || scopeRef.current !== appealId) {
        return;
      }
      setContext(next);
      if (next.status === "ready") {
        revisionRef.current = next.revision;
      }
    });
    return () => {
      loadGen.current += 1;
      linkGen.current += 1;
      certEntryGen.current += 1;
    };
  }, [paramSignature, param, resetLinkState]);

  useEffect(() => {
    return () => {
      certEntryGen.current += 1;
    };
  }, []);

  const ensureOrdinaryAppealContext = useCallback(
    async (args: EnsureOrdinaryAppealArgs): Promise<{ ok: true } | { ok: false; message: string }> => {
      if (param.mode === "scoped") {
        return { ok: true };
      }
      if (param.mode === "invalid") {
        return { ok: false, message: "Некорректный идентификатор обращения в URL." };
      }
      if (args.signal?.aborted || args.isStale()) {
        return { ok: false, message: "Проверка сертификата отменена." };
      }

      const branchKey = args.branchId?.trim() ?? "";
      const binding = adoptedBindingRef.current;
      if (
        binding &&
        binding.certCode === args.promoCode &&
        binding.branchKey === branchKey &&
        binding.appealId === scopeRef.current &&
        contextRef.current.status === "ready" &&
        contextRef.current.appealId === binding.appealId
      ) {
        return { ok: true };
      }

      const gen = ++certEntryGen.current;
      setCertEntryPending(true);
      setCertEntryError("");

      const crmWritable = await resolveCrmWriteForBranch(args.branchId, {
        signal: args.signal,
        isStale: args.isStale,
      });
      if (args.signal?.aborted || args.isStale() || gen !== certEntryGen.current) {
        finishCertEntryPending(gen);
        return { ok: false, message: "Проверка сертификата отменена." };
      }
      if (crmWritable === null) {
        finishCertEntryPending(gen);
        return { ok: false, message: crmGateRetryError || "Не удалось проверить права CRM." };
      }
      if (crmWritable === false) {
        finishCertEntryPending(gen);
        return { ok: true };
      }

      const entry = await submitReceivingCertificateEntry(
        { promoCode: args.promoCode },
        crmEntryGateRef.current ?? undefined,
        { branchId: args.branchId, signal: args.signal },
      );

      if (args.signal?.aborted || args.isStale() || gen !== certEntryGen.current) {
        finishCertEntryPending(gen);
        return { ok: false, message: "Проверка сертификата отменена." };
      }
      finishCertEntryPending(gen);

      if (!entry.ok) {
        setCertEntryError(entry.message);
        if (!binding || binding.certCode !== args.promoCode || binding.branchKey !== branchKey) {
          adoptedBindingRef.current = null;
          setAdoptedAppealId(null);
          setContext({ status: "idle" });
        }
        return { ok: false, message: entry.message };
      }

      return adoptAppealContext(entry.appealId, args.promoCode, branchKey, { gen, isStale: args.isStale });
    },
    [adoptAppealContext, crmGateRetryError, finishCertEntryPending, param.mode, resolveCrmWriteForBranch],
  );

  const restoreOrdinaryAppealForStoredAttempt = useCallback(
    async (args: RestoreOrdinaryAppealArgs): Promise<{ ok: true } | { ok: false; message: string }> => {
      if (param.mode !== "none") {
        return { ok: true };
      }
      const branchKey = args.record.branchId?.trim() ?? "";
      const crmWritable = await resolveCrmWriteForBranch(branchKey || undefined, {
        signal: args.signal,
        isStale: args.isStale,
      });
      if (args.signal?.aborted || args.isStale()) {
        return { ok: false, message: "Восстановление отменено." };
      }
      if (crmWritable === null) {
        return { ok: false, message: crmGateRetryError || "Не удалось проверить права CRM." };
      }
      if (crmWritable === false) {
        setLegacyUncertainRestore(true);
        return { ok: true };
      }

      const persisted = loadScannerOrdinaryAppealBinding(
        args.userId,
        args.record.idempotencyKey,
        args.record.body.certificateCode,
        branchKey,
      );
      if (!persisted) {
        setLegacyUncertainRestore(true);
        setAdoptedAppealId(null);
        adoptedBindingRef.current = null;
        scopeRef.current = null;
        setContext({ status: "idle" });
        return { ok: true };
      }

      const gen = certEntryGen.current;
      const adopted = await adoptAppealContext(persisted.appealId, persisted.certCode, persisted.branchId, {
        gen,
        isStale: args.isStale,
        expectedRevision: persisted.revision,
      });
      if (adopted.ok) {
        hydrateFrozenSubmitScope(persisted);
      }
      return adopted;
    },
    [adoptAppealContext, crmGateRetryError, hydrateFrozenSubmitScope, param.mode, resolveCrmWriteForBranch],
  );

  const persistOrdinaryAppealBinding = useCallback(
    (userId: string, idempotencyKey: string): boolean => {
      const binding = adoptedBindingRef.current;
      const ctx = contextRef.current;
      if (!binding || crmWriteCapable !== true || ctx.status !== "ready") {
        return false;
      }
      const saved = saveScannerOrdinaryAppealBinding({
        v: 1,
        userId,
        idempotencyKey,
        appealId: binding.appealId,
        certCode: binding.certCode,
        branchId: binding.branchKey,
        revision: revisionRef.current,
      });
      if (saved) {
        hydrateFrozenSubmitScope({
          v: 1,
          userId,
          idempotencyKey,
          appealId: binding.appealId,
          certCode: binding.certCode,
          branchId: binding.branchKey,
          revision: revisionRef.current,
        });
      }
      return saved;
    },
    [crmWriteCapable, hydrateFrozenSubmitScope],
  );

  const discardOrdinarySession = useCallback(() => {
    certEntryGen.current += 1;
    adoptedBindingRef.current = null;
    setAdoptedAppealId(null);
    setCertEntryError("");
    setCertEntryPending(false);
    setCrmReadOnlyNotice("");
    setCrmGateRetryError("");
    setLegacyUncertainRestore(false);
    setCrmWriteCapable(null);
    crmEntryGateRef.current = null;
    crmCapableByBranchRef.current.clear();
    gateResolveGen.current += 1;
    resetLinkState();
    if (param.mode === "none") {
      setContext({ status: "idle" });
      scopeRef.current = null;
    }
  }, [param.mode, resetLinkState]);

  const freezeSubmitScopeOnce = useCallback((idempotencyKey: string) => {
    if (!scopeRef.current) {
      return;
    }
    if (frozenSubmitByKeyRef.current.has(idempotencyKey)) {
      return;
    }
    const ctx = contextRef.current;
    if (ctx.status !== "ready" || ctx.appealId !== scopeRef.current || ctx.orderAlreadyLinked) {
      return;
    }
    const frozen: FrozenSubmitScope = {
      appealId: ctx.appealId,
      revision: revisionRef.current,
      loadGen: loadGen.current,
      idempotencyKey,
    };
    frozenSubmitByKeyRef.current.set(idempotencyKey, frozen);
    activeSubmitScopeRef.current = frozen;
  }, []);

  const prepareOrderAttemptScope = useCallback(
    (idempotencyKey: string, wasRetry: boolean, retryCtx?: PrepareOrderAttemptScopeOpts) => {
      if (!scopeRef.current) {
        return;
      }
      if (!wasRetry) {
        freezeSubmitScopeOnce(idempotencyKey);
        return;
      }
      let frozen = frozenSubmitByKeyRef.current.get(idempotencyKey);
      if (!frozen && retryCtx) {
        const branchKey = retryCtx.branchId?.trim() ?? "";
        const persisted = loadScannerOrdinaryAppealBinding(
          retryCtx.userId,
          idempotencyKey,
          retryCtx.certCode,
          branchKey,
        );
        if (persisted) {
          hydrateFrozenSubmitScope(persisted);
          frozen = frozenSubmitByKeyRef.current.get(idempotencyKey);
        }
      }
      if (!frozen) {
        activeSubmitScopeRef.current = null;
        return;
      }
      if (scopeRef.current !== frozen.appealId) {
        activeSubmitScopeRef.current = null;
        return;
      }
      activeSubmitScopeRef.current = frozen;
    },
    [freezeSubmitScopeOnce, hydrateFrozenSubmitScope],
  );

  const assertPreviewAllowed = useCallback((preview: OrderPreviewAllowed): string | null => {
    if (!scopeRef.current) {
      return null;
    }
    const ctx = contextRef.current;
    if (ctx.status !== "ready") {
      return "Контекст обращения ещё загружается.";
    }
    if (ctx.orderAlreadyLinked) {
      return "К обращению уже привязан заказ. Новую покупку оформить нельзя.";
    }
    if (!receivingCertificateMatchesPreview(ctx.certificateId, preview)) {
      return "Документ не совпадает с сертификатом обращения. Отсканируйте код привязанного сертификата.";
    }
    return null;
  }, []);

  const beginOrderLinkAfterSuccess = useCallback((orderId: string, idempotencyKey: string) => {
    if (!scopeRef.current) {
      return;
    }
    const frozen = frozenSubmitByKeyRef.current.get(idempotencyKey);
    if (!frozen) {
      setLinkPhase("failed");
      setLinkError(LINK_SCOPE_LOST_MESSAGE);
      return;
    }
    if (scopeRef.current !== frozen.appealId) {
      setLinkPhase("failed");
      setLinkError(LINK_SCOPE_LOST_MESSAGE);
      return;
    }
    const ctx = contextRef.current;
    if (ctx.status !== "ready" || ctx.appealId !== frozen.appealId || ctx.orderAlreadyLinked) {
      setLinkPhase("failed");
      setLinkError(LINK_SCOPE_LOST_MESSAGE);
      return;
    }
    linkScopeRef.current = {
      appealId: frozen.appealId,
      orderId,
      revision: frozen.revision,
      linkGen: linkGen.current,
    };
    setPendingOrderId(orderId);
    setLinkPhase("pending");
    setLinkError("");
  }, []);

  const runOrderLink = useCallback(async (orderId: string): Promise<ReceivingAppealOrderLinkResult> => {
    const scope = linkScopeRef.current;
    if (!scope || scope.orderId !== orderId) {
      return { ok: false, code: "ERROR", message: "Контекст привязки устарел." };
    }
    if (scopeRef.current !== scope.appealId) {
      return { ok: false, code: "ERROR", message: "Обращение сменилось — привязка отменена." };
    }
    if (linkInFlight.current) {
      return { ok: false, code: "ERROR", message: "Привязка уже выполняется." };
    }
    const appealId = scope.appealId;
    const gen = ++linkGen.current;
    linkInFlight.current = true;
    setLinkPhase("linking");
    setLinkError("");

    try {
      const result = await postReceivingAppealOrderLink(appealId, {
        orderId,
        expectedRevision: scope.revision,
      });
      if (gen !== linkGen.current || scopeRef.current !== appealId) {
        return result;
      }
      if (result.ok) {
        revisionRef.current = result.data.revision;
        setLinkedOrderId(result.data.orderId);
        setLinkPhase("linked");
        setLinkError("");
        const loadGenAtStart = loadGen.current;
        const next = await loadReceivingAppealScannerContext(appealId);
        if (loadGenAtStart === loadGen.current && scopeRef.current === appealId && next.status === "ready") {
          setContext(next);
          revisionRef.current = next.revision;
        }
        return result;
      }
      if (result.code === "CONFLICT") {
        setLinkPhase("conflict");
        setLinkError(result.message);
      } else {
        setLinkPhase("failed");
        setLinkError(result.message);
      }
      return result;
    } finally {
      if (gen === linkGen.current) {
        linkInFlight.current = false;
      }
    }
  }, []);

  useEffect(() => {
    if (linkPhase !== "pending" || !pendingOrderId) {
      return;
    }
    const scope = linkScopeRef.current;
    if (!scope || scope.orderId !== pendingOrderId || scope.linkGen !== linkGen.current) {
      return;
    }
    void runOrderLink(pendingOrderId);
  }, [linkPhase, pendingOrderId, runOrderLink]);

  const retryOrderLinkOnly = useCallback(() => {
    if (linkInFlight.current) {
      return;
    }
    const scope = linkScopeRef.current;
    const orderId = scope?.orderId ?? pendingOrderId ?? linkedOrderId;
    if (!orderId || !scopeRef.current) {
      return;
    }
    const ctx = contextRef.current;
    if (ctx.status !== "ready" || ctx.appealId !== scopeRef.current) {
      return;
    }
    if (!scope || scope.appealId !== scopeRef.current) {
      return;
    }
    linkScopeRef.current = {
      appealId: scope.appealId,
      orderId,
      revision: scope.revision,
      linkGen: linkGen.current,
    };
    setPendingOrderId(orderId);
    setLinkPhase("pending");
  }, [linkedOrderId, pendingOrderId]);

  const appealScoped = param.mode === "scoped" || Boolean(adoptedAppealId);
  const appealInvalid = param.mode === "invalid";
  const allowsNewStoreOrder =
    !appealScoped || (context.status === "ready" && !context.orderAlreadyLinked);
  const requiresAppealReady = appealScoped && context.status !== "ready";
  const blocksOrdinaryCheckout =
    ordinaryAppealRequired &&
    (Boolean(crmGateRetryError) ||
      (ordinaryAppealIntegrationRequired &&
        (certEntryPending || !adoptedAppealId || context.status !== "ready")));
  const certificatePrefillCode = context.status === "ready" ? context.certificatePrefillCode : null;

  return useMemo(
    () => ({
      param,
      appealId: effectiveAppealId,
      appealScoped,
      appealInvalid,
      ordinaryAppealRequired,
      blocksOrdinaryCheckout,
      ordinaryAppealIntegrationRequired,
      crmWriteCapable,
      allowsNewStoreOrder,
      requiresAppealReady,
      certEntryError,
      certEntryPending,
      crmReadOnlyNotice,
      crmGateRetryError,
      certificatePrefillCode,
      context,
      linkPhase,
      linkError,
      ensureOrdinaryAppealContext,
      restoreOrdinaryAppealForStoredAttempt,
      persistOrdinaryAppealBinding,
      discardOrdinarySession,
      freezeSubmitScopeOnce,
      prepareOrderAttemptScope,
      assertPreviewAllowed,
      beginOrderLinkAfterSuccess,
      retryOrderLinkOnly,
    }),
    [
      appealInvalid,
      appealScoped,
      allowsNewStoreOrder,
      assertPreviewAllowed,
      beginOrderLinkAfterSuccess,
      blocksOrdinaryCheckout,
      certEntryError,
      certEntryPending,
      certificatePrefillCode,
      context,
      crmGateRetryError,
      crmReadOnlyNotice,
      discardOrdinarySession,
      effectiveAppealId,
      ensureOrdinaryAppealContext,
      freezeSubmitScopeOnce,
      linkError,
      linkPhase,
      crmWriteCapable,
      ordinaryAppealIntegrationRequired,
      ordinaryAppealRequired,
      param,
      persistOrdinaryAppealBinding,
      prepareOrderAttemptScope,
      requiresAppealReady,
      restoreOrdinaryAppealForStoredAttempt,
      retryOrderLinkOnly,
    ],
  );
}