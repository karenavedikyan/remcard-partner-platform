"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { receivingAppealReturnHref } from "@/components/clients/receiving/receiving-appeal-navigation";
import { parseReceivingAppealReturnId } from "@/lib/clients-parity/receiving-appeal-return-query";

type PurchaseAppealReturnLinkProps = {
  linkClassName?: string;
};

/** Optional deep return to receiving appeal card when P4 passes ?appealId= on purchase detail. */
export function PurchaseAppealReturnLink({ linkClassName }: PurchaseAppealReturnLinkProps) {
  const searchParams = useSearchParams();
  const href = useMemo(() => {
    const id = parseReceivingAppealReturnId(searchParams?.get("appealId") ?? null);
    return id ? receivingAppealReturnHref(id) : null;
  }, [searchParams]);

  if (!href) return null;

  return (
    <Link href={href} className={linkClassName}>
      К обращению
    </Link>
  );
}
