import { MODEL_STATUS } from "@/lib/partner-1c-catalog/constants";
import type { ModelStatusCode } from "@/lib/partner-1c-catalog/types";
import { PcIconAlert, PcIconEye, PcIconEyeOff, PcIconImageOff } from "./Partner1cIcons";

const icons = {
  eye: PcIconEye,
  "eye-off": PcIconEyeOff,
  "image-off": PcIconImageOff,
  "circle-alert": PcIconAlert,
};

export function StatusPill({ code }: { code: ModelStatusCode }) {
  const [label, tone, iconKey] = MODEL_STATUS[code]!;
  const Icon = icons[iconKey as keyof typeof icons];
  return (
    <span className={`pill ${tone} pc-status`}>
      {Icon ? <Icon /> : null}
      {label}
    </span>
  );
}