"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
import {
  parseReceivingAppealReturnId,
  receivingAppealReturnHref,
} from "@/lib/clients-parity/receiving-appeal-return-href";
import styles from "./history.module.css";

/** Optional deep return to receiving appeal card when P4 passes ?appealId= on purchase detail. */
export function PurchaseAppealReturnLink() {
  const searchParams = useSearchParams();
  const href = useMemo(() => {
    const id = parseReceivingAppealReturnId(searchParams?.get("appealId") ?? null);
    return id ? receivingAppealReturnHref(id) : null;
  }, [searchParams]);

  if (!href) return null;

  return (
    <Link href={href} className={styles.meta}>
      К обращению
    </Link>
  );
}
