/** Matches backend `moderationRevise.ts` limits. */
export const MIN_MODERATION_REJECT_REASON = 5;
export const MIN_MODERATION_REVISE_COMMENT = 10;

export function validateModerationRejectClient(reason: string): string | null {
  const r = reason.trim();
  if (r.length < MIN_MODERATION_REJECT_REASON) {
    return `Укажите причину (минимум ${MIN_MODERATION_REJECT_REASON} символов)`;
  }
  return null;
}

export function validateModerationReviseClient(comment: string): string | null {
  const c = comment.trim();
  if (c.length < MIN_MODERATION_REVISE_COMMENT) {
    return `Опишите, что нужно доработать (минимум ${MIN_MODERATION_REVISE_COMMENT} символов)`;
  }
  return null;
}
