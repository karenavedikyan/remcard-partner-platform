"use client";

import { PageHeading } from "@/components/ui/PageHeading";
import { RecommendationsList } from "@/components/recommendations/RecommendationsList";
import { CertificateDetail } from "@/components/recommendations/CertificateDetail";
import { RecommendationCreateWithClient } from "@/components/recommendations/RecommendationCreateWithClient";
import { SpecialistCertificateDetailRedirect } from "@/components/specialist-certificates/SpecialistCertificateDetailRedirect";
import { SpecialistRecommendationsNewRedirect } from "@/components/specialist-certificates/SpecialistRecommendationsNewRedirect";
import { OwnerIssuerGate } from "@/components/specialist-certificates/OwnerIssuerGate";
import { useOwnerIssuerMode } from "@/components/specialist-certificates/OwnerIssuerModeContext";
import { SpecialistCertificatesList } from "@/components/specialist-certificates/SpecialistCertificatesList";
import { SPECIALIST_CERTIFICATES_PAGE } from "@/lib/specialist-certificates/copy";

function RecommendationsListPageContent() {
  const mode = useOwnerIssuerMode();
  if (mode === "specialist") {
    return (
      <>
        <PageHeading
          eyebrow={SPECIALIST_CERTIFICATES_PAGE.eyebrow}
          title={SPECIALIST_CERTIFICATES_PAGE.title}
        />
        <SpecialistCertificatesList />
      </>
    );
  }
  return (
    <>
      <PageHeading
        eyebrow="RemCard PROF"
        title="Мои рекомендации"
        description="Документы со скидкой, которые вы создали для клиентов."
      />
      <RecommendationsList />
    </>
  );
}

function RecommendationsCreatePageContent() {
  const mode = useOwnerIssuerMode();
  if (mode === "specialist") {
    return <SpecialistRecommendationsNewRedirect />;
  }
  return (
    <>
      <PageHeading
        eyebrow="Новая рекомендация"
        title="Создать документ для клиента"
        description="Выберите партнёров и укажите скидку — условия проверит сервер."
      />
      <RecommendationCreateWithClient />
    </>
  );
}

function RecommendationsDetailPageContent({ certificateId }: { certificateId: string }) {
  const mode = useOwnerIssuerMode();
  if (mode === "specialist") {
    return <SpecialistCertificateDetailRedirect certificateId={certificateId} />;
  }
  return (
    <>
      <PageHeading
        eyebrow="Рекомендация"
        title="Документ для клиента"
        description="QR-код, ссылка для клиента и PDF-документ рекомендации."
      />
      <CertificateDetail certificateId={certificateId} />
    </>
  );
}

export function RecommendationsListRouteBody() {
  return (
    <OwnerIssuerGate>
      <RecommendationsListPageContent />
    </OwnerIssuerGate>
  );
}

export function RecommendationsCreateRouteBody() {
  return (
    <OwnerIssuerGate>
      <RecommendationsCreatePageContent />
    </OwnerIssuerGate>
  );
}

export function RecommendationsDetailRouteBody({ certificateId }: { certificateId: string }) {
  return (
    <OwnerIssuerGate>
      <RecommendationsDetailPageContent certificateId={certificateId} />
    </OwnerIssuerGate>
  );
}
