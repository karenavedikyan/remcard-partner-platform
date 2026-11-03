import { peekCabinetSession } from "@/lib/session";
import { computeCabinetShellContextToken } from "@/lib/cabinet-shell-context-token";
import { CabinetShellTemplateReconciler } from "@/components/layout/CabinetShellTemplateReconciler";

type CabinetShellProps = {
  children: React.ReactNode;
  /** Preserved for page parity; guards run on the page before this wrapper. */
  returnTo?: string;
};

/** Per-page fresh shell identity (soft nav re-runs the page segment, not route-group template). */
export async function CabinetShell({ children }: CabinetShellProps) {
  const user = await peekCabinetSession();
  const freshShellContextToken = await computeCabinetShellContextToken(user);

  return (
    <CabinetShellTemplateReconciler freshShellContextToken={freshShellContextToken}>
      {children}
    </CabinetShellTemplateReconciler>
  );
}
