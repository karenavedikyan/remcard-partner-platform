import { Suspense } from "react";
import { StaffInviteAccept } from "@/components/invite/StaffInviteAccept";

export const dynamic = "force-dynamic";

export default function StaffInviteAcceptPage() {
  return (
    <Suspense
      fallback={
        <main style={{ padding: "2rem", fontFamily: "system-ui" }}>Загружаем приглашение…</main>
      }
    >
      <StaffInviteAccept />
    </Suspense>
  );
}
