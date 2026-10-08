# PROF-F: карта переиспользования

| Функция | Существующий источник (navigator) | Адаптация (platform / navigator) |
|--------|-----------------------------------|----------------------------------|
| Минимальный профиль для кабинета | `cabinetReadiness`, `proProfileCompleteness`, `PATCH /api/auth/me`, `PATCH /api/pro/profile`, `GET/POST/PATCH /api/pro/organization` | `profile-working-save.ts`, раздел «Основные данные» в `ProfileEditor`; сохранение без модерации |
| Добровольная публикация | `submit-for-moderation` (user/org/branch), `public-contacts`, `moderation-notes`, черновик через `profile-save` | Раздел «Публикация», `ProfileCatalogSection`; явный CTA и submit |
| Частное партнёрство (invite / link) | `partnership/invite`, `partnershipLinkInvite*`, `cabinetReadiness` | `privatePartnershipEligibility.ts` — без `catalogStatus === APPROVED`; `InviteLanding` — дозаполнение профиля, не модерация каталога |
| Филиалы | `/api/pro/organization`, `/api/pro/organization/branches`, `/branches/[id]` | `ProfileBranchesSection`, BFF allowlist |
| Сотрудники | `StaffInvite`, `employees-overview`, `/api/pro/invites`, `/api/invite/*` | `ProfileTeamSection`, `/invite/accept` на PROF, BFF allowlist |
| Уведомления Telegram/MAX | `notification-settings`, `notification-bind/*` | Без изменений контракта; раздел «Уведомления» |
| Права сотрудника | `employee-permissions`, branch employees API | Только список/приглашение в UI этапа F; расширенное редактирование — через существующий кабинет remcard.ru |

## Маршруты приглашений

| Тип | Preview | Accept | Кто принимает |
|-----|---------|--------|----------------|
| Партнёрская ссылка | `GET /api/partnership/link-invite/public/:token` | `POST /api/partnership/link-invite/accept` | PRO с `canAccessCabinet` + минимальный профиль |
| Прямое invite API | — | `POST /api/partnership/invite` (инициатор) | Целевой PRO с `canParticipateInPrivatePartnership` |
| Сотрудник | `GET /api/invite/:token` | `POST /api/invite/accept` | Вход в свой аккаунт, явное принятие на `/invite/accept` |

Владелец: создаёт link-invite / partnership invite / staff invite через существующие API. Сотрудник: не создаёт организацию владельца; проходит личные согласия и принимает staff invite.
