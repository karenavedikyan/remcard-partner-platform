import { requireProSession } from "@/lib/session";
import { loadCabinetShellClientProps } from "@/lib/cabinet-shell-data";
import { CabinetAppShellClient } from "@/components/layout/CabinetAppShellClient";

type CabinetShellProps = {
  children: React.ReactNode;
  returnTo?: string;
};

export async function CabinetShell({ children, returnTo = "/" }: CabinetShellProps) {
  const user = await requireProSession(returnTo);
  const shellProps = await loadCabinetShellClientProps(user);

  return (
    <CabinetAppShellClient {...shellProps}>
      {children}
    </CabinetAppShellClient>
  );
}
