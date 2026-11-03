import { peekCabinetSession } from "@/lib/session";
import { loadCabinetShellClientProps } from "@/lib/cabinet-shell-data";
import { computeCabinetShellContextToken } from "@/lib/cabinet-shell-context-token";
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
