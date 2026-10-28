"use client";

import { useSyncExternalStore } from "react";

function subscribe(cb: () => void) {
  window.addEventListener("hashchange", cb);
  return () => window.removeEventListener("hashchange", cb);
}

function pathnameFromHash(): string {
  const hash = window.location.hash.replace(/^#/, "") || "/overview";
  const path = hash.startsWith("/") ? hash : `/${hash}`;
  if (path.startsWith("/overview")) return "/admin/overview";
  if (path.startsWith("/partners/partnerships")) return "/admin/partners/demo/partnerships";
  if (path.startsWith("/partners")) return "/admin/partners";
  if (path.startsWith("/moderation/preview")) return "/admin/moderation/organizations/org1";
  if (path.startsWith("/moderation")) return "/admin/moderation";
  if (path.startsWith("/notifications")) return "/admin/notifications";
  if (path.startsWith("/test-users")) return "/admin/test-users";
  if (path.startsWith("/password")) return "/admin/password";
  return "/admin/overview";
}

export function usePathname() {
  return useSyncExternalStore(subscribe, pathnameFromHash, () => "/admin/overview");
}

export function useRouter() {
  return {
    push: (href: string) => {
      window.location.hash = href.replace(/^\/admin\//, "/");
    },
    replace: (href: string) => {
      window.location.hash = href.replace(/^\/admin\//, "/");
    },
    refresh: () => {},
  };
}

export function useSearchParams() {
  const hash = window.location.hash.replace(/^#/, "");
  const pathPart = hash.split("?")[0] ?? hash;
  const qIdx = hash.indexOf("?");
  if (qIdx >= 0) return new URLSearchParams(hash.slice(qIdx + 1));
  if (pathPart.includes("partners/partnerships")) {
    return new URLSearchParams("status=ACTIVE&contextName=Owner+Partner");
  }
  return new URLSearchParams(window.location.search);
}
