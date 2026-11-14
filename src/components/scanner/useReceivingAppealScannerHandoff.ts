"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  postReceivingAppealOrderLink,
  submitReceivingCertificateEntry,
  type ReceivingAppealOrderLinkResult,
} from "@/lib/clients-parity/receiving-appeals-api";
import {
  loadReceivingAppealScannerContext,
  parseScannerAppealParam,
  receivingCertificateMatchesPreview,
  scannerAppealInputSignature,
  type ReceivingAppealScannerContext,
  type ScannerAppealParam,
} from "@/lib/scanner/receiving-appeal-handoff";
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

export type EnsureOrdinaryAppealArgs = {
  promoCode: string;
  branchId?: string;
  previewRequestId: number;
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

  const effectiveAppealId = urlAppealId ?? adoptedAppealId;
  const ordinaryAppealRequired = param.mode === "none";

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

  useEffect(() => {
    adoptedBindingRef.current = null;
    setAdoptedAppealId(null);
    setCertEntryError("");
    setCertEntryPending(false);
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
    };
  }, [paramSignature, param, resetLinkState]);

  const ensureOrdinaryAppealContext = useCallback(
    async (args: EnsureOrdinaryAppealArgs): Promise<{ ok: true } | { ok: false; message: string }> => {
      if (param.mode === "scoped") {
        return { ok: true };
      }
      if (param.mode === "invalid") {
        return { ok: false, message: "Некорректный идентификатор обращения в URL." };
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

      const entry = await submitReceivingCertificateEntry(
        { promoCode: args.promoCode },
        undefined,
        { branchId: args.branchId, scannerAuthorizeStoreScan: true },
      );

      if (args.isStale() || gen !== certEntryGen.current) {
        setCertEntryPending(false);
        return { ok: false, message: "Проверка сертификата отменена." };
      }
      setCertEntryPending(false);

      if (!entry.ok) {
        setCertEntryError(entry.message);
        if (!binding || binding.certCode !== args.promoCode || binding.branchKey !== branchKey) {
          adoptedBindingRef.current = null;
          setAdoptedAppealId(null);
          setContext({ status: "idle" });
        }
        return { ok: false, message: entry.message };
      }

      adoptedBindingRef.current = {
        appealId: entry.appealId,
        certCode: args.promoCode,
        branchKey,
      };
      scopeRef.current = entry.appealId;
      setAdoptedAppealId(entry.appealId);
      setCertEntryError("");

      const detailGen = ++loadGen.current;
      setContext({ status: "loading", appealId: entry.appealId });
      const next = await loadReceivingAppealScannerContext(entry.appealId);
      if (args.isStale() || gen !== certEntryGen.current || detailGen !== loadGen.current) {
        return { ok: false, message: "Контекст обращения устарел." };
      }
      if (scopeRef.current !== entry.appealId && adoptedBindingRef.current?.appealId !== entry.appealId) {
        return { ok: false, message: "Контекст обращения устарел." };
      }
      setContext(next);
      if (next.status === "ready") {
        revisionRef.current = next.revision;
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
    [param.mode],
  );

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

  const prepareOrderAttemptScope = useCallback((idempotencyKey: string, wasRetry: boolean) => {
    if (!scopeRef.current) {
      return;
    }
    if (!wasRetry) {
      freezeSubmitScopeOnce(idempotencyKey);
      return;
    }
    const frozen = frozenSubmitByKeyRef.current.get(idempotencyKey);
    if (!frozen) {
      activeSubmitScopeRef.current = null;
      return;
    }
    if (scopeRef.current !== frozen.appealId) {
      activeSubmitScopeRef.current = null;
      return;
    }
    activeSubmitScopeRef.current = frozen;
  }, [freezeSubmitScopeOnce]);

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
    (!adoptedAppealId || context.status !== "ready" || certEntryPending);
  const certificatePrefillCode = context.status === "ready" ? context.certificatePrefillCode : null;

  return useMemo(
    () => ({
      param,
      appealId: effectiveAppealId,
      appealScoped,
      appealInvalid,
      ordinaryAppealRequired,
      blocksOrdinaryCheckout,
      allowsNewStoreOrder,
      requiresAppealReady,
      certEntryError,
      certEntryPending,
      certificatePrefillCode,
      context,
      linkPhase,
      linkError,
      ensureOrdinaryAppealContext,
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
      effectiveAppealId,
      ensureOrdinaryAppealContext,
      freezeSubmitScopeOnce,
      linkError,
      linkPhase,
      ordinaryAppealRequired,
      param,
      prepareOrderAttemptScope,
      requiresAppealReady,
      retryOrderLinkOnly,
    ],
  );
}