import type { Metadata } from "next";
import { InviteLanding } from "@/components/invite/InviteLanding";
import { appConfig } from "@/lib/config";
import { fetchPublicLinkInvitePreview } from "@/lib/link-invite-public";
import {
  buildInviteLinkMetadata,
  inviteOpenGraphImageUrl,
} from "@/lib/invite-presentation";

export const dynamic = "force-dynamic";

type InvitePageProps = {
  params: Promise<{ token: string }>;
};

export async function generateMetadata(props: InvitePageProps): Promise<Metadata> {
  const params = await props.params;
  const token = decodeURIComponent(params.token ?? "").trim();
  const appOrigin = appConfig.appUrl;
  const pageUrl = `${appOrigin}/invite/${encodeURIComponent(token)}`;
  const ogImageUrl = inviteOpenGraphImageUrl(appOrigin);

  const preview = token ? await fetchPublicLinkInvitePreview(token) : null;

  return buildInviteLinkMetadata({ preview, pageUrl, ogImageUrl });
}

export default async function InvitePage(props: InvitePageProps) {
  const params = await props.params;
  const token = decodeURIComponent(params.token ?? "").trim();
  return <InviteLanding token={token} />;
}
