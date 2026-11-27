// Synthetic fixtures only. No connections, real contacts, or production records.
window.DEMO = {
  today: '2026-10-29',
  types: [
    {id:'agent',name:'Агенты',one:'Агент',color:'var(--brand)',enabled:true},
    {id:'specialist',name:'Специалисты',one:'Специалист',color:'#557a87',enabled:true},
    {id:'store',name:'Магазины',one:'Магазин',color:'#bc8b43',enabled:true},
    {id:'company',name:'Компании',one:'Компания',color:'#6a8262',enabled:true},
    {id:'factory',name:'Фабрики и заводы',one:'Производитель',color:'#7d718a',enabled:false},
    {id:'builder',name:'Строительные компании',one:'Застройщик',color:'#6a788f',enabled:false}
  ],
  employees: [
    {id:'owner',name:'Владелец проекта',role:'owner',types:[],limit:false,active:true},
    {id:'head',name:'Алексей Орлов',role:'head',types:[],limit:false,active:true},
    {id:'m1',name:'Анна Миронова',role:'curator',types:['agent'],limit:true,active:true},
    {id:'m2',name:'Илья Соколов',role:'curator',types:['specialist'],limit:true,active:true},
    {id:'m3',name:'Мария Волкова',role:'curator',types:['store'],limit:true,active:true},
    {id:'m4',name:'Денис Белов',role:'curator',types:['company'],limit:true,active:true}
  ],
  partners:[],clients:[],edges:[],tasks:[],events:[],audit:[],
  notifications:{telegram:true,max:true,clients:true,partners:true,activity:false,digest:'instant'}
};
(() => {
 const d=window.DEMO;
 const first=['Александр','Сергей','Михаил','Андрей','Елена','Ольга','Марина','Анна','Дмитрий','Ирина','Роман','Наталья','Олег','Виктор','Павел','Артём','Иван','Дарья','Юлия','Алексей','Татьяна'];
 const last=['Миронов','Соколов','Белов','Волков','Лебедев','Орлов','Морозов','Кузнецов','Попов','Новиков','Крылов','Смирнов','Титов','Громов','Захаров','Егоров','Ильин','Макаров','Никитин','Фомин','Серов'];
 const fullName=(firstIndex,lastIndex)=>`${first[firstIndex]} ${last[lastIndex]}${['Елена','Ольга','Марина','Анна','Ирина','Наталья','Дарья','Юлия','Татьяна'].includes(first[firstIndex])?'а':''}`;
 const stores=['Форма','Свет и дом','Тёплый пол','Новая керамика','Точка цвета','Дом фактур','Линия кухни','Северный свет','Пространство','Мир паркета','Плитка рядом','Студия обоев','Окна и двери','Детали дома','Дом света','Материал','Текстура','Свой интерьер','Контур','Фасад','Квадрат'];
 const companies=['Ателье ремонта','Смена интерьера','Чистовая','Архитектура дома','Проект среды','Студия линий','Бюро пространства','Дом по плану','Мастерская форм','Ремонтная команда','Новая среда','Комната','Пропорция','Дом внутри','Проект плюс','Линия ремонта','Точный метр','Ремонт и стиль','Основа','План дома','Мастерская Юг'];
 const cities=['Краснодар','Сочи','Ростов-на-Дону','Новороссийск','Ставрополь','Анапа','Москва'];
 for(let i=0;i<84;i++){
  const t=Math.floor(i/21),k=i%21,isDemo=i%4===0;
  d.partners.push({id:'P'+String(i+1).padStart(3,'0'),name:t<2?fullName(k,(k+t*3)%21):(t===2?stores:companies)[k],type:d.types[t].id,city:cities[(i*3)%7],status:isDemo?'demo':'active',catalog:i%7!==0,cooperation:(!isDemo||i%13===0)&&i%5!==0,override:isDemo&&i%13===0,manager:i%11===0?null:'m'+(t+1),createdDays:(i*13)%89,lastDays:i%8===0?22+i%8:i%12,consent:i%6!==0,fill:40+(i*7)%61,moderation:i%17===0,archived:false,removed:false});
 }
 const available=d.partners.filter(p=>p.cooperation);
 available.forEach((p,i)=>{const other=available[(i+5)%available.length];if(p.id!==other.id)d.edges.push({a:p.id,b:other.id});});
 for(let i=0;i<126;i++){
  d.clients.push({id:'C'+String(i+1).padStart(3,'0'),name:fullName((i*3)%21,(i*5+2)%21),city:cities[i%7],partner:d.partners[(i*5)%84].id,createdDays:(i*7)%90,lastDays:i%24,stage:['new','contact','order','done'][i%4],consent:i%5!==0,archived:false});
 }
 for(let i=0;i<12;i++){
  const target=d.partners[(i*7)%84];
  d.tasks.push({id:'T'+(i+1),title:['Проверить профиль','Помочь с регистрацией','Связаться после подключения','Запустить первое партнёрство','Проверить карточку каталога','Обсудить развитие направления'][i%6],partner:target.id,employee:target.manager||'head',due:i%4===0?'Просрочено':i%3===0?'Завтра':'Сегодня',stage:i<5?'new':i<10?'work':'done',priority:i%4===0?'high':'normal'});
 }
 for(let i=0;i<32;i++){
  const p=d.partners[(i*7)%84],type=['partners','clients','activity','moderation'][i%4];
  d.events.push({id:'E'+i,type,partner:p.id,read:i>7,time:`${String(11-Math.floor(i/6)).padStart(2,'0')}:${String(54-(i*7)%54).padStart(2,'0')}`,text:{partners:'Новая регистрация партнёра',clients:'Новый клиент по рекомендации',activity:'Партнёр вернулся в кабинет',moderation:'Профиль ожидает проверки'}[type]});
 }
 d.audit.push({time:'Вчера, 16:40',who:'Алексей Орлов',action:'Назначил куратора магазина',target:'Точка цвета'},{time:'Вчера, 15:12',who:'Владелец проекта',action:'Включил поиск сотрудничества',target:'Форма'});
})();
// Результативность: сертификаты, заказы, отзывы, лиды, каталог. Синтетика, согласованная между собой.
(() => {
 const d=window.DEMO;
 d.categories=['Двери','Плитка и керамика','Сантехника','Освещение','Напольные покрытия','Обои и краска','Кухни','Окна'];
 d.releases=[
  {id:1,name:'Релиз 1 · сейчас',tone:'good',note:'Данные уже есть в PROF, нужен только экран и действия администратора',scope:'Базовый кабинет на данных, которые уже есть в PROF: реестр и карточка партнёра, модерация профилей и отзывов, уведомления, обзор, клиенты, сертификаты, сделки, базовая аналитика, команда с ролями StaffRole, журнал. Без кураторов, задач, новых расчётов и миграций; рейтинг — текущий RemScore.'},
  {id:2,name:'Релиз 2 · фундамент',tone:'blue',note:'Новые расчёты и правила поверх существующих данных',scope:'Управление командой и новые расчёты: кураторы по направлениям и ответственный за партнёра, задачи, просмотр от лица сотрудника, глобальный поиск, коэффициент успешности вместо прокси в RemScore, конверсия по связкам, качество каталога и дата обновления цен, рекомендации партнёров друг другу, сигналы куратору, география.'},
  {id:3,name:'Релиз 3 · развитие',tone:'',note:'Концепция, обсуждаем после первых двух релизов',scope:'Задание пока не формулируем: новые типы партнёров (производители, застройщики), дефицит направлений, сравнение с медианой, экономика бонусов, NPS и прогноз оттока обсуждаются после приёмки релизов 1 и 2.'}
 ];
 const stores=d.partners.filter(p=>p.type==='store'),issuers=d.partners.filter(p=>p.type!=='store');
 stores.forEach((s,i)=>{s.categories=[d.categories[i%8],d.categories[(i+3)%8],...(i%3===0?[d.categories[(i+5)%8]]:[])];});
 issuers.forEach((p,i)=>{p.categories=[d.categories[(i*3)%8],d.categories[(i*3+2)%8]];});
 // Партнёрства: исполнитель ↔ магазин, только среди доступных к сотрудничеству (плюс немного исторических)
 d.edges=[];
 issuers.forEach((p,i)=>{
  if(p.status!=='active'&&i%6!==0)return;
  const n=i%9===0?0:i%4===0?3:i%2===0?2:1;
  for(let k=0;k<n;k++){const s=stores[(i*5+k*7)%21];if(!d.edges.some(e=>e.a===p.id&&e.b===s.id))d.edges.push({a:p.id,b:s.id,category:s.categories[k%s.categories.length]});}
 });
 // Сертификаты (рекомендации): выпускает исполнитель, принимает магазин, использование = заказ
 d.certs=[];d.orders=[];
 const clientsOf=id=>d.clients.filter(c=>c.partner===id);
 issuers.forEach((p,i)=>{
  const partnersOf=d.edges.filter(e=>e.a===p.id);if(!partnersOf.length)return;
  const total=p.status==='demo'?(i%5===0?2:0):3+(i*7)%14,conv=[.15,.72,.45,.3,.6,.22,.8,.5,.38][i%9];
  for(let k=0;k<total;k++){
   const e=partnersOf[k%partnersOf.length],s=d.partners.find(x=>x.id===e.b),cl=clientsOf(p.id)[k%Math.max(1,clientsOf(p.id).length)]||d.clients[(i*11+k)%126];
   const issuedDays=(i*13+k*17)%90,used=((k*31+i*7)%100)/100<conv,expired=!used&&issuedDays>60&&k%3===0;
   const cert={id:'S'+String(d.certs.length+1).padStart(4,'0'),issuer:p.id,store:s.id,client:cl.id,category:e.category,issuedDays,discount:[5,7,10][k%3],status:used?'used':expired?'expired':'active',acceptedByStore:used||k%5!==0};
   d.certs.push(cert);
   if(used){const amount=12000+((i*37+k*53)%40)*4200,orderDays=Math.max(0,issuedDays-(k*5)%14);d.orders.push({id:'O'+String(d.orders.length+1).padStart(4,'0'),cert:cert.id,issuer:p.id,store:s.id,client:cl.id,category:e.category,amount,discount:Math.round(amount*cert.discount/100),bonus:Math.round(amount*0.03),days:orderDays,selfScan:(i+k)%29===0,flagged:(i*k)%47===0&&k>0,status:orderDays<3?'confirmed':orderDays<10?'bonus':'completed'});}
  }
 });
 // Каталог: у магазинов, специалистов и компаний. У агентов каталога нет.
 d.partners.forEach((p,i)=>{
  if(p.type==='agent'){p.catalog_items=null;return;}
  const items=p.status==='demo'?(i%3?4:0):(i%19===3?0:6+(i*5)%36);
  p.catalog_items={items,photos:items?Math.min(items,Math.round(items*[.95,.6,.8,.35,1][i%5])):0,prices:items?Math.min(items,Math.round(items*[.9,.5,1,.7,.3][(i+1)%5])):0,priceDays:[4,12,38,75,140,9,61,96,118,27][i%10],views:items?40+(i*29)%420:0,contacts:items?(i*3)%26:0};
 });
 // Лиды по каталогу и консьерж-заявки
 d.leads=[];const leadStatuses=['new','sent','accepted','in_progress','sold','refused','thinking'];
 d.partners.filter(p=>p.catalog_items?.items).forEach((p,i)=>{
  const n=(i*5)%8;for(let k=0;k<n;k++)d.leads.push({id:'L'+String(d.leads.length+1).padStart(4,'0'),partner:p.id,client:d.clients[(i*7+k*13)%126].id,source:k%4===0?'concierge':k%3===1?'partner':'catalog',category:p.categories[k%p.categories.length],status:leadStatuses[(i+k*3)%7],days:(i*3+k*11)%90,answeredHours:[2,30,5,70,1,12][(i+k)%6]});
 });
 // Отзывы клиентов (с модерацией, как PartnerReview в PROF)
 d.reviews=[];const texts={5:['Всё сделали в срок, цены как в каталоге.','Рекомендация партнёра сработала: скидка по сертификату учтена.','Помогли подобрать материалы, вернусь ещё.','Отличная работа, аккуратно и быстро.'],4:['Долго отвечали, но результат хороший.','Качество нормальное, сроки сдвинулись на неделю.','Хороший выбор, скидка по сертификату применилась без вопросов.'],3:['Цена на сайте отличалась от цены в магазине.','Сделали, но пришлось напоминать о сроках.'],2:['Не перезвонили по заявке два дня.','Сертификат приняли не сразу, пришлось звонить партнёру.'],1:['Заказ перенесли трижды, скидку так и не применили.','На заявку не ответили вовсе.']};
 d.partners.forEach((p,i)=>{
  if(p.status==="demo"&&i%4)return;const n=(i*5)%7;
  for(let k=0;k<n;k++){const rating=[5,4,5,3,5,4,2,5,4,1][(i*3+k)%10];d.reviews.push({id:'R'+String(d.reviews.length+1).padStart(4,'0'),partner:p.id,client:d.clients[(i*5+k*17)%126].id,rating,text:texts[rating][(i+k)%texts[rating].length],status:(i+k*3)%13===0?"pending":(i*k)%23===0&&k>0?'rejected':'published',days:(i*11+k*7)%90,category:p.categories[k%p.categories.length]});}
 });
 d.partners.forEach((p,i)=>{p.responseRate=p.consent?[96,74,88,52,100,67,81][i%7]:null;p.repeatClients=(i*3)%6;});
 d.audit.push({time:'Вчера, 12:05',who:'Алексей Орлов',action:'Опубликовал отзыв клиента',target:d.partners[13].name},{time:'Позавчера, 18:30',who:'Владелец проекта',action:'Пометил заказ как самосканирование',target:d.partners[42].name});
})();
