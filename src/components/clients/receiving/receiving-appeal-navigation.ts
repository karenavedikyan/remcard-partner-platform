/** P4 canonical receiving appeal navigation (Root contract). */

export function receivingAppealReturnHref(appealId: string): string {
  const params = new URLSearchParams({
    direction: "receiving",
    appealId,
  });
  return `/clients?${params.toString()}`;
}
