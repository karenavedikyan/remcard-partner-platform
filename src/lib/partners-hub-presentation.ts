import type { AgentR04Status } from "@/lib/agent-r04/api";
import type { SpecialistR06Status } from "@/lib/specialist-r06/types";
import type { SearchRole } from "@/lib/partnership-rules";

export type PartnersHubShell = "legacy" | "shared-r04";

export type PartnersPageHeading = {
  eyebrow: string;
  title: string;
  description: string;
};

export type PartnersHubAudience = "legacy" | "agent-r04" | "specialist-r04";

export type PartnersHubPresentation = {
  shell: PartnersHubShell;
  audience: PartnersHubAudience;
  heading: PartnersPageHeading;
  /** Agent R04 search only; specialist/store use server defaultSearchRoleForUser. */
  defaultSearchRole?: SearchRole;
};

type R04Gate = Pick<AgentR04Status, "featureEnabled" | "eligible">;
type R06Gate = Pick<SpecialistR06Status, "featureEnabled" | "eligible">;

export function resolvePartnersHubPresentation(input: {
  r04: R04Gate | null;
  r06: R06Gate | null;
}): PartnersHubPresentation {
  const r04Eligible = Boolean(input.r04?.featureEnabled && input.r04?.eligible);

  if (r04Eligible) {
    return {
      shell: "shared-r04",
      audience: "agent-r04",
      defaultSearchRole: "agent",
      heading: {
        eyebrow: "АГЕНТ",
        title: "Партнёры",
        description: "Действующие партнёры, поиск в RemCard и согласование условий.",
      },
    };
  }

  const specialistShared = Boolean(input.r06?.featureEnabled && input.r06?.eligible);

  if (specialistShared) {
    return {
      shell: "shared-r04",
      audience: "specialist-r04",
      heading: {
        eyebrow: "Специалист",
        title: "Партнёры",
        description: "Действующие партнёры, поиск в RemCard и согласование условий.",
      },
    };
  }

  return {
    shell: "legacy",
    audience: "legacy",
    heading: {
      eyebrow: "Партнёрская сеть",
      title: "Мои партнёры",
      description:
        "Список партнёров, поиск по каталогу, приглашения и согласование условий.",
    },
  };
}
