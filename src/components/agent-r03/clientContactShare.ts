import type { AgentClientRow } from "@/lib/agent-r03/types";
import { formatPhoneForDisplay } from "@/lib/contact-phone-display";

export type ClientContactShareToggles = {
  phone: boolean;
  email: boolean;
  city: boolean;
};

export const DEFAULT_CLIENT_CONTACT_SHARE_TOGGLES: ClientContactShareToggles = {
  phone: false,
  email: false,
  city: false,
};

export function buildClientShareLines(
  client: Pick<AgentClientRow, "displayName" | "phone" | "email" | "city">,
  toggles: ClientContactShareToggles,
): string[] {
  const lines: string[] = [client.displayName.trim()];
  if (toggles.phone && client.phone) {
    lines.push(formatPhoneForDisplay(client.phone));
  }
  if (toggles.email && client.email) {
    lines.push(client.email.trim());
  }
  if (toggles.city && client.city) {
    lines.push(client.city.trim());
  }
  return lines.filter(Boolean);
}
