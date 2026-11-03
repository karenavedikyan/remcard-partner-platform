import { peekCabinetSession } from "@/lib/session";
import { loadCabinetShellClientProps } from "@/lib/cabinet-shell-data";
import { CabinetAppShellClient } from "@/components/layout/CabinetAppShellClient";

export default async function CabinetRouteGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await peekCabinetSession();
  if (!user) {
    return children;
  }

  const shellProps = await loadCabinetShellClientProps(user);
  return <CabinetAppShellClient {...shellProps}>{children}</CabinetAppShellClient>;
}
