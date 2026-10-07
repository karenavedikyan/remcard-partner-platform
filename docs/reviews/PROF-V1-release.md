# RemCard PROF V1: выпуск 7 октября 2026

## Рабочий контур

- Кабинет: https://prof.remcard.ru (новый адрес по решению владельца).
- Timeweb: https://timeweb.cloud/my/apps/266285/setup.
- Технический адрес: https://karenavedikyan-remcard-partner-platform-9bc4.twc1.net.
- IP: `212.113.117.80`. Предыдущее приложение `266221` удалено после приёмки замены.
- Backend: https://remcard.ru, прежняя production-БД и авторизация.
- Кабинет runtime: `418aac7fcf2cd7e899de65d7652271f660901e73`,
  ветка `release/prof-v1-20261007`.
- Backend runtime: `94636ab4ecc4ea377b5a543aac85c6c8ea5011f3`,
  ветка `release/prof-backend-v1-20261007`.
- Документационные коммиты после runtime SHA сами по себе не означают новый деплой.

## Настройки кабинета без секретов

Node 22, 1 CPU / 1 GB, 510 ₽/месяц. Автодеплой выключен.

```text
build: npm ci --include=dev && npm run build
run: npm start -- --hostname 0.0.0.0
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
REMCARD_API_BASE_URL=https://remcard.ru
NEXT_PUBLIC_APP_URL=https://prof.remcard.ru
NEXT_PUBLIC_CERTIFICATE_BASE_URL=https://remcard.ru
NEXT_PUBLIC_REMCARD_SITE_URL=https://remcard.ru
NEXT_PUBLIC_TELEGRAM_BOT_LOGIN_URL=https://t.me/RemCardBot?start=login
```

Production credentials backend не копируются в кабинет или Git.
Технический домен предназначен для диагностики; основной origin для
пользовательских POST — `https://prof.remcard.ru`.

## Проверки и границы

### Итог после замены IP

По разрешению владельца создана одна замена на том же тарифе:
`remcard-prof-v2`, ID `266285`, IP `212.113.117.80`.
Перенесена привязка `prof.remcard.ru`, обновлена A-запись (TTL 300,
DNS only). Итоговый deploy `7cd5a55c-8f96-43fd-8eeb-b8b6866cf7fc`
успешен, runtime SHA не менялся.

7 октября около 14:55 MSK:
- https://prof.remcard.ru/login: HTTP 200, TLS verification 0 (успех).
- `/api/remcard/api/auth/me`: 200, `user:null` без cookie.
- `/api/remcard/api/account/cabinet-readiness`: 401 без сессии.
- Невалидный формат кода + корректный Origin: ожидаемый 400.
- Чужой Origin: 403.
- Desktop/mobile browser: форма входа отображается, ссылка ведёт в существующий бот.
- `/scanner` без сессии показывает вход, а не доступ к покупкам.
- Основной backend health: 200.

После этих проверок DELETE приложения `266221` вернул 204; приложение
отсутствует в списке Timeweb. Сохранены backend `263009`, кабинет `266285`,
демонстрационный прототип `264335`.
Сбой HTTPS на целевом домене устранён после замены IP; это не доказательство
конкретной причины сетевой фильтрации или доступности из всех сетей.
Обращение в поддержку №12789397 было отправлено до замены.
Полный production-вход через бота и реальные покупки ещё не проверены.

### История проблемы HTTPS (устранена заменой)

В 13:04 MSK владелец предложил попробовать `prof.remcard.ru`.
Создана A-запись `94.228.126.174`, TTL 300, DNS only.
Привязка приложения изменена с `pro.remcard.ru` на `prof.remcard.ru`,
`NEXT_PUBLIC_APP_URL` обновлён, остальные env сохранены.
Deploy `5f855d8d-4bf6-4bdd-9d51-ba3e12935209` успешен на том же runtime SHA.
На новом домене TLS internal error воспроизводится также.
Через технический HTTPS с Host/Origin нового домена invalid verify-code
возвращает 400, чужой Origin 403: конфигурация кабинета обновлена.
Основной backend health возвращал 200. На момент той проверки обращение ещё
не было отправлено; позднее зарегистрирован тикет №12789397.

История первой попытки:

Deploy `2593290e-4895-4d78-95d8-5e1fa883b9a1` завершён успешно
на runtime SHA `418aac7`. A-запись `pro.remcard.ru` указывает на
`94.228.126.174`; домен перенесён с прототипа на приложение `266221`.
Технический HTTPS и запрос к нему с `Host: pro.remcard.ru` возвращают 200.
Прямой HTTPS на `pro.remcard.ru` возвращает TLS internal error как извне,
так и из контейнера приложения. Timeweb UI показывает Let's Encrypt
«Установлено», но это не подтверждено реальным TLS handshake.
Однократный перезапуск приложения не устранил проблему.
На том этапе публичный запуск не объявлялся завершённым до HTTPS smoke.
Итог замены приведён выше.

Кабинет: 163 unit/proxy и 21 component тестов PASS, production build PASS.
Next 15.5.27, postcss 8.5.29; production dependency audit без известных
уязвимостей на дату выпуска. Backend production build также пройден.

Существующая auth-модель сохранена. Настройки рабочего бота не изменялись.
Production bot E2E не подменяется fixture-тестами: пользователь получает
настоящий код и самостоятельно принимает актуальные согласия.
Реальные покупки, начисления и тестовые аккаунты в production не создавались.

## Порядок сопровождения

Не начинать новую функцию от старого `main`. Сначала учесть release-ветки
в обеих репозиториях; старые stacked PR остаются историей принятой работы.
Никаких force-push, автоматического squash всех PR или обхода branch protection.
До очередного релиза сравнить diff с реально опубликованными SHA.

Backend запускается через `node scripts/start-prof-release.mjs`: этот
скрипт проверяет/применяет только заранее просмотренную additive migration
идемпотентности и затем запускает существующий `start-timeweb.mjs`.
Не заменять его полным `prisma migrate deploy` без разбора legacy migration chain.

## Откат

Прототип сохранён в Timeweb, приложение `264335`, и доступен по техническому адресу:
https://karenavedikyan-remcard-navigator-1351.twc1.net.

Рабочая A-запись кабинета: `prof.remcard.ru` → `212.113.117.80`.
`pro.remcard.ru` больше не является адресом входа: его A-запись также
направлена на текущий IP, но привязка/HTTPS/редирект для него не настроены.
Не возвращать DNS на освобождённый IP `94.228.126.174`.

При необходимости отката кода кабинета использовать контролируемый deploy
ранее проверенного SHA на приложении `266285`, сохраняя origin prof.remcard.ru.
Прототип является только демо, не заменой рабочего кабинета. Его публикация
вместо кабинета допускается лишь как отдельно согласованный режим обслуживания,
без обещания сохранения операций.

Для backend при подтверждённой регрессии вернуть код
`e6696a44da93e8e1f2bee26d21c3e0f48ee5cbb7` и
`node scripts/start-timeweb.mjs`. Additive таблицу и migration record оставить:
не удалять production-данные и не восстанавливать backup поверх новых операций.
Старый backend не обеспечивает новый safe retry, поэтому до его отката
отключить подтверждение покупок в новом кабинете или откатить кабинет.

Backup создан до backend-изменения; статус провайдера success.
Проверка восстановления backup в отдельный контур не выполнялась.
