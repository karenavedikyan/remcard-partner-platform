"use client";

type Props = {
  partnerId: string;
  onBack: () => void;
};

export function ObserverPartnerDetailMissing({ partnerId, onBack }: Props) {
  return (
    <div
      className="stack ca-section ca-section--observer"
      data-testid="ca-observer-partner-page"
      data-ca-state="missing"
    >
      <button type="button" className="ca-back" data-ca-action="observer:back" onClick={onBack}>
        <span aria-hidden="true">←</span> К партнёрам
      </button>
      <section className="panel empty ca-empty" data-testid="ca-observer-partner-missing">
        <h2>Партнёр не найден</h2>
        <p className="muted">Запись «{partnerId}» отсутствует в доступном списке или скрыта фильтрами.</p>
      </section>
    </div>
  );
}
