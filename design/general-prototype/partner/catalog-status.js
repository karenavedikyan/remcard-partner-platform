// Pending is a demonstration state, not a server acknowledgement.
export function catalogPendingView(cardHtml) {
  return `<section class="stack production-catalog catalog-pending" data-profile-step="catalog">
    <section class="panel catalog-pending-hero" role="status" aria-labelledby="catalog-pending-title">
      <span class="eyebrow">Публикация в каталоге</span>
      <h2 id="catalog-pending-title" tabindex="-1">Заявка отправлена</h2>
      <span class="catalog-waiting-pill"><span aria-hidden="true"></span>Ожидает подтверждения</span>
      <p>Карточка передана на модерацию. Сейчас она <strong>ещё не опубликована</strong> и не видна клиентам в каталоге.</p>
      <div class="catalog-next-step"><strong>Что делать дальше?</strong><p>Дождитесь решения модератора. Повторно отправлять заявку не нужно. После одобрения карточка появится в каталоге.</p></div>
      <small>Демонстрация: реальная заявка не отправлялась. Этот статус сохраняется только в текущей вкладке.</small>
    </section>
    <ol class="catalog-publication-progress" aria-label="Статус публикации">
      <li data-state="done"><span>1</span><div><strong>Заявка отправлена</strong><small>Данные карточки сохранены</small></div></li>
      <li data-state="current" aria-current="step"><span>2</span><div><strong>Ожидает подтверждения</strong><small>Ожидаем решения модератора</small></div></li>
      <li data-state="future"><span>3</span><div><strong>Публикация в каталоге</strong><small>После одобрения</small></div></li>
    </ol>
    <details class="panel catalog-submitted-card"><summary>Посмотреть отправленную карточку</summary>${cardHtml}</details>
    <div class="row"><button type="button" class="btn" data-profile-action="tab" data-profile-id="overview">Вернуться к профилю</button></div>
  </section>`;
}
