import { CLIENTS_CONTRACT_BLOCKERS } from "@/lib/clients-parity/contracts";
import { ObserverContractBlocked } from "../observer/ObserverContractBlocked";

const receivingBlocker = CLIENTS_CONTRACT_BLOCKERS.find((b) => b.id === "BLK-RECEIVING-APPEALS");
const blockerId = receivingBlocker?.id ?? "BLK-RECEIVING-APPEALS";

export function ReceivingAppealsBlocked() {
  return (
    <ObserverContractBlocked
      title="Клиенты у меня"
      blockerId={blockerId}
      message={
        receivingBlocker?.summary ??
        "Принимающий список обращений, KPI, массовые действия и воронка недоступны без серверного контракта."
      }
      missingRoutes={receivingBlocker?.missingApi ?? []}
      testId="ca-receiving-appeals-blocked"
      titleId="ca-receiving-blocked-title"
    />
  );
}
