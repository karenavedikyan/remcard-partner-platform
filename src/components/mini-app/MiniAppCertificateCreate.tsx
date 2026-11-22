"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RemcardApiError, remcardFetch } from "@/lib/api-client";
import type {
  AvailablePartner,
  AvailablePartnersResponse,
  CreateCertificateBody,
  StoreCertificate,
} from "@/lib/certificate-types";
import { buildCreateCertificatePayload } from "@/lib/certificate-percent";
import {
  hashAgentCreatePayload,
  resolveCreateIdempotencySession,
  type CreateIdempotencySession,
} from "@/lib/agent-r03/create-idempotency";
import { miniAppCreateCertificate, miniAppFetchCertificateOptions } from "@/lib/mini-app/api";
import type { MiniAppBootstrap, MiniAppPlatform } from "@/lib/mini-app/types";
import styles from "./mini-app.module.css";

type ProgramOption = {
  key: string;
  label: string;
  partner: AvailablePartner;
};

type ClientOption = { id: string; label: string };

export type MiniAppFixtureCreateSeed = {
  programLabel: string;
  clientLabel: string;
};

type Props = {
  platform: MiniAppPlatform;
  bootstrap: MiniAppBootstrap;
  branchId: string | null;
  onCreated: (cert: StoreCertificate) => void;
  /** Dev fixture flows only — shows static program/client, submit does not call PROF. */
  fixtureCreateSeed?: MiniAppFixtureCreateSeed;
  fixtureSubmitCertificate?: StoreCertificate;
};

function partnerPrograms(partners: AvailablePartner[]): ProgramOption[] {
  return partners
    .filter(
      (p) =>
        p.programReady !== false &&
        p.categories.some((c) => c.issuable !== false),
    )
    .map((p) => {
      const cat = p.categories.find((c) => c.issuable !== false) ?? p.categories[0];
      const programLabel = cat?.categoryLabel?.trim() || p.storeName;
      return {
        key: `${p.storeUserId}::${p.partnershipId ?? "self"}`,
        label: programLabel,
        partner: p,
      };
    });
}

export function MiniAppCertificateCreate({
  platform,
  bootstrap,
  branchId,
  onCreated,
  fixtureCreateSeed,
  fixtureSubmitCertificate,
}: Props) {
  const [loadState, setLoadState] = useState<"loading" | "ready" | "blocked">("loading");
  const [blockMessage, setBlockMessage] = useState("");
  const [programs, setPrograms] = useState<ProgramOption[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [programKey, setProgramKey] = useState("");
  const [clientId, setClientId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const idempotencyRef = useRef<CreateIdempotencySession | null>(null);

  const [needsClient, setNeedsClient] = useState(
    bootstrap.role === "agent" || bootstrap.role === "specialist",
  );
  const [needsBranch, setNeedsBranch] = useState(
    (bootstrap.role === "store" || bootstrap.role === "company") && bootstrap.branches.length > 0,
  );

  const load = useCallback(async () => {
    setLoadState("loading");
    setBlockMessage("");
    if (fixtureCreateSeed) {
      const partnerStub: AvailablePartner = {
        storeUserId: "fixture-store",
        storeName: "RemCard Showcase",
        partnershipId: "fixture-ps",
        isSelfScan: false,
        city: null,
        programReady: true,
        categories: [
          {
            category: "doors",
            categoryLabel: fixtureCreateSeed.programLabel,
            discountPercent: 10,
            issuerPercent: 3,
            issuable: true,
          },
        ],
      };
      const option: ProgramOption = {
        key: "fixture-program",
        label: fixtureCreateSeed.programLabel,
        partner: partnerStub,
      };
      setPrograms([option]);
      setProgramKey(option.key);
      setClients([{ id: "fixture-client", label: fixtureCreateSeed.clientLabel }]);
      setClientId("fixture-client");
      setLoadState("ready");
      return;
    }
    try {
      const partnersPayload = await miniAppFetchCertificateOptions(platform, branchId);
      if (partnersPayload.miniOptionsBlocked) {
        setBlockMessage(partnersPayload.miniOptionsBlocked);
        setLoadState("blocked");
        return;
      }
      setNeedsClient(partnersPayload.needsClient);
      setNeedsBranch(partnersPayload.needsBranch);
      if (partnersPayload.certificateRecommendationIssuerReady === false) {
        const missing = partnersPayload.certificateRecommendationIssuerMissing ?? [];
        setBlockMessage(
          missing.length
            ? missing.map((m) => m.message).join(" ")
            : "Профиль выпускающего не готов. Завершите настройку в полном кабинете.",
        );
        setLoadState("blocked");
        return;
      }
      const rows = [...(partnersPayload.partners ?? [])];
      if (partnersPayload.selfScanPartner) rows.push(partnersPayload.selfScanPartner);
      const options = partnerPrograms(rows);
      if (!options.length) {
        setBlockMessage("Нет доступных программ для выпуска. Добавьте партнёрство в полном кабинете.");
        setLoadState("blocked");
        return;
      }
      setPrograms(options);
      setProgramKey(options[0].key);

      if (partnersPayload.needsClient) {
        const clientRows: ClientOption[] = (partnersPayload.miniClients ?? []).map((c) => ({
          id: c.id,
          label: c.displayName?.trim() || "Клиент",
        }));
        if (!clientRows.length) {
          setBlockMessage("Нет клиентов для выпуска. Добавьте клиента в кабинете PROF.");
          setLoadState("blocked");
          return;
        }
        setClients(clientRows);
        setClientId(clientRows[0].id);
      }

      if (partnersPayload.needsBranch && !branchId) {
        setBlockMessage("Выберите филиал выпуска на главном экране.");
        setLoadState("blocked");
        return;
      }

      setLoadState("ready");
    } catch (err) {
      setBlockMessage(
        err instanceof RemcardApiError
          ? err.message
          : "Не удалось загрузить данные для выпуска. Проверьте подключение к PROF.",
      );
      setLoadState("blocked");
    }
  }, [branchId, fixtureCreateSeed, needsBranch, needsClient, platform]);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedProgram = useMemo(
    () => programs.find((p) => p.key === programKey) ?? null,
    [programs, programKey],
  );

  async function submit() {
    if (fixtureCreateSeed && fixtureSubmitCertificate) {
      onCreated(fixtureSubmitCertificate);
      return;
    }
    if (!selectedProgram) return;
    if (needsClient && !clientId) {
      setSubmitError("Выберите клиента");
      return;
    }
    setSubmitting(true);
    setSubmitError("");
    try {
      const payloadResult = buildCreateCertificatePayload({
        selectedPartners: [selectedProgram.partner],
        discountDrafts: {},
        maxUsages: 0,
      });
      if (!payloadResult.ok) {
        setSubmitError(
          payloadResult.formError ??
            "Сервер не смог собрать условия программы. Уточните партнёрство в полном кабинете.",
        );
        return;
      }
      const body: CreateCertificateBody & { agentClientId?: string; branchId?: string } = {
        ...payloadResult.body,
        ...(needsClient ? { agentClientId: clientId } : {}),
        ...(branchId && needsBranch ? { branchId } : {}),
      };
      const payloadHash = hashAgentCreatePayload(body);
      const session = resolveCreateIdempotencySession(idempotencyRef.current, payloadHash);
      idempotencyRef.current = session;
      const cert = await miniAppCreateCertificate(platform, body, session.key);
      idempotencyRef.current = null;
      onCreated(cert);
    } catch (err) {
      if (err instanceof RemcardApiError) {
        const code =
          err.body && typeof err.body === "object"
            ? (err.body as { code?: string }).code
            : undefined;
        if (err.status === 422 && code === "MINI_LIMIT_EXCEEDED") {
          setSubmitError(
            err.message ||
              "Превышен лимит пула % для выбранного филиала. Уменьшите условия программы или смените точку.",
          );
        } else {
          setSubmitError(err.message);
        }
      } else {
        setSubmitError("Не удалось выпустить сертификат");
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (loadState === "loading") {
    return <p className={styles.scanNotice}>Загрузка программ…</p>;
  }

  if (loadState === "blocked") {
    return (
      <div className={styles.blockedPanel} role="alert">
        <p>{blockMessage}</p>
      </div>
    );
  }

  return (
    <div className={styles.miniCreateForm} data-testid="mini-create-form">
      <label className={styles.miniField}>
        <span className={styles.miniFieldLabel}>Программа</span>
        <select
          className={styles.miniSelect}
          value={programKey}
          onChange={(e) => setProgramKey(e.target.value)}
        >
          {programs.map((p) => (
            <option key={p.key} value={p.key}>
              {p.label}
            </option>
          ))}
        </select>
      </label>
      {needsClient ? (
        <label className={styles.miniField}>
          <span className={styles.miniFieldLabel}>Клиент</span>
          <select
            className={styles.miniSelect}
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
          >
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {submitError ? (
        <p className={styles.scanBad} role="alert">
          {submitError}
        </p>
      ) : null}
      <button
        type="button"
        className={styles.primaryBtn}
        disabled={submitting}
        data-testid="mini-create-submit"
        onClick={() => void submit()}
      >
        {submitting ? "Выпуск…" : "Выпустить сертификат"}
      </button>
    </div>
  );
}