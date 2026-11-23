"use client";

import { AgentPartnersHub } from "@/components/partners/AgentPartnersHub";
import { PartnerLinkInviteGallery } from "@/components/partners/PartnerLinkInviteGallery";
import { PartnersHeadingLinkInvites } from "@/components/partners/PartnersHeadingLinkInvites";
import { PartnersHub } from "@/components/partners/PartnersHub";
import {
  linkInviteGalleryBindingsFromController,
  PartnersPageChromeProvider,
  useLinkInviteGalleryController,
  usePartnersPageChrome,
} from "@/components/partners/partnersPageChrome";
import { PageHeading } from "@/components/ui/PageHeading";
import type { OrganizationPartnershipReadContext } from "@/lib/employee-workspace-data/organization-partnership-read";
import type { PartnersHubPresentation } from "@/lib/partners-hub-presentation";
import type { ProContextSnapshot } from "@/lib/profile-cabinet-access";
import type { ProProfileResponse } from "@/lib/types";

export type PartnersCabinetPageProps = {
  presentation: PartnersHubPresentation;
  meId: string;
  partnershipSubjectUserId: string;
  organizationReadContext: OrganizationPartnershipReadContext | null;
  initialProfile: ProProfileResponse;
  proContext: ProContextSnapshot | null;
  proContextReady: boolean;
  showInviteGalleryInitially?: boolean;
};

function PartnersPageHeading({ presentation }: { presentation: PartnersHubPresentation }) {
  const chrome = usePartnersPageChrome();
  return (
    <PageHeading
      eyebrow={presentation.heading.eyebrow}
      title={presentation.heading.title}
      description={presentation.heading.description}
      compact
      headerLayout="partnersChrome"
      actionSlotRef={chrome?.setHeadingAction}
    />
  );
}

export function PartnersCabinetPage(props: PartnersCabinetPageProps) {
  const linkInviteGallery = useLinkInviteGalleryController(props.showInviteGalleryInitially);
  const hubGalleryBindings = linkInviteGalleryBindingsFromController(linkInviteGallery);
  const hubCommon = {
    meId: props.meId,
    partnershipSubjectUserId: props.partnershipSubjectUserId,
    organizationReadContext: props.organizationReadContext,
    initialProfile: props.initialProfile,
    proContext: props.proContext,
    proContextReady: props.proContextReady,
    linkInviteGallery: hubGalleryBindings,
    renderLinkInviteGallery: false as const,
  };

  return (
    <PartnersPageChromeProvider linkInviteGallery={linkInviteGallery}>
      <PartnersPageHeading presentation={props.presentation} />
      <PartnersHeadingLinkInvites />
      {props.presentation.shell === "shared-r04" ? (
        <AgentPartnersHub
          {...hubCommon}
          defaultSearchRole={props.presentation.defaultSearchRole}
          presentationAudience={props.presentation.audience}
        />
      ) : (
        <PartnersHub {...hubCommon} />
      )}
      <PartnerLinkInviteGallery
        open={linkInviteGallery.open}
        onClose={linkInviteGallery.closeGallery}
        meProfile={props.initialProfile}
        refreshToken={linkInviteGallery.refreshToken}
      />
    </PartnersPageChromeProvider>
  );
}
