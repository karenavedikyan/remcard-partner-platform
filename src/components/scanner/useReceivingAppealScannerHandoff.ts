"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  postReceivingAppealOrderLink,
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

export function useReceivingAppealScannerHandoff(input: ScannerAppealParam | string | null | undefined) {
  const paramSignature = scannerAppealInputSignature(input);
  const param = useMemo(() => resolveParam(input), [paramSignature]);
  const scopedAppealId = param.mode === "scoped" ? param.appealId : null;

  const [context, setContext] = useState<ReceivingAppealScannerContext>(() => initialContext(param));
  const loadGen = useRef(0);
  const linkGen = useRef(0);
  const linkInFlight = useRef(false);
  const scopeRef = useRef<string | null>(scopedAppealId);
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
    scopeRef.current = scopedAppealId;
    resetLinkState();
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
  }, [paramSignature, resetLinkState, scopedAppealId]);

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

  const appealScoped = param.mode === "scoped";
  const appealInvalid = param.mode === "invalid";
  const allowsNewStoreOrder =
    !appealScoped || (context.status === "ready" && !context.orderAlreadyLinked);
  const requiresAppealReady = appealScoped && context.status !== "ready";
  const certificatePrefillCode = context.status === "ready" ? context.certificatePrefillCode : null;

  return useMemo(
    () => ({
      param,
      appealId: scopedAppealId,
      appealScoped,
      appealInvalid,
      allowsNewStoreOrder,
      requiresAppealReady,
      certificatePrefillCode,
      context,
      linkPhase,
      linkError,
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
      certificatePrefillCode,
      context,
      freezeSubmitScopeOnce,
      linkError,
      linkPhase,
      param,
      prepareOrderAttemptScope,
      requiresAppealReady,
      retryOrderLinkOnly,
      scopedAppealId,
    ],
  );
}
