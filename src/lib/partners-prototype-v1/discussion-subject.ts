/**
 * Mirrors navigator DISCUSSION_SUBJECT_MAX — keep FE paste/validator/submit aligned.
 * Do not invent a different limit for the link/discussion wizard.
 */
export const DISCUSSION_SUBJECT_MAX = 500;

/**
 * Clamp to DISCUSSION_SUBJECT_MAX UTF-16 code units (same as BE JS length).
 * If the cut lands inside a surrogate pair, drop the lone high surrogate —
 * do not redefine the limit as graphemes.
 */
export function clampDiscussionSubject(value: string): string {
  let sliced = value.slice(0, DISCUSSION_SUBJECT_MAX);
  if (sliced.length === 0) return sliced;
  const last = sliced.charCodeAt(sliced.length - 1);
  if (last >= 0xd800 && last <= 0xdbff) {
    sliced = sliced.slice(0, -1);
  }
  return sliced;
}

export function discussionSubjectError(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "Добавьте текст сообщения";
  if (trimmed.length > DISCUSSION_SUBJECT_MAX) {
    return `Сообщение не длиннее ${DISCUSSION_SUBJECT_MAX} символов`;
  }
  return null;
}
