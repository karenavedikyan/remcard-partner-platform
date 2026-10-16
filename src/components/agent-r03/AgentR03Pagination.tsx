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
    <div className={styles.collectionFooter} data-testid="agent-r03-pagination">
      <label className={styles.collectionFooterField}>
        На странице
        <select
          className={styles.collectionFooterSelect}
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
      <span className={styles.collectionFooterPages}>
        Страница {page} из {totalPages}
      </span>
      <div className={styles.collectionFooterNav}>
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
