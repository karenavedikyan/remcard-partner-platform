"use client";

import styles from "./Tabs.module.css";

export type TabItem<T extends string> = {
  id: T;
  label: string;
  count?: number;
};

type TabsProps<T extends string> = {
  items: TabItem<T>[];
  active: T;
  onChange: (id: T) => void;
};

export function Tabs<T extends string>({ items, active, onChange }: TabsProps<T>) {
  return (
    <div className={styles.tabs} role="tablist">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          role="tab"
          aria-selected={active === item.id}
          className={`${styles.tab} ${active === item.id ? styles.tabActive : ""}`}
          onClick={() => onChange(item.id)}
        >
          {item.label}
          {item.count ? ` (${item.count})` : ""}
        </button>
      ))}
    </div>
  );
}
