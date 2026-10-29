/**
 * Mirrors navigator DISCUSSION_SUBJECT_MAX — keep FE paste/validator/submit aligned.
 * Do not invent a different limit for the link/discussion wizard.
 */
export const DISCUSSION_SUBJECT_MAX = 500;

export function clampDiscussionSubject(value: string): string {
  return value.slice(0, DISCUSSION_SUBJECT_MAX);
}

export function discussionSubjectError(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "Добавьте текст сообщения";
  if (trimmed.length > DISCUSSION_SUBJECT_MAX) {
    return `Сообщение не длиннее ${DISCUSSION_SUBJECT_MAX} символов`;
  }
  return null;
}
