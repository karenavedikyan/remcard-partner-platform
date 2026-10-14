import type { AgentNavSectionKey } from "@/lib/agent-nav/sections";

export type MobileNavEditorState = {
  draft: AgentNavSectionKey[];
  replacement: AgentNavSectionKey | null;
};

export function toggleMobileNavChoice(
  state: MobileNavEditorState,
  key: AgentNavSectionKey,
  checked: boolean,
  permitted: readonly AgentNavSectionKey[],
): MobileNavEditorState {
  if (!permitted.includes(key)) return state;
  let draft = [...state.draft];
  let replacement: AgentNavSectionKey | null = null;

  if (checked && !draft.includes(key)) {
    if (draft.length < 4) draft.push(key);
    else replacement = key;
  }
  if (!checked) {
    draft = draft.filter((value) => value !== key);
  }

  return { draft, replacement };
}

export function applyMobileNavReplacement(
  state: MobileNavEditorState,
  replaceKey: AgentNavSectionKey,
): MobileNavEditorState {
  if (!state.replacement) return state;
  const index = state.draft.indexOf(replaceKey);
  if (index < 0) return { ...state, replacement: null };
  const draft = [...state.draft];
  draft[index] = state.replacement;
  return { draft, replacement: null };
}

export function moveMobileNavKey(
  draft: AgentNavSectionKey[],
  key: AgentNavSectionKey,
  direction: "up" | "down",
): AgentNavSectionKey[] {
  const index = draft.indexOf(key);
  if (index < 0) return draft;
  const target = direction === "up" ? index - 1 : index + 1;
  if (target < 0 || target >= draft.length) return draft;
  const next = [...draft];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

export function canSaveMobileNavEditor(state: MobileNavEditorState): boolean {
  return state.draft.length > 0 && state.replacement === null;
}
