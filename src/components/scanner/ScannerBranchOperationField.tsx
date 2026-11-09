"use client";

import type { ScannerBranchOption } from "@/lib/scanner-branch-context";
import styles from "./scanner.module.css";

type Props = {
  options: ScannerBranchOption[];
  value: string;
  disabled?: boolean;
  onChange: (branchId: string) => void;
};

export function ScannerBranchOperationField({ options, value, disabled, onChange }: Props) {
  return (
    <div className={styles.branchField}>
      <label className={styles.branchLabel} htmlFor="scanner-operation-branch">
        Филиал для операции
      </label>
      <select
        id="scanner-operation-branch"
        className={styles.branchSelect}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">Выберите филиал</option>
        {options.map((opt) => (
          <option key={opt.id} value={opt.id}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
