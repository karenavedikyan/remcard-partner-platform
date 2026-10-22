import {
  BUSINESS_MOBILE_BOTTOM,
  businessNavMoreItems,
  businessPageTitleWithSection,
  COMPANY_DESKTOP_NAV,
  STORE_DESKTOP_NAV,
} from "@/lib/business-nav/sections";
import type { CabinetNavMode } from "@/lib/cabinet-nav/mode";
import {
  MASTER_DESKTOP_NAV,
  MASTER_MOBILE_BOTTOM,
  masterNavMoreItems,
  masterPageTitle,
  type MasterNavItem,
} from "@/lib/master-nav/sections";

export type CabinetNavConfig = {
  desktop: MasterNavItem[];
  mobileBottom: MasterNavItem[];
  moreItems: () => MasterNavItem[];
  pageTitle: (pathname: string, section: string | null) => string;
};

const LEGACY_CONFIG: CabinetNavConfig | null = null;

export function cabinetNavConfig(mode: CabinetNavMode): CabinetNavConfig | null {
  switch (mode) {
    case "master":
      return {
        desktop: MASTER_DESKTOP_NAV,
        mobileBottom: MASTER_MOBILE_BOTTOM,
        moreItems: masterNavMoreItems,
        pageTitle: (pathname) => masterPageTitle(pathname),
      };
    case "business-store":
      return {
        desktop: STORE_DESKTOP_NAV,
        mobileBottom: BUSINESS_MOBILE_BOTTOM,
        moreItems: () => businessNavMoreItems(STORE_DESKTOP_NAV),
        pageTitle: (pathname, section) =>
          businessPageTitleWithSection(pathname, section, STORE_DESKTOP_NAV),
      };
    case "business-company":
      return {
        desktop: COMPANY_DESKTOP_NAV,
        mobileBottom: BUSINESS_MOBILE_BOTTOM,
        moreItems: () => businessNavMoreItems(COMPANY_DESKTOP_NAV),
        pageTitle: (pathname, section) =>
          businessPageTitleWithSection(pathname, section, COMPANY_DESKTOP_NAV),
      };
    case "legacy":
      return LEGACY_CONFIG;
    default: {
      const _exhaustive: never = mode;
      return _exhaustive;
    }
  }
}
