"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AuthFlow } from "@/components/auth/AuthFlow";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/FormField";
import { fetchRegistrationCapabilitiesClient } from "@/lib/registration/capabilities";
import {
  clearRegistrationDraft,
  loadRegistrationDraft,
  mergeRegistrationDraftFields,
} from "@/lib/registration/draft";
import {
  mapAgentFinishError,
  postAgentRegistrationFinish,
  waitForRegistrationReady,
} from "@/lib/registration/agent-finish";
import type { RegistrationCapabilities, RegistrationKind } from "@/lib/registration/types";
import {
  REGISTRATION_KIND_LABELS,
  REGISTRATION_KIND_TO_PARTNER_TYPE,
} from "@/lib/registration/types";
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

function legacyLoginHref(kind: RegistrationKind): string {
  if (kind === "employee") {
    return "/login?returnTo=%2F";
  }
  return "/login?returnTo=%2Fonboarding";
}

export function RegistrationJoinFlow() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const phase = searchParams.get("phase");
  const roleLanding = parseRoleLanding(searchParams);

  const [caps, setCaps] = useState<RegistrationCapabilities | null>(null);
  const [capsLoaded, setCapsLoaded] = useState(false);
  const [kind, setKind] = useState<RegistrationKind | "">(roleLanding ?? "");
  const [step, setStep] = useState<WizardStep>(phase === "finish" ? "finish" : "types");
  const [displayName, setDisplayName] = useState("");
  const [city, setCity] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const finishLock = useRef(false);
  const idempotencyKey = useRef(`agent-reg-${Date.now()}-${Math.random().toString(36).slice(2)}`);

  useEffect(() => {
    const hash = typeof window !== "undefined" ? window.location.hash : "";
    const match = hash.match(/^#register\/(agent|specialist|store|company|employee)$/);
    if (match) {
      setKind(match[1] as RegistrationKind);
    }
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
    }
  }, [phase]);

  useEffect(() => {
    if (phase === "finish") {
      setKind("agent");
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

  const continueDisabled = !kind;

  const goLegacy = useCallback(
    (selected: RegistrationKind) => {
      if (selected === "employee") {
        router.push("/join?role=employee&legacy=1");
        return;
      }
      router.push(legacyLoginHref(selected));
    },
    [router],
  );

  const onContinueFromTypes = () => {
    if (!kind) return;
    setError("");
    if (kind === "agent" && agentPathActive) {
      setStep("name");
      return;
    }
    if (kind === "employee") {
      router.push("/join?role=employee&legacy=1");
      return;
    }
    goLegacy(kind);
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
      const draft = loadRegistrationDraft("agent");
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
      clearRegistrationDraft("agent");
      router.replace("/partners");
      router.refresh();
    } catch (e) {
      setError(mapAgentFinishError(e));
      finishLock.current = false;
    } finally {
      setBusy(false);
    }
  }, [city, displayName, router]);

  useEffect(() => {
    if (step === "finish" && isAgentNewPath && capsLoaded && agentPathActive) {
      void runAgentFinish();
    }
  }, [step, isAgentNewPath, capsLoaded, agentPathActive, runAgentFinish]);

  const typeHint = useMemo(() => {
    if (!roleLanding || !kind) return null;
    if (kind === roleLanding) {
      return `Тип «${REGISTRATION_KIND_LABELS[kind].title}» предвыбран — можно изменить до продолжения.`;
    }
    return null;
  }, [kind, roleLanding]);

  if (!capsLoaded) {
    return (
      <RegistrationPublicShell>
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
    return (
      <RegistrationPublicShell loginHref="/login?returnTo=%2Fjoin%3Fphase%3Dfinish">
        <div className={styles.authWrap}>
          <h1>Подтвердите вход</h1>
          <p className={styles.muted}>
            Получите код в MAX или Telegram, затем вернитесь сюда для завершения регистрации агента.
          </p>
          <AuthFlow returnTo="/join" registrationAgentJoin />
        </div>
      </RegistrationPublicShell>
    );
  }

  if (step === "finish" && isAgentNewPath) {
    return (
      <RegistrationPublicShell>
        <div className={styles.finishWrap}>
          <h1>Завершение регистрации</h1>
          {error ? <p className={styles.error}>{error}</p> : null}
          {busy && !error ? <p className={styles.status}>Сохраняем профиль агента…</p> : null}
          {!busy && error ? (
            <Button type="button" onClick={() => void runAgentFinish()}>
              Повторить
            </Button>
          ) : null}
        </div>
      </RegistrationPublicShell>
    );
  }

  if (searchParams.get("legacy") === "1" && kind === "employee") {
    return (
      <RegistrationPublicShell>
        <div className={styles.fallback}>
          <h1>Сотрудник организации</h1>
          <p>
            Доступ открывается по приглашению от партнёра. Примите приглашение по ссылке или войдите,
            если оно уже отправлено.
          </p>
          <Link href="/login?returnTo=%2F" className={styles.primaryLink}>
            Войти
          </Link>
          <Link href="/join" className={styles.secondaryLink}>
            Выбрать другой тип
          </Link>
        </div>
      </RegistrationPublicShell>
    );
  }

  return (
    <RegistrationPublicShell>
      <div className={styles.joinPage}>
        {step === "types" ? (
          <>
            <h1>Кто вы в RemCard?</h1>
            <p className={styles.muted}>Сравните типы партнёров и выберите подходящий.</p>
            {typeHint ? <p className={styles.hint}>{typeHint}</p> : null}
            <ul className={styles.typeList}>
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
                    <span className={styles.typeTitle}>{REGISTRATION_KIND_LABELS[k].title}</span>
                    <span className={styles.typeDesc}>{REGISTRATION_KIND_LABELS[k].description}</span>
                    {k !== "agent" && k !== "employee" ? (
                      <span className={styles.legacyTag}>
                        {REGISTRATION_KIND_TO_PARTNER_TYPE[k] ?? ""} · существующий onboarding
                      </span>
                    ) : null}
                    {k === "agent" && agentPathActive ? (
                      <span className={styles.newTag}>Новый путь регистрации</span>
                    ) : null}
                  </label>
                </li>
              ))}
            </ul>
            {error ? <p className={styles.error}>{error}</p> : null}
            <div className={styles.footerActions}>
              <Link href="/">Назад</Link>
              <Button type="button" disabled={continueDisabled} onClick={onContinueFromTypes}>
                Продолжить
              </Button>
            </div>
          </>
        ) : null}

        {step === "name" && isAgentNewPath ? (
          <>
            <h1>Как к вам обращаться?</h1>
            <TextField
              label="Имя"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              autoComplete="name"
              maxLength={120}
            />
            {error ? <p className={styles.error}>{error}</p> : null}
            <div className={styles.footerActions}>
              <Button type="button" variant="secondary" onClick={() => setStep("types")}>
                Назад
              </Button>
              <Button type="button" onClick={onContinueName}>
                Продолжить
              </Button>
            </div>
          </>
        ) : null}

        {step === "city" && isAgentNewPath ? (
          <>
            <h1>В каком городе вы работаете?</h1>
            <TextField
              label="Город"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              autoComplete="address-level2"
              maxLength={120}
            />
            {error ? <p className={styles.error}>{error}</p> : null}
            <div className={styles.footerActions}>
              <Button type="button" variant="secondary" onClick={() => setStep("name")}>
                Назад
              </Button>
              <Button type="button" onClick={onContinueCity}>
                Продолжить
              </Button>
            </div>
          </>
        ) : null}
      </div>
    </RegistrationPublicShell>
  );
}
