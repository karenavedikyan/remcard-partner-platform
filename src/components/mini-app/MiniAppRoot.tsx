"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { StoreCertificate } from "@/lib/certificate-types";
import { MiniAppCertificateCreate } from "./MiniAppCertificateCreate";
import { MiniAppWalletCard } from "./MiniAppWalletCard";
import { MiniAppWallet } from "./MiniAppWallet";
import { MiniAppScanReceive } from "./MiniAppScanReceive";
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
import { ensureMiniAppBridgeReady } from "@/lib/mini-app/bridge-loader";
import { detectMiniAppHost } from "@/lib/mini-app/host";
import { RemcardApiError } from "@/lib/api-client";
import { classifyMiniAppBootstrapFailure, miniAppExchangeSession, miniAppFetchBootstrap } from "@/lib/mini-app/api";
import {
  detectMiniAppEmbeddedContext,
  type MiniAppEmbeddedContext,
} from "@/lib/mini-app/embedded-context";
import { setMiniAppLaunchPayload, clearMiniAppLaunchPayload } from "@/lib/mini-app/launch-session";
import { MiniAppSessionProvider } from "@/lib/mini-app/MiniAppSessionContext";
import type { MiniAppBootstrap, MiniAppPlatform } from "@/lib/mini-app/types";
import { MiniAppMaxEntry } from "./MiniAppMaxEntry";
import {
  MiniAppCabinetBlockedScreen,
  MiniAppLaunchInvalidScreen,
  MiniAppMaxRecoveryScreen,
  MiniAppMaxUnlinkedScreen,
} from "./MiniAppAuthGateScreens";
import styles from "./mini-app.module.css";

type Screen =
  | "home"
  | "create"
  | "scan"
  | "wallet"
  | "invite"
  | "full-cabinet"
  | "certificate-ready"
  | "branch-pick";

type AuthGate = "none" | "max_unlinked" | "max_recovery" | "max_login" | "launch_invalid" | "cabinet_blocked";

type PilotProps = {
  fixtureBootstrap?: MiniAppBootstrap;
  fixturePlatform?: MiniAppPlatform;
  initialScreen?: Screen;
  fixtureCreatedCertificate?: StoreCertificate;
  fixtureCreateSeed?: import("./MiniAppCertificateCreate").MiniAppFixtureCreateSeed;
  fixtureInviteLink?: string | null;
};

export function MiniAppRoot({
  fixtureBootstrap,
  fixturePlatform,
  initialScreen = "home",
  fixtureCreatedCertificate,
  fixtureCreateSeed,
  fixtureInviteLink,
}: PilotProps = {}) {
  const searchParams = useSearchParams();
  const appealIdFromUrl = searchParams?.get("appealId");
  const [screen, setScreen] = useState<Screen>(initialScreen);
  const [platform, setPlatform] = useState<MiniAppPlatform | null>(fixturePlatform ?? null);
  const [bootstrap, setBootstrap] = useState<MiniAppBootstrap | null>(fixtureBootstrap ?? null);
  const [loading, setLoading] = useState(!fixtureBootstrap);
  const [error, setError] = useState<string | null>(null);
  const [unlinked, setUnlinked] = useState<{ message: string; url: string } | null>(null);
  const [cabinetBlocked, setCabinetBlocked] = useState<{ message: string; nextStep?: string } | null>(null);
  const [branchId, setBranchId] = useState<string | null>(fixtureBootstrap?.activeBranchId ?? null);
  const [branchPickError, setBranchPickError] = useState<string | null>(null);
  const [branchSwitching, setBranchSwitching] = useState(false);
  const [createdCertificate, setCreatedCertificate] = useState<StoreCertificate | null>(
    fixtureCreatedCertificate ?? null,
  );
  const [embeddedContext, setEmbeddedContext] = useState<MiniAppEmbeddedContext>("default");
  const [authGate, setAuthGate] = useState<AuthGate>("none");
  const [hostInitData, setHostInitData] = useState<string>("");
  const [profUrls, setProfUrls] = useState({ login: "/login", register: "/join" });
  const [maxUnlinkedMessage, setMaxUnlinkedMessage] = useState<string | null>(null);

  const loadBootstrap = useCallback(
    async (hostPlatform: MiniAppPlatform, activeBranch?: string | null, ctx?: MiniAppEmbeddedContext) => {
      const data = await miniAppFetchBootstrap(hostPlatform, {
        branchId: activeBranch,
        embeddedContext: ctx ?? embeddedContext,
      });
      setBootstrap(data);
      setBranchId(data.activeBranchId);
    },
    [embeddedContext],
  );

  const completeSession = useCallback(
    async (host: NonNullable<ReturnType<typeof detectMiniAppHost>>, ctx: MiniAppEmbeddedContext) => {
      setPlatform(host.platform);
      setEmbeddedContext(ctx);
      setHostInitData(host.initData);
      setMiniAppLaunchPayload(host.initData);
      const session = await miniAppExchangeSession(host.platform, host.initData, { embeddedContext: ctx });
      if (session.status === "unlinked") {
        if (host.platform === "max") {
          setAuthGate("max_unlinked");
          setMaxUnlinkedMessage(session.message);
          setProfUrls({
            login: session.profLoginUrl,
            register: "/join",
          });
          setError(null);
          return;
        }
        setUnlinked({ message: session.message, url: session.profLoginUrl });
        return;
      }
      if (session.status === "launch_invalid") {
        setAuthGate("launch_invalid");
        setError(null);
        return;
      }
      if (session.status === "session_missing") {
        if (host.platform === "max") {
          setAuthGate("max_recovery");
          setError(null);
          return;
        }
        setError(session.message);
        return;
      }
      if (session.status === "no_access") {
        setError(session.message);
        return;
      }
      if (session.status === "cabinet_blocked") {
        setCabinetBlocked({ message: session.message, nextStep: session.nextStep });
        setAuthGate("cabinet_blocked");
        setError(null);
        return;
      }
      if (session.status === "error") {
        if (host.platform === "max") {
          setAuthGate("max_recovery");
          setError(session.message);
          return;
        }
        setError(session.message);
        return;
      }
      if (session.status !== "ok") {
        return;
      }
      setAuthGate("none");
      try {
        await loadBootstrap(host.platform, undefined, ctx);
      } catch (e) {
        const classified = classifyMiniAppBootstrapFailure(e);
        if (classified?.status === "session_missing" && host.platform === "max") {
          setAuthGate("max_recovery");
          setError(null);
          return;
        }
        if (classified?.status === "cabinet_blocked") {
          setCabinetBlocked({ message: classified.message, nextStep: classified.nextStep });
          setAuthGate("cabinet_blocked");
          setError(null);
          return;
        }
        setError(e instanceof Error ? e.message : "Не удалось открыть кабинет");
      }
    },
    [loadBootstrap],
  );

  useEffect(() => {
    if (fixtureBootstrap) {
      setLoading(false);
      return;
    }
    void (async () => {
      try {
        const bridge = await ensureMiniAppBridgeReady();
        if (bridge.bridgeError && !bridge.platform) {
          setError(bridge.bridgeError);
          return;
        }
        const host = detectMiniAppHost(bridge.platform);
        if (!host) {
          setError(bridge.bridgeError ?? "Откройте мини-кабинет из Telegram или MAX.");
          return;
        }
        host.ready();
        host.expand();
        const ctx = detectMiniAppEmbeddedContext(host.platform);
        await completeSession(host, ctx);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Не удалось войти");
      } finally {
        setLoading(false);
      }
    })();
    return () => clearMiniAppLaunchPayload();
  }, [fixtureBootstrap, completeSession]);

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

  function openProfLink(url: string) {
    const host = detectMiniAppHost(platform);
    if (host) host.openExternalLink(url);
    else window.open(url, "_blank", "noopener,noreferrer");
  }

  async function onBranchChange(id: string) {
    if (!platform) return;
    if (id === branchId) {
      setScreen("home");
      return;
    }
    setBranchPickError(null);
    setBranchSwitching(true);
    try {
      const data = await miniAppFetchBootstrap(platform, { branchId: id, embeddedContext });
      setBootstrap(data);
      setBranchId(data.activeBranchId ?? id);
      setScreen("home");
    } catch (e) {
      setBranchPickError(
        e instanceof RemcardApiError
          ? e.message
          : "Не удалось выбрать филиал. Точка полного кабинета не менялась — повторите выбор.",
      );
    } finally {
      setBranchSwitching(false);
    }
  }

  if (loading) {
    return (
      <div className={styles.shell} data-testid="mini-app-loading">
        <p>Загрузка…</p>
      </div>
    );
  }

  function finishOtpBootstrap() {
    setLoading(true);
    setError(null);
    setAuthGate("none");
    void (async () => {
      try {
        await loadBootstrap("max", undefined, embeddedContext);
      } catch (e) {
        const classified = classifyMiniAppBootstrapFailure(e);
        if (classified?.status === "cabinet_blocked") {
          setCabinetBlocked({ message: classified.message, nextStep: classified.nextStep });
          setAuthGate("cabinet_blocked");
          setError(null);
          return;
        }
        if (classified?.status === "session_missing") {
          setAuthGate("max_recovery");
          setError(null);
          return;
        }
        setError(e instanceof Error ? e.message : "Не удалось открыть кабинет");
      } finally {
        setLoading(false);
      }
    })();
  }

  if (authGate === "launch_invalid") {
    return <MiniAppLaunchInvalidScreen />;
  }

  if (authGate === "cabinet_blocked" && cabinetBlocked) {
    return (
      <MiniAppCabinetBlockedScreen
        nextStep={cabinetBlocked.nextStep}
        message={cabinetBlocked.message}
        onOpenExternal={openProfLink}
      />
    );
  }

  if (authGate === "max_unlinked" && platform === "max" && hostInitData) {
    return (
      <MiniAppMaxUnlinkedScreen
        message={
          maxUnlinkedMessage ??
          "Этот MAX ещё не привязан к RemCard PROF. Зарегистрируйтесь или войдите на сайте, либо подтвердите вход одноразовым кодом."
        }
        profLoginUrl={profUrls.login}
        profRegisterUrl={profUrls.register}
        onOpenExternal={openProfLink}
        onLoginByCode={() => setAuthGate("max_login")}
      />
    );
  }

  if (authGate === "max_recovery" && platform === "max" && hostInitData) {
    const host = detectMiniAppHost(platform);
    return (
      <MiniAppMaxRecoveryScreen
        busy={loading}
        onRetrySession={() => {
          if (!host) return;
          setLoading(true);
          void completeSession(host, embeddedContext).finally(() => setLoading(false));
        }}
        onLoginByCode={() => setAuthGate("max_login")}
      />
    );
  }

  if (authGate === "max_login" && platform === "max" && hostInitData) {
    return (
      <MiniAppMaxEntry
        platform="max"
        initData={hostInitData}
        embeddedContext={embeddedContext}
        profLoginUrl={profUrls.login}
        profRegisterUrl={profUrls.register}
        onOpenExternal={openProfLink}
        onCabinetBlocked={(payload) => {
          setCabinetBlocked(payload);
          setAuthGate("cabinet_blocked");
        }}
        onAuthenticated={finishOtpBootstrap}
      />
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
    const host = detectMiniAppHost(platform);
    return (
      <div className={styles.shell} data-testid="mini-app-error">
        <MiniAppProfBrand />
        <p role="alert">{error ?? "Нет данных"}</p>
        {platform === "max" && host ? (
          <button
            type="button"
            className={styles.primaryBtn}
            data-testid="mini-app-login-by-code"
            onClick={() => setAuthGate("max_recovery")}
          >
            Войти по коду
          </button>
        ) : null}
        {bootstrap?.fullCabinetUrl || platform ? (
          <button
            type="button"
            className={styles.secondaryBtn}
            onClick={() =>
              openProfLink(
                bootstrap?.fullCabinetUrl?.replace(/\/+$/, "") ??
                  "https://prof.remcard.ru",
              )
            }
          >
            Открыть обычный кабинет
          </button>
        ) : null}
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
    return (
      <div className={styles.shell}>
        <MiniAppCertificateCreate
          platform={platform}
          bootstrap={bootstrap}
          branchId={branchId}
          embeddedContext={embeddedContext}
          fixtureCreateSeed={fixtureCreateSeed}
          fixtureSubmitCertificate={fixtureCreatedCertificate ?? undefined}
          onBack={() => setScreen("home")}
          onCreated={(cert) => {
            setCreatedCertificate(cert);
            setScreen("certificate-ready");
          }}
        />
      </div>
    );
  }

  if (screen === "scan") {
    return (
      <div className={styles.shell}>
        <MiniAppSubpage
          title="Сканер"
          lead="Проверка QR и приём документа с оформлением покупки."
          onBack={() => setScreen("home")}
        >
          <MiniAppScanReceive
            platform={platform}
            bootstrap={bootstrap}
            branchId={branchId}
            embeddedContext={embeddedContext}
            appealId={appealIdFromUrl}
            onDone={() => setScreen("home")}
            onClientsDeepLink={(appealId) => {
              const base = bootstrap.fullCabinetUrl.replace(/\/+$/, "");
              openProfLink(`${base}/clients?appealId=${encodeURIComponent(appealId)}`);
            }}
          />
        </MiniAppSubpage>
      </div>
    );
  }

  if (screen === "invite") {
    return (
      <div className={styles.shell}>
        <MiniAppInvitePartner
          actorUserId={bootstrap.actorUserId}
          platform={platform}
          branchId={branchId}
          embeddedContext={embeddedContext}
          partnersSearchUrl={bootstrap.partnersUrl}
          fixtureInviteLink={fixtureInviteLink}
          onBack={() => setScreen("home")}
        />
      </div>
    );
  }

  if (screen === "full-cabinet") {
    return (
      <div className={styles.shell}>
        <MiniAppFullCabinet
          partnersUrl={bootstrap.partnersUrl}
          onBack={() => setScreen("home")}
          onOpenLink={openProfLink}
        />
      </div>
    );
  }

  if (screen === "branch-pick") {
    return (
      <div className={styles.shell} data-testid="mini-app-branch-pick">
        <MiniAppSubpage title="Рабочая точка" onBack={() => setScreen("home")}>
          {branchSwitching ? <p className={styles.scanNotice}>Обновление мини-кабинета…</p> : null}
          {branchPickError ? (
            <p className={styles.scanBad} role="alert" data-testid="mini-branch-pick-error">
              {branchPickError}
            </p>
          ) : null}
          <div className={styles.branchSheet}>
            {bootstrap.branches.map((b) => (
              <button
                key={b.id}
                type="button"
                disabled={branchSwitching}
                className={`${styles.branchOption} ${b.id === branchId ? styles.branchOptionActive : ""}`}
                data-testid={`mini-branch-option-${b.id}`}
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

  if (screen === "wallet") {
    return (
      <div className={styles.shell} data-testid="mini-app-wallet">
        <MiniAppWallet
          platform={platform}
          bootstrap={bootstrap}
          branchId={branchId}
          embeddedContext={embeddedContext}
          fixtureMode={Boolean(fixtureBootstrap)}
          onBack={() => setScreen("home")}
          onOpenProfSettlements={openProfLink}
        />
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
    <MiniAppSessionProvider platform={platform} embeddedContext={embeddedContext}>
    <div className={styles.shell} data-testid="mini-app-home">
      <MiniAppProfBrand />
      {introLine ? <p className={styles.heroIntro}>{introLine}</p> : null}
      <h1 className={styles.heroTitle}>{bootstrap.cabinetTitle}</h1>

      {bootstrap.workplaceForbidden ? (
        <p className={styles.scanNotice}>{bootstrap.workplaceForbiddenMessage}</p>
      ) : null}

      <MiniAppWalletCard bootstrap={bootstrap} onCardClick={() => setScreen("wallet")} />

      {(bootstrap.role === "company" || bootstrap.role === "store") && bootstrap.branches.length > 1 ? (
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

      {bootstrap.role === "store" && bootstrap.workplaceLabel && bootstrap.branches.length <= 1 ? (
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
          {primary.map((action) =>
            bootstrap.role === "agent" ? (
              <button
                key={action.id}
                type="button"
                className={styles.actionRowPrimary}
                data-testid={`mini-action-${action.id}`}
                onClick={() => dispatchAction(action.id, setScreen, bootstrap, branchId)}
              >
                <span className={styles.actionIconPrimary}>
                  {action.id === "scan_qr" ? <MiniIconScan /> : <MiniIconCertificate />}
                </span>
                <span>{action.label}</span>
                <span className={styles.actionRowChevron} aria-hidden="true">
                  →
                </span>
              </button>
            ) : (
              <button
                key={action.id}
                type="button"
                className={`${styles.actionTile} ${styles.actionTilePrimary}`}
                data-testid={`mini-action-${action.id}`}
                onClick={() => dispatchAction(action.id, setScreen, bootstrap, branchId)}
              >
                <span className={styles.actionIconPrimary}>
                  {action.id === "scan_qr" ? <MiniIconScan /> : <MiniIconCertificate />}
                </span>
                <span>{action.label}</span>
              </button>
            ),
          )}
          {secondary.map((action) => (
            <button
              key={action.id}
              type="button"
              className={`${styles.actionTile} ${styles.actionTileSecondary}`}
              data-testid={`mini-action-${action.id}`}
              onClick={() => dispatchAction(action.id, setScreen, bootstrap, branchId)}
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
            onClick={() => dispatchAction(action.id, setScreen, bootstrap, branchId)}
          >
            {action.id === "invite_partner" ? <MiniIconLink /> : <MiniIconExternal />}
            <span>{action.label}</span>
            <MiniIconChevron />
          </button>
        ))}
      </nav>
    </div>
    </MiniAppSessionProvider>
  );
}

function dispatchAction(
  id: string,
  setScreen: (s: Screen) => void,
  bootstrap?: MiniAppBootstrap,
  branchId?: string | null,
) {
  if (id === "create_certificate") {
    if (
      bootstrap &&
      (bootstrap.role === "store" || bootstrap.role === "company") &&
      !branchId &&
      bootstrap.branches.length > 1
    ) {
      setScreen("branch-pick");
      return;
    }
    setScreen("create");
    return;
  }
  else if (id === "scan_qr") {
    if (
      bootstrap &&
      (bootstrap.role === "store" || bootstrap.role === "company") &&
      !branchId &&
      bootstrap.branches.length > 1
    ) {
      setScreen("branch-pick");
      return;
    }
    setScreen("scan");
  }
  else if (id === "invite_partner") setScreen("invite");
  else if (id === "open_full_cabinet") setScreen("full-cabinet");
}
