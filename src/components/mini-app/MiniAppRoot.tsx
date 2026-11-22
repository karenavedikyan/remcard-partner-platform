"use client";

import { useCallback, useEffect, useState } from "react";
import type { StoreCertificate } from "@/lib/certificate-types";
import { CertificateCreateForm } from "@/components/recommendations/CertificateCreateForm";
import { MiniAppWalletCard } from "./MiniAppWalletCard";
import { MiniAppScanVerify } from "./MiniAppScanVerify";
import { MiniAppProfBrand } from "./MiniAppProfBrand";
import { MiniAppInvitePartner } from "./MiniAppInvitePartner";
import { MiniAppFullCabinet } from "./MiniAppFullCabinet";
import { MiniAppCertificateReady } from "./MiniAppCertificateReady";
import { MiniAppSubpage } from "./MiniAppSubpage";
import {
  MiniIconCertificate,
  MiniIconChevron,
  MiniIconExternal,
  MiniIconLink,
  MiniIconPin,
  MiniIconScan,
} from "./MiniAppIcons";
import { detectMiniAppHost } from "@/lib/mini-app/host";
import { miniAppExchangeSession, miniAppFetchBootstrap } from "@/lib/mini-app/api";
import type { MiniAppBootstrap, MiniAppPlatform } from "@/lib/mini-app/types";
import styles from "./mini-app.module.css";

type Screen =
  | "home"
  | "create"
  | "scan"
  | "card-info"
  | "invite"
  | "full-cabinet"
  | "certificate-ready"
  | "branch-pick";

type PilotProps = {
  fixtureBootstrap?: MiniAppBootstrap;
  fixturePlatform?: MiniAppPlatform;
};

export function MiniAppRoot({ fixtureBootstrap, fixturePlatform }: PilotProps = {}) {
  const [screen, setScreen] = useState<Screen>("home");
  const [platform, setPlatform] = useState<MiniAppPlatform | null>(fixturePlatform ?? null);
  const [bootstrap, setBootstrap] = useState<MiniAppBootstrap | null>(fixtureBootstrap ?? null);
  const [loading, setLoading] = useState(!fixtureBootstrap);
  const [error, setError] = useState<string | null>(null);
  const [unlinked, setUnlinked] = useState<{ message: string; url: string } | null>(null);
  const [branchId, setBranchId] = useState<string | null>(fixtureBootstrap?.activeBranchId ?? null);
  const [createdCertificate, setCreatedCertificate] = useState<StoreCertificate | null>(null);

  const loadBootstrap = useCallback(
    async (hostPlatform: MiniAppPlatform, activeBranch?: string | null) => {
      const data = await miniAppFetchBootstrap(hostPlatform, activeBranch);
      setBootstrap(data);
      setBranchId(data.activeBranchId);
    },
    [],
  );

  useEffect(() => {
    if (fixtureBootstrap) {
      setLoading(false);
      return;
    }
    const host = detectMiniAppHost();
    if (!host) {
      setLoading(false);
      setError("Откройте мини-кабинет из Telegram или MAX.");
      return;
    }
    host.ready();
    host.expand();
    setPlatform(host.platform);
    void (async () => {
      try {
        const session = await miniAppExchangeSession(host.platform, host.initData);
        if (session.status === "unlinked") {
          setUnlinked({ message: session.message, url: session.profLoginUrl });
          return;
        }
        if (session.status === "error") {
          setError(session.message);
          return;
        }
        if (session.status === "cabinet_blocked") {
          setError("Кабинет ещё не готов. Продолжите на сайте PROF.");
          return;
        }
        if (session.status !== "ok") {
          return;
        }
        await loadBootstrap(host.platform);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Не удалось войти");
      } finally {
        setLoading(false);
      }
    })();
  }, [fixtureBootstrap, loadBootstrap]);

  useEffect(() => {
    const host = detectMiniAppHost();
    if (!host) return;
    const back = () => {
      if (screen !== "home") setScreen("home");
    };
    if (screen !== "home") host.onBack(back);
    else host.offBack(back);
    return () => host.offBack(back);
  }, [screen]);

  async function onBranchChange(id: string) {
    setBranchId(id);
    if (!platform) return;
    setLoading(true);
    try {
      await remcardPatchBranch(id);
      await loadBootstrap(platform, id);
      setScreen("home");
    } catch {
      setError("Не удалось сменить филиал");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className={styles.shell} data-testid="mini-app-loading">
        <p>Загрузка…</p>
      </div>
    );
  }

  if (unlinked) {
    return (
      <div className={styles.shell} data-testid="mini-app-unlinked">
        <MiniAppProfBrand />
        <h1 className={styles.heroTitle}>Аккаунт не подключён</h1>
        <p>{unlinked.message}</p>
        <a className={styles.primaryBtn} href={unlinked.url} target="_blank" rel="noreferrer">
          Войти и привязать
        </a>
      </div>
    );
  }

  if (error || !bootstrap || !platform) {
    return (
      <div className={styles.shell} data-testid="mini-app-error">
        <MiniAppProfBrand />
        <p role="alert">{error ?? "Нет данных"}</p>
      </div>
    );
  }

  if (screen === "certificate-ready" && createdCertificate) {
    return (
      <div className={styles.shell}>
        <MiniAppCertificateReady
          certificate={createdCertificate}
          onBack={() => {
            setCreatedCertificate(null);
            setScreen("home");
          }}
        />
      </div>
    );
  }

  if (screen === "create") {
    const agentR03 = bootstrap.role === "agent";
    return (
      <div className={styles.shell}>
        <MiniAppSubpage
          title="Новый сертификат"
          lead="Заполните короткую форму для выпуска."
          onBack={() => setScreen("home")}
        >
          <div className={styles.createWrap}>
            <CertificateCreateForm
              agentR03={agentR03}
              issuerUi={bootstrap.role === "specialist" ? "specialist" : "default"}
              issuerListApi={bootstrap.role === "store" || bootstrap.role === "company" ? "business" : "specialist"}
              presentation="page"
              onCertificateCreated={(cert) => {
                setCreatedCertificate(cert);
                setScreen("certificate-ready");
              }}
            />
          </div>
        </MiniAppSubpage>
      </div>
    );
  }

  if (screen === "scan") {
    return (
      <div className={styles.shell}>
        <MiniAppSubpage
          title="Проверка QR"
          lead="Проверка не активирует и не списывает сертификат."
          onBack={() => setScreen("home")}
        >
          <MiniAppScanVerify branchId={branchId} onDone={() => setScreen("home")} embed />
        </MiniAppSubpage>
      </div>
    );
  }

  if (screen === "invite") {
    return (
      <div className={styles.shell}>
        <MiniAppInvitePartner
          partnersSearchUrl={bootstrap.partnersUrl}
          onBack={() => setScreen("home")}
        />
      </div>
    );
  }

  if (screen === "full-cabinet") {
    return (
      <div className={styles.shell}>
        <MiniAppFullCabinet partnersUrl={bootstrap.partnersUrl} onBack={() => setScreen("home")} />
      </div>
    );
  }

  if (screen === "branch-pick") {
    return (
      <div className={styles.shell}>
        <MiniAppSubpage title="Рабочая точка" onBack={() => setScreen("home")}>
          <div className={styles.branchSheet}>
            {bootstrap.branches.map((b) => (
              <button
                key={b.id}
                type="button"
                className={`${styles.branchOption} ${b.id === branchId ? styles.branchOptionActive : ""}`}
                onClick={() => void onBranchChange(b.id)}
              >
                {b.label}
              </button>
            ))}
          </div>
        </MiniAppSubpage>
      </div>
    );
  }

  if (screen === "card-info") {
    return (
      <div className={styles.shell}>
        <MiniAppSubpage title="Кошелёк" onBack={() => setScreen("home")}>
          <p>{bootstrap.presentation.cardExplainer}</p>
          <a className={styles.secondaryBtn} href={bootstrap.presentation.historyHref}>
            История начислений в кабинете
          </a>
        </MiniAppSubpage>
      </div>
    );
  }

  const primary = bootstrap.actions.filter((a) => a.prominence === "primary");
  const secondary = bootstrap.actions.filter((a) => a.prominence === "secondary");
  const tertiary = bootstrap.actions.filter((a) => a.prominence === "tertiary");
  const introLine =
    bootstrap.entityLine ??
    (bootstrap.displayName && bootstrap.role !== "store" && bootstrap.role !== "company"
      ? bootstrap.displayName
      : null);

  return (
    <div className={styles.shell} data-testid="mini-app-home">
      <MiniAppProfBrand />
      {introLine ? <p className={styles.heroIntro}>{introLine}</p> : null}
      <h1 className={styles.heroTitle}>{bootstrap.cabinetTitle}</h1>

      {bootstrap.workplaceForbidden ? (
        <p className={styles.scanNotice}>{bootstrap.workplaceForbiddenMessage}</p>
      ) : null}

      <MiniAppWalletCard bootstrap={bootstrap} onCardClick={() => setScreen("card-info")} />

      {bootstrap.role === "company" && bootstrap.branches.length > 0 ? (
        <button
          type="button"
          className={styles.branchButton}
          data-testid="mini-app-branch-select"
          onClick={() => setScreen("branch-pick")}
        >
          <span className={styles.branchButtonLeft}>
            <MiniIconPin />
            {bootstrap.workplaceLabel ?? "Выберите филиал"}
          </span>
          <MiniIconChevron />
        </button>
      ) : null}

      {bootstrap.role === "store" && bootstrap.workplaceLabel ? (
        <p className={styles.workplacePin}>
          <MiniIconPin />
          {bootstrap.workplaceLabel}
        </p>
      ) : null}

      <section className={styles.quickSection} aria-labelledby="mini-quick-actions">
        <h2 id="mini-quick-actions" className={styles.quickLabel}>
          БЫСТРЫЕ ДЕЙСТВИЯ
        </h2>
        <div
          className={`${styles.quickGrid} ${bootstrap.role === "agent" ? styles.quickGridSingle : ""}`}
        >
          {primary.map((action) => (
            <button
              key={action.id}
              type="button"
              className={`${styles.actionTile} ${styles.actionTilePrimary}`}
              data-testid={`mini-action-${action.id}`}
              onClick={() => dispatchAction(action.id, setScreen)}
            >
              <span className={styles.actionIconPrimary}>
                {action.id === "scan_qr" ? <MiniIconScan /> : <MiniIconCertificate />}
              </span>
              <span>{action.label}</span>
            </button>
          ))}
          {secondary.map((action) => (
            <button
              key={action.id}
              type="button"
              className={`${styles.actionTile} ${styles.actionTileSecondary}`}
              data-testid={`mini-action-${action.id}`}
              onClick={() => dispatchAction(action.id, setScreen)}
            >
              <span className={styles.actionIconSecondary}>
                {action.id === "scan_qr" ? <MiniIconScan /> : <MiniIconCertificate />}
              </span>
              <span>{action.label}</span>
            </button>
          ))}
        </div>
      </section>

      <nav className={styles.listNav} aria-label="Дополнительные действия">
        {tertiary.map((action) => (
          <button
            key={action.id}
            type="button"
            className={styles.listNavItem}
            data-testid={`mini-action-${action.id}`}
            onClick={() => dispatchAction(action.id, setScreen)}
          >
            {action.id === "invite_partner" ? <MiniIconLink /> : <MiniIconExternal />}
            <span>{action.label}</span>
            <MiniIconChevron />
          </button>
        ))}
      </nav>
    </div>
  );
}

function dispatchAction(id: string, setScreen: (s: Screen) => void) {
  if (id === "create_certificate") setScreen("create");
  else if (id === "scan_qr") setScreen("scan");
  else if (id === "invite_partner") setScreen("invite");
  else if (id === "open_full_cabinet") setScreen("full-cabinet");
}

async function remcardPatchBranch(branchId: string) {
  const { remcardFetch } = await import("@/lib/api-client");
  await remcardFetch("/api/pro/context", { method: "PATCH", body: { branchId }, requireCsrf: true });
}