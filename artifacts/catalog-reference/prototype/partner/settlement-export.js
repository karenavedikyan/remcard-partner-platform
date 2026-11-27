// Accounting export from the permitted in-memory demo scope. No API or secret codes.
import { DEMO_DATE, debt, filterLedger, formatTime } from "./settlement-analysis.js";
import { orderLines, orderTotals } from "./settlement-order-detail.js";
import { reconcile } from "./settlement-reconciliation.js";
import { legalGroups, legalKey, legalTypes } from "./partner-legal.js";
const legalFields=(r)=>({legalType:legalTypes[r.partnerLegal?.type] || "",legalName:r.partnerLegal?.name || "Реквизиты не указаны",inn:r.partnerLegal?.inn || "",kpp:r.partnerLegal?.kpp || "",requisiteId:r.partnerLegal?.recordId || "",ourLegalName:r.ourLegal?.name || "Сторона не указана",ourInn:r.ourLegal?.inn || "",ourKpp:r.ourLegal?.kpp || ""});
const round = (v) => Math.round(v * 100) / 100;
const direction = (v) => v === "in" ? "Мне должны" : "Я должен";
const statuses = { due:"К выплате",partial:"Частично выплачено",paid:"Закрыто",pending:"Несогласовано",cancelled:"Отменено",awaiting:"Ждёт подтверждения",disputed:"Получение не подтверждено" };
const method = (v) => v === "cash" ? "Наличный" : v === "transfer" ? "Безналичный" : "";
const isoDay = (at) => new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Moscow",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(at));
export function buildSettlementExport(s, role, exportedAt = new Date()) {
  const permitted = s.records.filter((r) => role !== "agent" || r.direction === "in");
  const scope = permitted.filter((r) => !s.partner || r.partnerId === s.partner);
  const isReconciliation = !!s.partner && s.filter === "reconciliation";
  const overview = !s.partner && s.screen === "overview";
  const reconciliation = isReconciliation ? reconcile(scope,s.reconciliation) : null;
  if (reconciliation?.invalid) throw new Error("Исправьте период сверки перед выгрузкой.");
  const records = overview || isReconciliation ? scope : filterLedger(scope,s.direction,s.analysis);
  const orders = records.map((r) => {
    const t=orderTotals(r);
    return {id:r.id,partnerId:r.partnerId,partner:r.partner,direction:direction(r.direction),order:r.orderId,certificate:r.certificateId,client:r.client,creator:r.creator,created:r.createdAt,due:r.dueDate,state:statuses[r.status] || r.status,gross:t.gross/100,discount:t.discount/100,net:t.net/100,rate:r.rate/100,fee:r.total,paid:r.paid,balance:debt(r),currency:"RUB",...legalFields(r)};
  });
  const categories = records.flatMap((r) => orderLines(r).map((line) => ({id:r.id,partner:r.partner,direction:direction(r.direction),order:r.orderId,certificate:r.certificateId,category:line.category,gross:line.gross,discountRate:line.discountPercent/100,discount:line.discount,net:line.net,rate:line.rate/100,fee:line.fee,...legalFields(r)})));
  const partners = legalGroups(records).map((g) => {
    const rows=g.records;
    return {id:g.partnerId,name:g.partner,orders:rows.length,incoming:round(rows.filter(r=>r.direction==="in").reduce((n,r)=>n+debt(r),0)),outgoing:round(rows.filter(r=>r.direction==="out").reduce((n,r)=>n+debt(r),0)),...legalFields(g)};
  });
  const payments = new Map(), allocations=[], history=[];
  records.forEach((r) => r.history.forEach((h,index) => {
    if (isReconciliation && (!Number.isFinite(Date.parse(h.at)) || isoDay(h.at)<s.reconciliation.from || isoDay(h.at)>s.reconciliation.to)) return;
    const paymentId=h.type==="payment" ? h.paymentId || `УЧЕБНАЯ-${r.id}-${index}` : "";
    const event = {id:r.id,partner:r.partner,direction:direction(r.direction),order:r.orderId,certificate:r.certificateId,client:r.client,at:h.at,title:h.title,type:h.type || "note",amount:h.amount,delta:h.type==="obligation" ? h.amount : ["payment","cancel"].includes(h.type) ? -h.amount : 0,paymentId,method:method(h.method),financial:["obligation","payment","cancel"].includes(h.type) ? "Да" : "Нет"};
    history.push({...event,...legalFields(r)});
    if(h.type!=="payment") return;
    const key=`${r.partnerId}:${legalKey(r.partnerLegal)}:${legalKey(r.ourLegal)}:${r.direction}:${paymentId}`;
    if(!payments.has(key)) payments.set(key,{paymentId,partner:r.partner,direction:direction(r.direction),at:h.at,method:method(h.method),amount:0,orders:0,...legalFields(r)});
    const p=payments.get(key);p.amount=round(p.amount+h.amount);p.orders++;
    allocations.push({paymentId,partner:r.partner,direction:direction(r.direction),order:r.orderId,certificate:r.certificateId,client:r.client,amount:h.amount,at:h.at,...legalFields(r)});
  }));
  history.sort((a,b)=>Date.parse(a.at)-Date.parse(b.at));
  const info = [
    ["Тип данных","ДЕМО. Вымышленные данные, не бухгалтерские документы рабочего ЛК."],
    ["Выгружено",formatTime(exportedAt.toISOString())],
    ["Учебная дата",DEMO_DATE],["Роль",role],
    ["Область",overview ? "Все направления и состояния" : isReconciliation ? `Сверка: ${s.partnerName}, оба разрешённых направления` : `${s.partnerName || "Все партнёры"} · ${direction(s.direction)}`],
    ["Поиск",overview || isReconciliation ? "Не применяется" : s.analysis.q || "Без поиска"],
    ["Состояние",overview || isReconciliation ? "Все" : s.analysis.status],
    ["Период",isReconciliation ? `${s.reconciliation.from} — ${s.reconciliation.to}; даты финансовых событий` : `${s.analysis.from || "Без начала"} — ${s.analysis.to || "Без окончания"}; даты возникновения обязательств`],
    ["Количество расчётов",records.length],
    ["Страницы","Выгружен весь текущий отбор, не только видимая страница."],
    ["Суммы","RUB. Встречные долги не зачтены. Несогласованные и отменённые обязательства не входят в долг."],
    ["Заказы и партнёры","Текущий снимок задолженности; в режиме сверки не остаток на конец выбранного исторического периода."],
    ["Сверка","Остатки за выбранный период находятся на листе «Сверка». История / выплаты / распределения в этом режиме ограничены периодом."],
    ["Выплаты","Только подтверждённые события payment. Одна общая выплата — одна строка; доли находятся в «Распределение»."],
    ["История","Сумма относится к событию / доле заказа. Не суммируйте её повторно с листом «Выплаты». Запросы не меняют долг."],
    ["Формулы","Изменение ячеек файла не меняет данные RemCard. Формулы — проверочные, не изменение договорных условий."],
    ["Безопасность","Коды подтверждения, пароли и номера банковских счетов не выгружаются."],
    ["Юридические стороны","Имя получателя, тип, ИНН и КПП — снимки выбранных реквизитов на дату заказа. Банковские счета не включены. Смена профиля не меняет старые документы."],
  ];
  const reconciliationRows = reconciliation ? legalGroups(scope).flatMap(g=>{
    const v=reconcile(g.records,s.reconciliation);
    return (role==="agent" ? ["in"] : ["in","out"]).map((d)=>({partner:g.partner,direction:direction(d),from:s.reconciliation.from,to:s.reconciliation.to,opening:v[d].opening/100,obligations:v[d].obligations/100,payments:v[d].payments/100,cancellations:v[d].cancellations/100,closing:v[d].closing/100,...legalFields(g)}));
  }) : [];
  return {info,orders,categories,partners,payments:[...payments.values()],allocations,history,reconciliation:reconciliationRows,role,scope:overview?"all":isReconciliation?"reconciliation":s.direction,count:records.length};
}
const moneyFormat='#,##0.00;[Red]-#,##0.00';
function excelDate(v) {
  if(!v || !Number.isFinite(Date.parse(v))) return null;
  if(/^\d{4}-\d\d-\d\d$/.test(v)) return new Date(`${v}T00:00:00Z`);
  const p=Object.fromEntries(new Intl.DateTimeFormat("en-GB",{timeZone:"Europe/Moscow",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit",hourCycle:"h23"}).formatToParts(new Date(v)).map(x=>[x.type,x.value]));
  return new Date(Date.UTC(+p.year,+p.month-1,+p.day,+p.hour,+p.minute,+p.second));
}
export function createSettlementWorkbook(model, ExcelJS) {
  const wb=new ExcelJS.Workbook();
  wb.creator="RemCard · учебный прототип";wb.created=new Date();wb.calcProperties.fullCalcOnLoad=true;
  const col=(key,header,type="text",width=22)=>({key,header,type,width});
  const legalCols=[col("legalType","Тип стороны партнёра"),col("legalName","Юридическое имя партнёра","text",40),col("inn","ИНН партнёра"),col("kpp","КПП партнёра"),col("requisiteId","ID набора реквизитов"),col("ourLegalName","Ваша юридическая сторона","text",40),col("ourInn","Ваш ИНН"),col("ourKpp","Ваш КПП")];
  function sheet(name,cols,rows,formulas={}) {
    if(name!=="Описание") cols=[...cols,...legalCols];
    const ws=wb.addWorksheet(name,{views:[{state:"frozen",ySplit:1}],properties:{defaultRowHeight:22}});
    ws.columns=cols.map(c=>({header:c.header,key:c.key,width:c.width}));
    rows.forEach((row)=> {
      const values={...row};cols.forEach(c=>{if(c.type==="date")values[c.key]=excelDate(row[c.key]);});
      const added=ws.addRow(values);
      for(const [key,fn] of Object.entries(formulas)) added.getCell(key).value={formula:fn(added.number,ws),result:row[key]};
    });
    ws.getRow(1).height=38;
    ws.getRow(1).eachCell(c=>{c.font={name:"Calibri",size:11,bold:true,color:{argb:"FFFFFFFF"}};c.fill={type:"pattern",pattern:"solid",fgColor:{argb:"FF84272B"}};c.alignment={vertical:"middle",wrapText:true};});
    cols.forEach(c=>{ws.getColumn(c.key).numFmt=c.type==="money" ? moneyFormat : c.type==="percent" ? "0.00%" : c.type==="date" ? "dd.mm.yyyy hh:mm" : c.type==="number" ? "0" : "@";});
    ws.eachRow((r,n)=>{
      if(n===1)return;
      let lines=1;
      r.eachCell({includeEmpty:true},cell=>{
        cell.font={name:"Calibri",size:11};cell.alignment={vertical:"top",wrapText:true};
        if(typeof cell.value==="string") lines=Math.max(lines,...cell.value.split("\n").map(v=>Math.ceil(v.length/Math.max(10,(cols[cell.col-1]?.width || 22)*.8))));
      });
      r.height=Math.max(22,lines*16+6);
    });
    ws.autoFilter={from:{row:1,column:1},to:{row:Math.max(1,rows.length+1),column:cols.length}};
    ws.pageSetup={orientation:"landscape",fitToPage:true,fitToWidth:1,fitToHeight:0};
    return ws;
  }
  const address=(ws,key,row)=>`${ws.getColumn(key).letter}${row}`;
  sheet("Описание",[col("key","Параметр","text",25),col("value","Значение","text",100)],model.info.map(([key,value])=>({key,value})));
  sheet("Партнёры",[col("id","ID партнёра"),col("name","Партнёр","text",35),col("orders","Количество расчётов","number"),col("incoming","Мне должны, ₽","money"),...(model.role==="agent"?[]:[col("outgoing","Я должен, ₽","money")])],model.partners);
  sheet("Заказы",[
    col("id","ID расчёта"),col("partnerId","ID партнёра"),col("partner","Партнёр","text",35),col("direction","Направление"),col("order","Номер заказа"),col("certificate","Номер сертификата"),col("client","Клиент","text",32),col("creator","Автор сертификата","text",32),col("created","Возникло, МСК","date"),col("due","Срок выплаты","date"),col("state","Состояние"),col("gross","Без скидки, ₽","money"),col("discount","Скидка клиенту, ₽","money"),col("net","После скидки, ₽","money"),col("rate","Ставка вознаграждения","percent"),col("fee","Согласованное вознаграждение, ₽","money"),col("paid","Получение подтверждено, ₽","money"),col("balance","Остаток долга, ₽","money"),col("currency","Валюта")
  ],model.orders,{
    net:(n,w)=>`ROUND(${address(w,"gross",n)}-${address(w,"discount",n)},2)`,
    balance:(n,w)=>`IF(OR(${address(w,"state",n)}="Несогласовано",${address(w,"state",n)}="Отменено"),0,MAX(0,ROUND(${address(w,"fee",n)}-${address(w,"paid",n)},2)))`
  });
  sheet("Категории",[
    col("id","ID расчёта"),col("partner","Партнёр","text",35),col("direction","Направление"),col("order","Заказ"),col("certificate","Сертификат"),col("category","Категория","text",40),col("gross","Без скидки, ₽","money"),col("discountRate","Скидка, %","percent"),col("discount","Скидка, ₽","money"),col("net","После скидки, ₽","money"),col("rate","Ставка вознаграждения","percent"),col("fee","Вознаграждение, ₽","money")
  ],model.categories,{discount:(n,w)=>`ROUND(${address(w,"gross",n)}-${address(w,"net",n)},2)`,fee:(n,w)=>`ROUND(${address(w,"net",n)}*${address(w,"rate",n)},2)`});
  sheet("Выплаты",[col("paymentId","ID подтверждённой выплаты","text",30),col("partner","Партнёр","text",35),col("direction","Направление"),col("at","Подтверждено, МСК","date"),col("method","Способ"),col("amount","Сумма всей выплаты, ₽","money"),col("orders","Количество распределений","number")],model.payments);
  sheet("Распределение",[col("paymentId","ID выплаты","text",30),col("partner","Партнёр","text",35),col("direction","Направление"),col("order","Заказ"),col("certificate","Сертификат"),col("client","Клиент","text",32),col("amount","Доля по заказу, ₽","money"),col("at","Подтверждено, МСК","date")],model.allocations);
  sheet("История",[col("id","ID расчёта"),col("partner","Партнёр","text",35),col("direction","Направление"),col("order","Заказ"),col("certificate","Сертификат"),col("client","Клиент","text",32),col("at","Дата события, МСК","date"),col("title","Событие","text",40),col("type","Тип события"),col("amount","Сумма события / доли, ₽","money"),col("delta","Изменение долга, ₽","money"),col("paymentId","ID выплаты","text",30),col("method","Способ"),col("financial","Влияет на долг")],model.history);
  if(model.reconciliation.length) sheet("Сверка",[col("partner","Партнёр","text",35),col("direction","Направление"),col("from","Начало периода","date"),col("to","Конец периода","date"),col("opening","Долг на начало, ₽","money"),col("obligations","Новые обязательства, ₽","money"),col("payments","Подтверждённые выплаты, ₽","money"),col("cancellations","Отменено до выплаты, ₽","money"),col("closing","Долг на конец, ₽","money")],model.reconciliation,{closing:(n,w)=>`ROUND(${address(w,"opening",n)}+${address(w,"obligations",n)}-${address(w,"payments",n)}-${address(w,"cancellations",n)},2)`});
  return wb;
}
let library;
export function loadExcelLibrary() {
  if(globalThis.ExcelJS) return Promise.resolve(globalThis.ExcelJS);
  if(!library) library=new Promise((resolve,reject)=>{
    const script=document.createElement("script");
    script.src=new URL("./vendor/exceljs.min.js",import.meta.url).href;
    script.onload=()=>resolve(globalThis.ExcelJS);
    script.onerror=()=>{script.remove();library=null;reject(new Error("Не удалось загрузить модуль Excel. Попробуйте ещё раз."));};
    document.head.append(script);
  });
  return library;
}
function loadExcel() {
  return loadExcelLibrary();
}
export async function downloadSettlementExport(s,role) {
  const model=buildSettlementExport(s,role);
  const ExcelJS=await loadExcel();
  const wb=createSettlementWorkbook(model,ExcelJS);
  const buffer=await wb.xlsx.writeBuffer();
  const blob=new Blob([buffer],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});
  const url=URL.createObjectURL(blob),a=document.createElement("a");
  a.href=url;a.download=`RemCard-demo-${model.scope}-${new Date().toISOString().slice(0,10)}.xlsx`;
  document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
  return model.count;
}
