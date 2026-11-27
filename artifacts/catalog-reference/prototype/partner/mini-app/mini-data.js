/*
 * Базовые демо-данные мини-кабинета: профиль = MiniAppBootstrap (src/lib/mini-app/types.ts),
 * значения — как в фикстурах src/app/dev/mini-app-fixture/fixtures-data.ts @ c457512f.
 * Состояния MiniAppRoot (загрузка, ошибка, «не привязан», запрет рабочего места, кошелёк недоступен/ошибка)
 * — сценарии группы 'app' (панель «Демо», hash scenario=<id>).
 */
(function () {
  'use strict';
  var RCMini = window.RCMini;

  var CABINET_TITLE = {
    agent: 'Кабинет агента',
    specialist: 'Кабинет специалиста',
    store: 'Кабинет магазина',
    company: 'Кабинет компании'
  };
  var ROLE_LABEL = { agent: 'Агент', specialist: 'Специалист', store: 'Магазин', company: 'Компания' };
  var ENTITY = {
    store: 'Магазин «Маяк»',
    company: 'Компания «Формат»',
    agent: 'Алексей Романов',
    specialist: 'Мария Орлова'
  };
  /* Филиалы: у компании два (как withBranches=true в фикстурах), у магазина — один рабочий пункт. */
  var BRANCHES = {
    company: [
      { id: 'b1', label: 'Центральный' },
      { id: 'b2', label: 'пр. Демо, Казань' }
    ],
    store: []
  };
  var CAPS = {
    agent: { canCreate: true, canScan: false },
    specialist: { canCreate: true, canScan: true },
    store: { canCreate: true, canScan: true },
    company: { canCreate: true, canScan: true }
  };

  /* buildMiniAppFixture(role, platform, caps, withBranches) */
  function buildProfile(role, platform) {
    var caps = CAPS[role] || CAPS.specialist;
    var actions = [];
    if (role === 'agent' && caps.canCreate) {
      actions.push({ id: 'create_certificate', label: 'Создать сертификат', prominence: 'primary' });
    } else if (role === 'specialist') {
      if (caps.canCreate) actions.push({ id: 'create_certificate', label: 'Создать сертификат', prominence: 'primary' });
      if (caps.canScan) actions.push({ id: 'scan_qr', label: 'Сканировать QR', prominence: 'secondary' });
    } else {
      if (caps.canScan) actions.push({ id: 'scan_qr', label: 'Сканировать QR', prominence: 'primary' });
      if (caps.canCreate) actions.push({ id: 'create_certificate', label: 'Создать сертификат', prominence: 'secondary' });
    }
    actions.push(
      { id: 'invite_partner', label: 'Пригласить партнёра', prominence: 'tertiary' },
      { id: 'open_full_cabinet', label: 'Открыть полный кабинет', prominence: 'tertiary' }
    );
    var branches = (BRANCHES[role] || []).map(function (b, i) {
      return { id: b.id, label: b.label, active: i === 0 };
    });
    var isOrg = role === 'store' || role === 'company';
    return {
      role: role,
      roleLabel: ROLE_LABEL[role],
      platform: platform,
      displayName: role === 'agent' || role === 'specialist' ? ENTITY[role] : null,
      entityLine: isOrg ? ENTITY[role] : null,
      cabinetTitle: CABINET_TITLE[role],
      workplaceLabel: isOrg ? 'Центральная точка' : null,
      actions: actions,
      branches: branches,
      activeBranchId: branches.length ? 'b1' : null,
      workplaceForbidden: false,
      workplaceForbiddenMessage: null,
      wallet: { status: 'ok', confirmedUnpaidRub: 12480, awaitingRub: 3200, loadError: false },
      presentation: {
        cardIdentifier: null,
        historyHref: '/settlements',
        cardExplainer:
          '«Начислено к получению» — подтверждённые суммы. «Ожидает подтверждения» — начисления до подтверждения магазином.'
      },
      fullCabinetUrl: 'https://prof.remcard.ru/',
      partnersUrl: 'https://prof.remcard.ru/partners',
      gate: null
    };
  }

  RCMini.data.roles = ['agent', 'specialist', 'store', 'company'];
  RCMini.data.roleLabels = { agent: 'Агент', specialist: 'Специалист', store: 'Магазин', company: 'Компания' };
  RCMini.data.hosts = { telegram: 'Telegram', max: 'MAX' };
  RCMini.data.branchesByRole = BRANCHES;
  /* Расширенный набор точек (mini-notes/demo-entities.md) — сценарий «Несколько точек»; по умолчанию — как в фикстурах. */
  var MANY_BRANCHES = {
    store: [
      { id: 'b1', label: 'Центральный', workplaceLabel: 'Центральная точка' },
      { id: 'b2', label: 'Южный', workplaceLabel: 'Южный филиал' },
      { id: 'b3', label: 'Западный', workplaceLabel: 'Западный филиал' }
    ],
    company: [
      { id: 'b1', label: 'Центральный', workplaceLabel: 'Центральная точка' },
      { id: 'b2', label: 'пр. Демо, Казань', workplaceLabel: 'пр. Демо, Казань' },
      { id: 'b3', label: 'Курортный, Сочи', workplaceLabel: 'Курортный, Сочи' }
    ]
  };
  RCMini.data.manyBranchesByRole = MANY_BRANCHES;
  RCMini.data.cardIdentifiers = { agent: 'RC 4010 2101', specialist: 'RC 4020 3102', store: 'RC 4030 5103', company: 'RC 4040 7104' };
  RCMini.data.buildProfile = buildProfile;
  /* Демо-коды для «Проверки QR» (только чтение, ничего не списывает) */
  RCMini.data.scanCodes = {
    'RC-FIXTURE': { state: 'valid', clientDisplayName: 'Анна Клиентова', promoCode: 'RC-FIXTURE', usageCount: 0, maxUsages: 1 },
    'RC-4821-KZN': { state: 'valid', clientDisplayName: 'Игорь Седов', promoCode: 'RC-4821-KZN', usageCount: 1, maxUsages: 3 },
    'RC-OPEN-77': { state: 'valid', clientDisplayName: 'Ольга Миронова', promoCode: 'RC-OPEN-77', usageCount: 2, maxUsages: 0 },
    'RC-4810': { state: 'valid', clientDisplayName: 'Анна Клиентова', promoCode: 'RC-4810', usageCount: 0, maxUsages: 1 },
    'RC-USED': { state: 'used' },
    'RC-EXP': { state: 'used' },
    'RC-B2-ONLY': { state: 'wrong_branch' }
  };

  /* Сценарии состояний MiniAppRoot.tsx */
  RCMini.registerScenarios(
    'app',
    [
      { id: 'default', label: 'Обычная работа' },
      {
        id: 'loading',
        label: 'Загрузка',
        patchProfile: function (p) {
          p.gate = { kind: 'loading' };
          return p;
        }
      },
      {
        id: 'login',
        label: 'Вход без авторизации',
        patchProfile: function (p) {
          p.gate = { kind: 'login', joinUrl: 'https://prof.remcard.ru/join' };
          return p;
        }
      },
      {
        id: 'unlinked',
        label: 'Нет доступа · нужна регистрация',
        patchProfile: function (p) {
          p.gate = { kind: 'unlinked', url: 'https://prof.remcard.ru/join' };
          return p;
        }
      },
      {
        id: 'cabinet-blocked',
        label: 'Нет доступа · регистрация не завершена',
        patchProfile: function (p) {
          p.gate = { kind: 'blocked', url: 'https://prof.remcard.ru/join' };
          return p;
        }
      },
      {
        id: 'error',
        label: 'Ошибка загрузки',
        patchProfile: function (p) {
          p.gate = { kind: 'error', reason: 'load', message: 'Не удалось загрузить мини-кабинет.' };
          return p;
        }
      },
      {
        id: 'pilot-off',
        label: 'Пилот отключён',
        patchProfile: function (p) {
          p.gate = { kind: 'error', reason: 'pilot', message: 'Пилот мини-кабинета отключён.' };
          return p;
        }
      },
      {
        id: 'no-host',
        label: 'Открыто не из мессенджера',
        patchProfile: function (p) {
          p.gate = { kind: 'error', reason: 'host', message: 'Откройте мини-кабинет из Telegram или MAX.' };
          return p;
        }
      },
      {
        id: 'workplace-forbidden',
        label: 'Нет прав на рабочее место',
        patchProfile: function (p) {
          p.workplaceForbidden = true;
          /* Запрет относится к текущей точке; после выбора другого филиала (компания) кабинет работает как обычно. */
          p.workplaceForbiddenBranchId = p.activeBranchId;
          p.workplaceForbiddenMessage = 'Нет прав на работу с выбранной точкой. Получите доступ у вашего руководителя.';
          return p;
        }
      },
      {
        id: 'no-branch',
        label: 'Филиал не выбран (компания)',
        roles: ['company'],
        patchProfile: function (p) {
          if (p.branches && p.branches.length > 1) {
            p.activeBranchId = null;
            p.workplaceLabel = null;
          }
          return p;
        }
      },
      {
        id: 'many-branches',
        label: 'Несколько точек (магазин, компания)',
        roles: ['store', 'company'],
        patchProfile: function (p) {
          var list = MANY_BRANCHES[p.role];
          if (list) {
            p.branches = list.map(function (b, i) {
              return { id: b.id, label: b.label, active: i === 0, workplaceLabel: b.workplaceLabel };
            });
            p.activeBranchId = 'b1';
          }
          return p;
        }
      },
      {
        id: 'branch-switch-error',
        label: 'Ошибка смены филиала (компания)',
        roles: ['company'],
        patchProfile: function (p) {
          p.branchSwitchError = true;
          return p;
        }
      },
      {
        id: 'wallet-unavailable',
        label: 'Кошелёк недоступен',
        patchProfile: function (p) {
          p.wallet = { status: 'unavailable', message: 'Нет прав на просмотр баланса. Получите доступ у вашего руководителя.', loadError: false };
          return p;
        }
      },
      {
        id: 'wallet-error',
        label: 'Ошибка загрузки кошелька',
        patchProfile: function (p) {
          p.wallet = { status: 'error', message: 'Не удалось загрузить баланс.', loadError: true };
          return p;
        }
      }
    ],
    'Состояние'
  );
})();
