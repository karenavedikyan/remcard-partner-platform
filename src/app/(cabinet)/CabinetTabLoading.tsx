import {
  CabinetPageDetailLoadingSkeleton,
  CabinetPageLoadingSkeleton,
} from "@/components/layout/CabinetPageLoadingSkeleton";
import {
  CABINET_TAB_LOADING_HEADINGS,
  type CabinetLoadingHeading,
} from "@/lib/cabinet-loading-copy";

export function CabinetTabLoading({
  routeKey,
  variant = "list",
}: {
  routeKey: keyof typeof CABINET_TAB_LOADING_HEADINGS;
  variant?: "list" | "detail";
}) {
  if (variant === "detail") {
    return <CabinetPageDetailLoadingSkeleton />;
  }
  return <CabinetPageLoadingSkeleton {...CABINET_TAB_LOADING_HEADINGS[routeKey]} />;
}

export function CabinetTabLoadingFromHeading(props: CabinetLoadingHeading) {
  return <CabinetPageLoadingSkeleton {...props} />;
}
