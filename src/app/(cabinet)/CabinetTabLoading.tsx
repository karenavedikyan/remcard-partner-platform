import { CabinetPageLoadingSkeleton } from "@/components/layout/CabinetPageLoadingSkeleton";
import {
  CABINET_TAB_LOADING_HEADINGS,
  type CabinetLoadingHeading,
} from "@/lib/cabinet-loading-copy";

export function CabinetTabLoading({ routeKey }: { routeKey: keyof typeof CABINET_TAB_LOADING_HEADINGS }) {
  return <CabinetPageLoadingSkeleton {...CABINET_TAB_LOADING_HEADINGS[routeKey]} />;
}

export function CabinetTabLoadingFromHeading(props: CabinetLoadingHeading) {
  return <CabinetPageLoadingSkeleton {...props} />;
}
