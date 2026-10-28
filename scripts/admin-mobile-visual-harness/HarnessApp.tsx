"use client";

import { Suspense, useSyncExternalStore } from "react";
import { AdminHeader } from "@/app/admin/AdminHeader";
import { ProfAdminSessionVisit } from "@/app/admin/ProfAdminSessionVisit";
import adminStyles from "@/app/admin/Admin.module.css";
import { AdminOverviewClient } from "@/app/admin/overview/AdminOverviewClient";
import { AdminPartnersClient } from "@/app/admin/partners/AdminPartnersClient";
import { AdminPartnerPartnershipsClient } from "@/app/admin/partners/[id]/partnerships/AdminPartnerPartnershipsClient";
import { AdminModerationClient } from "@/app/admin/moderation/AdminModerationClient";
import { OrganizationModerationDetailClient } from "@/app/admin/moderation/organizations/[id]/OrganizationModerationDetailClient";
import { PartnerModerationDetailClient } from "@/app/admin/moderation/partners/[id]/PartnerModerationDetailClient";
import { ModerationPreviewModal } from "@/app/admin/moderation/organizations/[id]/ModerationPreviewModal";
import { PartnerModerationPreviewModal } from "@/app/admin/moderation/partners/[id]/PartnerModerationPreviewModal";
import { AdminNotificationsClient } from "@/app/admin/notifications/AdminNotificationsClient";
import { AdminTestUsersClient } from "@/app/admin/test-users/AdminTestUsersClient";
import { AdminPasswordChangePanel } from "@/app/admin/test-users/AdminPasswordChangePanel";
import { sampleOrgDetail, samplePartnerDetail } from "./mocks/fixtures";

function subscribe(cb: () => void) {
  window.addEventListener("hashchange", cb);
  return () => window.removeEventListener("hashchange", cb);
}

function readScene(): string {
  const raw = window.location.hash.replace(/^#\/?/, "") || "overview";
  return raw.split("?")[0] ?? "overview";
}

const IDENTITY = {
  displayName: "Harness Admin",
  staffRole: "ADMIN" as const,
};

function SceneBody({ scene }: { scene: string }) {
  switch (scene) {
    case "overview":
      return <AdminOverviewClient />;
    case "partners":
      return <AdminPartnersClient />;
    case "partners/partnerships":
      return (
        <Suspense fallback={<p>Загрузка партнёрств…</p>}>
          <AdminPartnerPartnershipsClient partnerUserId="owner-1" />
        </Suspense>
      );
    case "moderation":
      return (
        <Suspense fallback={<p>Загрузка модерации…</p>}>
          <AdminModerationClient />
        </Suspense>
      );
    case "moderation/partner-detail":
      return (
        <Suspense fallback={<p>Загрузка карточки партнёра…</p>}>
          <PartnerModerationDetailClient partnerId="u-pending" />
        </Suspense>
      );
    case "moderation/org-detail":
      return (
        <Suspense fallback={<p>Загрузка организации…</p>}>
          <OrganizationModerationDetailClient organizationId="org1" />
        </Suspense>
      );
    case "moderation/org-preview":
      return (
        <ModerationPreviewModal
          open
          mode="list"
          onClose={() => {}}
          org={sampleOrgDetail as never}
        />
      );
    case "moderation/partner-preview":
      return (
        <PartnerModerationPreviewModal open mode="list" onClose={() => {}} partner={samplePartnerDetail} />
      );
    case "notifications":
      return <AdminNotificationsClient />;
    case "test-users":
      return <AdminTestUsersClient />;
    case "password":
      return (
        <div className={adminStyles.adminPage}>
          <h1>Безопасность администратора</h1>
          <AdminPasswordChangePanel />
        </div>
      );
    case "shell":
      return <p>Изолированная оболочка admin для проверки мобильного меню (без server guards).</p>;
    default:
      return <p>Unknown harness scene: {scene}</p>;
  }
}

export function HarnessApp() {
  const scene = useSyncExternalStore(subscribe, readScene, () => "overview");

  return (
    <div className={adminStyles.shell} data-harness-scene={scene}>
      <ProfAdminSessionVisit />
      <AdminHeader identity={IDENTITY} />
      <main>
        <SceneBody scene={scene} />
      </main>
    </div>
  );
}
