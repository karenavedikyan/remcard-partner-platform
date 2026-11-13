import { readFileSync } from "node:fs";
import path from "node:path";

export type StatsGridTheme = "light" | "dark";

export function loadObserverModuleCss(): string {
  return readFileSync(
    path.resolve(__dirname, "../../components/clients/observer/observer.module.css"),
    "utf8",
  );
}

export function buildObserverStatsGridHarnessHtml(css: string, theme: StatsGridTheme): string {
  return `<!DOCTYPE html>
<html lang="ru" data-theme="${theme}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700&display=swap" />
  <style>
    body { margin: 16px; font-family: Manrope, system-ui, sans-serif; }
    ${css}
  </style>
</head>
<body>
  <article class="partnerCard" data-testid="harness-card">
    <dl class="stats" data-testid="harness-stats" aria-label="Показатели">
      <div><dt>Всего</dt><dd>12</dd></div>
      <div><dt>В работе</dt><dd>3</dd></div>
      <div><dt>Оплачено</dt><dd>5</dd></div>
      <div><dt>Отказы</dt><dd>1</dd></div>
    </dl>
  </article>
</body>
</html>`;
}
