import { NAV_ICONS } from "@/components/layout/NavIcons";
import type { AgentNavSectionDef } from "@/lib/agent-nav/sections";

export function AgentNavIcon({ section }: { section: Pick<AgentNavSectionDef, "icon"> }) {
  if (section.icon === "wallet") {
    const Icon = NAV_ICONS.settlements;
    return <Icon />;
  }
  const Icon = NAV_ICONS[section.icon];
  return <Icon />;
}
