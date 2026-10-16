import type { AgentCertificateRow } from './types';

/** Matches reference default once-per-partner usage copy when usageMode is not exposed in list DTO. */
export function certificateUsageLabel(_cert: AgentCertificateRow): string {
  return 'Одна покупка у каждого партнёра';
}
