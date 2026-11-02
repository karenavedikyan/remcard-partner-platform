"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { remcardFetch, RemcardApiError } from "@/lib/api-client";
import { parseRubles, rewardActionLabels, type RewardAction, type RewardAttempt, type RewardResponse } from "@/lib/reward-lifecycle-types";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/FormField";
import styles from "./reward-lifecycle.module.css";

const money = (k: number) => `${(k / 100).toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₽`;
const date = (at: string) => `${new Date(at).toLocaleString("ru-RU", { timeZone: "Europe/Moscow" })} МСК`;

export function RewardLifecyclePanel({ orderId, onChanged }: { orderId: string; onChanged?: () => void }) {
  const [data, setData] = useState<RewardResponse | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [storageFault, setStorageFault] = useState(false);
  const [uncertain, setUncertain] = useState<RewardAttempt | null>(null);
  const [confirmation, setConfirmation] = useState<{ action: RewardAction; text: string } | null>(null);
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [method, setMethod] = useState<"CASH" | "TRANSFER">("TRANSFER");
  const inFlight = useRef(false);
  const endpoint = `/api/pro/wallet/order-rewards/${encodeURIComponent(orderId)}`;
  const storageKey = data ? `remcard:reward-attempt:${data.actorId}:${orderId}` : null;
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await remcardFetch<RewardResponse>(endpoint);
      setData(response);
      try {
        const saved = localStorage.getItem(`remcard:reward-attempt:${response.actorId}:${orderId}`);
        const parsed = saved ? JSON.parse(saved) as RewardAttempt : null;
        if (saved && (!parsed || typeof parsed.key !== "string" || !parsed.action || typeof parsed.action.type !== "string"))
          throw new Error("Invalid saved operation");
        setUncertain(parsed); setStorageFault(false);
      } catch {
        setStorageFault(true);
        setError("Не удалось прочитать сохранённую операцию. Действия заблокированы, чтобы не отправить её повторно. Проверьте хранилище браузера.");
      }
    } catch (e) { setError(e instanceof Error ? e.message : "Не удалось загрузить начисление"); }
    finally { setLoading(false); }
  }, [endpoint, orderId]);
  useEffect(() => { void load(); }, [load]);

  async function execute(attempt: RewardAttempt) {
    if (!storageKey || storageFault || inFlight.current) return;
    inFlight.current = true; setBusy(true); setError("");
    try {
      // Persist before sending. An unknown result must be retried with this exact body and key.
      localStorage.setItem(storageKey, JSON.stringify(attempt));
    } catch {
      setError("Операция не отправлена: недоступно хранилище браузера.");
      inFlight.current = false; setBusy(false); return;
    }
    setUncertain(attempt);
    try {
      const response = await remcardFetch<RewardResponse>(endpoint, {
        method: "POST", body: attempt.action, idempotencyKey: attempt.key, requireCsrf: true,
      });
      localStorage.removeItem(storageKey);
      setUncertain(null); setConfirmation(null); setAmounts({}); setData(response);
      window.dispatchEvent(new Event("remcard:reward-changed"));
      onChanged?.();
    } catch (e) {
      const knownRejection = e instanceof RemcardApiError && e.status >= 400 && e.status < 500 &&
        e.status !== 408 && e.status !== 429;
      if (knownRejection) {
        localStorage.removeItem(storageKey); setUncertain(null); setConfirmation(null);
      }
      setError(e instanceof Error ? e.message : "Ответ не получен. Повторите проверку той же операции.");
    } finally { inFlight.current = false; setBusy(false); }
  }
  function prepare(action: () => RewardAction, text: string) {
    try { setError(""); setConfirmation({ action: action(), text }); }
    catch (e) { setError(e instanceof Error ? e.message : "Проверьте сумму"); }
  }
  const input = (key: string, label: string) => <TextField id={`reward-${orderId}-${key}`} label={label} inputMode="decimal"
    value={amounts[key] ?? ""} onChange={e => setAmounts(prev => ({ ...prev, [key]: e.target.value }))}
    disabled={busy || !!uncertain} data-testid={`reward-amount-${key}`} />;
  if (loading && !data) return <p role="status">Загружаем условия вознаграждения…</p>;
  if (!data) return <div role="alert"><p>{error}</p><Button variant="secondary" onClick={() => void load()}>Повторить</Button></div>;
  if (!data.reward || !data.permissions) return null;
  const { reward: r, permissions: p } = data;
  const label = r.summary.review ? "Требует сверки после возврата"
    : r.summary.suspended ? "Есть приостановленная сумма"
    : r.summary.pending && r.summary.confirmed ? "Частично подтверждено"
    : r.summary.pending ? "Начислено, ожидает подтверждения"
    : r.summary.confirmed ? "Подтверждено"
    : r.summary.paid ? "Оплачено" : "Возврат / отмена начисления";
  return <section className={styles.panel} data-testid={`reward-lifecycle-${orderId}`}>
    <h3>Вознаграждение по покупке</h3><p className={styles.status}>{label}</p>
    <p>{r.lines.every(l => l.returnedGrossKopecks === l.grossKopecks) ? "Покупка: полный возврат"
      : r.lines.some(l => l.returnedGrossKopecks > 0) ? "Покупка: частичный возврат"
      : r.lines.every(l => !!l.fulfilledAt) ? "Товар передан / работы приняты"
      : r.lines.some(l => !!l.fulfilledAt) ? "Часть позиций ожидает передачи / принятия"
      : "Покупка ожидает передачи товара / принятия работ"}</p>
    <dl className={styles.totals}>
      <div><dt>Подтверждено к расчёту</dt><dd data-testid="reward-confirmed">{money(r.summary.confirmed)}</dd></div>
      <div><dt>Ожидает подтверждения</dt><dd data-testid="reward-pending">{money(r.summary.pending)}</dd></div>
      <div><dt>Приостановлено</dt><dd>{money(r.summary.suspended)}</dd></div>
      <div><dt>Получение денег подтверждено</dt><dd>{money(r.summary.paid)}</dd></div>
    </dl>
    {r.summary.review > 0 ? <p role="alert">После возврата требуется отдельная сверка: {money(r.summary.review)}. История полученных выплат сохранена.</p> : null}
    <p className={styles.note}>В баланс входит только подтверждённая неоплаченная сумма. Сроки считаются полными календарными днями после передачи товара / принятия работ, по московскому времени. Они не отменяют законные права клиента.</p>
    {error ? <p role="alert">{error}</p> : null}
    {storageFault ? <Button variant="secondary" onClick={() => void load()}>Повторить загрузку</Button> : null}
    {uncertain ? <div className={styles.warning} role="status">
      <p>Проверьте результат ранее отправленной операции. Повтор использует тот же ключ и не создаёт её заново.</p>
      <Button disabled={busy} variant="secondary" onClick={() => void execute(uncertain)}>Проверить результат операции</Button>
    </div> : null}
    {confirmation && !uncertain ? <div className={styles.warning} role="group" aria-label="Подтверждение действия">
      <p>{confirmation.text}</p>
      <Button disabled={busy} onClick={() => void execute({ key: crypto.randomUUID(), action: confirmation.action })}>Подтвердить действие</Button>
      <Button variant="text" disabled={busy} onClick={() => setConfirmation(null)}>Отмена</Button>
    </div> : null}
    <fieldset disabled={busy || storageFault || !!uncertain || !!confirmation} className={styles.controls}>
      <legend>Категории и условия</legend>
      {r.lines.map(line => <article className={styles.line} key={line.id}>
        <h4>{line.categoryLabel} · {line.kind === "GOODS" ? "товар" : "услуга"}</h4>
        <p>Начислено: {money(line.amount)} · срок: {line.days} дн.</p>
        {line.returnedGrossKopecks > 0 ? <p>
          {line.returnedGrossKopecks === line.grossKopecks ? "Полный возврат" : "Частичный возврат"}:
          {" "}{money(line.returnedGrossKopecks)} покупки до скидки. Исходное вознаграждение: {money(line.originalKopecks)}.
        </p> : null}
        <p>{!line.fulfilledAt ? "Ожидает передачи товара / принятия работ"
          : `Передано / принято: ${date(line.fulfilledAt)}`}</p>
        {line.confirmationAt ? <p>{line.confirmedAt ? "Подтверждено" : "Подтверждение не ранее"}: {date(line.confirmedAt ?? line.confirmationAt)}</p> : null}
        <p>Подтверждено: {money(line.confirmed)} · ожидает: {money(line.pending)} · приостановлено: {money(line.suspended)}</p>
        {p.sellerAllowed && !line.fulfilledAt && line.amount > 0 ? <Button variant="secondary"
          onClick={() => prepare(() => ({ type: "fulfill", lineId: line.id, fulfilledAt: "ON_OPERATION" }),
            `${line.categoryLabel}: товар действительно передан или работы приняты сейчас?`)}>Отметить передачу / принятие</Button> : null}
        <details><summary>Возврат и приостановление</summary>
          {p.sellerAllowed && line.returnedGrossKopecks < line.grossKopecks ? <div className={styles.form}>
            {input(`return-${line.id}`, "Возвращаемая сумма покупки до скидки, ₽")}
            <Button variant="secondary" onClick={() => prepare(() => ({
              type: "return", lineId: line.id, grossKopecks: parseRubles(amounts[`return-${line.id}`] ?? ""),
            }), `${line.categoryLabel}: зарегистрировать возврат ${amounts[`return-${line.id}`] ?? ""} ₽ покупки до скидки? Вознаграждение уменьшится пропорционально.`)}>Зарегистрировать возврат</Button>
          </div> : null}
          {p.canSuspend && line.pending + line.confirmed > 0 && !line.suspended ? <div className={styles.form}>
            {input(`suspend-${line.id}`, "Приостановить из вознаграждения, ₽")}
            <Button variant="secondary" onClick={() => prepare(() => ({
              type: "suspend", lineId: line.id, kopecks: parseRubles(amounts[`suspend-${line.id}`] ?? ""),
            }), `${line.categoryLabel}: приостановить ${amounts[`suspend-${line.id}`] ?? ""} ₽ вознаграждения?`)}>Приостановить сумму</Button>
          </div> : null}
          {line.canResume && line.suspended > 0 ? <Button variant="secondary" onClick={() => prepare(
            () => ({ type: "resume", lineId: line.id }), `${line.categoryLabel}: снять своё приостановление?`
          )}>Снять приостановление</Button> : null}
        </details>
      </article>)}
      {(p.cash || p.transfer) && r.summary.confirmed > 0 ? <div className={styles.line}>
        <h4>Сообщить об отправке денег</h4>
        <p>Это не подтверждает получение. Партнёр отдельно подтвердит фактически поступившую сумму.</p>
        {input("payment", "Отправленная сумма, ₽")}
        <label className={styles.select}>Способ выплаты<select value={p.transfer && p.cash ? method : p.cash ? "CASH" : "TRANSFER"}
          onChange={e => setMethod(e.target.value as "CASH" | "TRANSFER")}>
          {p.transfer ? <option value="TRANSFER">Перевод</option> : null}
          {p.cash ? <option value="CASH">Наличные</option> : null}
        </select></label>
        <Button variant="secondary" onClick={() => prepare(() => ({
          type: "propose_payment", method: p.transfer && p.cash ? method : p.cash ? "CASH" : "TRANSFER",
          kopecks: parseRubles(amounts.payment ?? ""),
        }), `Деньги в сумме ${amounts.payment ?? ""} ₽ действительно отправлены партнёру?`)}>Деньги отправлены</Button>
      </div> : null}
      {r.payments.length ? <div className={styles.line}><h4>Выплаты</h4>
        {r.payments.map(payment => <div key={payment.id} className={styles.payment}>
          <p>{money(payment.allocations.reduce((sum, a) => sum + a.kopecks, 0))} · {payment.method === "CASH" ? "Наличные" : "Перевод"} · {date(payment.proposedAt)}</p>
          <p>{payment.status === "PROPOSED" ? "Отправка заявлена, получение не подтверждено"
            : payment.status === "RECEIVED" ? "Получение подтверждено" : "Получение отклонено"}</p>
          {p.recipient && payment.status === "PROPOSED" ? <div className={styles.actions}>
            <Button variant="secondary" onClick={() => prepare(() => ({ type: "confirm_payment", paymentId: payment.id }),
              `Вы действительно получили ${money(payment.allocations.reduce((s, a) => s + a.kopecks, 0))}? Подтверждение уменьшит долг партнёра.`)}>Подтвердить получение</Button>
            <Button variant="text" onClick={() => prepare(() => ({ type: "reject_payment", paymentId: payment.id }),
              "Деньги не поступили? Отклонить сообщение об отправке?")}>Не получил</Button>
          </div> : null}
        </div>)}
      </div> : null}
    </fieldset>
    <details><summary>История изменений</summary>
      {r.history.length ? <ul className={styles.history}>{r.history.map((e, i) => <li key={`${e.at}-${i}`}>
        {date(e.at)} · {e.actor}: {rewardActionLabels[e.action] ?? "Изменение начисления"}
        {e.lineId ? ` · ${r.lines.find(l => l.id === e.lineId)?.categoryLabel ?? ""}` : ""}
        {e.kopecks !== null ? ` · ${money(e.kopecks)}` : ""}
      </li>)}</ul> : <p>Изменений пока нет. Исходные условия сохранены.</p>}
    </details>
  </section>;
}
