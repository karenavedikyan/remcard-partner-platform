/** User-facing copy for mini-app auth gates (no PII). */

export type MiniAppCabinetNextStep = "consents" | "profile" | string;

export function miniAppCabinetBlockedMessage(nextStep?: MiniAppCabinetNextStep): string {
  if (nextStep === "profile") {
    return "Кабинет партнёра ещё не готов: заполните профиль на сайте PROF.";
  }
  if (nextStep === "consents") {
    return "Кабинет партнёра ещё не готов: примите обязательные согласия на сайте PROF.";
  }
  return "Кабинет партнёра ещё не готов. Продолжите настройку на сайте PROF.";
}

export function miniAppProfContinueUrl(nextStep?: MiniAppCabinetNextStep): string {
  if (nextStep === "profile") return "/join";
  if (nextStep === "consents") return "/join";
  return "/join";
}

export function isLaunchContextError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("срок входа") ||
    m.includes("закройте и снова") ||
    m.includes("не удалось проверить вход мессенджера") ||
    m.includes("invalid_launch") ||
    m.includes("expired")
  );
}

export function miniAppLaunchInvalidMessage(): string {
  return "Данные запуска MAX устарели или недействительны. Закройте мини-приложение и откройте его снова из чата MAX.";
}

export function miniAppSessionRecoveryMessage(): string {
  return "Не удалось сохранить вход в мини-кабинете (сессия или сеть). Повторите автоматический вход или подтвердите вход кодом из MAX.";
}