import { OrganizationModerationDetailClient } from "./OrganizationModerationDetailClient";
import { requireProfPlatformAdmin } from "@/lib/prof-admin-session";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function OrganizationModerationPage({ params }: Props) {
  const { id } = await params;
  await requireProfPlatformAdmin(`/admin/moderation/organizations/${id}`);
  return <OrganizationModerationDetailClient organizationId={id} />;
}
