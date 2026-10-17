"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AuthFlow } from "@/components/auth/AuthFlow";
import { Button } from "@/components/ui/Button";
import { fetchRegistrationCapabilitiesClient } from "@/lib/registration/capabilities";
import {
  bindRegistrationDraftOwner,
  buildJoinHref,
  buildLegacyOnboardingLoginHref,
  clearAllRegistrationDrafts,
  clearDraftOnOwnerMismatch,
  getRegistrationDraftOwner,
  loadAgentDraftForUser,
  loadRegistrationDraft,
  loadRegistrationWizardState,
  maybeStorageRecoveryNotice,
  mergeRegistrationDraftFields,
  saveRegistrationWizardState,
} from "@/lib/registration/draft";
import {
  buildEmployeeLegacyJoinHref,
  buildEmployeeLoginHref,
  buildJoinAuthReturnTo,
  buildJoinFinishHref,
  resolveAgentRegistrationCompleteHref,
  buildWelcomeHref,
} from "@/lib/registration/routing";
import { fetchAuthMeSafe } from "@/lib/auth-session";
import {
  mapAgentFinishError,
  postAgentRegistrationFinish,
  waitForRegistrationReady,
} from "@/lib/registration/agent-finish";
import type { RegistrationCapabilities, RegistrationKind } from "@/lib/registration/types";
import { REGISTRATION_KIND_LABELS } from "@/lib/registration/types";
import { JoinProgress } from "./JoinProgress";
import { RegistrationAuthStep } from "./RegistrationAuthStep";
import { RegistrationEntryDataStep } from "./RegistrationEntryDataStep";
import { RegistrationKindIcon } from "./RegistrationKindIcons";
import { RegistrationPublicShell } from "./RegistrationPublicShell";
import styles from "./registration-join.module.css";

const ALL_KINDS: RegistrationKind[] = [
  "agent",
  "specialist",
  "store",
  "company",
  "employee",
];

type WizardStep = "types" | "name" | "city" | "auth" | "finish";

function parseRoleLanding(searchParams: URLSearchParams): RegistrationKind | null {
  const role = searchParams.get("role")?.trim().toLowerCase();
  if (role === "agent" || role === "specialist" || role === "store" || role === "company") {
    return role;
  }
  if (role === "employee" || role === "staff") return "employee";
  return null;
}

export function RegistrationJoinFlow() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const phase = searchParams.get("phase");
  const roleLanding = parseRoleLanding(searchParams);
  const inviteToken = searchParams.get("invite");
  const contextReturnTo = searchParams.get("returnTo");

  const joinContext = useMemo(
    () => ({ invite: inviteToken, returnTo: contextReturnTo }),
    [inviteToken, contextReturnTo],
  );

  const [caps, setCaps] = useState<RegistrationCapabilities | null>(null);
  const [storageNotice] = useState(() => maybeStorageRecoveryNotice());
  const [capsLoaded, setCapsLoaded] = useState(false);
  const [kind, setKind] = useState<RegistrationKind | "">(roleLanding ?? "");
  const [step, setStep] = useState<WizardStep>(phase === "finish" ? "finish" : "types");
  const [displayName, setDisplayName] = useState("");
  const [city, setCity] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const finishLock = useRef(false);
  const idempotencyKey = useRef(`agent-reg-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const [authCodeVerified, setAuthCodeVerified] = useState(false);

  const finishHref = buildJoinFinishHref(joinContext);
  const authReturnTo = buildJoinAuthReturnTo(joinContext);

  useEffect(() => {
    const hash = typeof window !== "undefined" ? window.location.hash : "";
    const match = hash.match(/^#register\/(agent|specialist|store|company|employee)$/);
    if (match) setKind(match[1] as RegistrationKind);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void fetchRegistrationCapabilitiesClient().then((c) => {
      if (cancelled) return;
      setCaps(c);
      setCapsLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (phase === "finish") {
      setStep("finish");
      setKind("agent");
      return;
    }
    const saved = loadRegistrationWizardState();
    if (saved?.kind) {
      setKind(saved.kind);
      setStep(saved.step);
    }
  }, [phase]);

  useEffect(() => {
    if (!kind) return;
    const draft = loadRegistrationDraft(kind);
    if (draft?.fields.displayName) setDisplayName(draft.fields.displayName);
    if (draft?.fields.city) setCity(draft.fields.city);
  }, [kind]);

  const agentPathActive = Boolean(caps?.agentRegistrationPathEnabled);
  const welcomeActive = Boolean(caps?.welcomeEnabled);
  const isAgentNewPath =
    agentPathActive && (kind === "agent" || (phase === "finish" && step === "finish"));

  useEffect(() => {
    if (phase === "finish" || step === "finish") return;
    saveRegistrationWizardState({ step, kind, updatedAt: Date.now() });
  }, [step, kind, phase]);

  const onContinueFromTypes = () => {
    if (!kind) return;
    setError("");
    if (kind === "agent" && agentPathActive) {
      setStep("name");
      return;
    }
    if (kind === "employee") {
      router.push(buildEmployeeLegacyJoinHref(joinContext));
      return;
    }
    router.push(buildLegacyOnboardingLoginHref(kind));
  };

  const onContinueName = () => {
    const trimmed = displayName.trim();
    if (trimmed.length < 2) {
      setError("Укажите имя (минимум 2 символа)");
      return;
    }
    setError("");
    mergeRegistrationDraftFields("agent", { displayName: trimmed });
    setStep("city");
  };

  const onContinueCity = () => {
    const trimmedCity = city.trim();
    if (trimmedCity.length < 2) {
      setError("Укажите город (минимум 2 символа)");
      return;
    }
    setError("");
    mergeRegistrationDraftFields("agent", { city: trimmedCity });
    setStep("auth");
  };

  const runAgentFinish = useCallback(async () => {
    if (finishLock.current) return;
    finishLock.current = true;
    setBusy(true);
    setError("");
    try {
      const me = await fetchAuthMeSafe();
      if (!me.ok || !me.data.user?.id) {
        setError("Сессия не подтверждена. Войдите снова.");
        finishLock.current = false;
        setBusy(false);
        return;
      }
      const userId = me.data.user.id;
      if (clearDraftOnOwnerMismatch(userId)) {
        setError(
          "Черновик принадлежал другому входу. Заполните имя и город заново для текущего аккаунта.",
        );
        setStep("name");
        finishLock.current = false;
        setBusy(false);
        return;
      }
      const owner = getRegistrationDraftOwner();
      if (owner && owner !== userId) {
        clearAllRegistrationDrafts();
        setError("Черновик привязан к другому аккаунту. Начните регистрацию заново.");
        setStep("types");
        finishLock.current = false;
        setBusy(false);
        return;
      }
      if (!owner) {
        bindRegistrationDraftOwner(userId);
      }

      const draft = loadAgentDraftForUser(userId);
      const name = draft?.fields.displayName?.trim() ?? displayName.trim();
      const cityValue = draft?.fields.city?.trim() ?? city.trim();
      if (!name || !cityValue) {
        setError("Не хватает данных регистрации. Вернитесь и заполните имя и город.");
        setStep("name");
        finishLock.current = false;
        setBusy(false);
        return;
      }

      await postAgentRegistrationFinish({
        displayName: name,
        city: cityValue,
        idempotencyKey: idempotencyKey.current,
      });
      const readiness = await waitForRegistrationReady();
      if (!readiness || readiness.needsProfileOnboarding || !readiness.canAccessCabinet) {
        setError("Сохранение ещё обрабатывается. Повторите через несколько секунд.");
        finishLock.current = false;
        setBusy(false);
        return;
      }
      clearAllRegistrationDrafts();
      router.replace(resolveAgentRegistrationCompleteHref(joinContext));
      router.refresh();
    } catch (e) {
      setError(mapAgentFinishError(e));
      finishLock.current = false;
    } finally {
      setBusy(false);
    }
  }, [city, displayName, joinContext, router]);

  useEffect(() => {
    if (step !== "finish" || !isAgentNewPath || !capsLoaded || !agentPathActive) return;
    void runAgentFinish();
  }, [step, isAgentNewPath, capsLoaded, agentPathActive, runAgentFinish]);

  const handleAuthenticated = useCallback(
    (userId: string) => {
      const owner = getRegistrationDraftOwner();
      if (owner && owner !== userId) {
        clearAllRegistrationDrafts();
        setError("Вход выполнен под другим аккаунтом. Черновик очищен — заполните данные заново.");
        setStep("name");
        return;
      }
      if (!owner) {
        bindRegistrationDraftOwner(userId);
      }
    },
    [],
  );

  const typeHint = useMemo(() => {
    if (!roleLanding || !kind) return null;
    if (kind === roleLanding) {
      return `Тип «${REGISTRATION_KIND_LABELS[kind].title}» предвыбран — можно изменить до продолжения.`;
    }
    return null;
  }, [kind, roleLanding]);

  const loginRecovery = `/login?${new URLSearchParams({
    returnTo: authReturnTo,
    registration: "agent",
  }).toString()}`;

  if (!capsLoaded) {
    return (
      <RegistrationPublicShell loginHref={loginRecovery}>
        <p className={styles.status}>Загружаем…</p>
      </RegistrationPublicShell>
    );
  }

  if (!welcomeActive && !agentPathActive) {
    return (
      <RegistrationPublicShell>
        <div className={styles.fallback}>
          <h1>Регистрация партнёров</h1>
          <p>Новый сценарий регистрации пока недоступен. Используйте существующий вход.</p>
          <Link href="/login" className={styles.primaryLink}>
            Войти
          </Link>
        </div>
      </RegistrationPublicShell>
    );
  }

  if (step === "auth" && isAgentNewPath) {
    const roleLabel = kind ? REGISTRATION_KIND_LABELS[kind].title : "Агент";
    return (
      <RegistrationPublicShell loginHref={loginRecovery}>
        <div className={styles.joinPage}>
          <JoinProgress current="auth" />
          {storageNotice ? <p className={styles.notice}>{storageNotice}</p> : null}
          {!authCodeVerified ? (
            <RegistrationAuthStep
              roleLabel={roleLabel}
              displayName={displayName.trim()}
              city={city.trim()}
              onBackToData={() => setStep("city")}
              onAuthenticated={handleAuthenticated}
              onCodeVerified={() => setAuthCodeVerified(true)}
            />
          ) : (
            <AuthFlow
              returnTo={authReturnTo}
              registrationAgentJoin
              layout="embedded"
              onAuthenticated={handleAuthenticated}
            />
          )}
        </div>
      </RegistrationPublicShell>
    );
  }

  if (step === "finish" && isAgentNewPath) {
    return (
      <RegistrationPublicShell loginHref={loginRecovery}>
        <div className={styles.finishWrap}>
          <JoinProgress current="done" />
          <h1>Завершение регистрации</h1>
          {error ? <p className={styles.error}>{error}</p> : null}
          {busy && !error ? <p className={styles.status}>Сохраняем профиль агента…</p> : null}
          {!busy && error ? (
            <div className={styles.footerActions}>
              <Link href={loginRecovery} className={styles.secondaryLink}>
                Войти снова
              </Link>
              <Button type="button" onClick={() => void runAgentFinish()}>
                Повторить
              </Button>
            </div>
          ) : null}
        </div>
      </RegistrationPublicShell>
    );
  }

  if (searchParams.get("legacy") === "1" && (kind === "employee" || roleLanding === "employee")) {
    return (
      <RegistrationPublicShell loginHref={buildEmployeeLoginHref(joinContext)}>
        <div className={styles.fallback}>
          <h1>Сотрудник организации</h1>
          <p className={styles.workspaceNote}>
            Рабочее пространство организации открывается только после принятого приглашения. Без
            приглашения доступ к данным организации не выдаётся.
          </p>
          {inviteToken ? (
            <p className={styles.hint}>Приглашение сохранено в контексте входа. Автоматически не принимаем.</p>
          ) : null}
          <Link href={buildEmployeeLoginHref(joinContext)} className={styles.primaryLink}>
            Войти
          </Link>
          <Link href={buildJoinHref(joinContext)} className={styles.secondaryLink}>
            Выбрать другой тип
          </Link>
        </div>
      </RegistrationPublicShell>
    );
  }

  return (
    <RegistrationPublicShell loginHref={loginRecovery}>
      {storageNotice ? <p className={styles.notice}>{storageNotice}</p> : null}
      {step === "types" ? (
        <div className={styles.typesRegistration}>
          <JoinProgress current="types" layout="typesRegistration" />
          <div className={styles.typesIntro}>
            <p className={styles.typesEyebrow}>Регистрация · шаг 1 из 4</p>
            <h1>Какой тип партнёрства вам подходит?</h1>
            <p className={styles.workspaceNote}>
              Сравните варианты и выберите, как планируете работать. Затем начнём заполнять данные
              по шагам.
            </p>
            {typeHint ? <p className={styles.hint}>{typeHint}</p> : null}
          </div>
          <ul className={styles.typeList} data-testid="registration-types-grid">
            {ALL_KINDS.map((k) => (
              <li key={k}>
                <label className={kind === k ? styles.typeCardActive : styles.typeCard}>
                  <input
                    type="radio"
                    name="registrationKind"
                    value={k}
                    checked={kind === k}
                    onChange={() => {
                      setKind(k);
                      setError("");
                    }}
                  />
                  <span className={styles.typeCardIcon}>
                    <RegistrationKindIcon kind={k} />
                  </span>
                  <span className={styles.typeTitle}>{REGISTRATION_KIND_LABELS[k].title}</span>
                  <span className={styles.typeDesc}>
                    {REGISTRATION_KIND_LABELS[k].lead}
                    <br />
                    {REGISTRATION_KIND_LABELS[k].detail}
                  </span>
                </label>
              </li>
            ))}
          </ul>
          {error ? <p className={styles.error}>{error}</p> : null}
          <div className={styles.typeChoiceFooter}>
            <p className={styles.typeTeamNote}>
              Один аккаунт может совмещать личную деятельность и работу в команде.
              <br />
              Рабочие пространства и данные при этом разделены.
            </p>
            <div className={styles.typeFooterActions}>
              <Button
                type="button"
                className={styles.typeContinueBtn}
                disabled={!kind}
                onClick={onContinueFromTypes}
              >
                Продолжить →
              </Button>
              <Link href={loginRecovery} className={styles.typeLoginSecondary}>
                Уже есть аккаунт? Войти
              </Link>
              <Link href={buildWelcomeHref(joinContext)} className={styles.backToWelcome}>
                К приветствию
              </Link>
            </div>
          </div>
        </div>
      ) : null}

      {step !== "types" ? (
      <div className={styles.joinPage}>
        {step === "name" && isAgentNewPath && kind ? (
          <>
            <JoinProgress current="data" />
            <RegistrationEntryDataStep
              kind={kind}
              field="name"
              stepIndex={0}
              stepTotal={2}
              value={displayName}
              error={error || undefined}
              onChange={setDisplayName}
              onBack={() => setStep("types")}
              onSubmit={onContinueName}
              onChangeType={() => setStep("types")}
            />
          </>
        ) : null}

        {step === "city" && isAgentNewPath && kind ? (
          <>
            <JoinProgress current="data" />
            <RegistrationEntryDataStep
              kind={kind}
              field="city"
              stepIndex={1}
              stepTotal={2}
              value={city}
              error={error || undefined}
              onChange={setCity}
              onBack={() => setStep("name")}
              onSubmit={onContinueCity}
              onChangeType={() => setStep("types")}
            />
          </>
        ) : null}
      </div>
      ) : null}
    </RegistrationPublicShell>
  );
}
