/** Map legacy recommendations routes to agent R03 certificates, preserving query. */
export function mapRecommendationsPathToAgentCertificates(
  pathname: string,
  search: string,
): string {
  const q = search.startsWith("?") || !search ? search : `?${search}`;
  if (pathname === "/recommendations" || pathname === "/recommendations/") {
    return `/certificates${q}`;
  }
  if (pathname === "/recommendations/new") {
    return `/certificates/new${q}`;
  }
  const detail = pathname.match(/^\/recommendations\/([^/]+)$/);
  if (detail?.[1] && detail[1] !== "new") {
    return `/certificates/${encodeURIComponent(detail[1])}${q}`;
  }
  return `/certificates${q}`;
}
