import { requireProSession } from "@/lib/session";
import { loadCabinetShellClientProps } from "@/lib/cabinet-shell-data";
import { computeCabinetShellContextToken } from "@/lib/cabinet-shell-context-token";
import { CabinetAppShellClient } from "@/components/layout/CabinetAppShellClient";

type CabinetShellProps = {
  children: React.ReactNode;
  returnTo?: string;
};

export async function CabinetShell({ children, returnTo = "/" }: CabinetShellProps) {
  const user = await requireProSession(returnTo);
  const [shellProps, shellContextToken] = await Promise.all([
    loadCabinetShellClientProps(user),
    computeCabinetShellContextToken(user),
  ]);

  return (
    <CabinetAppShellClient {...shellProps} shellContextToken={shellContextToken}>
      {children}
    </CabinetAppShellClient>
  );
}
