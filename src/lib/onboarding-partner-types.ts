export type PartnerTypeOption = "MASTER" | "STORE" | "COMPANY";

export const PARTNER_TYPE_OPTIONS: {
  value: PartnerTypeOption;
  label: string;
  description: string;
}[] = [
  {
    value: "MASTER",
    label: "Специалист",
    description: "Мастер или бригада на этапах строительства и ремонта",
  },
  {
    value: "STORE",
    label: "Магазин",
    description: "Точка продаж строительных и отделочных материалов",
  },
  {
    value: "COMPANY",
    label: "Компания",
    description: "Компания с несколькими направлениями или филиалами",
  },
];
