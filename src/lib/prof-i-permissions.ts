/** Client mirror of navigator `prof-i-permissions.ts` (contract 2026-10-14.1). */

export const PROF_I_PERMISSIONS_CONTRACT_VERSION = "2026-10-14.1";

export type ProfIActionId =
  | "clients"
  | "scan"
  | "sale"
  | "own"
  | "ledger"
  | "cash"
  | "transfer"
  | "catalog"
  | "terms"
  | "team";

export type ProfIPermissionFlags = {
  canManageLeads: boolean;
  canManageCertificates: boolean;
  canActivateCertificates: boolean;
  canViewOwnOperations: boolean;
  canViewWallet: boolean;
  canPayBonusCash: boolean;
  canPayBonusTransfer: boolean;
  canManageCatalog: boolean;
  canManagePartnerships: boolean;
  canManageEmployees: boolean;
  canManageCrossRequests: boolean;
};

const ALL_FLAG_KEYS: (keyof ProfIPermissionFlags)[] = [
  "canManageLeads",
  "canManageCertificates",
  "canActivateCertificates",
  "canViewOwnOperations",
  "canViewWallet",
  "canPayBonusCash",
  "canPayBonusTransfer",
  "canManageCatalog",
  "canManagePartnerships",
  "canManageEmployees",
  "canManageCrossRequests",
];

export const PROF_I_ACTION_TO_FLAG: Record<ProfIActionId, keyof ProfIPermissionFlags> = {
  clients: "canManageLeads",
  scan: "canManageCertificates",
  sale: "canActivateCertificates",
  own: "canViewOwnOperations",
  ledger: "canViewWallet",
  cash: "canPayBonusCash",
  transfer: "canPayBonusTransfer",
  catalog: "canManageCatalog",
  terms: "canManagePartnerships",
  team: "canManageEmployees",
};

export const PROF_I_TEMPLATE_PRESETS: Record<
  string,
  { name: string; actionIds: ProfIActionId[] }
> = {
  sales: { name: "Продажи", actionIds: ["clients", "scan", "sale", "own"] },
  cashier: { name: "Касса", actionIds: ["scan", "sale", "own"] },
  manager: {
    name: "Управление",
    actionIds: ["clients", "scan", "sale", "own", "ledger", "catalog", "terms", "team"],
  },
  finance: { name: "Бухгалтер / просмотр расчётов", actionIds: ["ledger"] },
  payout: { name: "Ответственный за выплаты", actionIds: ["ledger", "cash", "transfer"] },
  viewer: { name: "Наблюдатель", actionIds: ["own"] },
  blank: { name: "Настроить с нуля", actionIds: [] },
};

function emptyFlags(): ProfIPermissionFlags {
  return {
    canManageLeads: false,
    canManageCertificates: false,
    canActivateCertificates: false,
    canViewOwnOperations: false,
    canViewWallet: false,
    canPayBonusCash: false,
    canPayBonusTransfer: false,
    canManageCatalog: false,
    canManagePartnerships: false,
    canManageEmployees: false,
    canManageCrossRequests: false,
  };
}

export function flagsFromActionIds(actionIds: ProfIActionId[]): ProfIPermissionFlags {
  const flags = emptyFlags();
  for (const id of actionIds) {
    const key = PROF_I_ACTION_TO_FLAG[id];
    if (key) flags[key] = true;
  }
  return normalizePermissionFlags(flags);
}

export function actionIdsFromFlags(flags: ProfIPermissionFlags): ProfIActionId[] {
  const out: ProfIActionId[] = [];
  for (const [id, key] of Object.entries(PROF_I_ACTION_TO_FLAG) as [
    ProfIActionId,
    keyof ProfIPermissionFlags,
  ][]) {
    if (flags[key]) out.push(id);
  }
  return out;
}

export function permissionLabelsFromFlags(flags: ProfIPermissionFlags): string[] {
  const labels: Record<ProfIActionId, string> = {
    clients: "Клиенты и рекомендации",
    scan: "Сканирование сертификатов",
    sale: "Продажа с начислением",
    own: "Свои операции",
    ledger: "Просмотр расчётов",
    cash: "Выплата наличными",
    transfer: "Выплата переводом",
    catalog: "Каталог",
    terms: "Условия партнёрств",
    team: "Управление командой",
  };
  return actionIdsFromFlags(flags).map((id) => labels[id]);
}

export function normalizePermissionFlags(
  input: Partial<ProfIPermissionFlags> | null | undefined,
): ProfIPermissionFlags {
  const base = emptyFlags();
  if (!input || typeof input !== "object") return base;
  for (const key of ALL_FLAG_KEYS) {
    if (typeof input[key] === "boolean") base[key] = input[key]!;
  }
  if (input.canViewWallet === false) {
    base.canViewWallet = false;
    base.canPayBonusCash = false;
    base.canPayBonusTransfer = false;
  } else {
    if (base.canPayBonusCash || base.canPayBonusTransfer) {
      base.canViewWallet = true;
    }
    if (!base.canViewWallet) {
      base.canPayBonusCash = false;
      base.canPayBonusTransfer = false;
    }
  }
  return base;
}

export function parsePermissionFlagsFromJson(raw: unknown): ProfIPermissionFlags | null {
  if (raw == null) return null;
  if (typeof raw !== "object") return null;
  return normalizePermissionFlags(raw as Partial<ProfIPermissionFlags>);
}

export function permissionSlice(employee: Partial<ProfIPermissionFlags>): ProfIPermissionFlags {
  return normalizePermissionFlags(employee);
}

export function flagsEqual(a: ProfIPermissionFlags, b: ProfIPermissionFlags): boolean {
  for (const key of ALL_FLAG_KEYS) {
    if (a[key] !== b[key]) return false;
  }
  return true;
}

export function toggleActionInSet(
  current: ProfIActionId[],
  actionId: ProfIActionId,
  enabled: boolean,
): ProfIActionId[] {
  const set = new Set(current);
  if (enabled) {
    set.add(actionId);
    if (actionId === "cash" || actionId === "transfer") set.add("ledger");
  } else {
    set.delete(actionId);
    if (actionId === "ledger") {
      set.delete("cash");
      set.delete("transfer");
    }
  }
  return actionIdsFromFlags(flagsFromActionIds([...set]));
}

export type OrganizationPermissionTemplate = {
  id: string;
  name: string;
  permissions: ProfIPermissionFlags;
  createdAt: string;
};
