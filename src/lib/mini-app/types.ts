export type MiniAppPlatform = "telegram" | "max";

export type MiniAppActionId =
  | "create_certificate"
  | "scan_qr"
  | "invite_partner"
  | "open_full_cabinet";

export type MiniAppBootstrap = {
  actorUserId: string;
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
  canChooseWalletBranches?: boolean;
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
  | { status: "cabinet_blocked"; nextStep?: string; message: string }
  | { status: "session_missing"; message: string; retryable: boolean }
  | { status: "launch_invalid"; message: string }
  | { status: "no_access"; message: string }
  | { status: "error"; message: string };

export type MiniAppAuthSendCodeResult =
  | { status: "ok"; expiresAt: string; resendAfterSec?: number }
  | { status: "blocked"; message: string }
  | { status: "error"; message: string };

export type MiniAppAuthVerifyResult =
  | { status: "ok"; platform: MiniAppPlatform }
  | { status: "invalid_code"; message: string }
  | { status: "expired_code"; message: string }
  | { status: "no_prof_access"; message: string }
  | { status: "cabinet_blocked"; message: string; nextStep?: string }
  | { status: "blocked"; message: string }
  | { status: "error"; message: string };
