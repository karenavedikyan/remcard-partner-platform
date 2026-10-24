/** WCAG AA text pairs for PROF admin moderation badges/status (source for regression tests). */
export type ModerationContrastPair = {
  id: string;
  theme: "light" | "dark";
  foreground: string;
  background: string;
  /** Minimum required contrast ratio (4.5 for normal text). */
  minRatio: number;
};

export const MODERATION_BADGE_CONTRAST_PAIRS: ModerationContrastPair[] = [
  {
    id: "badgePending",
    theme: "light",
    foreground: "#78350f",
    background: "#fffbeb",
    minRatio: 4.5,
  },
  {
    id: "badgePending",
    theme: "dark",
    foreground: "#fef3c7",
    background: "#78350f",
    minRatio: 4.5,
  },
  {
    id: "badgeTest",
    theme: "light",
    foreground: "#92400e",
    background: "#fef3c7",
    minRatio: 4.5,
  },
  {
    id: "badgeTest",
    theme: "dark",
    foreground: "#fde68a",
    background: "#92400e",
    minRatio: 4.5,
  },
  {
    id: "statusOk",
    theme: "light",
    foreground: "#166534",
    background: "#ecfdf5",
    minRatio: 4.5,
  },
  {
    id: "statusOk",
    theme: "dark",
    foreground: "#bbf7d0",
    background: "#052e16",
    minRatio: 4.5,
  },
  {
    id: "statusError",
    theme: "light",
    foreground: "#991b1b",
    background: "#fef2f2",
    minRatio: 4.5,
  },
  {
    id: "statusError",
    theme: "dark",
    foreground: "#fecaca",
    background: "#450a0a",
    minRatio: 4.5,
  },
  {
    id: "queueBadgeTest",
    theme: "light",
    foreground: "#92400e",
    background: "#fef3c7",
    minRatio: 4.5,
  },
  {
    id: "queueBadgeTest",
    theme: "dark",
    foreground: "#fde68a",
    background: "#92400e",
    minRatio: 4.5,
  },
];
