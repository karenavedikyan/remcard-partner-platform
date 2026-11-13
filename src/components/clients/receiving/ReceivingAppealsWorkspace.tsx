"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createReceivingAppeal,
  fetchReceivingAppealsWorkspace,
  isReceivingAppealsProxyReady,
  isReceivingCertificateEntryProxyReady,
  submitReceivingCertificateEntry,
  RECEIVING_ACCESS_LIST_ONLY_DENIAL,
  RECEIVING_EMPTY_SETTINGS,
  receivingAppealsMutationsAllowed,
  type ReceivingAppealsListResponse,
  type ReceivingAppealsLoadResult,
} from "@/lib/clients-parity/receiving-appeals-api";
import { ReceivingAppealsBlocked } from "@/components/clients/direction/ReceivingAppealsBlocked";
import { ReceivingAppealForm } from "./ReceivingAppealForm";
import { ReceivingAppealsList } from "./ReceivingAppealsList";
import { ReceivingCertificateScan } from "./ReceivingCertificateScan";
import { WorkingStagesEditor } from "./WorkingStagesEditor";
import styles from "./receiving.module.css";

type LoadPhase = "loading" | "blocked" | "ready" | "error";
type ReceivingView = "list" | "manual" | "settings" | "scan" | "detail";

type Props = {
  /** Root/tests only — never wire mock data in production paths. */
  previewData?: ReceivingAppealsListResponse;
};

export function ReceivingAppealsWorkspace({ previewData }: Props = {}) {
  const [phase, setPhase] = useState<LoadPhase>(previewData ? "ready" : "loading");
  const [blocked, setBlocked] = useState<ReceivingAppealsLoadResult | null>(null);
  const [data, setData] = useState<ReceivingAppealsListResponse | null>(previewData ?? null);
  const [view, setView] = useState<ReceivingView>("list");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [persistNotice, setPersistNotice] = useState<string | null>(null);

  const proxyReady = isReceivingAppealsProxyReady();
  const certEntryReady = isReceivingCertificateEntryProxyReady();

  const reload = useCallback(async () => {
    const res = await fetchReceivingAppealsWorkspace();
    if (!res.ok) {
      setPhase(res.code === "BLOCKED_CONTRACT" ? "blocked" : "error");
      setBlocked(res);
      setData(null);
      return res;
    }
    setPhase("ready");
    setData(res.data);
    setBlocked(null);
    return res;
  }, []);

  useEffect(() => {
    if (previewData) return;
    let cancelled = false;
    void fetchReceivingAppealsWorkspace().then((res) => {
      if (cancelled) return;
      if (!res.ok) {
        setPhase(res.code === "BLOCKED_CONTRACT" ? "blocked" : "error");
        setBlocked(res);
        setData(null);
        return;
      }
      setPhase("ready");
      setData(res.data);
      setBlocked(null);
    });
    return () => {
      cancelled = true;
    };
  }, [previewData]);

  const bulkCallbacks = useMemo(
    () => ({
      selectedIds: selected,
      onToggleRow: (id: string, checked: boolean) => {
        setSelected((prev) => {
          const next = new Set(prev);
          if (checked) next.add(id);
          else next.delete(id);
          return next;
        });
      },
      onToggleSelectAll: (ids: string[], checked: boolean) => {
        setSelected((prev) => {
          const next = new Set(prev);
          for (const id of ids) {
            if (checked) next.add(id);
            else next.delete(id);
          }
          return next;
        });
      },
      onBulkEditOpen: () => setPersistNotice("BLOCKED_PERSISTENCE: bulk edit — P5 + API batch."),
      onBulkArchiveAsk: () => setPersistNotice("BLOCKED_PERSISTENCE: archive — P5 + API batch."),
      onBulkTrashAsk: () => setPersistNotice("BLOCKED_PERSISTENCE: trash — P5 + API batch."),
      onBulkRestoreAsk: () => setPersistNotice("BLOCKED_PERSISTENCE: restore — P5 + API batch."),
      onBulkClear: () => setSelected(new Set()),
    }),
    [selected],
  );

  if (phase === "loading" && !previewData) {
    return <p data-testid="ca-receiving-appeals-loading">Загрузка…</p>;
  }

  if (phase === "blocked" && !previewData) {
    return <ReceivingAppealsBlocked />;
  }

  if (phase === "error" && blocked && !blocked.ok && !previewData) {
    return (
      <section data-testid="ca-receiving-appeals-error" role="alert">
        <p>{blocked.message}</p>
      </section>
    );
  }

  if (!data) {
    return <ReceivingAppealsBlocked />;
  }

  const readOnly = data.readOnly === true;
  const mutationsAllowed = receivingAppealsMutationsAllowed(data);
  const denialMessage =
    data.access?.denialCode ?? RECEIVING_ACCESS_LIST_ONLY_DENIAL;

  if (data.access?.listAllowed === false) {
    return (
      <section data-testid="ca-receiving-list-denied" role="alert">
        <p>{denialMessage}</p>
      </section>
    );
  }

  const mutationDeniedShell = (
    <section className="panel stack" data-testid="ca-receiving-mutation-denied" role="alert">
      <p className="notice">
        Только просмотр: изменять статусы, создавать обращения и настраивать этапы нельзя.
      </p>
      <p className="small muted">{denialMessage}</p>
      <button type="button" className="btn ghost" onClick={() => setView("list")}>
        К списку
      </button>
    </section>
  );

  if ((view === "manual" || view === "settings" || view === "scan") && readOnly) {
    return mutationDeniedShell;
  }

  if (view === "manual") {
    return (
      <ReceivingAppealForm
        disabled={!proxyReady || readOnly}
        persistBlockedMessage="Создание обращения ждёт P1 proxy и K1 handler."
        onCancel={() => setView("list")}
        onSubmit={async (body) => {
          if (!proxyReady || readOnly) return;
          const res = await createReceivingAppeal(body, data);
          if (!res.ok) {
            setPersistNotice(res.message);
            return;
          }
          setView("list");
          await reload();
        }}
      />
    );
  }

  if (view === "settings") {
    return (
      <WorkingStagesEditor
        settings={data.settings ?? RECEIVING_EMPTY_SETTINGS}
        disabled={!proxyReady || readOnly}
        onCancel={() => setView("list")}
        onSave={async () => {
          setPersistNotice("BLOCKED_PERSISTENCE: POST working-stages ждёт K8 storage + K1.");
        }}
      />
    );
  }

  if (view === "scan") {
    return (
      <ReceivingCertificateScan
        disabled={!certEntryReady || readOnly}
        persistBlockedMessage={
          readOnly ? denialMessage
            : "Certificate-entry ждёт K1 route + P1 allowlist (authorizeStoreScan без правки store scan)."
        }
        onCancel={() => setView("list")}
        onSubmit={async (body) => {
          const res = await submitReceivingCertificateEntry(body, data);
          if (!res.ok) {
            throw new Error(res.message);
          }
          setDetailId(res.appealId);
          setView("detail");
          await reload();
        }}
      />
    );
  }

  if (view === "detail" && detailId) {
    return (
      <section className="panel stack" data-testid="ca-receiving-detail-shell">
        <h2>Обращение</h2>
        <p className="muted">
          Детальная карточка <strong>{detailId}</strong> — владелец <strong>P4</strong> (
          `fetchReceivingAppealDetail`).
        </p>
        <button type="button" className="btn ghost" onClick={() => setView("list")}>
          Назад к списку
        </button>
      </section>
    );
  }

  return (
    <>
      {persistNotice ? (
        <div className={styles.receivingNotice} role="status" data-testid="ca-receiving-persist-notice">
          {persistNotice}
          <button type="button" className="btn ghost small-btn" onClick={() => setPersistNotice(null)}>
            Закрыть
          </button>
        </div>
      ) : null}
      <ReceivingAppealsList
        data={data}
        readOnly={readOnly}
        bulk={mutationsAllowed ? bulkCallbacks : undefined}
        onOpenAppeal={(id) => {
          setDetailId(id);
          setView("detail");
        }}
        onNavigateManual={
          mutationsAllowed
            ? () => setView("manual")
            : () =>
                setPersistNotice(denialMessage)
        }
        onNavigateSettings={
          mutationsAllowed
            ? () => setView("settings")
            : () => setPersistNotice(denialMessage)
        }
        onNavigateScan={
          mutationsAllowed
            ? () => setView("scan")
            : () => setPersistNotice(denialMessage)
        }
        onNavigateAnalytics={() =>
          setPersistNotice("Аналитика воронки — страница п.85 после receiving list API.")
        }
      />
    </>
  );
}
