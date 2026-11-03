import { peekCabinetSession } from "@/lib/session";
import { computeCabinetShellContextToken } from "@/lib/cabinet-shell-context-token";
import { CabinetShellTemplateReconciler } from "@/components/layout/CabinetShellTemplateReconciler";

export default async function CabinetRouteGroupTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await peekCabinetSession();
  const freshShellContextToken = await computeCabinetShellContextToken(user);

  return (
    <CabinetShellTemplateReconciler freshShellContextToken={freshShellContextToken}>
      {children}
    </CabinetShellTemplateReconciler>
  );
}
