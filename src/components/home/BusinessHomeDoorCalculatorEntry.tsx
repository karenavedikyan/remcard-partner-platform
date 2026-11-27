import Link from "next/link";
import { DOORS_CALCULATOR_HREF } from "@/lib/door-calculator/access";
import { IconArrowRight } from "@/components/layout/ThemeIcons";
import styles from "./SpecialistHomeDashboard.module.css";

export function BusinessHomeDoorCalculatorEntry() {
  return (
    <Link
      href={DOORS_CALCULATOR_HREF}
      className={styles.actionLine}
      aria-label="Открыть калькулятор дверей"
      data-testid="business-home-door-calculator"
    >
      <div>
        <h3>Калькулятор дверей</h3>
        <small>Расчёт заказа для клиента: проёмы, модель, сравнение, предложение</small>
      </div>
      <span className={styles.iconBtn} aria-hidden="true">
        <IconArrowRight width={20} height={20} />
      </span>
    </Link>
  );
}