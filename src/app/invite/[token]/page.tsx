import type { Metadata } from "next";
import { InviteLanding } from "@/components/invite/InviteLanding";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Приглашение к сотрудничеству · RemCard PROF",
  robots: { index: false, follow: false },
};

type InvitePageProps = {
  params: Promise<{ token: string }>;
};

export default async function InvitePage(props: InvitePageProps) {
  const params = await props.params;
  const token = decodeURIComponent(params.token ?? "").trim();
  return <InviteLanding token={token} />;
}
