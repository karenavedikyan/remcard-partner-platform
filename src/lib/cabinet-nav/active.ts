/** Match sidebar / mobile nav highlight, including profile vs team deep link. */
export function isCabinetNavItemActive(
  itemHref: string,
  pathname: string,
  searchParams: URLSearchParams | ReadonlyURLSearchParamsLike | null,
): boolean {
  const section = searchParams?.get("section") ?? null;

  if (itemHref === "/") {
    return pathname === "/";
  }

  const qIndex = itemHref.indexOf("?");
  if (qIndex !== -1) {
    const path = itemHref.slice(0, qIndex);
    if (pathname !== path) return false;
    const expected = new URLSearchParams(itemHref.slice(qIndex + 1));
    for (const [key, value] of expected.entries()) {
      if (searchParams?.get(key) !== value) return false;
    }
    return true;
  }

  if (itemHref === "/profile") {
    if (pathname !== "/profile" && !pathname.startsWith("/profile/")) return false;
    return section !== "team";
  }

  return pathname === itemHref || pathname.startsWith(`${itemHref}/`);
}

/** Minimal read-only search params for tests and Next.js hooks. */
export type ReadonlyURLSearchParamsLike = {
  get(name: string): string | null;
};
