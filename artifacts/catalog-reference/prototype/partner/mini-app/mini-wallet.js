/*
 * RemCard мини-кабинет — модуль кошелька (mini-wallet.js).
 * Отвечает за:
 *  1) RCMini.data.wallet — сверенные с ЛК и mini-notes/demo-entities.md демо-обязательства по 4 ролям и филиалам;
 *  2) RCMini.slots.homeWallet(ctx) — карта кошелька на главной с переключателем направления у ролей с расходами;
 *  3) экран wallet — переключение «Мне должны / Я должен», раздельные суммы по статусам без общего итога,
 *     группировка по контрагентам с раскрытием сделок/сертификатов, учёт рабочего филиала и ссылка в полный кабинет (/settlements).
 * Запись выплаты по коду в мини-кабинет не входит (остаётся в полном кабинете RemCard PROF).
 */
(function () {
  'use strict';

  var RCMini = window.RCMini;
  if (!RCMini) return;

  var ui = RCMini.ui;
  var esc = ui.esc;

  var SETTLEMENTS_URL = 'https://prof.remcard.ru/settlements';
  var FULL_CABINET_PARAMS = {
    url: SETTLEMENTS_URL,
    lead: 'Здесь мини-приложение откроет раздел «Кошелёк и выплаты» в полном кабинете RemCard PROF.',
    buttonLabel: 'Открыть выплаты в полном кабинете'
  };

  /* Арифметика в целых копейках — исключает расхождения округления между строками, контрагентами и итогами */
  function toK(rub) {
    return Math.round((Number(rub) || 0) * 100);
  }
  function fromK(kop) {
    return Math.round(kop) / 100;
  }

  /* Справочник контрагентов (единый с mini-notes/demo-entities.md §2) */
  var PARTNERS = {
    'p-dom-materialov': { id: 'p-dom-materialov', name: 'Дом материалов', typeLabel: 'Магазин', city: 'Краснодар' },
    'p-keramika-yug': { id: 'p-keramika-yug', name: 'Керамика Юг', typeLabel: 'Магазин', city: 'Сочи' },
    'p-studiya-sveta': { id: 'p-studiya-sveta', name: 'Студия света', typeLabel: 'Магазин', city: 'Краснодар' },
    'p-fabrika-line': { id: 'p-fabrika-line', name: 'Фабрика LINE', typeLabel: 'Компания', city: 'Краснодар' },
    'p-studiya-remonta': { id: 'p-studiya-remonta', name: 'Студия ремонта', typeLabel: 'Компания', city: 'Краснодар' },
    'p-igor-volkov': { id: 'p-igor-volkov', name: 'Игорь Волков', typeLabel: 'Специалист', city: 'Краснодар' },
    'p-elena-fomina': { id: 'p-elena-fomina', name: 'Елена Фомина', typeLabel: 'Агент', city: 'Краснодар' },
    'p-aleksey-romanov': { id: 'p-aleksey-romanov', name: 'Алексей Романов', typeLabel: 'Агент', city: 'Краснодар' },
    'p-maria-orlova': { id: 'p-maria-orlova', name: 'Мария Орлова', typeLabel: 'Специалист', city: 'Краснодар' }
  };

  var BRANCH_NAMES = {
    store: {
      b1: 'Центральный',
      b2: 'Южный',
      b3: 'Западный'
    },
    company: {
      b1: 'Центральный',
      b2: 'пр. Демо, Казань',
      b3: 'Курортный, Сочи'
    }
  };

  /*
   * Канонический реестр начислений и обязательств (100% сверка с mini-notes/demo-entities.md §4).
   * На всех ролях при дефолтном срезе (b1) входящие суммы равны эталону фикстур: 12 480 ₽ и 3 200 ₽.
   */
  var LEDGER = {
    agent: {
      incomingOnly: true,
      emptyKind: 'earner',
      rows: [
        {
          id: 'ag-in-1',
          dir: 'in',
          branchId: null,
          partnerId: 'p-dom-materialov',
          orderId: 'ЗАК-ДЕМО-101',
          certCode: 'RC-FIXTURE',
          clientName: 'Анна Клиентова',
          basis: 'Двери и входные группы',
          confirmedRub: 7500,
          waitingRub: 0,
          suspendedRub: 0,
          paidRub: 0,
          grossRub: 7500,
          createdAt: '10.11.2026',
          statusDate: '17.11.2026',
          windowDays: 7,
          steps: [
            '10.11.2026 · Покупка клиента по сертификату RC-FIXTURE (7 500 ₽)',
            '17.11.2026 · Подтверждено магазином после окна возврата (7 дн.)'
          ]
        },
        {
          id: 'ag-in-2',
          dir: 'in',
          branchId: null,
          partnerId: 'p-keramika-yug',
          orderId: 'ЗАК-ДЕМО-201',
          certCode: 'RC-4812',
          clientName: 'Карен Сафарян',
          basis: 'Плитка',
          confirmedRub: 4980,
          waitingRub: 0,
          suspendedRub: 0,
          paidRub: 0,
          grossRub: 4980,
          createdAt: '09.11.2026',
          statusDate: '16.11.2026',
          windowDays: 7,
          steps: [
            '09.11.2026 · Покупка по сертификату RC-4812 (4 980 ₽)',
            '16.11.2026 · Подтверждено к получению магазином «Керамика Юг»'
          ]
        },
        {
          id: 'ag-in-3',
          dir: 'in',
          branchId: null,
          partnerId: 'p-studiya-sveta',
          orderId: 'ЗАК-ДЕМО-102',
          certCode: 'RC-4815',
          clientName: 'Ольга Соколова',
          basis: 'Освещение',
          confirmedRub: 0,
          waitingRub: 3200,
          suspendedRub: 0,
          paidRub: 0,
          grossRub: 3200,
          createdAt: '16.11.2026',
          dueDate: '30.11.2026',
          windowDays: 14,
          steps: [
            '16.11.2026 · Начислено после оплаты заказа (3 200 ₽)',
            'До 30.11.2026 · Ожидает подтверждения магазином (окно 14 дн.)'
          ]
        },
        {
          id: 'ag-in-4',
          dir: 'in',
          branchId: null,
          partnerId: 'p-dom-materialov',
          orderId: 'ЗАК-ДЕМО-103',
          certCode: 'RC-4805',
          clientName: 'Анна Клиентова',
          basis: 'Напольные покрытия',
          confirmedRub: 0,
          waitingRub: 0,
          suspendedRub: 1000,
          paidRub: 0,
          grossRub: 1000,
          createdAt: '08.11.2026',
          suspendedReason: 'Уточнение частичного возврата упаковки до 26.11.',
          steps: [
            '08.11.2026 · Начислено по заказу ЗАК-ДЕМО-103 (1 000 ₽)',
            '15.11.2026 · Приостановлено партнёром на время сверки возврата'
          ]
        },
        {
          id: 'ag-in-5',
          dir: 'in',
          branchId: null,
          partnerId: 'p-fabrika-line',
          orderId: 'ЗАК-ДЕМО-301',
          certCode: 'RC-4790',
          clientName: 'Дмитрий Морозов',
          basis: 'Кухни',
          confirmedRub: 0,
          waitingRub: 0,
          suspendedRub: 0,
          paidRub: 4000,
          grossRub: 4000,
          createdAt: '25.10.2026',
          paidDate: '05.11.2026',
          payoutMethod: 'Безнал · подтверждено кодом в ЛК',
          steps: [
            '25.10.2026 · Начислено и подтверждено по заказу ЗАК-ДЕМО-301 (4 000 ₽)',
            '05.11.2026 · Выплата получена напрямую и подтверждена кодом в ЛК'
          ]
        }
      ]
    },

    specialist: {
      incomingOnly: false,
      emptyKind: 'earner',
      rows: [
        /* Входящие («Мне должны») */
        {
          id: 'sp-in-1',
          dir: 'in',
          branchId: null,
          partnerId: 'p-dom-materialov',
          orderId: 'PZ-SP-101',
          certCode: 'RC-FIXTURE',
          clientName: 'Анна Клиентова',
          basis: 'Двери и входные группы',
          confirmedRub: 6480,
          waitingRub: 0,
          suspendedRub: 0,
          paidRub: 2000,
          grossRub: 8480,
          createdAt: '05.11.2026',
          statusDate: '12.11.2026',
          paidDate: '12.11.2026',
          steps: [
            '05.11.2026 · Покупка по сертификату RC-FIXTURE, начислено 8 480 ₽',
            '12.11.2026 · Частичная выплата 2 000 ₽ подтверждена в ЛК (остаток 6 480 ₽)'
          ]
        },
        {
          id: 'sp-in-2',
          dir: 'in',
          branchId: null,
          partnerId: 'p-fabrika-line',
          orderId: 'PZ-SP-102',
          certCode: 'RC-5104',
          clientName: 'Екатерина Лебедева',
          basis: 'Кухни',
          confirmedRub: 6000,
          waitingRub: 0,
          suspendedRub: 0,
          paidRub: 0,
          grossRub: 6000,
          createdAt: '08.11.2026',
          statusDate: '18.11.2026',
          windowDays: 10,
          steps: [
            '08.11.2026 · Заказ кухни по сертификату RC-5104 (6 000 ₽)',
            '18.11.2026 · Подтверждено компанией «Фабрика LINE»'
          ]
        },
        {
          id: 'sp-in-3',
          dir: 'in',
          branchId: null,
          partnerId: 'p-studiya-sveta',
          orderId: 'PZ-SP-103',
          certCode: 'RC-5108',
          clientName: 'Сергей Белов',
          basis: 'Освещение',
          confirmedRub: 0,
          waitingRub: 3200,
          suspendedRub: 0,
          paidRub: 0,
          grossRub: 3200,
          createdAt: '20.11.2026',
          dueDate: '27.11.2026',
          windowDays: 7,
          steps: [
            '20.11.2026 · Покупка по сертификату RC-5108 (3 200 ₽)',
            'До 27.11.2026 · Ожидает подтверждения магазином (окно 7 дн.)'
          ]
        },
        {
          id: 'sp-in-4',
          dir: 'in',
          branchId: null,
          partnerId: 'p-keramika-yug',
          orderId: 'PZ-SP-104',
          certCode: 'RC-5099',
          clientName: 'Артём Новиков',
          basis: 'Плитка',
          confirmedRub: 0,
          waitingRub: 0,
          suspendedRub: 1200,
          paidRub: 0,
          grossRub: 1200,
          createdAt: '11.11.2026',
          needsReview: true,
          suspendedReason: 'Требует сверки после замены партии плитки.',
          steps: [
            '11.11.2026 · Начислено по заказу PZ-SP-104 (1 200 ₽)',
            '18.11.2026 · Приостановлено до сверки итоговой суммы заказа'
          ]
        },
        {
          id: 'sp-in-5',
          dir: 'in',
          branchId: null,
          partnerId: 'p-keramika-yug',
          orderId: 'PZ-SP-095',
          certCode: 'RC-5080',
          clientName: 'Сергей Белов',
          basis: 'Сантехника',
          confirmedRub: 0,
          waitingRub: 0,
          suspendedRub: 0,
          paidRub: 3400,
          grossRub: 3400,
          createdAt: '24.10.2026',
          paidDate: '03.11.2026',
          payoutMethod: 'Перевод · подтверждено кодом в ЛК',
          steps: [
            '24.10.2026 · Подтверждено по заказу PZ-SP-095 (3 400 ₽)',
            '03.11.2026 · Выплата получена полностью и закрыта в ЛК'
          ]
        },
        /* Исходящие («Я должен») */
        {
          id: 'sp-out-1',
          dir: 'out',
          branchId: null,
          partnerId: 'p-aleksey-romanov',
          orderId: 'PZ-SP-201',
          certCode: 'RC-4801',
          clientName: 'Сергей Белов',
          basis: 'Дизайн-проект и комплектация',
          confirmedRub: 3000,
          waitingRub: 0,
          suspendedRub: 0,
          paidRub: 0,
          grossRub: 3000,
          createdAt: '09.11.2026',
          statusDate: '16.11.2026',
          windowDays: 7,
          steps: [
            '09.11.2026 · Обращение клиента по сертификату агента RC-4801',
            '16.11.2026 · Обязательство 3 000 ₽ подтверждено к оплате'
          ]
        },
        {
          id: 'sp-out-2',
          dir: 'out',
          branchId: null,
          partnerId: 'p-studiya-remonta',
          orderId: 'PZ-SP-202',
          certCode: 'RC-4809',
          clientName: 'Анна Клиентова',
          basis: 'Авторский надзор',
          confirmedRub: 1500,
          waitingRub: 0,
          suspendedRub: 0,
          paidRub: 0,
          grossRub: 1500,
          createdAt: '12.11.2026',
          statusDate: '19.11.2026',
          windowDays: 7,
          steps: [
            '12.11.2026 · Заказ по партнёрской рекомендации RC-4809 (1 500 ₽)',
            '19.11.2026 · Подтверждено к выплате партнёру'
          ]
        },
        {
          id: 'sp-out-3',
          dir: 'out',
          branchId: null,
          partnerId: 'p-elena-fomina',
          orderId: 'PZ-SP-203',
          certCode: 'RC-4820',
          clientName: 'Екатерина Лебедева',
          basis: 'Дизайн интерьера',
          confirmedRub: 0,
          waitingRub: 2000,
          suspendedRub: 0,
          paidRub: 0,
          grossRub: 2000,
          createdAt: '18.11.2026',
          dueDate: '02.12.2026',
          windowDays: 14,
          steps: [
            '18.11.2026 · Договор по сертификату RC-4820 (2 000 ₽)',
            'До 02.12.2026 · Ожидает подтверждения первого этапа работ'
          ]
        },
        {
          id: 'sp-out-4',
          dir: 'out',
          branchId: null,
          partnerId: 'p-aleksey-romanov',
          orderId: 'PZ-SP-190',
          certCode: 'RC-4775',
          clientName: 'Артём Новиков',
          basis: 'Комплектация и планировка',
          confirmedRub: 0,
          waitingRub: 0,
          suspendedRub: 0,
          paidRub: 2500,
          grossRub: 2500,
          createdAt: '20.10.2026',
          paidDate: '02.11.2026',
          payoutMethod: 'Перевод · подтверждено кодом получателя',
          steps: [
            '20.10.2026 · Подтверждено по сделке PZ-SP-190 (2 500 ₽)',
            '02.11.2026 · Выплачено агенту и подтверждено кодом в ЛК'
          ]
        }
      ]
    },

    store: {
      incomingOnly: false,
      emptyKind: 'seller',
      rows: [
        /* Филиал b1 («Центральный») — входящие */
        {
          id: 'st-in-1',
          dir: 'in',
          branchId: 'b1',
          partnerId: 'p-fabrika-line',
          orderId: 'PZ-ST-101',
          certCode: 'RC-6101',
          clientName: 'Виктор Кузнецов',
          basis: 'Кухни',
          confirmedRub: 7680,
          waitingRub: 0,
          suspendedRub: 0,
          paidRub: 0,
          grossRub: 7680,
          createdAt: '08.11.2026',
          statusDate: '15.11.2026',
          windowDays: 7,
          steps: [
            '08.11.2026 · Покупка клиента по сертификату магазина RC-6101 (7 680 ₽)',
            '15.11.2026 · Подтверждено партнёром «Фабрика LINE»'
          ]
        },
        {
          id: 'st-in-2',
          dir: 'in',
          branchId: 'b1',
          partnerId: 'p-keramika-yug',
          orderId: 'PZ-ST-102',
          certCode: 'RC-6104',
          clientName: 'Виктор Кузнецов',
          basis: 'Сантехника',
          confirmedRub: 4800,
          waitingRub: 0,
          suspendedRub: 0,
          paidRub: 0,
          grossRub: 4800,
          createdAt: '10.11.2026',
          statusDate: '17.11.2026',
          windowDays: 7,
          steps: [
            '10.11.2026 · Смежная покупка по сертификату RC-6104 (4 800 ₽)',
            '17.11.2026 · Подтверждено к получению'
          ]
        },
        {
          id: 'st-in-3',
          dir: 'in',
          branchId: 'b1',
          partnerId: 'p-igor-volkov',
          orderId: 'PZ-ST-103',
          certCode: 'RC-6109',
          clientName: 'Виктор Кузнецов',
          basis: 'Монтаж дверей',
          confirmedRub: 0,
          waitingRub: 3200,
          suspendedRub: 0,
          paidRub: 0,
          grossRub: 3200,
          createdAt: '19.11.2026',
          dueDate: '29.11.2026',
          windowDays: 10,
          steps: [
            '19.11.2026 · Заказ монтажа по рекомендации магазина (3 200 ₽)',
            'До 29.11.2026 · Ожидает закрытия акта монтажа'
          ]
        },
        {
          id: 'st-in-4',
          dir: 'in',
          branchId: 'b1',
          partnerId: 'p-studiya-remonta',
          orderId: 'PZ-ST-090',
          certCode: 'RC-6088',
          clientName: 'Виктор Кузнецов',
          basis: 'Потолки',
          confirmedRub: 0,
          waitingRub: 0,
          suspendedRub: 0,
          paidRub: 3600,
          grossRub: 3600,
          createdAt: '24.10.2026',
          paidDate: '04.11.2026',
          payoutMethod: 'Безнал · закрыто в ЛК',
          steps: [
            '24.10.2026 · Подтверждено по заказу PZ-ST-090 (3 600 ₽)',
            '04.11.2026 · Оплата получена магазином и подтверждена кодом'
          ]
        },
        /* Филиал b1 («Центральный») — исходящие */
        {
          id: 'st-out-1',
          dir: 'out',
          branchId: 'b1',
          partnerId: 'p-maria-orlova',
          orderId: 'PZ-ST-201',
          certCode: 'RC-FIXTURE',
          clientName: 'Анна Клиентова',
          basis: 'Двери и входные группы',
          confirmedRub: 5400,
          waitingRub: 0,
          suspendedRub: 0,
          paidRub: 1600,
          grossRub: 7000,
          createdAt: '07.11.2026',
          statusDate: '14.11.2026',
          paidDate: '14.11.2026',
          steps: [
            '07.11.2026 · Продажа по сертификату специалиста RC-FIXTURE (7 000 ₽)',
            '14.11.2026 · Выплачено частично 1 600 ₽, остаток к оплате 5 400 ₽'
          ]
        },
        {
          id: 'st-out-2',
          dir: 'out',
          branchId: 'b1',
          partnerId: 'p-aleksey-romanov',
          orderId: 'PZ-ST-202',
          certCode: 'RC-4810',
          clientName: 'Карен Сафарян',
          basis: 'Напольные покрытия',
          confirmedRub: 4000,
          waitingRub: 0,
          suspendedRub: 0,
          paidRub: 0,
          grossRub: 4000,
          createdAt: '09.11.2026',
          statusDate: '16.11.2026',
          windowDays: 7,
          steps: [
            '09.11.2026 · Продажа по сертификату агента RC-4810 (4 000 ₽)',
            '16.11.2026 · Срок возврата истёк, сумма к оплате подтверждена'
          ]
        },
        {
          id: 'st-out-3',
          dir: 'out',
          branchId: 'b1',
          partnerId: 'p-elena-fomina',
          orderId: 'PZ-ST-203',
          certCode: 'RC-6112',
          clientName: 'Ольга Соколова',
          basis: 'Освещение',
          confirmedRub: 0,
          waitingRub: 4100,
          suspendedRub: 0,
          paidRub: 0,
          grossRub: 4100,
          createdAt: '17.11.2026',
          dueDate: '01.12.2026',
          windowDays: 14,
          steps: [
            '17.11.2026 · Отгрузка по сертификату RC-6112 (4 100 ₽)',
            'До 01.12.2026 · Ожидает завершения 14-дневного окна возврата'
          ]
        },
        {
          id: 'st-out-4',
          dir: 'out',
          branchId: 'b1',
          partnerId: 'p-aleksey-romanov',
          orderId: 'PZ-ST-204',
          certCode: 'RC-6100',
          clientName: 'Анна Клиентова',
          basis: 'Фурнитура и замки',
          confirmedRub: 0,
          waitingRub: 0,
          suspendedRub: 800,
          paidRub: 0,
          grossRub: 800,
          createdAt: '11.11.2026',
          suspendedReason: 'Клиент оформил обмен ручек — сверка до 25.11.',
          steps: [
            '11.11.2026 · Начислено по заказу PZ-ST-204 (800 ₽)',
            '15.11.2026 · Приостановлено до завершения обмена комплекта'
          ]
        },
        {
          id: 'st-out-5',
          dir: 'out',
          branchId: 'b1',
          partnerId: 'p-igor-volkov',
          orderId: 'PZ-ST-188',
          certCode: 'RC-6075',
          clientName: 'Виктор Кузнецов',
          basis: 'Двери и входные группы',
          confirmedRub: 0,
          waitingRub: 0,
          suspendedRub: 0,
          paidRub: 3000,
          grossRub: 3000,
          createdAt: '25.10.2026',
          paidDate: '06.11.2026',
          payoutMethod: 'Перевод · подтверждено кодом в ЛК',
          steps: [
            '25.10.2026 · Подтверждено по заказу PZ-ST-188 (3 000 ₽)',
            '06.11.2026 · Выплачено специалисту и зафиксировано в ЛК'
          ]
        },
        /* Филиал b2 («Южный») */
        {
          id: 'st-in-5',
          dir: 'in',
          branchId: 'b2',
          partnerId: 'p-dom-materialov',
          orderId: 'PZ-ST-301',
          certCode: 'RC-6201',
          clientName: 'Наталья Захарова',
          basis: 'Краска / ЛКМ',
          confirmedRub: 3500,
          waitingRub: 0,
          suspendedRub: 0,
          paidRub: 0,
          grossRub: 3500,
          createdAt: '11.11.2026',
          statusDate: '18.11.2026',
          windowDays: 7,
          steps: [
            '11.11.2026 · Покупка по сертификату RC-6201 (Южный филиал)',
            '18.11.2026 · Подтверждено партнёром (3 500 ₽)'
          ]
        },
        {
          id: 'st-in-6',
          dir: 'in',
          branchId: 'b2',
          partnerId: 'p-studiya-sveta',
          orderId: 'PZ-ST-302',
          certCode: 'RC-6202',
          clientName: 'Наталья Захарова',
          basis: 'Электротовары',
          confirmedRub: 0,
          waitingRub: 1400,
          suspendedRub: 0,
          paidRub: 0,
          grossRub: 1400,
          createdAt: '20.11.2026',
          dueDate: '30.11.2026',
          windowDays: 10,
          steps: [
            '20.11.2026 · Начислено по заказу PZ-ST-302 (1 400 ₽)',
            'До 30.11.2026 · Ожидает подтверждения магазином «Студия света»'
          ]
        },
        {
          id: 'st-out-6',
          dir: 'out',
          branchId: 'b2',
          partnerId: 'p-maria-orlova',
          orderId: 'PZ-ST-303',
          certCode: 'RC-6205',
          clientName: 'Наталья Захарова',
          basis: 'Напольные покрытия',
          confirmedRub: 2800,
          waitingRub: 0,
          suspendedRub: 0,
          paidRub: 0,
          grossRub: 2800,
          createdAt: '12.11.2026',
          statusDate: '19.11.2026',
          windowDays: 7,
          steps: [
            '12.11.2026 · Продажа в Южном филиале по сертификату RC-6205',
            '19.11.2026 · Подтверждено к оплате специалисту (2 800 ₽)'
          ]
        }
      ]
    },

    company: {
      incomingOnly: false,
      emptyKind: 'seller',
      rows: [
        /* Филиал b1 («Центральный») — входящие */
        {
          id: 'co-in-1',
          dir: 'in',
          branchId: 'b1',
          partnerId: 'p-dom-materialov',
          orderId: 'PZ-CO-101',
          certCode: 'RC-7101',
          clientName: 'Павел Громов',
          basis: 'Двери и входные группы',
          confirmedRub: 8280,
          waitingRub: 0,
          suspendedRub: 0,
          paidRub: 0,
          grossRub: 8280,
          createdAt: '07.11.2026',
          statusDate: '14.11.2026',
          windowDays: 7,
          steps: [
            '07.11.2026 · Комплектация объекта по сертификату RC-7101 (8 280 ₽)',
            '14.11.2026 · Подтверждено магазином «Дом материалов»'
          ]
        },
        {
          id: 'co-in-2',
          dir: 'in',
          branchId: 'b1',
          partnerId: 'p-studiya-sveta',
          orderId: 'PZ-CO-102',
          certCode: 'RC-7102',
          clientName: 'Павел Громов',
          basis: 'Освещение',
          confirmedRub: 4200,
          waitingRub: 0,
          suspendedRub: 0,
          paidRub: 1800,
          grossRub: 6000,
          createdAt: '04.11.2026',
          statusDate: '11.11.2026',
          paidDate: '11.11.2026',
          steps: [
            '04.11.2026 · Начислено по заказу PZ-CO-102 (6 000 ₽)',
            '11.11.2026 · Частично получено 1 800 ₽, остаток к получению 4 200 ₽'
          ]
        },
        {
          id: 'co-in-3',
          dir: 'in',
          branchId: 'b1',
          partnerId: 'p-keramika-yug',
          orderId: 'PZ-CO-103',
          certCode: 'RC-7105',
          clientName: 'Павел Громов',
          basis: 'Плитка',
          confirmedRub: 0,
          waitingRub: 3200,
          suspendedRub: 0,
          paidRub: 0,
          grossRub: 3200,
          createdAt: '18.11.2026',
          dueDate: '28.11.2026',
          windowDays: 10,
          steps: [
            '18.11.2026 · Отгрузка плитки по сертификату RC-7105 (3 200 ₽)',
            'До 28.11.2026 · Ожидает подтверждения партнёром'
          ]
        },
        {
          id: 'co-in-4',
          dir: 'in',
          branchId: 'b1',
          partnerId: 'p-fabrika-line',
          orderId: 'PZ-CO-104',
          certCode: 'RC-7098',
          clientName: 'Павел Громов',
          basis: 'Мебель',
          confirmedRub: 0,
          waitingRub: 0,
          suspendedRub: 1500,
          paidRub: 0,
          grossRub: 1500,
          createdAt: '09.11.2026',
          suspendedReason: 'Спор по рекламации фасада до 27.11.',
          steps: [
            '09.11.2026 · Начислено по заказу PZ-CO-104 (1 500 ₽)',
            '16.11.2026 · Приостановлено на период замены фасада'
          ]
        },
        {
          id: 'co-in-5',
          dir: 'in',
          branchId: 'b1',
          partnerId: 'p-dom-materialov',
          orderId: 'PZ-CO-089',
          certCode: 'RC-7070',
          clientName: 'Павел Громов',
          basis: 'Напольные покрытия',
          confirmedRub: 0,
          waitingRub: 0,
          suspendedRub: 0,
          paidRub: 5000,
          grossRub: 5000,
          createdAt: '21.10.2026',
          paidDate: '01.11.2026',
          payoutMethod: 'Безнал по счёту · подтверждено кодом',
          steps: [
            '21.10.2026 · Подтверждено по заказу PZ-CO-089 (5 000 ₽)',
            '01.11.2026 · Оплата получена компанией и закрыта в ЛК'
          ]
        },
        /* Филиал b1 («Центральный») — исходящие */
        {
          id: 'co-out-1',
          dir: 'out',
          branchId: 'b1',
          partnerId: 'p-maria-orlova',
          orderId: 'PZ-CO-201',
          certCode: 'RC-5102',
          clientName: 'Сергей Белов',
          basis: 'Ремонт и отделка',
          confirmedRub: 7200,
          waitingRub: 0,
          suspendedRub: 0,
          paidRub: 0,
          grossRub: 7200,
          createdAt: '05.11.2026',
          statusDate: '15.11.2026',
          windowDays: 10,
          steps: [
            '05.11.2026 · Договор подряда по сертификату специалиста RC-5102',
            '15.11.2026 · Этап сдан, к оплате подтверждено 7 200 ₽'
          ]
        },
        {
          id: 'co-out-2',
          dir: 'out',
          branchId: 'b1',
          partnerId: 'p-aleksey-romanov',
          orderId: 'PZ-CO-202',
          certCode: 'RC-4811',
          clientName: 'Анна Клиентова',
          basis: 'Окна',
          confirmedRub: 4000,
          waitingRub: 0,
          suspendedRub: 0,
          paidRub: 0,
          grossRub: 4000,
          createdAt: '10.11.2026',
          statusDate: '17.11.2026',
          windowDays: 7,
          steps: [
            '10.11.2026 · Заказ остекления по сертификату агента RC-4811',
            '17.11.2026 · Подтверждено к выплате агенту (4 000 ₽)'
          ]
        },
        {
          id: 'co-out-3',
          dir: 'out',
          branchId: 'b1',
          partnerId: 'p-igor-volkov',
          orderId: 'PZ-CO-203',
          certCode: 'RC-7110',
          clientName: 'Виктор Кузнецов',
          basis: 'Двери и входные группы',
          confirmedRub: 0,
          waitingRub: 5500,
          suspendedRub: 0,
          paidRub: 0,
          grossRub: 5500,
          createdAt: '19.11.2026',
          dueDate: '29.11.2026',
          handoverPending: true,
          steps: [
            '19.11.2026 · Работы по сертификату RC-7110 (5 500 ₽)',
            'До 29.11.2026 · Ожидает подписания акта сдачи работ'
          ]
        },
        {
          id: 'co-out-4',
          dir: 'out',
          branchId: 'b1',
          partnerId: 'p-elena-fomina',
          orderId: 'PZ-CO-204',
          certCode: 'RC-7100',
          clientName: 'Павел Громов',
          basis: 'Ремонт и отделка',
          confirmedRub: 0,
          waitingRub: 0,
          suspendedRub: 500,
          paidRub: 0,
          grossRub: 500,
          createdAt: '12.11.2026',
          suspendedReason: 'Проверка акта доп. работ.',
          steps: [
            '12.11.2026 · Начислено по доп. соглашению PZ-CO-204 (500 ₽)',
            '17.11.2026 · Приостановлено на время сверки сметы'
          ]
        },
        {
          id: 'co-out-5',
          dir: 'out',
          branchId: 'b1',
          partnerId: 'p-aleksey-romanov',
          orderId: 'PZ-CO-185',
          certCode: 'RC-4760',
          clientName: 'Карен Сафарян',
          basis: 'Окна',
          confirmedRub: 0,
          waitingRub: 0,
          suspendedRub: 0,
          paidRub: 3500,
          grossRub: 3500,
          createdAt: '22.10.2026',
          paidDate: '03.11.2026',
          payoutMethod: 'Перевод · подтверждено кодом получателя',
          steps: [
            '22.10.2026 · Подтверждено по заказу PZ-CO-185 (3 500 ₽)',
            '03.11.2026 · Выплачено агенту и закрыто в ЛК'
          ]
        },
        /* Филиал b2 («пр. Демо, Казань») */
        {
          id: 'co-in-6',
          dir: 'in',
          branchId: 'b2',
          partnerId: 'p-dom-materialov',
          orderId: 'PZ-CO-301',
          certCode: 'RC-7201',
          clientName: 'Алина Сафина',
          basis: 'Напольные покрытия',
          confirmedRub: 5200,
          waitingRub: 0,
          suspendedRub: 0,
          paidRub: 0,
          grossRub: 5200,
          createdAt: '11.11.2026',
          statusDate: '18.11.2026',
          windowDays: 7,
          steps: [
            '11.11.2026 · Заказ по сертификату RC-7201 (филиал Казань)',
            '18.11.2026 · Подтверждено к получению (5 200 ₽)'
          ]
        },
        {
          id: 'co-in-7',
          dir: 'in',
          branchId: 'b2',
          partnerId: 'p-studiya-sveta',
          orderId: 'PZ-CO-302',
          certCode: 'RC-7202',
          clientName: 'Алина Сафина',
          basis: 'Освещение',
          confirmedRub: 0,
          waitingRub: 1900,
          suspendedRub: 0,
          paidRub: 0,
          grossRub: 1900,
          createdAt: '20.11.2026',
          dueDate: '30.11.2026',
          windowDays: 10,
          steps: [
            '20.11.2026 · Покупка света по сертификату RC-7202 (1 900 ₽)',
            'До 30.11.2026 · Ожидает подтверждения партнёром'
          ]
        },
        {
          id: 'co-out-6',
          dir: 'out',
          branchId: 'b2',
          partnerId: 'p-maria-orlova',
          orderId: 'PZ-CO-303',
          certCode: 'RC-7205',
          clientName: 'Артём Новиков',
          basis: 'Ремонт и отделка',
          confirmedRub: 3800,
          waitingRub: 0,
          suspendedRub: 0,
          paidRub: 0,
          grossRub: 3800,
          createdAt: '12.11.2026',
          statusDate: '19.11.2026',
          windowDays: 7,
          steps: [
            '12.11.2026 · Сделка в филиале Казань по сертификату RC-7205',
            '19.11.2026 · Подтверждено к оплате специалисту (3 800 ₽)'
          ]
        },
        {
          id: 'co-out-7',
          dir: 'out',
          branchId: 'b2',
          partnerId: 'p-elena-fomina',
          orderId: 'PZ-CO-304',
          certCode: 'RC-7208',
          clientName: 'Алина Сафина',
          basis: 'Окна',
          confirmedRub: 0,
          waitingRub: 1500,
          suspendedRub: 0,
          paidRub: 0,
          grossRub: 1500,
          createdAt: '19.11.2026',
          dueDate: '03.12.2026',
          windowDays: 14,
          steps: [
            '19.11.2026 · Монтаж окон в Казани по сертификату RC-7208 (1 500 ₽)',
            'До 03.12.2026 · Ожидает подтверждения этапа'
          ]
        }
      ]
    }
  };

  /* Тексты, шаги и CTA пустых состояний из src/lib/wallet-empty/copy.ts + WalletSectionEmptyState.tsx */
  var EMPTY_COPY = {
    earner: {
      kicker: 'Пока пусто',
      title: 'Здесь будут ваши начисления',
      body: 'Бонус появляется после покупки клиента по вашему сертификату.',
      cardFootLabel: 'к получению',
      primaryCta: 'Создать сертификат',
      primaryAction: 'create_certificate',
      steps: [
        ['Клиент покупает у партнёра', 'По вашему сертификату'],
        ['Партнёр подтверждает', 'Начисление «в ожидании»'],
        ['Сумма в кошельке', 'После подтверждения — к получению']
      ],
      footNote: 'Раздел заполнится сам, когда появятся первые данные.'
    },
    seller: {
      kicker: 'Пока пусто',
      title: 'Кошелёк: кому и сколько',
      body: 'Начисления партнёрам и ваши выплаты — в одном месте.',
      cardFootLabel: 'начислений пока нет',
      primaryCta: 'Проверить сертификат',
      primaryAction: 'scan_qr',
      steps: [
        ['Продажа по сертификату', 'Бонус начислен партнёру'],
        ['Подтверждение', 'В срок по категории или вручную'],
        ['Выплата', 'Фиксируете перевод — долг закрыт']
      ],
      footNote: 'Раздел заполнится сам, когда появятся первые данные.'
    }
  };

  /* Сценарии группы 'wallet' (панель «Демо», hash sc-wallet=<id>) */
  RCMini.registerScenarios(
    'wallet',
    [
      { id: 'empty', label: 'Пустой кошелёк (0 ₽)' },
      { id: 'staff-branch', label: 'Сотрудник · доступ к 1 филиалу' },
      { id: 'staff-all', label: 'Сотрудник · все филиалы (просмотр)' },
      {
        id: 'staff-denied',
        label: 'Сотрудник · нет права просмотра',
        patchProfile: function (p) {
          p.wallet = {
            status: 'unavailable',
            message: 'Нет права «Просмотр расчётов». Получите доступ у вашего руководителя.',
            loadError: false
          };
          return p;
        }
      }
    ],
    'Кошелёк'
  );

  /* Сброс локального флага повтора загрузки при смене роли / сценария / филиала */
  RCMini.on('change', function () {
    RCMini.mem.set('wallet:errorRecovered', false);
  });

  function pluralRu(n, one, two, five) {
    var abs = Math.abs(n) % 100;
    var n1 = abs % 10;
    if (abs > 10 && abs < 20) return five;
    if (n1 > 1 && n1 < 5) return two;
    if (n1 === 1) return one;
    return five;
  }

  function branchTitle(role, id) {
    var map = BRANCH_NAMES[role] || {};
    return map[id] || id || 'Центральный';
  }

  function sumRows(rows) {
    var confirmedK = 0;
    var waitingK = 0;
    var suspendedK = 0;
    var paidK = 0;
    var confirmedCount = 0;
    var waitingCount = 0;
    var suspendedCount = 0;
    var paidCount = 0;

    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      if (r.confirmedRub > 0) {
        confirmedK += toK(r.confirmedRub);
        confirmedCount++;
      }
      if (r.waitingRub > 0) {
        waitingK += toK(r.waitingRub);
        waitingCount++;
      }
      if (r.suspendedRub > 0) {
        suspendedK += toK(r.suspendedRub);
        suspendedCount++;
      }
      if (r.paidRub > 0) {
        paidK += toK(r.paidRub);
        paidCount++;
      }
    }

    return {
      confirmedRub: fromK(confirmedK),
      waitingRub: fromK(waitingK),
      suspendedRub: fromK(suspendedK),
      paidRub: fromK(paidK),
      allCount: rows.length,
      confirmedCount: confirmedCount,
      waitingCount: waitingCount,
      suspendedCount: suspendedCount,
      paidCount: paidCount
    };
  }

  function parseRuDateKey(ddmmyyyy) {
    if (!ddmmyyyy) return 99999999;
    var m = String(ddmmyyyy).match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
    if (!m) return 99999999;
    return Number(m[3]) * 10000 + Number(m[2]) * 100 + Number(m[1]);
  }

  function rowMatchesBucket(row, bucket) {
    if (!bucket || bucket === 'all') return true;
    if (bucket === 'confirmed') return row.confirmedRub > 0;
    if (bucket === 'waiting' || bucket === 'schedule') return row.waitingRub > 0;
    if (bucket === 'suspended') return row.suspendedRub > 0;
    if (bucket === 'paid') return row.paidRub > 0;
    return true;
  }

  function emptyBucketCopy(bucket, dir) {
    if (bucket === 'confirmed') return 'Нет подтверждённых сумм';
    if (bucket === 'waiting') return 'Нет сумм в ожидании';
    if (bucket === 'suspended') return 'Нет приостановленных сумм';
    if (bucket === 'paid') return dir === 'in' ? 'Пока нет поступлений' : 'Пока нет выплат';
    return 'Операций пока нет';
  }

  function groupByPartner(rows) {
    var order = [];
    var byId = {};

    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      var pid = r.partnerId;
      if (!byId[pid]) {
        var meta = PARTNERS[pid] || { id: pid, name: pid, typeLabel: 'Партнёр', city: '' };
        byId[pid] = {
          partnerId: pid,
          name: meta.name,
          typeLabel: meta.typeLabel,
          city: meta.city,
          rows: [],
          confirmedK: 0,
          waitingK: 0,
          suspendedK: 0,
          paidK: 0
        };
        order.push(byId[pid]);
      }
      var g = byId[pid];
      g.rows.push(r);
      g.confirmedK += toK(r.confirmedRub);
      g.waitingK += toK(r.waitingRub);
      g.suspendedK += toK(r.suspendedRub);
      g.paidK += toK(r.paidRub);
    }

    return order.map(function (g) {
      return {
        partnerId: g.partnerId,
        name: g.name,
        typeLabel: g.typeLabel,
        city: g.city,
        rows: g.rows,
        confirmedRub: fromK(g.confirmedK),
        waitingRub: fromK(g.waitingK),
        suspendedRub: fromK(g.suspendedK),
        paidRub: fromK(g.paidK)
      };
    });
  }

  /*
   * Расчёт активного среза кошелька для контекста c.
   * opts.scope: 'auto' | 'branch' | 'all'
   */
  function computeWallet(c, opts) {
    opts = opts || {};
    var role = c.role;
    var roleDef = LEDGER[role] || LEDGER.specialist;
    var isOrg = role === 'store' || role === 'company';
    var wScenario = RCMini.scenario('wallet');
    var isStaffBranch = wScenario === 'staff-branch';
    var isStaffAll = wScenario === 'staff-all';
    var isStaff = isStaffBranch || isStaffAll;

    /* Доступные пользователю филиалы */
    var configuredBranches = (c.branches && c.branches.length)
      ? c.branches.map(function (b) { return b.id; })
      : (isOrg ? ['b1'] : []);
    var allowedBranchIds = isOrg
      ? (isStaffBranch ? ['b1'] : configuredBranches.slice())
      : [];

    /* Активная рабочая точка (у магазина по умолчанию c.branches=[] и branchId=null -> точка 'b1') */
    var effectiveBranchId = null;
    if (isOrg) {
      if (c.branchId) effectiveBranchId = c.branchId;
      else if (configuredBranches.length <= 1) effectiveBranchId = 'b1';
      else effectiveBranchId = null; // сценарий no-branch у компании с несколькими филиалами
    }

    var scopeMode = 'single';
    if (isOrg) {
      if (opts.scope === 'all' && allowedBranchIds.length > 1) {
        scopeMode = 'all';
      } else if (opts.scope === 'branch' && effectiveBranchId) {
        scopeMode = 'branch';
      } else if (!effectiveBranchId && allowedBranchIds.length > 1) {
        scopeMode = 'all';
      } else {
        scopeMode = 'branch';
      }
    }

    /* Проверка запрета доступа к выбранному филиалу */
    var branchDenied = false;
    var branchDeniedMessage = null;
    if (c.profile && c.profile.workplaceForbidden) {
      branchDenied = true;
      branchDeniedMessage = c.profile.workplaceForbiddenMessage || 'Нет прав на работу с выбранной точкой. Получите доступ у вашего руководителя.';
    } else if (isOrg && scopeMode === 'branch' && effectiveBranchId && allowedBranchIds.indexOf(effectiveBranchId) < 0) {
      branchDenied = true;
      branchDeniedMessage = 'Нет доступа к расчётам филиала «' + branchTitle(role, effectiveBranchId) + '». Получите доступ у вашего руководителя. Или выберите доступную точку.';
    }

    var rawRows = (wScenario === 'empty' || branchDenied) ? [] : roleDef.rows;
    var scopedRows = rawRows.filter(function (r) {
      if (!isOrg) return true;
      if (scopeMode === 'all') return allowedBranchIds.indexOf(r.branchId) >= 0;
      var target = effectiveBranchId || 'b1';
      return r.branchId === target;
    });

    var inRows = scopedRows.filter(function (r) { return r.dir === 'in'; });
    var outRows = roleDef.incomingOnly ? [] : scopedRows.filter(function (r) { return r.dir === 'out'; });

    var staffBanner = null;
    if (isStaffBranch) {
      staffBanner = isOrg
        ? 'Показаны расчёты по филиалам с правом просмотра (1). Исторические начисления без привязки к филиалу не включены. Итог может отличаться от общего баланса владельца.'
        : 'Режим сотрудника: доступен просмотр начислений без изменения реквизитов и фиксации выплат.';
    } else if (isStaffAll) {
      staffBanner = isOrg
        ? 'Только просмотр по доступным подразделениям (' + allowedBranchIds.length + '). Реквизиты и выплаты настраивает владелец организации.'
        : 'Режим сотрудника: доступен только просмотр расчётов.';
    }

    var currentBranchLabel = null;
    if (isOrg) {
      if (scopeMode === 'all') {
        currentBranchLabel = 'Все доступные филиалы (' + allowedBranchIds.length + ')';
      } else {
        var bid = effectiveBranchId || 'b1';
        if ((!c.branches || !c.branches.length) && c.profile && c.profile.workplaceLabel) {
          currentBranchLabel = c.profile.workplaceLabel;
        } else {
          currentBranchLabel = (c.branch && c.branch.label) || branchTitle(role, bid);
        }
      }
    }

    var cardIds = (RCMini.data && RCMini.data.cardIdentifiers) || {};

    return {
      role: role,
      isOrg: isOrg,
      incomingOnly: !!roleDef.incomingOnly,
      emptyCopy: EMPTY_COPY[roleDef.emptyKind] || EMPTY_COPY.earner,
      isStaff: isStaff,
      staffBanner: staffBanner,
      cardIdentifier: isStaff ? null : (cardIds[role] || null),
      scopeMode: scopeMode,
      effectiveBranchId: effectiveBranchId,
      allowedBranchIds: allowedBranchIds,
      canToggleAllBranches: isOrg && allowedBranchIds.length > 1,
      currentBranchLabel: currentBranchLabel,
      branchDenied: branchDenied,
      branchDeniedMessage: branchDeniedMessage,
      allCount: scopedRows.length,
      in: {
        rows: inRows,
        totals: sumRows(inRows),
        groups: groupByPartner(inRows)
      },
      out: {
        rows: outRows,
        totals: sumRows(outRows),
        groups: groupByPartner(outRows)
      }
    };
  }

  /* Экспорт данных и расчётного ядра в RCMini.data.wallet */
  RCMini.data.wallet = {
    partners: PARTNERS,
    branchNames: BRANCH_NAMES,
    ledger: LEDGER,
    emptyCopy: EMPTY_COPY,
    compute: computeWallet
  };

  /* ---------- Слот главной карты RCMini.slots.homeWallet(ctx) ---------- */
  function renderHomeWalletCard(c) {
    var p = c.profile || {};
    var w = p.wallet || { status: 'unavailable', message: '' };
    var recovered = !!RCMini.mem.get('wallet:errorRecovered', false);
    var status = (w.status === 'error' && recovered) ? 'ok' : w.status;

    /* При запрете доступа к филиалу сотруднику отражаем недоступность расчётов на карте */
    var calc = computeWallet(c, { scope: 'auto' });
    var effectiveStatus = status;
    var effectiveMessage = w.message || '';
    if (status === 'ok' && calc.branchDenied) {
      effectiveStatus = 'unavailable';
      effectiveMessage = 'Нет прав на расчёты этой точки. Получите доступ у руководителя.';
    }

    /* Ошибка загрузки баланса. В рабочем коде — прочерки и строка «Не удалось загрузить баланс.».
       В прототипе по комментарию: что случилось, что сделать и кнопка повтора прямо на карте. */
    if (effectiveStatus === 'error') {
      return (
        '<div class="cardWrap">' +
        '<section class="walletCard walletCardDual walletCardError" data-testid="mini-app-wallet-card" aria-label="Кошелёк RemCard">' +
        '<div class="walletHead">' +
        '<span class="walletRibbon">' + esc(p.roleLabel) + '</span>' +
        '<span class="walletLockup" aria-hidden="true">remcard<span class="walletLockupDot">.</span></span>' +
        '</div>' +
        '<div class="walletBody">' +
        '<p class="walletLabel">Баланс</p>' +
        '<p class="walletErrorTitle" role="alert" data-testid="mini-wallet-card-error">Не удалось загрузить баланс</p>' +
        '<p class="walletErrorText">Начисления не пропали\u00a0— не получилось только их показать. Проверьте интернет и\u00a0обновите баланс.</p>' +
        '</div>' +
        '<div class="walletCardBar">' +
        '<button type="button" class="walletRetryBtn" data-home-wallet-retry data-testid="mini-wallet-card-retry">' +
        '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M20 12a8 8 0 1 1-2.6-5.9"/><path d="M20 4.5v4.2h-4.2"/></svg>' +
        '<span>Обновить баланс</span></button>' +
        '</div>' +
        '</section>' +
        '</div>'
      );
    }

    var showOutgoing = effectiveStatus === 'ok' && !calc.incomingOnly;
    var dir = showOutgoing && RCMini.mem.get('wallet:homeDir:' + c.role, 'in') === 'out' ? 'out' : 'in';
    var switched = showOutgoing && !!RCMini.mem.get('wallet:homeDirSwitched', false);
    var totals = (dir === 'out' ? calc.out : calc.in).totals;
    var confirmed = effectiveStatus === 'ok'
      ? ui.moneyParts(totals.confirmedRub)
      : { amount: '—', currency: '' };
    var waiting = effectiveStatus === 'ok'
      ? ui.moneyParts(totals.waitingRub)
      : { amount: '—', currency: '' };

    var html =
      '<div class="cardWrap">' +
      (showOutgoing
        ? '<section class="walletCard walletCardDual' + (switched ? ' is-switched' : '') + '" data-testid="mini-app-wallet-card" aria-label="Кошелёк RemCard">'
        : '<button type="button" class="walletCard" data-testid="mini-app-wallet-card" aria-label="Кошелёк RemCard" data-go="wallet">') +
      '<div class="walletHead">' +
      '<span class="walletRibbon">' + esc(p.roleLabel) + '</span>' +
      '<span class="walletLockup" aria-hidden="true">remcard<span class="walletLockupDot">.</span></span>' +
      '</div>' +
      (showOutgoing ? '' : '<span class="walletCardFab" aria-hidden="true">→</span>') +
      '<div class="walletBody">' +
      /* Нет прав или баланс недоступен: суммы и прочерки не показываем — только что делать. */
      (effectiveStatus === 'unavailable'
        ? '<p class="walletLabel">Баланс</p>' +
          '<p class="walletNotice walletNoticeSolo" data-testid="mini-wallet-card-unavailable">' + esc(effectiveMessage) + '</p>'
        : '<p class="walletLabel">' + (dir === 'out' ? 'Начислено к оплате' : 'Начислено к получению') + '</p>' +
          '<div class="walletHero">' +
          '<strong class="walletAmount">' + esc(confirmed.amount) + '</strong>' +
          '<span class="walletUnit">' + esc(confirmed.currency || ' ₽') + '</span>' +
          '</div>' +
          (effectiveStatus === 'error' ? '<p class="walletNotice" role="alert">' + esc(effectiveMessage) + '</p>' : '') +
          '<p class="walletLabel walletLabelSecondary">Ожидает подтверждения</p>' +
          '<div class="walletWaitingRow">' +
          '<strong class="walletWaitingAmount">' + esc(waiting.amount) + '</strong>' +
          '<span class="walletWaitingUnit">' + esc(waiting.currency || ' ₽') + '</span>' +
          '</div>');

    /* Нижняя строка карты: выбор направления и переход к деталям выбранного направления */
    html += '</div>' + (showOutgoing
      ? '<div class="walletCardBar">' +
        '<div class="walletHomeSwitch" role="group" aria-label="Направление баланса" data-dir="' + dir + '">' +
        '<span class="walletHomeThumb" aria-hidden="true"></span>' +
        '<button type="button" data-home-wallet-dir="in" aria-pressed="' + (dir === 'in') + '">Мне должны</button>' +
        '<button type="button" data-home-wallet-dir="out" aria-pressed="' + (dir === 'out') + '">Я должен</button>' +
        '</div>' +
        '<button type="button" class="walletCardFab" data-go="wallet" data-params=\'{"dir":"' + dir + '"}\' aria-label="Подробнее о балансе: ' +
        (dir === 'out' ? 'Я должен' : 'Мне должны') + '"><span aria-hidden="true">→</span></button></div></section>'
      : '</button>') + '</div>';
    return html;
  }

  RCMini.slots.homeWallet = renderHomeWalletCard;
  RCMini.slots.bindHomeWallet = function (root, c) {
    /* Повтор загрузки баланса с карты: в прототипе повтор всегда успешен. */
    var homeRetry = root.querySelector('[data-home-wallet-retry]');
    if (homeRetry) {
      homeRetry.addEventListener('click', function () {
        if (homeRetry.disabled) return;
        homeRetry.disabled = true;
        homeRetry.classList.add('is-loading');
        homeRetry.querySelector('span').textContent = 'Обновляем…';
        setTimeout(function () {
          if (!homeRetry.isConnected) return;
          RCMini.mem.set('wallet:errorRecovered', true);
          RCMini.rerender();
          ui.toast('Баланс обновлён');
        }, 900);
      });
    }
    root.querySelectorAll('[data-home-wallet-dir]').forEach(function (button) {
      button.addEventListener('click', function () {
        if (button.getAttribute('aria-pressed') === 'true') return;
        var dir = button.getAttribute('data-home-wallet-dir');
        RCMini.mem.set('wallet:homeDir:' + c.role, dir);
        /* Флаг живёт один рендер: бегунок и суммы плавно сменяются только после нажатия */
        RCMini.mem.set('wallet:homeDirSwitched', true);
        RCMini.rerender();
        RCMini.mem.set('wallet:homeDirSwitched', false);
        var selected = root.querySelector('[data-home-wallet-dir][aria-pressed="true"]');
        if (selected) selected.focus({ preventScroll: true });
      });
    });
  };

  /* ---------- Экран wallet ---------- */
  function rowPrimaryBadge(row, dir) {
    if (row.suspendedRub > 0) {
      return {
        cls: 'mwBadge mwBadgeSuspended',
        text: row.needsReview ? 'Требует сверки' : 'Приостановлено'
      };
    }
    if (row.confirmedRub > 0) {
      return {
        cls: 'mwBadge mwBadgeConfirmed',
        text: dir === 'in' ? 'К получению' : 'К оплате'
      };
    }
    if (row.waitingRub > 0) {
      return {
        cls: 'mwBadge mwBadgeWaiting',
        text: row.handoverPending ? 'Акт сдачи работ' : 'Ожидает подтверждения'
      };
    }
    return {
      cls: 'mwBadge mwBadgePaid',
      text: dir === 'in' ? 'Получено' : 'Выплачено'
    };
  }

  function renderObligationRow(row, dir, c, showBranchName) {
    var badge = rowPrimaryBadge(row, dir);
    var isPartial = row.paidRub > 0 && (row.confirmedRub > 0 || row.waitingRub > 0 || row.suspendedRub > 0);
    var branchPiece = (showBranchName && row.branchId)
      ? ' · Точка: ' + branchTitle(c.role, row.branchId)
      : '';

    var h = '<div class="mwRow" data-testid="mw-row-' + esc(row.id) + '">';
    h += '<div class="mwRowTop">';
    h += '<span class="mwRowBasis">' + esc(row.basis) + '</span>';
    h += '<span class="' + badge.cls + '">' + esc(badge.text) + '</span>';
    h += '</div>';

    h +=
      '<p class="mwRowMeta">Сертификат ' + esc(row.certCode) +
      ' · Заказ ' + esc(row.orderId) +
      (row.clientName ? ' · Клиент: ' + esc(row.clientName) : '') +
      esc(branchPiece) +
      '</p>';

    h += '<div class="mwRowBuckets">';
    if (row.confirmedRub > 0) {
      h +=
        '<div class="mwBucketLine">' +
        '<span>' + (dir === 'in' ? 'Начислено к получению' : 'Начислено к оплате') + '</span>' +
        '<strong>' + esc(ui.money(row.confirmedRub)) + '</strong>' +
        '</div>';
    }
    if (row.waitingRub > 0) {
      h +=
        '<div class="mwBucketLine">' +
        '<span>Ожидает подтверждения' + (row.dueDate ? ' (до ' + esc(row.dueDate) + ')' : '') + '</span>' +
        '<strong>' + esc(ui.money(row.waitingRub)) + '</strong>' +
        '</div>';
    }
    if (row.suspendedRub > 0) {
      h +=
        '<div class="mwBucketLine">' +
        '<span>Приостановлено (не в балансе)</span>' +
        '<strong>' + esc(ui.money(row.suspendedRub)) + '</strong>' +
        '</div>';
    }
    if (row.paidRub > 0) {
      h +=
        '<div class="mwBucketLine mwBucketSubtle">' +
        '<span>' +
        (isPartial
          ? (dir === 'in' ? 'Частично получено' : 'Частично выплачено') + ' (из ' + esc(ui.money(row.grossRub)) + ')'
          : (dir === 'in' ? 'Получено вне RemCard' : 'Выплачено вне RemCard')) +
        '</span>' +
        '<strong>' + esc(ui.money(row.paidRub)) + '</strong>' +
        '</div>';
    }
    h += '</div>';

    if (row.suspendedReason) {
      h += '<p class="mwReasonNote">' + esc(row.suspendedReason) + '</p>';
    }

    h += '<details class="mwDetails">';
    h += '<summary>Детали и хронология</summary>';
    h += '<div class="mwDetailsBody">';
    h += '<div class="mwDetailPair"><span>Дата начисления</span><span>' + esc(row.createdAt) + '</span></div>';
    if (row.statusDate) {
      h += '<div class="mwDetailPair"><span>Дата подтверждения</span><span>' + esc(row.statusDate) + '</span></div>';
    }
    if (row.dueDate) {
      h += '<div class="mwDetailPair"><span>Окно подтверждения</span><span>до ' + esc(row.dueDate) + (row.windowDays ? ' (' + esc(row.windowDays) + ' дн.)' : '') + '</span></div>';
    }
    if (row.paidDate) {
      h += '<div class="mwDetailPair"><span>Дата выплаты</span><span>' + esc(row.paidDate) + '</span></div>';
    }
    if (row.payoutMethod) {
      h += '<div class="mwDetailPair"><span>Фиксация расчёта</span><span>' + esc(row.payoutMethod) + '</span></div>';
    }
    if (row.steps && row.steps.length) {
      h += '<ul class="mwTimeline">';
      for (var s = 0; s < row.steps.length; s++) {
        h += '<li>' + esc(row.steps[s]) + '</li>';
      }
      h += '</ul>';
    }
    h += '</div></details>';

    h += '</div>';
    return h;
  }

  function renderPartnerCard(group, dir, isOpen, c, showBranchName) {
    var countLabel = group.rows.length + ' ' + pluralRu(group.rows.length, 'запись', 'записи', 'записей');
    var sub = group.typeLabel + (group.city ? ' · ' + group.city : '') + ' · ' + countLabel;

    /* В шапке контрагента суммы по статусам показываем строго раздельно, не складывая с неподтверждёнными */
    var mainLine = '';
    var extraLines = [];

    if (group.confirmedRub > 0) {
      mainLine = ui.money(group.confirmedRub);
    }
    if (group.waitingRub > 0) {
      var wText = 'ожидает ' + ui.money(group.waitingRub);
      if (!mainLine) mainLine = wText;
      else extraLines.push({ text: wText, muted: false });
    }
    if (group.suspendedRub > 0) {
      var sText = 'приост. ' + ui.money(group.suspendedRub);
      if (!mainLine) mainLine = sText;
      else extraLines.push({ text: sText, muted: false });
    }
    if (group.paidRub > 0) {
      var pLabel = (dir === 'in' ? 'получено ' : 'выплачено ') + ui.money(group.paidRub);
      if (!mainLine) mainLine = pLabel;
      else extraLines.push({ text: pLabel, muted: true });
    }
    if (!mainLine) mainLine = ui.money(0);

    var h =
      '<article class="mwPartnerCard' + (isOpen ? ' mwPartnerCardOpen' : '') + '" data-testid="mw-partner-' + esc(group.partnerId) + '">' +
      '<button type="button" class="mwPartnerHead" aria-expanded="' + (isOpen ? 'true' : 'false') + '" data-mw-partner="' + esc(group.partnerId) + '">' +
      '<span class="mwPartnerLeft">' +
      '<span class="mwPartnerName">' + esc(group.name) + '</span>' +
      '<span class="mwPartnerSub">' + esc(sub) + '</span>' +
      '</span>' +
      '<span class="mwPartnerRight">' +
      '<span class="mwPartnerSums">' +
      '<span class="mwPartnerMainSum">' + esc(mainLine) + '</span>';

    for (var i = 0; i < extraLines.length; i++) {
      h +=
        '<span class="mwPartnerExtraSum' + (extraLines[i].muted ? ' mwPartnerExtraMuted' : '') + '">' +
        esc(extraLines[i].text) +
        '</span>';
    }

    h +=
      '</span>' +
      '<span class="mwPartnerChevron">' + ui.icon('chevron') + '</span>' +
      '</span>' +
      '</button>';

    if (isOpen) {
      h += '<div class="mwRows">';
      for (var r = 0; r < group.rows.length; r++) {
        h += renderObligationRow(group.rows[r], dir, c, showBranchName);
      }
      h += '</div>';
    }

    h += '</article>';
    return h;
  }

  function fullCabinetBtnHtml() {
    return (
      '<button type="button" class="secondaryBtn" data-testid="mini-wallet-open-cabinet" data-go="full-cabinet" data-params=\'' +
      esc(JSON.stringify(FULL_CABINET_PARAMS)) +
      '\'>' +
      ui.icon('external') +
      '<span>Открыть выплаты в полном кабинете</span>' +
      '</button>'
    );
  }

  function getOpenMapKey(c, dir, scopeMode) {
    return 'wallet:open:' + c.role + ':' + dir + ':' + scopeMode + ':' + (c.branchId || 'default');
  }

  function renderWalletScreen(c, params) {
    params = params || {};
    var p = c.profile || {};
    var w = p.wallet || { status: 'unavailable', message: '' };
    var recovered = !!RCMini.mem.get('wallet:errorRecovered', false);
    var status = (w.status === 'error' && recovered) ? 'ok' : w.status;

    var lead = c.role === 'agent'
      ? 'Вознаграждения от партнёров по подтверждённым покупкам.'
      : 'Взаиморасчёты с партнёрами по подтверждённым покупкам.';

    /* 1. Состояние ошибки загрузки кошелька */
    if (status === 'error') {
      var errBody =
        '<div class="mwStack">' +
        '<p class="scanBad" role="alert" data-testid="mini-wallet-error">' +
        'Не удалось загрузить баланс' +
        '</p>' +
        '<p class="gateText">Начисления не пропали\u00a0— не получилось только их показать.</p>' +
        '<ol class="gateSteps" aria-label="Что сделать">' +
        '<li>Проверьте интернет на\u00a0телефоне</li>' +
        '<li>Нажмите «Повторить»</li>' +
        '<li>Не помогло\u00a0— откройте выплаты в\u00a0полном кабинете на\u00a0сайте</li>' +
        '</ol>' +
        '<button type="button" class="primaryBtn" data-testid="mini-wallet-retry" data-mw-retry>Повторить</button>' +
        fullCabinetBtnHtml() +
        '</div>';
      return ui.subpage({ title: 'Кошелёк', lead: lead, body: errBody });
    }

    /* 2. Состояние «недоступен для роли / нет права просмотра расчётов» */
    if (status === 'unavailable') {
      var unavailBody =
        '<div class="mwStack">' +
        '<div class="blockedPanel" data-testid="mini-wallet-unavailable">' +
        esc(w.message || 'Баланс недоступен для этой роли.') +
        '</div>' +
        '<p class="footnote">Права сотрудников и реквизиты расчётов настраивает руководитель в полном кабинете.</p>' +
        fullCabinetBtnHtml() +
        '</div>';
      return ui.subpage({ title: 'Кошелёк', lead: lead, body: unavailBody });
    }

    /* 3. Рабочий режим (status === 'ok') */
    var requestedScope = params.scope === 'all' ? 'all' : (params.scope === 'branch' ? 'branch' : 'auto');
    var calc = computeWallet(c, { scope: requestedScope });

    var dir = (!calc.incomingOnly && params.dir === 'out') ? 'out' : 'in';
    var bucket = params.bucket || 'all';
    if (['all', 'confirmed', 'waiting', 'suspended', 'paid', 'schedule'].indexOf(bucket) < 0) bucket = 'all';

    var body = '<div class="mwStack">';

    /* Строка идентификатора участника и роли */
    var ownerEntity = p.entityLine || p.displayName || p.roleLabel;
    body += '<div class="mwIdentityRow">';
    body += '<span>' + esc(ownerEntity) + (calc.incomingOnly ? ' · только входящие' : '') + '</span>';
    if (calc.cardIdentifier) {
      body += '<span class="mwPanBadge" data-testid="mini-wallet-pan">' + esc(calc.cardIdentifier) + '</span>';
    }
    body += '</div>';

    /* Плашка филиала / охвата для магазина и компании */
    if (calc.isOrg) {
      body += '<div class="mwScopeBar" data-testid="mini-wallet-scope">';
      body += '<div class="mwScopeTop">';
      body += '<span class="mwScopeCurrent">' + ui.icon('pin') + '<span>' + esc(calc.currentBranchLabel || 'Центральная точка') + '</span></span>';
      if (c.branches && c.branches.length > 1) {
        body += '<button type="button" class="mwLinkBtn" data-mw-pick-branch>Сменить точку</button>';
      }
      body += '</div>';

      if (calc.canToggleAllBranches) {
        var branchBtnLabel = calc.effectiveBranchId
          ? 'По точке: ' + branchTitle(c.role, calc.effectiveBranchId)
          : 'Выбрать точку';
        body += '<div class="mwScopeSeg" role="group" aria-label="Охват подразделений">';
        body +=
          '<button type="button" class="mwScopeTab' + (calc.scopeMode === 'branch' ? ' mwScopeTabActive' : '') + '"' +
          ' data-testid="mini-wallet-scope-branch" data-mw-scope="branch">' + esc(branchBtnLabel) + '</button>';
        body +=
          '<button type="button" class="mwScopeTab' + (calc.scopeMode === 'all' ? ' mwScopeTabActive' : '') + '"' +
          ' data-testid="mini-wallet-scope-all" data-mw-scope="all">Все филиалы (' + esc(calc.allowedBranchIds.length) + ')</button>';
        body += '</div>';
      }
      body += '</div>';
    }

    /* Баннер охвата прав для сотрудника */
    if (calc.staffBanner) {
      body += '<div class="blockedPanel" data-testid="mini-wallet-staff-banner">' + esc(calc.staffBanner) + '</div>';
    }

    /* Если выбранный филиал запрещён для просмотра */
    if (calc.branchDenied) {
      body +=
        '<div class="blockedPanel" data-testid="mini-wallet-branch-denied">' +
        esc(calc.branchDeniedMessage) +
        '</div>';
      if (c.branches && c.branches.length > 1) {
        body += '<button type="button" class="primaryBtn" data-mw-pick-branch>Выбрать доступную точку</button>';
      }
      body += fullCabinetBtnHtml();
      body += '</div>';
      return ui.subpage({ title: 'Кошелёк', lead: lead, body: body });
    }

    /* Полностью пустой кошелёк по активному срезу (WalletSectionEmptyState.tsx + wallet-empty/copy.ts) */
    if (calc.allCount === 0) {
      var ec = calc.emptyCopy;
      body += '<section class="infoCard mwEmptyWrap" data-testid="mini-wallet-empty" aria-labelledby="mw-empty-title">';
      body +=
        '<div class="mwEmptyMiniCard" aria-hidden="true">' +
        '<div class="mwEmptyMiniTop"><span>RemCard</span><span class="mwEmptyMiniChip"></span></div>' +
        '<div class="mwEmptyMiniSum">0 ₽</div>' +
        '<div class="mwEmptyMiniFoot"><span>' + esc(ec.cardFootLabel) + '</span><span>Карта партнёра</span></div>' +
        '</div>';
      body += '<div>';
      body += '<p class="mwEmptyKicker">' + esc(ec.kicker) + '</p>';
      body += '<h2 class="infoCardTitle" id="mw-empty-title">' + esc(ec.title) + '</h2>';
      body += '<p class="infoCardText">' + esc(ec.body) + '</p>';
      body += '</div>';
      if (!calc.isStaff) {
        body +=
          '<button type="button" class="primaryBtn" data-testid="wallet-empty-primary-cta" data-mw-empty-action="' +
          esc(ec.primaryAction) + '">' + esc(ec.primaryCta) + '</button>';
      }
      if (ec.steps && ec.steps.length) {
        body += '<ol class="mwEmptySteps">';
        for (var st = 0; st < ec.steps.length; st++) {
          body +=
            '<li class="mwEmptyStep">' +
            '<span class="mwEmptyStepNum">' + esc(st + 1) + '</span>' +
            '<span class="mwEmptyStepBody">' +
            '<strong class="mwEmptyStepTitle">' + esc(ec.steps[st][0]) + '</strong>' +
            '<span class="mwEmptyStepNote">' + esc(ec.steps[st][1]) + '</span>' +
            '</span>' +
            '</li>';
        }
        body += '</ol>';
      }
      if (ec.footNote) {
        body += '<p class="mwEmptyFoot">' + esc(ec.footNote) + '</p>';
      }
      body += '</section>';
      body +=
        '<p class="footnote">RemCard ведёт учёт обязательств по подтверждённым покупкам и сам деньги не принимает, не хранит и не переводит.</p>';
      body += fullCabinetBtnHtml();
      body += '</div>';
      return ui.subpage({ title: 'Кошелёк', lead: lead, body: body });
    }

    /* Переключатель «Мне должны / Я должен» (скрыт у агента, т.к. агент только получает вознаграждения) */
    if (!calc.incomingOnly) {
      body += '<div class="mwDirTabs" role="tablist" aria-label="Направление расчётов" data-testid="mini-wallet-dir-tabs">';
      body +=
        '<button type="button" role="tab" aria-selected="' + (dir === 'in' ? 'true' : 'false') + '"' +
        ' class="mwDirTab' + (dir === 'in' ? ' mwDirTabActive' : '') + '"' +
        ' data-testid="mini-wallet-tab-in" data-mw-dir="in">' +
        '<span class="mwDirTabLabel">Мне должны</span>' +
        '<span class="mwDirTabSum">' + esc(ui.money(calc.in.totals.confirmedRub)) + '</span>' +
        '</button>';
      body +=
        '<button type="button" role="tab" aria-selected="' + (dir === 'out' ? 'true' : 'false') + '"' +
        ' class="mwDirTab' + (dir === 'out' ? ' mwDirTabActive' : '') + '"' +
        ' data-testid="mini-wallet-tab-out" data-mw-dir="out">' +
        '<span class="mwDirTabLabel">Я должен</span>' +
        '<span class="mwDirTabSum">' + esc(ui.money(calc.out.totals.confirmedRub)) + '</span>' +
        '</button>';
      body += '</div>';
    }

    var activeSide = dir === 'out' ? calc.out : calc.in;
    var totals = activeSide.totals;

    /* Сводка по статусам выбранного направления — строго раздельно, без общего итога */
    var heroLabel = dir === 'in' ? 'Начислено к получению' : 'Начислено к оплате';
    var heroHint = dir === 'in'
      ? 'Подтверждённые обязательства партнёров перед вами'
      : 'Подтверждённые обязательства перед вашими партнёрами';
    var paidLabel = dir === 'in' ? 'Получено' : 'Выплачено';

    body += '<section class="infoCard mwSummary" aria-label="Сводка по статусам" data-testid="mini-wallet-summary">';
    body += '<div>';
    body += '<p class="mwSummaryHeroLabel">' + esc(heroLabel) + '</p>';
    body += '<p class="mwSummaryHeroValue" data-testid="mini-wallet-confirmed">' + esc(ui.money(totals.confirmedRub)) + '</p>';
    body += '<p class="mwSummaryHeroHint">' + esc(heroHint) + '</p>';
    body += '</div>';

    body += '<div class="mwStatList">';
    body +=
      '<div class="mwStatRow">' +
      '<span class="mwStatLabelWrap"><span class="mwStatLabel">Ожидает подтверждения</span><span class="mwStatNote">· не в балансе</span></span>' +
      '<strong class="mwStatValue" data-testid="mini-wallet-waiting">' + esc(ui.money(totals.waitingRub)) + '</strong>' +
      '</div>';
    body +=
      '<div class="mwStatRow">' +
      '<span class="mwStatLabelWrap"><span class="mwStatLabel">Приостановлено</span><span class="mwStatNote">· на сверке</span></span>' +
      '<strong class="mwStatValue" data-testid="mini-wallet-suspended">' + esc(ui.money(totals.suspendedRub)) + '</strong>' +
      '</div>';
    body +=
      '<div class="mwStatRow">' +
      '<span class="mwStatLabelWrap"><span class="mwStatLabel">' + esc(paidLabel) + '</span><span class="mwStatNote">· закрыто</span></span>' +
      '<strong class="mwStatValue" data-testid="mini-wallet-paid">' + esc(ui.money(totals.paidRub)) + '</strong>' +
      '</div>';
    body += '</div>';
    body += '</section>';

    /* Быстрые фильтры статусов и графика (корзины детализации ЛК — остаются кликабельными и при 0) */
    var chips = [
      { id: 'all', label: 'Все', count: totals.allCount },
      { id: 'confirmed', label: dir === 'in' ? 'К получению' : 'К оплате', count: totals.confirmedCount },
      { id: 'waiting', label: 'Ожидает', count: totals.waitingCount },
      { id: 'suspended', label: 'Приостановлено', count: totals.suspendedCount },
      { id: 'paid', label: paidLabel, count: totals.paidCount },
      { id: 'schedule', label: 'График', count: totals.waitingCount }
    ];

    body += '<div class="mwFilterRow" role="group" aria-label="Фильтр по статусу">';
    for (var ch = 0; ch < chips.length; ch++) {
      var chip = chips[ch];
      body +=
        '<button type="button" class="mwChip' + (bucket === chip.id ? ' mwChipActive' : '') + '"' +
        ' data-testid="mini-wallet-filter-' + esc(chip.id) + '" data-mw-bucket="' + esc(chip.id) + '">' +
        '<span>' + esc(chip.label) + '</span>' +
        '<span class="mwChipCount">' + esc(chip.count) + '</span>' +
        '</button>';
    }
    body += '</div>';

    /* Отбор строк по фильтру */
    var filteredRows = activeSide.rows.filter(function (r) {
      return rowMatchesBucket(r, bucket);
    });
    var showBranchInRow = calc.isOrg && calc.scopeMode === 'all';

    if (bucket === 'schedule') {
      var scheduleRows = filteredRows.slice().sort(function (a, b) {
        return parseRuDateKey(a.dueDate) - parseRuDateKey(b.dueDate);
      });
      body += '<div class="mwSectionHead">';
      body += '<h2 class="mwSectionTitle">График подтверждений</h2>';
      body += '<span class="mwSectionMeta">' + esc(scheduleRows.length + ' ' + pluralRu(scheduleRows.length, 'запись', 'записи', 'записей')) + '</span>';
      body += '</div>';

      if (!scheduleRows.length) {
        body +=
          '<div class="infoCard" data-testid="mini-wallet-bucket-empty">' +
          '<p class="infoCardText">' + esc(emptyBucketCopy('schedule', dir)) + '</p>' +
          '</div>';
      } else {
        body += '<div class="mwScheduleCard" data-testid="wallet-accruals-schedule"><div class="mwRows">';
        for (var sr = 0; sr < scheduleRows.length; sr++) {
          var sRow = scheduleRows[sr];
          var sPartner = PARTNERS[sRow.partnerId] || { name: sRow.partnerId };
          var dueShort = sRow.dueDate ? sRow.dueDate.slice(0, 5) : '';
          body += '<div class="mwRow" data-testid="mw-schedule-' + esc(sRow.id) + '">';
          body += '<div class="mwRowTop">';
          body += '<span class="mwRowBasis">' + esc(sRow.basis) + '</span>';
          body += '<span class="mwBadge mwBadgeWaiting">' + esc(dueShort ? 'ожидает · до ' + dueShort : 'ожидает') + '</span>';
          body += '</div>';
          body +=
            '<p class="mwRowMeta">' + esc(sPartner.name) +
            ' · Заказ № ' + esc(sRow.orderId) +
            (showBranchInRow && sRow.branchId ? ' · Точка: ' + esc(branchTitle(c.role, sRow.branchId)) : '') +
            '</p>';
          body +=
            '<div class="mwBucketLine"><span>Ожидает подтверждения' +
            (sRow.dueDate ? ' (до ' + esc(sRow.dueDate) + ')' : '') +
            '</span><strong>' + esc(ui.money(sRow.waitingRub)) + '</strong></div>';
          body += '</div>';
        }
        body += '</div></div>';
      }
    } else {
      var groups = groupByPartner(filteredRows);

      body += '<div class="mwSectionHead">';
      body += '<h2 class="mwSectionTitle">По контрагентам</h2>';
      body +=
        '<span class="mwSectionMeta">' +
        esc(groups.length + ' ' + pluralRu(groups.length, 'партнёр', 'партнёра', 'партнёров')) +
        '</span>';
      body += '</div>';

      if (!groups.length) {
        body +=
          '<div class="infoCard" data-testid="mini-wallet-bucket-empty">' +
          '<p class="infoCardText">' + esc(emptyBucketCopy(bucket, dir)) + '</p>' +
          '</div>';
      } else {
        var openKey = getOpenMapKey(c, dir, calc.scopeMode);
        var openMap = RCMini.mem.get(openKey, null);
        if (!openMap || typeof openMap !== 'object') {
          openMap = {};
          /* По умолчанию раскрыт первый контрагент — детали видны сразу без лишних переходов */
          openMap[groups[0].partnerId] = true;
        }

        body += '<div class="mwPartnerList" data-testid="mini-wallet-partners">';
        for (var g = 0; g < groups.length; g++) {
          var grp = groups[g];
          body += renderPartnerCard(grp, dir, !!openMap[grp.partnerId], c, showBranchInRow);
        }
        body += '</div>';
      }
    }

    /* Разъяснение учётной модели RemCard + переход к выплатам в полном кабинете */
    body +=
      '<p class="footnote">' +
      'Неподтверждённые суммы не входят в сумму ' + (dir === 'in' ? 'к получению' : 'к оплате') + '. ' +
      'RemCard ведёт учёт обязательств и не переводит деньги: расчёты выполняются партнёрами напрямую, а запись выплаты по коду доступна в полном кабинете.' +
      '</p>';

    body += fullCabinetBtnHtml();
    body += '</div>';

    return ui.subpage({
      title: 'Кошелёк',
      lead: lead,
      body: body
    });
  }

  function updateWalletParams(c, patch) {
    var cur = c.params || {};
    var next = {};
    var k;
    for (k in cur) {
      if (cur[k] != null) next[k] = cur[k];
    }
    for (k in patch) {
      if (patch[k] == null) delete next[k];
      else next[k] = patch[k];
    }
    RCMini.replace('wallet', next);
  }

  RCMini.registerScreen('wallet', {
    testid: 'mini-app-wallet',
    render: renderWalletScreen,
    afterRender: function (root, c, params) {
      /* Повтор загрузки при ошибке */
      var retryBtn = root.querySelector('[data-mw-retry]');
      if (retryBtn) {
        retryBtn.addEventListener('click', function () {
          RCMini.mem.set('wallet:errorRecovered', true);
          RCMini.rerender();
          ui.toast('Баланс обновлён');
        });
      }

      /* Первичное действие пустого состояния (Создать сертификат / Проверить сертификат) */
      var emptyBtn = root.querySelector('[data-mw-empty-action]');
      if (emptyBtn) {
        emptyBtn.addEventListener('click', function () {
          var act = emptyBtn.getAttribute('data-mw-empty-action');
          if (typeof RCMini.dispatchAction === 'function') {
            RCMini.dispatchAction(act);
          } else if (act === 'scan_qr') {
            RCMini.go('scan');
          } else {
            RCMini.go('cert-create');
          }
        });
      }

      /* Переключение направления «Мне должны / Я должен» */
      root.querySelectorAll('[data-mw-dir]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var nextDir = btn.getAttribute('data-mw-dir');
          updateWalletParams(c, {
            dir: nextDir === 'out' ? 'out' : null,
            bucket: null
          });
        });
      });

      /* Переключение фильтра статуса */
      root.querySelectorAll('[data-mw-bucket]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var b = btn.getAttribute('data-mw-bucket');
          updateWalletParams(c, { bucket: b === 'all' ? null : b });
        });
      });

      /* Переключение охвата подразделений («По точке» / «Все филиалы») */
      root.querySelectorAll('[data-mw-scope]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var sc = btn.getAttribute('data-mw-scope');
          if (sc === 'branch' && !c.branchId && c.branches && c.branches.length > 1) {
            var wSc = RCMini.scenario('wallet');
            RCMini.go('branch-pick', {
              next: 'wallet',
              nextParams: { scope: 'branch', dir: params && params.dir ? params.dir : null },
              branchIds: wSc === 'staff-branch' ? ['b1'] : null
            });
            return;
          }
          updateWalletParams(c, { scope: sc === 'all' ? 'all' : 'branch' });
        });
      });

      /* Переход к выбору рабочей точки с возвратом в кошелёк */
      root.querySelectorAll('[data-mw-pick-branch]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var wSc = RCMini.scenario('wallet');
          RCMini.go('branch-pick', {
            next: 'wallet',
            nextParams: { scope: 'branch', dir: params && params.dir ? params.dir : null },
            branchIds: wSc === 'staff-branch' ? ['b1'] : null
          });
        });
      });

      /* Раскрытие / сворачивание карточек контрагентов */
      root.querySelectorAll('[data-mw-partner]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var pid = btn.getAttribute('data-mw-partner');
          var requestedScope = params && params.scope === 'all' ? 'all' : (params && params.scope === 'branch' ? 'branch' : 'auto');
          var calc = computeWallet(c, { scope: requestedScope });
          var dir = (!calc.incomingOnly && params && params.dir === 'out') ? 'out' : 'in';
          var openKey = getOpenMapKey(c, dir, calc.scopeMode);
          var openMap = RCMini.mem.get(openKey, null);
          if (!openMap || typeof openMap !== 'object') {
            openMap = {};
            var activeSide = dir === 'out' ? calc.out : calc.in;
            var curBucket = (params && params.bucket) || 'all';
            var curGroups = groupByPartner(activeSide.rows.filter(function (r) { return rowMatchesBucket(r, curBucket); }));
            if (curGroups.length) openMap[curGroups[0].partnerId] = true;
          }
          openMap[pid] = !openMap[pid];
          RCMini.mem.set(openKey, openMap);
          RCMini.rerender();
        });
      });
    }
  });
})();
