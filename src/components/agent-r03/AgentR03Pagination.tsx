"use client";

import { Button } from "@/components/ui/Button";
import styles from "./agent-r03.module.css";

type Props = {
  page: number;
  totalPages: number;
  pageSize: number;
  onPageSizeChange: (size: number) => void;
  onPrev: () => void;
  onNext: () => void;
  hasPrev: boolean;
  hasNext: boolean;
};

export function AgentR03Pagination({
  page,
  totalPages,
  pageSize,
  onPageSizeChange,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
}: Props) {
  return (
    <div className={styles.paginationBar} data-testid="agent-r03-pagination">
      <label className={styles.fieldInline}>
        На странице
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          data-testid="agent-r03-page-size"
        >
          {[25, 50, 100].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </label>
      <span className={styles.meta}>
        Страница {page} из {totalPages}
      </span>
      <div className={styles.paginationNav}>
        <Button type="button" variant="secondary" disabled={!hasPrev} onClick={onPrev}>
          Назад
        </Button>
        <Button type="button" variant="secondary" disabled={!hasNext} onClick={onNext}>
          Далее
        </Button>
      </div>
    </div>
  );
}
