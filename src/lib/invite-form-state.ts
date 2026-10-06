import {
  buildDefaultInviteRows,
  buildGeneralInviteRow,
  type InviteTermRow,
} from "./partnership-rules";

export type InviteFormSnapshot = {
  resetKey: string;
  rows: InviteTermRow[];
  useGeneralFallback: boolean;
  generalConfirmed: boolean;
  note: string;
  error: string;
};

export function buildInviteFormResetKey(targetId: string, categories: readonly string[]): string {
  return `${targetId}\0${categories.join("\0")}`;
}

export function categoriesFromResetKey(resetKey: string, targetId: string): string[] {
  const prefix = `${targetId}\0`;
  if (!resetKey.startsWith(prefix)) {
    return [];
  }
  const tail = resetKey.slice(prefix.length);
  return tail ? tail.split("\0") : [];
}

export function createInitialInviteFormState(
  resetKey: string,
  categories: readonly string[],
  blockedReason?: string,
): InviteFormSnapshot {
  if (blockedReason) {
    return {
      resetKey,
      rows: [],
      useGeneralFallback: false,
      generalConfirmed: false,
      note: "",
      error: "",
    };
  }

  if (categories.length > 0) {
    return {
      resetKey,
      rows: buildDefaultInviteRows([...categories]),
      useGeneralFallback: false,
      generalConfirmed: false,
      note: "",
      error: "",
    };
  }

  return {
    resetKey,
    rows: [],
    useGeneralFallback: true,
    generalConfirmed: false,
    note: "",
    error: "",
  };
}

/** Returns next state only when resetKey changes; preserves user edits otherwise. */
export function syncInviteFormState(
  current: InviteFormSnapshot,
  resetKey: string,
  categories: readonly string[],
  blockedReason?: string,
): InviteFormSnapshot {
  if (current.resetKey === resetKey) {
    return current;
  }
  return createInitialInviteFormState(resetKey, categories, blockedReason);
}

export function updateInviteRowPercent(
  state: InviteFormSnapshot,
  index: number,
  percent: string,
): InviteFormSnapshot {
  return {
    ...state,
    rows: state.rows.map((row, rowIndex) => (rowIndex === index ? { ...row, percent } : row)),
  };
}

export function updateInviteRowExcluded(
  state: InviteFormSnapshot,
  index: number,
  excluded: boolean,
): InviteFormSnapshot {
  return {
    ...state,
    rows: state.rows.map((row, rowIndex) => (rowIndex === index ? { ...row, excluded } : row)),
  };
}

export function updateInviteNote(state: InviteFormSnapshot, note: string): InviteFormSnapshot {
  return { ...state, note };
}

export function updateInviteGeneralConfirmed(
  state: InviteFormSnapshot,
  generalConfirmed: boolean,
): InviteFormSnapshot {
  return { ...state, generalConfirmed };
}

export function setInviteFormError(state: InviteFormSnapshot, error: string): InviteFormSnapshot {
  return { ...state, error };
}

export function activeInviteRows(state: InviteFormSnapshot): InviteTermRow[] {
  return state.useGeneralFallback ? [buildGeneralInviteRow()] : state.rows;
}
