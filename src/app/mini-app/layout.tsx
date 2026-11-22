import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "RemCard PROF — мини-кабинет",
  robots: { index: false, follow: false },
};

export default function MiniAppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mini-app-host" data-mini-app-root>
      {children}
    </div>
  );
}