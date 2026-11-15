import { useEffect, useState } from "react";
import { CertificatePolicyDialog } from "@/components/certificate-policy/CertificatePolicyDialog";
import { CertificatePolicyProfileEntry } from "@/components/certificate-policy/CertificatePolicyProfileEntry";
import { CertificateResultView } from "@/components/recommendations/CertificateResultView";
import { CertificatePolicyCompactChips } from "@/components/certificate-policy/CertificatePolicyCompactChips";
import { CertificatePolicyPublicDetails } from "@/components/certificate-policy/CertificatePolicyPublicDetails";
import { PartnerGeneralTermsDetails } from "@/components/partners/PartnerGeneralTermsDetails";
import { workspaces, issuedCertificate, issuedCertificateLegacy } from "./fixtures/workspaces";
import {
  resetHarnessCertificatePolicyWorkspace,
} from "./mocks/certificate-policy-api";
import {
  type HarnessApiMode,
  setHarnessActiveSceneId,
  setHarnessApiMode,
} from "./harness-state";
import "./harness.css";

const FIXTURE_LABEL =
  "LOCAL FIXTURE — certificate-policy-visual-harness · no backend / no orders / no messenger";

const API_MODES: { id: HarnessApiMode; label: string }[] = [
  { id: "success", label: "API · OK" },
  { id: "conflict_409", label: "API · 409" },
  { id: "network_error", label: "API · offline" },
  { id: "slow_pending", label: "API · slow" },
];

export function HarnessApp() {
  const [scene, setScene] = useState(workspaces[0]!.id);
  const [apiMode, setApiMode] = useState<HarnessApiMode>("success");
  const ws = workspaces.find((w) => w.id === scene)!;
  const [dialogGeneration, setDialogGeneration] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(true);

  useEffect(() => {
    setHarnessActiveSceneId(scene);
    resetHarnessCertificatePolicyWorkspace(scene);
    setDialogGeneration((g) => g + 1);
    if (ws.kind === "settings") setDialogOpen(true);
  }, [scene, ws.kind]);

  useEffect(() => {
    setHarnessApiMode(apiMode);
  }, [apiMode]);

  return (
    <div data-testid="cp-harness" data-fixture-label={FIXTURE_LABEL}>
      <header className="cp-harness-header">
        <strong>{FIXTURE_LABEL}</strong>
        <div role="group" aria-label="API mock" className="cp-harness-scenes">
          {API_MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              aria-pressed={apiMode === m.id}
              onClick={() => setApiMode(m.id)}
            >
              {m.label}
            </button>
          ))}
        </div>
        <div role="tablist" aria-label="Harness scenes" className="cp-harness-scenes">
          {workspaces.map((w) => (
            <button
              key={w.id}
              type="button"
              role="tab"
              aria-selected={scene === w.id}
              onClick={() => setScene(w.id)}
            >
              {w.label}
            </button>
          ))}
        </div>
      </header>

      <section className="cp-harness-panel" data-scene={scene}>
        {ws.kind === "settings" ? (
          <>
            {!dialogOpen ? (
              <p className="cp-harness-muted">
                Диалог закрыт.{" "}
                <button type="button" onClick={() => setDialogOpen(true)}>
                  Открыть «Условия сертификатов»
                </button>
              </p>
            ) : null}
            <CertificatePolicyDialog
              key={`${scene}-${dialogGeneration}`}
              open={dialogOpen}
              onClose={() => setDialogOpen(false)}
              canEditSettings={ws.canEditSettings}
              viewerUserId={ws.viewerUserId}
              initialTab={ws.initialTab}
              initialScope={ws.initialScope}
              initialPartnerUserId={ws.initialPartnerUserId}
            />
          </>
        ) : null}

        {ws.kind === "profile-entry" ? (
          <CertificatePolicyProfileEntry
            viewerUserId={ws.viewerUserId}
            canEditSettings={ws.canEditSettings}
          />
        ) : null}

        {ws.kind === "public-catalog" && ws.publicSummary ? (
          <CertificatePolicyCompactChips summary={ws.publicSummary} testId="harness-public" />
        ) : null}

        {ws.kind === "catalog-details" && ws.publicSummary ? (
          <div className="cp-harness-catalog-details">
            <CertificatePolicyPublicDetails
              policy={ws.publicSummary}
              items={ws.publicSummary.items}
              testId="harness-public-details"
            />
            <PartnerGeneralTermsDetails partnerUserId="cp-store-opt" />
          </div>
        ) : null}

        {ws.kind === "issued-dark" ? (
          <div className="rc-cert-dark-shell">
            <CertificateResultView certificate={issuedCertificate} showCreateSuccessBanner />
          </div>
        ) : null}

        {ws.kind === "issued-split" ? (
          <div className="rc-cert-dark-shell">
            <CertificateResultView
              certificate={ws.certificate!}
            />
          </div>
        ) : null}

        {ws.kind === "issued-legacy" ? (
          <CertificateResultView
            certificate={ws.certificate ?? issuedCertificateLegacy}
          />
        ) : null}
      </section>
    </div>
  );
}