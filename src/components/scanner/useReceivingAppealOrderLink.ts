"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  loadReceivingAppealScannerContext,
  previewCertificateMatchesAppeal,
  type ReceivingAppealScannerWire,
} from "@/lib/clients-parity/receiving-appeal-scanner-context";
import { postReceivingAppealOrderLink } from "@/lib/clients-parity/receiving-order-link-client";

export function useReceivingAppealOrderLink(receivingAppealId: string | null | undefined) {
  const [appealWire, setAppealWire] = useState<ReceivingAppealScannerWire | null>(null);
  const [appealLoadError, setAppealLoadError] = useState<string | null>(null);
  const [linking, setLinking] = useState(false);
  const [linked, setLinked] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const lastOrderIdRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const id = receivingAppealId?.trim();
    if (!id) {
      setAppealWire(null);
      setAppealLoadError(null);
      return;
    }
    void loadReceivingAppealScannerContext(id).then((res) => {
      if (cancelled) return;
      if (!res.ok) {
        setAppealWire(null);
        setAppealLoadError(res.message);
        return;
      }
      setAppealWire(res.wire);
      setAppealLoadError(null);
      if (res.wire.purchaseOrderId) {
        setLinked(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [receivingAppealId]);

  const assertPreviewAllowed = useCallback(
    (previewCertificateId: string | undefined) => {
      if (!appealWire?.certificateId) return true;
      return previewCertificateMatchesAppeal(appealWire.certificateId, previewCertificateId);
    },
    [appealWire],
  );

  const linkAfterOrderSuccess = useCallback(
    async (orderId: string) => {
      if (!appealWire || linked) return;
      lastOrderIdRef.current = orderId;
      setLinking(true);
      setLinkError(null);
      const res = await postReceivingAppealOrderLink(appealWire.appealId, {
        orderId,
        expectedRevision: appealWire.revision,
      });
      setLinking(false);
      if (res.ok) {
        setLinked(true);
        setAppealWire((prev) =>
          prev ? { ...prev, revision: res.data.revision, purchaseOrderId: orderId } : prev,
        );
        return;
      }
      setLinkError(res.message);
    },
    [appealWire, linked],
  );

  const retryLinkOnly = useCallback(async () => {
    const orderId = lastOrderIdRef.current;
    if (!appealWire || !orderId) return;
    await linkAfterOrderSuccess(orderId);
  }, [appealWire, linkAfterOrderSuccess]);

  return {
    appealWire,
    appealLoadError,
    linking,
    linked,
    linkError,
    assertPreviewAllowed,
    linkAfterOrderSuccess,
    retryLinkOnly,
  };
}
