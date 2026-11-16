import type { PartnersHubAudience } from "@/lib/partners-hub-presentation";

const SHARED_OVERVIEW_LEAD =
  "Магазины, мастера и компании, с которыми вы обмениваетесь клиентами. Условия по каждому партнёру открываются в его строке.";

const SHARED_ACTIVE_ZONE_HINT =
  "Кому вы можете рекомендовать клиентов и кто рекомендует вас. Архив скрывает запись только из списка, не отменяя условия.";

export type PartnersSharedUiCopy = {
  activeZoneHint: string;
  /** Lead of the overview head. An agent only recommends, so its copy is outgoing-only. */
  overviewLead: string;
  activeLead: string;
  invitationsLead: string;
  footnote: string;
  hubModalTitleFind: string;
  hubModalTitleLink: string;
};

const AGENT_COPY: PartnersSharedUiCopy = {
  activeZoneHint:
    "Партнёры, которым вы можете рекомендовать клиентов. Архив скрывает запись только из списка, не отменяя условия.",
  overviewLead:
    "Партнёры, которым вы рекомендуете клиентов. Условия по каждому партнёру открываются в его строке.",
  activeLead:
    "Ваши действующие партнёры. Ожидающие приглашения — во вкладке «Приглашения». Фильтры работают вместе; архив скрывает запись только у вас.",
  invitationsLead: "Приглашения, которые ждут решения или отправлены вами.",
  footnote:
    "Приглашения сотрудников находятся отдельно в разделе команды. Здесь только партнёрство.",
  hubModalTitleFind: "Найти партнёра",
  hubModalTitleLink: "Пригласить партнёра",
};

const BUSINESS_COPY: PartnersSharedUiCopy = {
  activeZoneHint: SHARED_ACTIVE_ZONE_HINT,
  overviewLead: SHARED_OVERVIEW_LEAD,
  activeLead:
    "Ваши действующие партнёры. Ожидающие приглашения — во вкладке «Приглашения». Фильтры работают вместе; архив скрывает запись только у вас.",
  invitationsLead:
    "Входящие и отправленные приглашения. Принятие не меняет условия автоматически — только поддержанные шаги контракта.",
  footnote:
    "Здесь партнёрство с другими участниками RemCard. Управление сотрудниками — в разделе команды.",
  hubModalTitleFind: "Найти партнёра",
  hubModalTitleLink: "Пригласить партнёра",
};

const SPECIALIST_COPY: PartnersSharedUiCopy = {
  activeZoneHint: SHARED_ACTIVE_ZONE_HINT,
  overviewLead: SHARED_OVERVIEW_LEAD,
  activeLead:
    "Ваши действующие партнёры. Ожидающие приглашения находятся в соседней вкладке. Фильтры применяются вместе. Архив скрывает запись только из списка, не отменяя условия.",
  invitationsLead:
    "Входящие и отправленные приглашения. Принятие приглашения не согласует условия автоматически — для этого нужен отдельный шаг, если он предусмотрен контрактом.",
  footnote:
    "Здесь только партнёрство с другими участниками RemCard. Управление сотрудниками организации — в разделе команды.",
  hubModalTitleFind: "Найти партнёра",
  hubModalTitleLink: "Пригласить партнёра",
};

export function partnersSharedUiCopy(audience: PartnersHubAudience | undefined): PartnersSharedUiCopy {
  if (audience === "specialist-r04") return SPECIALIST_COPY;
  if (audience === "business-store-r04" || audience === "business-company-r04") return BUSINESS_COPY;
  return AGENT_COPY;
}
