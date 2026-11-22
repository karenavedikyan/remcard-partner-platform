export type MiniAppPlatform = "telegram" | "max";

export type MiniAppActionId =
  | "create_certificate"
  | "scan_qr"
  | "invite_partner"
  | "open_full_cabinet";

export type MiniAppBootstrap = {
  role: "agent" | "specialist" | "store" | "company";
  roleLabel: string;
  platform: MiniAppPlatform;
  displayName: string | null;
  entityLine: string | null;
  cabinetTitle: string;
  workplaceLabel: string | null;
  actions: Array<{
    id: MiniAppActionId;
    label: string;
    prominence: "primary" | "secondary" | "tertiary";
  }>;
  branches: Array<{ id: string; label: string; active: boolean }>;
  activeBranchId: string | null;
  workplaceForbidden: boolean;
  workplaceForbiddenMessage: string | null;
  wallet:
    | {
        status: "ok";
        confirmedUnpaidRub: number;
        awaitingRub: number;
        loadError: false;
      }
    | { status: "unavailable"; message: string; loadError: false }
    | { status: "error"; message: string; loadError: true };
  presentation: {
    cardIdentifier: string | null;
    historyHref: string;
    cardExplainer: string;
  };
  fullCabinetUrl: string;
  partnersUrl: string;
};

export type MiniAppSessionResult =
  | { status: "ok"; platform: MiniAppPlatform }
  | { status: "unlinked"; message: string; profLoginUrl: string }
  | { status: "cabinet_blocked"; nextStep?: string }
  | { status: "error"; message: string };