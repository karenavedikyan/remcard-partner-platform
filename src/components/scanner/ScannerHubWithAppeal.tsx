"use client";

import { useSearchParams } from "next/navigation";
import { parseReceivingAppealIdFromSearch } from "@/lib/clients-parity/receiving-appeal-routes";
import { ScannerHub } from "./ScannerHub";

type Props = {
  userId: string;
};

export function ScannerHubWithAppeal({ userId }: Props) {
  const searchParams = useSearchParams();
  const receivingAppealId = parseReceivingAppealIdFromSearch(searchParams);
  return <ScannerHub userId={userId} receivingAppealId={receivingAppealId} />;
}
