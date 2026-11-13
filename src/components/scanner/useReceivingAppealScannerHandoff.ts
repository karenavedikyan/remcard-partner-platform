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

function initialContext(param: ScannerAppealParam): ReceivingAppealScannerContext {
  if (param.mode === "invalid") {
    return { status: "invalid_param", message: "Некорректный идентификатор обращения в URL." };
  }
  if (param.mode === "scoped") {
    return { status: "loading", appealId: param.appealId };
  }
  return { status: "idle" };
}

export function useReceivingAppealScannerHandoff(appealIdParam: string | null | undefined) {
  const param = useMemo(() => parseScannerAppealParam(appealIdParam), [appealIdParam]);
  const scopedAppealId = param.mode === "scoped" ? param.appealId : null;

  const [context, setContext] = useState<ReceivingAppealScannerContext>(() => initialContext(param));
  const loadGen = useRef(0);
  const linkGen = useRef(0);
  const linkInFlight = useRef(false);
  const scopeRef = useRef<string | null>(scopedAppealId);
  const revisionRef = useRef(0);
  const contextRef = useRef(context);
  contextRef.current = context;

  const [linkPhase, setLinkPhase] = useState<ReceivingAppealLinkPhase>("idle");
  const [linkError, setLinkError] = useState("");
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);
  const [linkedOrderId, setLinkedOrderId] = useState<string | null>(null);
  const linkScopeRef = useRef<{ appealId: string; orderId: string; revision: number } | null>(null);

  const resetLinkState = useCallback(() => {
    linkGen.current += 1;
    linkInFlight.current = false;
    linkScopeRef.current = null;
    setLinkPhase("idle");
    setLinkError("");
    setPendingOrderId(null);
    setLinkedOrderId(null);
    revisionRef.current = 0;
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
    };
  }, [param, resetLinkState, scopedAppealId]);

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

  const beginOrderLinkAfterSuccess = useCallback(
    (orderId: string) => {
      const ctx = contextRef.current;
      if (ctx.status !== "ready" || ctx.orderAlreadyLinked) {
        return;
      }
      const appealId = ctx.appealId;
      if (scopeRef.current !== appealId) {
        return;
      }
      linkScopeRef.current = {
        appealId,
        orderId,
        revision: revisionRef.current,
      };
      setPendingOrderId(orderId);
      setLinkPhase("pending");
      setLinkError("");
    },
    [],
  );

  const runOrderLink = useCallback(
    async (orderId: string): Promise<ReceivingAppealOrderLinkResult> => {
      const scope = linkScopeRef.current;
      const ctx = contextRef.current;
      if (ctx.status !== "ready" || !scope || scope.orderId !== orderId || scope.appealId !== ctx.appealId) {
        return { ok: false, code: "ERROR", message: "Контекст привязки устарел." };
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
          if (loadGenAtStart === loadGen.current && scopeRef.current === appealId) {
            setContext(next);
            if (next.status === "ready") {
              revisionRef.current = next.revision;
            }
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
    },
    [],
  );

  useEffect(() => {
    if (linkPhase !== "pending" || !pendingOrderId) {
      return;
    }
    const scope = linkScopeRef.current;
    if (!scope || scope.orderId !== pendingOrderId) {
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
    const ctx = contextRef.current;
    if (!orderId || ctx.status !== "ready") {
      return;
    }
    if (scope && scope.appealId !== ctx.appealId) {
      return;
    }
    linkScopeRef.current = {
      appealId: ctx.appealId,
      orderId,
      revision: revisionRef.current,
    };
    setPendingOrderId(orderId);
    setLinkPhase("pending");
  }, [linkedOrderId, pendingOrderId]);

  const appealScoped = param.mode === "scoped";
  const appealInvalid = param.mode === "invalid";
  const allowsNewStoreOrder =
    !appealScoped ||
    (context.status === "ready" && !context.orderAlreadyLinked);
  const requiresAppealReady = appealScoped && context.status !== "ready";
  const certificatePrefillCode =
    context.status === "ready" ? context.certificatePrefillCode : null;

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
      linkError,
      linkPhase,
      param,
      requiresAppealReady,
      retryOrderLinkOnly,
      scopedAppealId,
    ],
  );
}
