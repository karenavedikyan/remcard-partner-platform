"use client";

import { MiniAppLinkInviteFlow } from "./MiniAppLinkInviteFlow";

type Props = {
  partnersSearchUrl: string;
  onBack: () => void;
  /** Dev fixture flows only — not used in full invite path. */
  fixtureInviteLink?: string | null;
};

export function MiniAppInvitePartner({ onBack }: Props) {
  return <MiniAppLinkInviteFlow onBack={onBack} />;
}