"use client";

import { useTheme } from "@/contexts/ThemeContext";
import { IconMoon, IconSun } from "@/components/layout/ThemeIcons";
import styles from "./ThemeToggle.module.css";

export function ThemeToggle() {
  const { resolvedTheme, toggleLightDark } = useTheme();
  const isDark = resolvedTheme === "dark";
  const label = isDark ? "Включить светлую тему" : "Включить тёмную тему";

  return (
    <button
      type="button"
      className={styles.toggle}
      onClick={toggleLightDark}
      aria-label={label}
      title={label}
      data-testid="theme-toggle"
    >
      {isDark ? <IconSun /> : <IconMoon />}
    </button>
  );
}
