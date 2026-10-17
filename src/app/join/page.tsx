import { Suspense } from "react";
import { RegistrationJoinFlow } from "@/components/registration/RegistrationJoinFlow";

export const dynamic = "force-dynamic";

export default function JoinPage() {
  return (
    <Suspense fallback={<p>Загружаем…</p>}>
      <RegistrationJoinFlow />
    </Suspense>
  );
}
