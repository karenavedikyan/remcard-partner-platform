"use client";

import { CabinetMobileMoreSheet } from "@/components/layout/CabinetMobileMoreSheet";
import { masterNavMoreItems } from "@/lib/master-nav/sections";

type Props = {
  open: boolean;
  onClose: () => void;
};

/** @deprecated Prefer CabinetMobileMoreSheet with explicit items. */
export function MasterMobileMoreSheet({ open, onClose }: Props) {
  return <CabinetMobileMoreSheet open={open} onClose={onClose} items={masterNavMoreItems()} />;
}
