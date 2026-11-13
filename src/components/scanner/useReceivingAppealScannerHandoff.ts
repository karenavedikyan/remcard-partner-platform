"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  postReceivingAppealOrderLink,
  type ReceivingAppealOrderLinkResult,
} from "@/lib/clients-parity/receiving-appeals-api";
import {
  loadReceivingAppealScannerContext,
  parseScannerAppealId,
  receivingCertificateMatchesPreview,
  type ReceivingAppealScannerContext,
} from "@/lib/scanner/receiving-appeal-handoff";
import type { OrderPreviewAllowed } from "@/lib/order-types";

export type ReceivingAppealLinkPhase =
  | "idle"
  | "pending"
  | "linking"
  | "linked"
  | "failed"
  | "conflict";

export function useReceivingAppealScannerHandoff(appealIdParam: string | null) {
  const appealId = parseScannerAppealId(appealIdParam);
  const [context, setContext] = useState<ReceivingAppealScannerContext>(
    appealId ? { status: "loading", appealId } : { status: "idle" },
  );
  const loadGen = useRef(0);
  const [linkPhase, setLinkPhase] = useState<ReceivingAppealLinkPhase>("idle");
  const [linkError, setLinkError] = useState("");
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);
  const [linkedOrderId, setLinkedOrderId] = useState<string | null>(null);
  const revisionRef = useRef(0);

  const reloadContext = useCallback(async () => {
    if (!appealId) {
      setContext({ status: "idle" });
      return;
    }
    const gen = ++loadGen.current;
    setContext({ status: "loading", appealId });
    const next = await loadReceivingAppealScannerContext(appealId);
    if (gen !== loadGen.current) return;
    setContext(next);
    if (next.status === "ready") {
      revisionRef.current = next.revision;
    }
  }, [appealId]);

  useEffect(() => {
    void reloadContext();
  }, [reloadContext]);

  const assertPreviewAllowed = useCallback(
    (preview: OrderPreviewAllowed): string | null => {
      if (context.status !== "ready") return null;
      if (!receivingCertificateMatchesPreview(context.certificateId, preview)) {
        return "Документ не совпадает с сертификатом обращения. Отсканируйте код привязанного сертификата.";
      }
      return null;
    },
    [context],
  );

  const beginOrderLinkAfterSuccess = useCallback(
    (orderId: string) => {
      if (context.status !== "ready") return;
      setPendingOrderId(orderId);
      setLinkPhase("pending");
      setLinkError("");
    },
    [context],
  );

  const runOrderLink = useCallback(
    async (orderId: string): Promise<ReceivingAppealOrderLinkResult> => {
      if (context.status !== "ready") {
        return { ok: false, code: "ERROR", message: "Нет контекста обращения." };
      }
      setLinkPhase("linking");
      setLinkError("");
      const result = await postReceivingAppealOrderLink(context.appealId, {
        orderId,
        expectedRevision: revisionRef.current,
      });
      if (result.ok) {
        revisionRef.current = result.data.revision;
        setLinkedOrderId(result.data.orderId);
        setLinkPhase("linked");
        setLinkError("");
        await reloadContext();
        return result;
      }
      if (result.code === "CONFLICT") {
        setLinkPhase("conflict");
        setLinkError(result.message);
        await reloadContext();
        return result;
      }
      setLinkPhase("failed");
      setLinkError(result.message);
      return result;
    },
    [context, reloadContext],
  );

  useEffect(() => {
    if (linkPhase !== "pending" || !pendingOrderId) return;
    void runOrderLink(pendingOrderId);
  }, [linkPhase, pendingOrderId, runOrderLink]);

  const retryOrderLinkOnly = useCallback(() => {
    if (!pendingOrderId && !linkedOrderId) return;
    const orderId = pendingOrderId ?? linkedOrderId;
    if (!orderId) return;
    setPendingOrderId(orderId);
    setLinkPhase("pending");
  }, [linkedOrderId, pendingOrderId]);

  return {
    appealId,
    context,
    linkPhase,
    linkError,
    pendingOrderId,
    linkedOrderId,
    assertPreviewAllowed,
    beginOrderLinkAfterSuccess,
    retryOrderLinkOnly,
    reloadContext,
  };
}
