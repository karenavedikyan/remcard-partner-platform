import { PartnerModerationDetailClient } from "./PartnerModerationDetailClient";
import { requireProfPlatformAdmin } from "@/lib/prof-admin-session";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function PartnerModerationPage({ params }: Props) {
  const { id } = await params;
  await requireProfPlatformAdmin(`/admin/moderation/partners/${id}`);
  return <PartnerModerationDetailClient partnerId={id} />;
}
