/** Book page reviewer chrome. See PROTOTYPE-PAGES.md */
const PAGE_DEFS = [
  { n: 1, id: "hub", title: "Общий вход прототипа", zone: "hub", rel: "index.html" },
  { n: 2, id: "client:home", title: "Клиент · главная", zone: "client", clientRoutes: ["home",""], r2: false },
  { n: 3, id: "client:login", title: "Клиент · вход", zone: "client", clientRoutes: ["login"], r2: false },
  { n: 4, id: "client:register", title: "Клиент · регистрация", zone: "client", clientRoutes: ["register","signup"], r2: false },
  { n: 5, id: "client:catalog", title: "Клиент · каталог", zone: "client", clientRoutes: ["catalog"], r2: false },
  { n: 6, id: "client:product", title: "Клиент · карточка товара", zone: "client", clientRoutes: ["product/*"], r2: false },
  { n: 7, id: "client:client-retained", title: "Клиент · сохранённое (client-retained)", zone: "client", clientRoutes: ["client-retained"], r2: false },
  { n: 8, id: "client:navigator", title: "Клиент · навигатор ремонта", zone: "client", clientRoutes: ["navigator"], r2: false },
  { n: 9, id: "client:navigator-object", title: "Клиент · объект навигатора", zone: "client", clientRoutes: ["navigator/*"], r2: false },
  { n: 10, id: "client:account", title: "Клиент · личный кабинет", zone: "client", clientRoutes: ["account"], r2: false },
  { n: 11, id: "client:account-profile", title: "Клиент · профиль", zone: "client", clientRoutes: ["account/profile"], r2: false },
  { n: 12, id: "client:account-orders", title: "Клиент · заказы", zone: "client", clientRoutes: ["account/orders"], r2: false },
  { n: 13, id: "client:account-settings", title: "Клиент · настройки", zone: "client", clientRoutes: ["account/settings"], r2: false },
  { n: 14, id: "client:account-certificates", title: "Клиент · мои сертификаты", zone: "client", clientRoutes: ["account/certificates"], r2: false },
  { n: 15, id: "client:cert", title: "Клиент · сертификат (витрина)", zone: "client", clientRoutes: ["cert"], r2: false },
  { n: 16, id: "client:cert-detail", title: "Клиент · сертификат (код)", zone: "client", clientRoutes: ["cert/*"], r2: false },
  { n: 17, id: "client:care", title: "Клиент · забота (R2)", zone: "client", clientRoutes: ["care","services","care/*"], r2: true },
  { n: 18, id: "client:calc", title: "Клиент · калькулятор", zone: "client", clientRoutes: ["calc"], r2: false },
  { n: 19, id: "client:calc-materials", title: "Клиент · калькулятор материалов", zone: "client", clientRoutes: ["calc/materials"], r2: false },
  { n: 20, id: "client:calc-object", title: "Клиент · калькулятор объекта", zone: "client", clientRoutes: ["calc/object","calc/objects"], r2: false },
  { n: 21, id: "client:matcalc", title: "Клиент · matcalc", zone: "client", clientRoutes: ["matcalc"], r2: false },
  { n: 22, id: "client:matcalc-materials", title: "Клиент · matcalc материалы", zone: "client", clientRoutes: ["matcalc/materials","matcalc/*"], r2: false },
  { n: 23, id: "client:extras-projects", title: "Клиент · проекты (extras)", zone: "client", clientRoutes: ["extras/projects","projects","extras/*"], r2: false },
  { n: 24, id: "client:app", title: "Клиент · приложение (PWA)", zone: "client", clientRoutes: ["app"], r2: false },
  { n: 25, id: "client:cart", title: "Клиент · корзина", zone: "client", clientRoutes: ["cart"], r2: false },
  { n: 26, id: "client:checkout", title: "Клиент · оформление", zone: "client", clientRoutes: ["checkout"], r2: false },
  { n: 27, id: "client:search", title: "Клиент · поиск", zone: "client", clientRoutes: ["search"], r2: false },
  { n: 28, id: "client:partners", title: "Клиент · партнёры (демо)", zone: "client", clientRoutes: ["partners"], r2: false },
  { n: 29, id: "client:favorites", title: "Клиент · избранное", zone: "client", clientRoutes: ["favorites"], r2: false },
  { n: 30, id: "client:compare", title: "Клиент · сравнение", zone: "client", clientRoutes: ["compare"], r2: false },
  { n: 31, id: "client:reviews", title: "Клиент · отзывы", zone: "client", clientRoutes: ["reviews"], r2: false },
  { n: 32, id: "client:help", title: "Клиент · помощь", zone: "client", clientRoutes: ["help"], r2: false },
  { n: 33, id: "client:privacy", title: "Клиент · конфиденциальность", zone: "client", clientRoutes: ["privacy"], r2: false },
  { n: 34, id: "client:notifications", title: "Клиент · уведомления", zone: "client", clientRoutes: ["notifications"], r2: false },
  { n: 35, id: "client:landing", title: "Клиент · лендинг", zone: "client", clientRoutes: ["landing"], r2: false },
  { n: 36, id: "client:retained", title: "Клиент · удерживаемый экран", zone: "client", clientRoutes: ["retained"], r2: false },
  { n: 37, id: "client:deal", title: "Клиент · сделка", zone: "client", clientRoutes: ["deal"], r2: false },
  { n: 38, id: "client:order", title: "Клиент · заказ", zone: "client", clientRoutes: ["order","orders"], r2: false },
  { n: 39, id: "admin:overview", title: "Админ · обзор", zone: "admin", adminView: "overview" },
  { n: 40, id: "admin:partners", title: "Админ · партнёры", zone: "admin", adminView: "partners" },
  { n: 41, id: "admin:clients", title: "Админ · клиенты", zone: "admin", adminView: "clients" },
  { n: 42, id: "admin:team", title: "Админ · команда", zone: "admin", adminView: "team" },
  { n: 43, id: "admin:tasks", title: "Админ · задачи", zone: "admin", adminView: "tasks" },
  { n: 44, id: "admin:analytics", title: "Админ · аналитика", zone: "admin", adminView: "analytics" },
  { n: 45, id: "admin:results", title: "Админ · результаты", zone: "admin", adminView: "results" },
  { n: 46, id: "admin:notifications", title: "Админ · уведомления", zone: "admin", adminView: "notifications" },
  { n: 47, id: "admin:settings", title: "Админ · настройки", zone: "admin", adminView: "settings" },
  { n: 48, id: "partner:registration", title: "Партнёр · регистрация и вход", zone: "partner", rel: "partner/index.html", partnerMode: "registration" },
  { n: 49, id: "partner:specialist:home", title: "Кабинет специалиста · главная", zone: "partner", r2: false, partnerRole: "specialist", partnerSection: "home" },
  { n: 50, id: "partner:specialist:partners", title: "Кабинет специалиста · партнёры", zone: "partner", r2: false, partnerRole: "specialist", partnerSection: "partners" },
  { n: 51, id: "partner:specialist:recommendations", title: "Кабинет специалиста · сертификаты", zone: "partner", r2: false, partnerRole: "specialist", partnerSection: "recommendations" },
  { n: 52, id: "partner:specialist:procurement", title: "Кабинет специалиста · закупки (R2)", zone: "partner", r2: true, partnerRole: "specialist", partnerSection: "procurement" },
  { n: 53, id: "partner:specialist:care", title: "Кабинет специалиста · забота (R2)", zone: "partner", r2: true, partnerRole: "specialist", partnerSection: "care" },
  { n: 54, id: "partner:specialist:profile", title: "Кабинет специалиста · профиль", zone: "partner", r2: false, partnerRole: "specialist", partnerSection: "profile" },
  { n: 55, id: "partner:store:home", title: "Кабинет магазина · главная", zone: "partner", r2: false, partnerRole: "store", partnerSection: "home" },
  { n: 56, id: "partner:store:recommendations", title: "Кабинет магазина · сертификаты", zone: "partner", r2: false, partnerRole: "store", partnerSection: "recommendations" },
  { n: 57, id: "partner:store:partners", title: "Кабинет магазина · партнёры", zone: "partner", r2: false, partnerRole: "store", partnerSection: "partners" },
  { n: 58, id: "partner:store:history", title: "Кабинет магазина · история", zone: "partner", r2: false, partnerRole: "store", partnerSection: "history" },
  { n: 59, id: "partner:store:procurement", title: "Кабинет магазина · закупки (R2)", zone: "partner", r2: true, partnerRole: "store", partnerSection: "procurement" },
  { n: 60, id: "partner:store:care", title: "Кабинет магазина · забота (R2)", zone: "partner", r2: true, partnerRole: "store", partnerSection: "care" },
  { n: 61, id: "partner:store:profile", title: "Кабинет магазина · профиль", zone: "partner", r2: false, partnerRole: "store", partnerSection: "profile" },
  { n: 62, id: "partner:company:home", title: "Кабинет компании · главная", zone: "partner", r2: false, partnerRole: "company", partnerSection: "home" },
  { n: 63, id: "partner:company:recommendations", title: "Кабинет компании · сертификаты", zone: "partner", r2: false, partnerRole: "company", partnerSection: "recommendations" },
  { n: 64, id: "partner:company:partners", title: "Кабинет компании · партнёры", zone: "partner", r2: false, partnerRole: "company", partnerSection: "partners" },
  { n: 65, id: "partner:company:history", title: "Кабинет компании · история", zone: "partner", r2: false, partnerRole: "company", partnerSection: "history" },
  { n: 66, id: "partner:company:team", title: "Кабинет компании · сотрудники", zone: "partner", r2: false, partnerRole: "company", partnerSection: "team" },
  { n: 67, id: "partner:company:procurement", title: "Кабинет компании · закупки (R2)", zone: "partner", r2: true, partnerRole: "company", partnerSection: "procurement" },
  { n: 68, id: "partner:company:care", title: "Кабинет компании · забота (R2)", zone: "partner", r2: true, partnerRole: "company", partnerSection: "care" },
  { n: 69, id: "partner:company:profile", title: "Кабинет компании · профиль", zone: "partner", r2: false, partnerRole: "company", partnerSection: "profile" },
  { n: 70, id: "partner:agent:home", title: "Кабинет агента · главная", zone: "partner", r2: false, partnerRole: "agent", partnerSection: "home" },
  { n: 71, id: "partner:agent:partners", title: "Кабинет агента · партнёры", zone: "partner", r2: false, partnerRole: "agent", partnerSection: "partners" },
  { n: 72, id: "partner:agent:recommendations", title: "Кабинет агента · сертификаты", zone: "partner", r2: false, partnerRole: "agent", partnerSection: "recommendations" },
  { n: 73, id: "partner:agent:procurement", title: "Кабинет агента · закупки (R2)", zone: "partner", r2: true, partnerRole: "agent", partnerSection: "procurement" },
  { n: 74, id: "partner:agent:care", title: "Кабинет агента · забота (R2)", zone: "partner", r2: true, partnerRole: "agent", partnerSection: "care" },
  { n: 75, id: "partner:agent:profile", title: "Кабинет агента · профиль", zone: "partner", r2: false, partnerRole: "agent", partnerSection: "profile" },
  { n: 76, id: "partner:employee:home", title: "Кабинет сотрудника · главная", zone: "partner", r2: false, partnerRole: "employee", partnerSection: "home" },
  { n: 77, id: "partner:employee:partners", title: "Кабинет сотрудника · партнёры", zone: "partner", r2: false, partnerRole: "employee", partnerSection: "partners" },
  { n: 78, id: "partner:employee:history", title: "Кабинет сотрудника · история", zone: "partner", r2: false, partnerRole: "employee", partnerSection: "history" },
  { n: 79, id: "partner:employee:team", title: "Кабинет сотрудника · сотрудники", zone: "partner", r2: false, partnerRole: "employee", partnerSection: "team" },
  { n: 80, id: "partner:employee:links", title: "Кабинет сотрудника · приглашения", zone: "partner", r2: false, partnerRole: "employee", partnerSection: "links" },
  { n: 81, id: "partner:employee:procurement", title: "Кабинет сотрудника · закупки (R2)", zone: "partner", r2: true, partnerRole: "employee", partnerSection: "procurement" },
  { n: 82, id: "partner:employee:care", title: "Кабинет сотрудника · забота (R2)", zone: "partner", r2: true, partnerRole: "employee", partnerSection: "care" },
  { n: 83, id: "partner:employee:profile", title: "Кабинет сотрудника · профиль", zone: "partner", r2: false, partnerRole: "employee", partnerSection: "profile" },
  { n: 84, id: "partner:specialist:clients-list", title: "Кабинет специалиста · Клиенты", zone: "partner", r2: false, partnerRole: "specialist", partnerSection: "clients", clientAppealsView: "list" },
  { n: 85, id: "partner:specialist:clients-detail", title: "Кабинет специалиста · Обращение", zone: "partner", r2: false, partnerRole: "specialist", partnerSection: "clients", clientAppealsView: "detail", tocOpen: "Раздел «Клиенты» → строка обращения" },
  { n: 86, id: "partner:specialist:clients-scan", title: "Кабинет специалиста · Сканировать сертификат", zone: "partner", r2: false, partnerRole: "specialist", partnerSection: "clients", clientAppealsView: "scan", tocOpen: "«Клиенты» или «Сканер» → «Сканировать сертификат»" },
  { n: 87, id: "partner:specialist:clients-manual", title: "Кабинет специалиста · Добавить клиента", zone: "partner", r2: false, partnerRole: "specialist", partnerSection: "clients", clientAppealsView: "manual", tocOpen: "«Клиенты» → «Добавить клиента»" },
  { n: 88, id: "partner:specialist:clients-settings", title: "Кабинет специалиста · Этапы и причины", zone: "partner", r2: false, partnerRole: "specialist", partnerSection: "clients", clientAppealsView: "settings", tocOpen: "«Клиенты» → «Этапы и причины»" },
  { n: 89, id: "partner:specialist:clients-purchase", title: "Кабинет специалиста · Покупка", zone: "partner", r2: false, partnerRole: "specialist", partnerSection: "clients", clientAppealsView: "purchase", tocOpen: "Карточка обращения → покупка" },
  { n: 90, id: "partner:specialist:clients-analytics", title: "Кабинет специалиста · Аналитика", zone: "partner", r2: false, partnerRole: "specialist", partnerSection: "clients", clientAppealsView: "analytics", tocOpen: "«Клиенты» → «Аналитика»" },
  { n: 91, id: "partner:specialist:clients-observer-partner", title: "Кабинет специалиста · Клиенты у партнёра", zone: "partner", r2: false, partnerRole: "specialist", partnerSection: "clients", clientAppealsView: "observer-partner", tocOpen: "Вкладка «Мои клиенты у партнёров» → партнёр" },
  { n: 92, id: "partner:specialist:clients-observer-client", title: "Кабинет специалиста · Статус направления", zone: "partner", r2: false, partnerRole: "specialist", partnerSection: "clients", clientAppealsView: "observer-client", tocOpen: "Список направлений → клиент" },
  { n: 93, id: "partner:store:clients-list", title: "Кабинет магазина · Клиенты", zone: "partner", r2: false, partnerRole: "store", partnerSection: "clients", clientAppealsView: "list" },
  { n: 94, id: "partner:store:clients-detail", title: "Кабинет магазина · Обращение", zone: "partner", r2: false, partnerRole: "store", partnerSection: "clients", clientAppealsView: "detail", tocOpen: "Раздел «Клиенты» → строка обращения" },
  { n: 95, id: "partner:store:clients-scan", title: "Кабинет магазина · Сканировать сертификат", zone: "partner", r2: false, partnerRole: "store", partnerSection: "clients", clientAppealsView: "scan", tocOpen: "«Клиенты» или «Сканер» → «Сканировать сертификат»" },
  { n: 96, id: "partner:store:clients-manual", title: "Кабинет магазина · Добавить клиента", zone: "partner", r2: false, partnerRole: "store", partnerSection: "clients", clientAppealsView: "manual", tocOpen: "«Клиенты» → «Добавить клиента»" },
  { n: 97, id: "partner:store:clients-settings", title: "Кабинет магазина · Этапы и причины", zone: "partner", r2: false, partnerRole: "store", partnerSection: "clients", clientAppealsView: "settings", tocOpen: "«Клиенты» → «Этапы и причины»" },
  { n: 98, id: "partner:store:clients-purchase", title: "Кабинет магазина · Покупка", zone: "partner", r2: false, partnerRole: "store", partnerSection: "clients", clientAppealsView: "purchase", tocOpen: "Карточка обращения → покупка" },
  { n: 99, id: "partner:store:clients-analytics", title: "Кабинет магазина · Аналитика", zone: "partner", r2: false, partnerRole: "store", partnerSection: "clients", clientAppealsView: "analytics", tocOpen: "«Клиенты» → «Аналитика»" },
  { n: 100, id: "partner:store:clients-observer-partner", title: "Кабинет магазина · Клиенты у партнёра", zone: "partner", r2: false, partnerRole: "store", partnerSection: "clients", clientAppealsView: "observer-partner", tocOpen: "Вкладка «Мои клиенты у партнёров» → партнёр" },
  { n: 101, id: "partner:store:clients-observer-client", title: "Кабинет магазина · Статус направления", zone: "partner", r2: false, partnerRole: "store", partnerSection: "clients", clientAppealsView: "observer-client", tocOpen: "Список направлений → клиент" },
  { n: 102, id: "partner:company:clients-list", title: "Кабинет компании · Клиенты", zone: "partner", r2: false, partnerRole: "company", partnerSection: "clients", clientAppealsView: "list" },
  { n: 103, id: "partner:company:clients-detail", title: "Кабинет компании · Обращение", zone: "partner", r2: false, partnerRole: "company", partnerSection: "clients", clientAppealsView: "detail", tocOpen: "Раздел «Клиенты» → строка обращения" },
  { n: 104, id: "partner:company:clients-scan", title: "Кабинет компании · Сканировать сертификат", zone: "partner", r2: false, partnerRole: "company", partnerSection: "clients", clientAppealsView: "scan", tocOpen: "«Клиенты» или «Сканер» → «Сканировать сертификат»" },
  { n: 105, id: "partner:company:clients-manual", title: "Кабинет компании · Добавить клиента", zone: "partner", r2: false, partnerRole: "company", partnerSection: "clients", clientAppealsView: "manual", tocOpen: "«Клиенты» → «Добавить клиента»" },
  { n: 106, id: "partner:company:clients-settings", title: "Кабинет компании · Этапы и причины", zone: "partner", r2: false, partnerRole: "company", partnerSection: "clients", clientAppealsView: "settings", tocOpen: "«Клиенты» → «Этапы и причины»" },
  { n: 107, id: "partner:company:clients-purchase", title: "Кабинет компании · Покупка", zone: "partner", r2: false, partnerRole: "company", partnerSection: "clients", clientAppealsView: "purchase", tocOpen: "Карточка обращения → покупка" },
  { n: 108, id: "partner:company:clients-analytics", title: "Кабинет компании · Аналитика", zone: "partner", r2: false, partnerRole: "company", partnerSection: "clients", clientAppealsView: "analytics", tocOpen: "«Клиенты» → «Аналитика»" },
  { n: 109, id: "partner:company:clients-observer-partner", title: "Кабинет компании · Клиенты у партнёра", zone: "partner", r2: false, partnerRole: "company", partnerSection: "clients", clientAppealsView: "observer-partner", tocOpen: "Вкладка «Мои клиенты у партнёров» → партнёр" },
  { n: 110, id: "partner:company:clients-observer-client", title: "Кабинет компании · Статус направления", zone: "partner", r2: false, partnerRole: "company", partnerSection: "clients", clientAppealsView: "observer-client", tocOpen: "Список направлений → клиент" },
  { n: 111, id: "partner:agent:clients-list", title: "Кабинет агента · Клиенты", zone: "partner", r2: false, partnerRole: "agent", partnerSection: "clients", clientAppealsView: "list" },
  { n: 112, id: "partner:agent:clients-detail", title: "Кабинет агента · Обращение", zone: "partner", r2: false, partnerRole: "agent", partnerSection: "clients", clientAppealsView: "detail", tocOpen: "Раздел «Клиенты» → строка обращения" },
  { n: 113, id: "partner:agent:clients-scan", title: "Кабинет агента · Сканировать сертификат", zone: "partner", r2: false, partnerRole: "agent", partnerSection: "clients", clientAppealsView: "scan", tocOpen: "«Клиенты» или «Сканер» → «Сканировать сертификат»" },
  { n: 114, id: "partner:agent:clients-manual", title: "Кабинет агента · Добавить клиента", zone: "partner", r2: false, partnerRole: "agent", partnerSection: "clients", clientAppealsView: "manual", tocOpen: "«Клиенты» → «Добавить клиента»" },
  { n: 115, id: "partner:agent:clients-settings", title: "Кабинет агента · Этапы и причины", zone: "partner", r2: false, partnerRole: "agent", partnerSection: "clients", clientAppealsView: "settings", tocOpen: "«Клиенты» → «Этапы и причины»" },
  { n: 116, id: "partner:agent:clients-purchase", title: "Кабинет агента · Покупка", zone: "partner", r2: false, partnerRole: "agent", partnerSection: "clients", clientAppealsView: "purchase", tocOpen: "Карточка обращения → покупка" },
  { n: 117, id: "partner:agent:clients-analytics", title: "Кабинет агента · Аналитика", zone: "partner", r2: false, partnerRole: "agent", partnerSection: "clients", clientAppealsView: "analytics", tocOpen: "«Клиенты» → «Аналитика»" },
  { n: 118, id: "partner:agent:clients-observer-partner", title: "Кабинет агента · Клиенты у партнёра", zone: "partner", r2: false, partnerRole: "agent", partnerSection: "clients", clientAppealsView: "observer-partner", tocOpen: "Вкладка «Мои клиенты у партнёров» → партнёр" },
  { n: 119, id: "partner:agent:clients-observer-client", title: "Кабинет агента · Статус направления", zone: "partner", r2: false, partnerRole: "agent", partnerSection: "clients", clientAppealsView: "observer-client", tocOpen: "Список направлений → клиент" },
  { n: 120, id: "partner:employee:clients-list", title: "Кабинет сотрудника · Клиенты", zone: "partner", r2: false, partnerRole: "employee", partnerSection: "clients", clientAppealsView: "list" },
  { n: 121, id: "partner:employee:clients-detail", title: "Кабинет сотрудника · Обращение", zone: "partner", r2: false, partnerRole: "employee", partnerSection: "clients", clientAppealsView: "detail", tocOpen: "Раздел «Клиенты» → строка обращения" },
  { n: 122, id: "partner:employee:clients-scan", title: "Кабинет сотрудника · Сканировать сертификат", zone: "partner", r2: false, partnerRole: "employee", partnerSection: "clients", clientAppealsView: "scan", tocOpen: "«Клиенты» или «Сканер» → «Сканировать сертификат»" },
  { n: 123, id: "partner:employee:clients-manual", title: "Кабинет сотрудника · Добавить клиента", zone: "partner", r2: false, partnerRole: "employee", partnerSection: "clients", clientAppealsView: "manual", tocOpen: "«Клиенты» → «Добавить клиента»" },
  { n: 124, id: "partner:employee:clients-settings", title: "Кабинет сотрудника · Этапы и причины", zone: "partner", r2: false, partnerRole: "employee", partnerSection: "clients", clientAppealsView: "settings", tocOpen: "«Клиенты» → «Этапы и причины»" },
  { n: 125, id: "partner:employee:clients-purchase", title: "Кабинет сотрудника · Покупка", zone: "partner", r2: false, partnerRole: "employee", partnerSection: "clients", clientAppealsView: "purchase", tocOpen: "Карточка обращения → покупка" },
  { n: 126, id: "partner:employee:clients-analytics", title: "Кабинет сотрудника · Аналитика", zone: "partner", r2: false, partnerRole: "employee", partnerSection: "clients", clientAppealsView: "analytics", tocOpen: "«Клиенты» → «Аналитика»" },
  { n: 127, id: "partner:employee:clients-observer-partner", title: "Кабинет сотрудника · Клиенты у партнёра", zone: "partner", r2: false, partnerRole: "employee", partnerSection: "clients", clientAppealsView: "observer-partner", tocOpen: "Вкладка «Мои клиенты у партнёров» → партнёр" },
  { n: 128, id: "partner:employee:clients-observer-client", title: "Кабинет сотрудника · Статус направления", zone: "partner", r2: false, partnerRole: "employee", partnerSection: "clients", clientAppealsView: "observer-client", tocOpen: "Список направлений → клиент" },
  { n: 129, id: "partner:store:settlements-accruals", title: "Кабинет магазина · кошелёк · Взаиморасчёты (обзор)", zone: "partner", r2: false, partnerRole: "store", partnerSection: "settlements", walletTemplate: "accruals" },
  { n: 130, id: "partner:store:settlements-requisites", title: "Кабинет магазина · кошелёк · Реквизиты", zone: "partner", r2: false, partnerRole: "store", partnerSection: "settlements", walletTemplate: "requisites", tocOpen: "Кошелёк → вкладка «Реквизиты»" },
  { n: 131, id: "partner:store:settlements-master-ledger", title: "Кабинет магазина · кошелёк · Реестр и сверка", zone: "partner", r2: false, partnerRole: "store", partnerSection: "settlements", walletTemplate: "master-ledger", tocOpen: "Кошелёк → «Реестр, сверка и Excel»" },
  { n: 132, id: "partner:company:settlements-accruals", title: "Кабинет компании · кошелёк · Взаиморасчёты (обзор)", zone: "partner", r2: false, partnerRole: "company", partnerSection: "settlements", walletTemplate: "accruals" },
  { n: 133, id: "partner:company:settlements-requisites", title: "Кабинет компании · кошелёк · Реквизиты", zone: "partner", r2: false, partnerRole: "company", partnerSection: "settlements", walletTemplate: "requisites", tocOpen: "Кошелёк → вкладка «Реквизиты»" },
  { n: 134, id: "partner:company:settlements-master-ledger", title: "Кабинет компании · кошелёк · Реестр и сверка", zone: "partner", r2: false, partnerRole: "company", partnerSection: "settlements", walletTemplate: "master-ledger", tocOpen: "Кошелёк → «Реестр, сверка и Excel»" },
  { n: 135, id: "partner:employee:settlements-accruals", title: "Кабинет сотрудника · кошелёк · Взаиморасчёты (обзор)", zone: "partner", r2: false, partnerRole: "employee", partnerSection: "settlements", walletTemplate: "accruals" },
  { n: 136, id: "partner:employee:settlements-requisites", title: "Кабинет сотрудника · кошелёк · Реквизиты", zone: "partner", r2: false, partnerRole: "employee", partnerSection: "settlements", walletTemplate: "requisites", tocOpen: "Кошелёк → вкладка «Реквизиты»" },
  { n: 137, id: "partner:employee:settlements-master-ledger", title: "Кабинет сотрудника · кошелёк · Реестр и сверка", zone: "partner", r2: false, partnerRole: "employee", partnerSection: "settlements", walletTemplate: "master-ledger", tocOpen: "Кошелёк → «Реестр, сверка и Excel»" },
  { n: 138, id: "partner:agent:bonus-accruals", title: "Кабинет агента · кошелёк · Взаиморасчёты (обзор)", zone: "partner", r2: false, partnerRole: "agent", partnerSection: "bonus", walletTemplate: "accruals" },
  { n: 139, id: "partner:agent:bonus-requisites", title: "Кабинет агента · кошелёк · Реквизиты", zone: "partner", r2: false, partnerRole: "agent", partnerSection: "bonus", walletTemplate: "requisites", tocOpen: "Кошелёк → вкладка «Реквизиты»" },
  { n: 140, id: "partner:agent:bonus-agent-registry", title: "Кабинет агента · кошелёк · Реестр начислений агента", zone: "partner", r2: false, partnerRole: "agent", partnerSection: "bonus", walletTemplate: "agent-registry", tocOpen: "Кошелёк агента → «Реестр начислений агента»" },
  { n: 141, id: "partner:specialist:bonus-accruals", title: "Кабинет специалиста · кошелёк · Взаиморасчёты (обзор)", zone: "partner", r2: false, partnerRole: "specialist", partnerSection: "bonus", walletTemplate: "accruals" },
  { n: 142, id: "partner:specialist:bonus-requisites", title: "Кабинет специалиста · кошелёк · Реквизиты", zone: "partner", r2: false, partnerRole: "specialist", partnerSection: "bonus", walletTemplate: "requisites", tocOpen: "Кошелёк → вкладка «Реквизиты»" },
  { n: 143, id: "partner:legacy", title: "Партнёр · legacy", zone: "standalone", rel: "partner/legacy.html" },
  { n: 144, id: "partner:certificate-guest", title: "Гостевой сертификат", zone: "standalone", rel: "partner/certificate.html" },
  { n: 145, id: "partner:recommendation-guest", title: "Гостевая рекомендация", zone: "standalone", rel: "partner/recommendation.html" },
  { n: 146, id: "partner:assignment-guest", title: "Поручение исполнителю", zone: "standalone", rel: "partner/assignment.html" },
  { n: 147, id: "partner:observer-guest", title: "Наблюдение за объектом", zone: "standalone", rel: "partner/observer.html" },
  { n: 148, id: "partner:cooperation-detail", title: "Деталь сотрудничества", zone: "standalone", rel: "partner/partner-cooperation-detail.html" },
  { n: 149, id: "partner:purchase-detail", title: "Деталь покупки", zone: "standalone", rel: "partner/partner-purchase-detail.html" },
  { n: 150, id: "partner:reward-receipt", title: "Квитанция вознаграждения", zone: "standalone", rel: "partner/partner-reward-receipt.html" },
  { n: 151, id: "partner:scan-transaction", title: "Сканер · эталон", zone: "standalone", rel: "partner/partner-scan-transaction.html" },
  { n: 152, id: "partner:wallet-history", title: "История кошелька", zone: "standalone", rel: "partner/partner-wallet-history.html" },
];
// TOTAL 152

(function protoPageNumbering() {
  if (typeof window === "undefined" || window.__protoPageNumberingBooted) return;
  window.__protoPageNumberingBooted = true;

  const UI_MARK = "data-proto-page-ui";
  const CLIENT_ALIASES = { services: "care", "care/services": "care" };
  const KNOWN_RELS = [
    "index.html",
    "client/index.html",
    "admin/index.html",
    "partner/index.html",
    "partner/roles.html",
    ...PAGE_DEFS.filter((p) => p.rel && p.zone === "standalone").map((p) => p.rel),
  ];

  function protoRootDir() {
    const src = document.currentScript?.src;
    if (!src) return new URL("./", location.href);
    const u = new URL(src, location.href);
    u.search = "";
    u.hash = "";
    u.pathname = u.pathname.replace(/\/prototype-numbering\.js$/, "/");
    return u;
  }

  let ROOT = protoRootDir();

  function hubUrl(rel) {
    return new URL(String(rel || "").replace(/^\//, ""), ROOT).href;
  }

  function pathnameRel() {
    const rootPath = ROOT.pathname;
    const path = location.pathname || "";
    if (path.startsWith(rootPath)) {
      const rel = decodeURIComponent(path.slice(rootPath.length).replace(/^\//, ""));
      return rel || "index.html";
    }
    for (const k of KNOWN_RELS) {
      if (path === k || path.endsWith("/" + k)) return k;
    }
    const tail = path.split("/").filter(Boolean).slice(-2).join("/");
    return tail || "index.html";
  }

  function normalizeClientRoute(rawHash) {
    let route = (rawHash || "").replace(/^#\/?/, "").split("?")[0];
    if (!route) route = "home";
    route = route.replace(/^\/+/, "");
    if (CLIENT_ALIASES[route]) route = CLIENT_ALIASES[route];
    return route;
  }

  function routePatternScore(pat, route) {
    if (pat === "" || pat === "home") return route === "home" || route === "" ? 10 : -1;
    if (pat.endsWith("/*")) {
      const base = pat.slice(0, -2);
      if (route === base) return base.length + 5;
      if (route.startsWith(base + "/")) return base.length + 20 + route.length;
      return -1;
    }
    if (route === pat) return pat.length + 50;
    if (pat && route.startsWith(pat + "/")) return pat.length + 15;
    return -1;
  }

  function matchClientPage(route) {
    let best = null;
    let score = -1;
    for (const p of PAGE_DEFS) {
      if (!p.clientRoutes) continue;
      for (const pat of p.clientRoutes) {
        const s = routePatternScore(pat, route);
        if (s > score) {
          score = s;
          best = p;
        }
      }
    }
    return best;
  }

  function readPrototypeRelease() {
    const sel = document.querySelector('[data-testid="prototype-release"]');
    if (sel?.value) return Number(sel.value) === 2 ? 2 : 1;
    try {
      if (window.rcDemoMemory?.getItem?.("rc_release") === "2") return 2;
    } catch (_) {}
    if (new URLSearchParams(location.search).get("rc_demo_release") === "2") return 2;
    return 1;
  }

  function readAdminView() {
    const go =
      document.querySelector('[data-action="go"][aria-current="page"]') ||
      document.querySelector('[data-action="go"][aria-selected="true"]') ||
      document.querySelector('[data-action="go"].is-active[data-view]');
    if (go) {
      const v = go.getAttribute("data-view");
      if (v) return v;
    }
    const shell = document.querySelector("[data-admin-screen], main[data-view], #app[data-view]");
    const sv = shell?.getAttribute("data-admin-screen") || shell?.getAttribute("data-view");
    if (sv) return sv;
    const hash = normalizeClientRoute(location.hash);
    if (hash && hash !== "home") return hash;
    return "overview";
  }

  function partnerContext() {
    const rel = pathnameRel();
    if (!["partner/index.html", "partner/roles.html"].includes(rel)) return null;
    const qs = new URLSearchParams(location.search);
    const cabinetBtn = document.querySelector('[data-testid="view-cabinet"]');
    const openFromQs = qs.get("open");
    if (cabinetBtn) {
      if (cabinetBtn.getAttribute("aria-pressed") !== "true" && !openFromQs) return { mode: "registration" };
    } else if (!openFromQs && !document.querySelector(".cabinet-shell, aside.sidebar, .mobile-navigation, .nav-btn")) {
      return { mode: "registration" };
    }
    const roleEl = document.querySelector('[data-testid="scenario-role"]');
    const role = (roleEl && roleEl.value) || qs.get("role") || "store";
    let section = openFromQs || "home";
    const currentNav = document.querySelector(".nav-btn[aria-current='page'], .sidebar .nav-btn[aria-current='page']");
    if (currentNav) {
      const act = currentNav.getAttribute("data-action") || "";
      const m = act.match(/^nav:(.+)$/);
      if (m) section = m[1];
    }
    return { mode: "cabinet", role, section };
  }

  function readClientAppealsView() {
    if (document.querySelector('[data-testid="ca-observer-partner-page"]')) return "observer-partner";
    if (document.querySelector('[data-testid="ca-observer-client-page"]')) return "observer-client";
    const root = document.querySelector("[data-ca-root]");
    if (!root) return null;
    if (root.querySelector(".ca-scan")) return "scan";
    if (root.querySelector(".ca-manual-form")) return "manual";
    if (root.querySelector(".ca-settings-grid")) return "settings";
    if (root.querySelector(".ca-purchase")) return "purchase";
    if (root.querySelector(".ca-funnel")) return "analytics";
    if (root.querySelector(".ca-detail-layout")) return "detail";
    const back = document.querySelector('[data-testid="ca-clients-back"]');
    if (back) {
      const act = back.getAttribute("data-ca-action") || "";
      if (act === "nav:observer-list") return "observer-partner";
      if (act === "nav:observer-partner") return "observer-client";
      if (act === "nav:detail") return "purchase";
      if (act === "nav:list" || act === "nav:cabinet") return "detail";
    }
    return "list";
  }

  function readWalletTemplate() {
    const shell = document.querySelector('[data-testid="wallet-shell"]');
    if (!shell) return null;
    const panel = shell.getAttribute("data-wallet-panel") || "";
    if (panel === "master-ledger" || document.querySelector("[data-testid='settlement-demo'].is-master-ledger")) {
      return "master-ledger";
    }
    if (panel === "agent-registry") return "agent-registry";
    if (panel === "requisites" || shell.getAttribute("data-wallet-tab") === "requisites") return "requisites";
    return "accruals";
  }

  function resolvePartnerCabinetPage(ctx) {
    const { role, section } = ctx;
    if (section === "clients" || section === "scanner") {
      const view = readClientAppealsView() || (section === "scanner" ? "scan" : "list");
      return byId.get(`partner:${role}:clients-${view}`) || byId.get(`partner:${role}:clients-list`);
    }
    if (section === "bonus" || section === "settlements") {
      const tpl = readWalletTemplate() || "accruals";
      return byId.get(`partner:${role}:${section}-${tpl}`) || byId.get(`partner:${role}:${section}-accruals`);
    }
    return byId.get(`partner:${role}:${section}`) || byId.get(`partner:${role}:home`);
  }

  function resolveCurrentPage() {
    const rel = pathnameRel();
    if (rel === "index.html") return byId.get("hub");
    if (rel === "client/index.html") {
      return matchClientPage(normalizeClientRoute(location.hash)) || byId.get("client:home");
    }
    if (rel === "admin/index.html") {
      const view = readAdminView();
      return byAdminView.get(view) || byId.get("admin:overview");
    }
    const standalone = PAGE_DEFS.find((p) => p.rel === rel);
    if (standalone) return standalone;
    if (rel === "partner/index.html" || rel === "partner/roles.html") {
      const ctx = partnerContext();
      if (!ctx || ctx.mode === "registration") return byId.get("partner:registration");
      return resolvePartnerCabinetPage(ctx);
    }
    return byId.get("hub");
  }

  const byId = new Map(PAGE_DEFS.map((p) => [p.id, p]));
  const byN = new Map(PAGE_DEFS.map((p) => [p.n, p]));
  const byAdminView = new Map(PAGE_DEFS.filter((p) => p.adminView).map((p) => [p.adminView, p]));

  function pageHref(page) {
    if (page.rel && page.zone !== "partner") return hubUrl(page.rel);
    if (page.zone === "partner" && page.partnerMode === "registration") return hubUrl("partner/index.html");
    if (page.partnerRole) {
      const params = new URLSearchParams({ role: page.partnerRole });
      if (page.partnerSection && page.partnerSection !== "home") params.set("open", page.partnerSection);
      return `${hubUrl("partner/roles.html")}?${params}`;
    }
    if (page.clientRoutes) {
      const route = page.clientRoutes.find((r) => r && r !== "home" && r !== "") || "home";
      const hashRoute = route.endsWith("/*") ? route.replace("/*", "") : route;
      return `${hubUrl("client/index.html")}#/${hashRoute === "home" ? "" : hashRoute}`;
    }
    if (page.adminView) return hubUrl("admin/index.html");
    return hubUrl("index.html");
  }

  function navigateToPage(page, ev) {
    if (page.r2 && readPrototypeRelease() !== 2) {
      ev?.preventDefault();
      return;
    }
    const rel = pathnameRel();
    if (page.adminView && (rel === "admin/index.html" || location.pathname.endsWith("/admin/index.html"))) {
      ev?.preventDefault();
      const btn = document.querySelector(`[data-action="go"][data-view="${page.adminView}"]`);
      if (btn) {
        btn.click();
        scheduleRefresh();
        return;
      }
    }
    if (page.partnerRole && (rel === "partner/roles.html" || rel === "partner/index.html")) {
      ev?.preventDefault();
      const roleEl = document.querySelector('[data-testid="scenario-role"]');
      if (roleEl) {
        roleEl.value = page.partnerRole;
        roleEl.dispatchEvent(new Event("change", { bubbles: true }));
      }
      document.querySelector('[data-testid="view-cabinet"]')?.click();
      if (page.partnerSection && page.partnerSection !== "home") {
        const navSection = page.partnerSection === "clients" && page.clientAppealsView === "scan" ? "scanner" : page.partnerSection;
        document.querySelector(`[data-action="nav:${navSection}"]`)?.click();
      }
      if (page.tocOpen) return;
      scheduleRefresh();
    }
  }

  let flowEl;
  let badgeEl;
  let panelEl;
  let listEl;
  let searchEl;
  let tocBtn;
  let dockedDialog = null;
  let scheduled = false;
  let refreshTimer = 0;

  function isUiNode(node) {
    if (!node) return false;
    const el = node.nodeType === 1 ? node : node.parentElement;
    return !!el?.closest?.(`[${UI_MARK}], .proto-page-flow, .proto-page-panel`);
  }

  function scheduleRefresh() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      refreshBadge();
      syncDialogDock();
    });
  }

  function refreshBadge() {
    const page = resolveCurrentPage();
    if (!page || !badgeEl) return;
    badgeEl.textContent = `Страница ${page.n} · ${page.title}`;
    badgeEl.title = page.id;
    window.__protoCurrentPage = page;
    window.__protoRootHref = ROOT.href;
    listEl?.querySelectorAll("[data-current]").forEach((n) => n.removeAttribute("data-current"));
    const link = listEl?.querySelector(`[data-page-n="${page.n}"]`);
    if (link) link.setAttribute("data-current", "true");
  }

  function buildToc() {
    const rel = readPrototypeRelease();
    listEl.innerHTML = PAGE_DEFS.map((p) => {
      const r2Locked = p.r2 && rel !== 2;
      const tocHint = p.tocOpen;
      if (r2Locked || tocHint) {
        const hint = r2Locked ? "Только в релизе 2 прототипа" : tocHint;
        const suffix = r2Locked ? " · R2" : "";
        return `<li><span class="proto-page-toc-muted" title="${escapeAttr(hint)}"><span class="n">${p.n}</span> ${escapeHtml(p.title)}${suffix}</span></li>`;
      }
      return `<li><a href="${escapeAttr(pageHref(p))}" data-page-n="${p.n}" data-page-id="${escapeAttr(p.id)}"><span class="n">${p.n}</span> ${escapeHtml(p.title)}</a></li>`;
    }).join("");
    listEl.addEventListener("click", (ev) => {
      const a = ev.target.closest("a[data-page-id]");
      if (!a) return;
      const page = byId.get(a.getAttribute("data-page-id"));
      if (page) navigateToPage(page, ev);
    });
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  }

  function escapeAttr(s) {
    return escapeHtml(s).replace(/'/g, "&#39;");
  }

  function togglePanel(open) {
    const next = open ?? panelEl.getAttribute("data-open") !== "true";
    panelEl.setAttribute("data-open", next ? "true" : "false");
    tocBtn.setAttribute("aria-expanded", next ? "true" : "false");
    syncDialogDock();
    if (next) searchEl.focus();
  }

  function activeAppDialog() {
    const open = document.querySelectorAll(`dialog[open]:not([${UI_MARK}])`);
    return open.length ? open[open.length - 1] : null;
  }

  function syncDialogDock() {
    const dlg = activeAppDialog();
    if (dockedDialog && dockedDialog !== dlg) dockedDialog.classList.remove("proto-page-dialog-host");
    dockedDialog = dlg;
    if (!flowEl) return;
    if (dlg) {
      dlg.classList.add("proto-page-dialog-host");
      dlg.append(flowEl);
      if (panelEl.getAttribute("data-open") === "true") dlg.append(panelEl);
      else if (panelEl.parentNode !== document.body) document.body.append(panelEl);
    } else {
      document.body.append(flowEl);
      if (panelEl.parentNode !== document.body) document.body.append(panelEl);
    }
  }

  function mountChrome() {
    flowEl = document.createElement("div");
    flowEl.className = "proto-page-flow";
    flowEl.setAttribute(UI_MARK, "flow");

    badgeEl = document.createElement("div");
    badgeEl.className = "proto-page-badge";
    badgeEl.setAttribute("aria-live", "polite");

    tocBtn = document.createElement("button");
    tocBtn.type = "button";
    tocBtn.className = "proto-page-toc-btn";
    tocBtn.textContent = "Страницы";
    tocBtn.setAttribute("aria-expanded", "false");
    tocBtn.setAttribute(UI_MARK, "toc");
    tocBtn.addEventListener("click", () => togglePanel());

    flowEl.append(badgeEl, tocBtn);
    document.body.appendChild(flowEl);

    panelEl = document.createElement("div");
    panelEl.className = "proto-page-panel";
    panelEl.setAttribute("data-open", "false");
    panelEl.setAttribute(UI_MARK, "panel");
    panelEl.innerHTML =
      '<div class="proto-page-panel-head"><input class="proto-page-search" type="search" placeholder="Поиск по номеру или названию" autocomplete="off" /></div><ul class="proto-page-list"></ul>';
    document.body.appendChild(panelEl);

    searchEl = panelEl.querySelector(".proto-page-search");
    listEl = panelEl.querySelector(".proto-page-list");
    buildToc();

    searchEl.addEventListener("input", () => {
      const q = searchEl.value.trim().toLowerCase();
      listEl.querySelectorAll("li").forEach((li) => {
        li.hidden = q.length > 0 && !li.textContent.toLowerCase().includes(q);
      });
    });

    document.addEventListener(
      "click",
      (e) => {
        if (panelEl.contains(e.target) || flowEl.contains(e.target)) return;
        if (panelEl.getAttribute("data-open") === "true") togglePanel(false);
      },
      true,
    );

    document.addEventListener(
      "toggle",
      (e) => {
        if (e.target instanceof HTMLDialogElement && !e.target.hasAttribute(UI_MARK)) {
          scheduleRefresh();
        }
      },
      true,
    );
  }

  window.PROTOTYPE_PAGE_CATALOG = Object.freeze(PAGE_DEFS.map((p) => ({ n: p.n, id: p.id, title: p.title })));
  window.protoResolvePage = resolveCurrentPage;
  window.protoPageByNumber = (n) => byN.get(Number(n));
  window.protoHubUrl = hubUrl;
  window.protoPathnameRel = pathnameRel;

  mountChrome();
  refreshBadge();
  syncDialogDock();

  window.addEventListener("hashchange", scheduleRefresh);
  window.addEventListener("popstate", scheduleRefresh);
  document.addEventListener(
    "change",
    (e) => {
      if (e.target?.matches?.('[data-testid="scenario-role"], [data-testid="prototype-release"], [data-control="role"]')) {
        scheduleRefresh();
        if (e.target.matches('[data-testid="prototype-release"]')) buildToc();
      }
    },
    true,
  );
  document.addEventListener(
    "click",
    (e) => {
      if (
        e.target.closest(
          "[data-action^='nav:'], [data-action^='view:'], [data-action='go'], [data-testid^='nav-'], [data-control]",
        )
      ) {
        clearTimeout(refreshTimer);
        refreshTimer = setTimeout(scheduleRefresh, 120);
      }
    },
    true,
  );

  const observeRoot = document.getElementById("app") || document.getElementById("main");
  if (observeRoot && typeof MutationObserver !== "undefined") {
    const mo = new MutationObserver((records) => {
      if (records.every((r) => [...(r.addedNodes || []), ...(r.removedNodes || [])].every(isUiNode))) return;
      clearTimeout(refreshTimer);
      refreshTimer = setTimeout(scheduleRefresh, 200);
    });
    mo.observe(observeRoot, { childList: true, subtree: true, attributes: true, attributeFilter: ["aria-current", "aria-pressed", "data-view"] });
  }
})();
