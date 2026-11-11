"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AuthFlow } from "@/components/auth/AuthFlow";
import { AdminLoginAccessory } from "@/components/auth/AdminLoginAccessory";
import { RegistrationPreAuthConsent } from "@/components/registration/RegistrationPreAuthConsent";
import type { AuthFlowStep } from "@/lib/auth-flow";
import {
  buildJoinHref,
  loadRegistrationWizardState,
} from "@/lib/registration/draft";
import { isJoinRegistrationKind } from "@/lib/registration/join-finish";
import { parseJoinKindFromFinishReturnTo } from "@/lib/registration/join-kind-capability";
import {
  loadPreAuthConsentAck,
  savePreAuthConsentAck,
} from "@/lib/registration/pre-auth-consent";
import type { RegistrationKind } from "@/lib/registration/types";
import styles from "./auth.module.css";

export type AdminCapabilitiesState = "pending" | "enabled" | "disabled" | "error";

type Props = {
  returnTo?: string | null;
  reason?: string;
  initialStep?: AuthFlowStep;
  initialMode?: "partner" | "admin";
  registrationAgentJoin?: boolean;
};

function resolveRegistrationJoinKind(returnTo: string | null | undefined): RegistrationKind | null {
  const fromReturn = parseJoinKindFromFinishReturnTo(returnTo);
  if (fromReturn) return fromReturn;
  const wizard = loadRegistrationWizardState();
  if (wizard?.kind && isJoinRegistrationKind(wizard.kind)) return wizard.kind;
  return null;
}

export function LoginExperience({
  returnTo,
  reason,
  initialStep,
  initialMode = "partner",
  registrationAgentJoin,
}: Props) {
  const joinKind = useMemo(
    () => (registrationAgentJoin ? resolveRegistrationJoinKind(returnTo) : null),
    [registrationAgentJoin, returnTo],
  );
  const needsRegistrationPreAuth = Boolean(
    registrationAgentJoin && joinKind && isJoinRegistrationKind(joinKind),
  );
  const [preAuthReady, setPreAuthReady] = useState(
    () => (joinKind && isJoinRegistrationKind(joinKind) ? loadPreAuthConsentAck(joinKind) : false),
  );

  if (initialMode === "admin") {
    return (
      <div className={styles.loginEntryShell}>
        <AuthFlow
          returnTo={null}
          reason={reason}
          initialStep={initialStep}
          checkSessionOnMount={false}
          layout="full"
        />
        <AdminLoginAccessory returnTo={returnTo} autoOpen />
      </div>
    );
  }

  if (registrationAgentJoin && !joinKind) {
    return (
      <div className={styles.loginEntryShell}>
        <section className={styles.card}>
          <h1 className={styles.title}>Продолжение регистрации</h1>
          <p className={styles.lead}>
            Не удалось определить тип регистрации для этого входа. Вернитесь к выбору типа в
            регистрации и пройдите шаги заново.
          </p>
          <Link href={buildJoinHref({})} className={styles.entryRegistrationCta}>
            К регистрации
          </Link>
        </section>
      </div>
    );
  }

  if (needsRegistrationPreAuth && !preAuthReady && joinKind) {
    return (
      <div className={styles.loginEntryShell}>
        <RegistrationPreAuthConsent
          kind={joinKind}
          onContinue={() => {
            savePreAuthConsentAck(joinKind);
            setPreAuthReady(true);
          }}
        />
        <p className={styles.lead}>
          <Link href={buildJoinHref({ role: joinKind })}>Вернуться к шагам регистрации</Link>
        </p>
      </div>
    );
  }

  return (
    <div className={styles.loginEntryShell}>
      <AuthFlow
        returnTo={returnTo}
        reason={reason}
        initialStep={initialStep}
        registrationAgentJoin={registrationAgentJoin}
        registrationMessengerGateReady={needsRegistrationPreAuth ? preAuthReady : true}
        checkSessionOnMount
        layout="full"
      />
      <AdminLoginAccessory returnTo={returnTo} autoOpen={false} />
    </div>
  );
}
