/* Interactive design prototype. All mutations are local to this page. */
(() => {
'use strict';
const D=structuredClone(window.DEMO);
const S={view:'overview',period:30,q:'',type:'all',status:'all',visibility:'all',manager:'all',sort:'recent',page:1,selected:new Set(),role:'owner',nav:false,notice:'',analytics:'growth',settings:'types',clientStage:'all',clientFresh:false,taskOpen:false,taskLate:false,cohort:'',eventType:'all',unread:false,results:'rating',resType:'all',resGrade:'all',resSort:'score',release:3};
const titles={overview:'Обзор проекта',partners:'Партнёры',clients:'Клиенты',team:'Команда',tasks:'Задачи',analytics:'Аналитика',results:'Результативность',notifications:'Уведомления',settings:'Настройки',suppliers:'Поставщики'};
const roleNames={owner:'Владелец',head:'Руководитель',curator:'Куратор направления'};
const roleLabel=e=>R(2)?roleNames[e.role]:({owner:'Владелец',head:'Администратор',curator:'Оператор'})[e.role];
const stages={new:'Новый',contact:'На связи',order:'Есть заявка',done:'Сделка завершена'};
const app=document.getElementById('app'),dialog=document.getElementById('dialog');
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icon=n=>`<i data-lucide="${esc(n)}" aria-hidden="true"></i>`;
const fmt=n=>typeof n==='number'?n.toLocaleString('ru-RU'):String(n);
const me=()=>D.employees.find(x=>x.id===S.role)||D.employees[0];
const canManage=()=>me().active&&['owner','head'].includes(me().role);
const typeOf=id=>D.types.find(t=>t.id===id)||{name:'Другой тип',one:'Партнёр',color:'#747575'};
const employee=id=>D.employees.find(x=>x.id===id);
const partner=id=>D.partners.find(x=>x.id===id);
const initials=s=>s.split(' ').slice(0,2).map(x=>x[0]).join('').toUpperCase();
const allowed=p=>canManage()||(me().active&&me().types.includes(p.type)&&(!me().limit||p.manager===me().id));
const roster=()=>D.partners.filter(p=>!p.archived&&!p.removed&&allowed(p));
const scopedClients=()=>D.clients.filter(c=>!c.archived&&allowed(partner(c.partner)));
const filteredClients=()=>scopedClients().filter(c=>(!S.clientFresh||c.createdDays<S.period)&&(S.clientStage==='all'||c.stage===S.clientStage)&&(!S.q.trim()||[c.name,c.city,partner(c.partner).name,c.id].join(' ').toLowerCase().includes(S.q.trim().toLowerCase())));
const links=id=>D.edges.filter(e=>e.a===id||e.b===id);
const statePill=p=>p.removed?'<span class="pill red">Удалён</span>':p.archived?'<span class="pill">В архиве</span>':`<span class="pill ${p.status==='active'?'good':''}"><span class="dot"></span>${p.status==='active'?'Активный':'Демо'}</span>`;
const recent=p=>p.lastDays===0?'Сегодня':p.lastDays===1?'Вчера':`${p.lastDays} дн. назад`;
const managerName=p=>employee(p.manager)?.active?employee(p.manager).name:'Без куратора';
const button=(text,action,extra='',cls='')=>`<button class="button ${cls}" data-action="${action}" ${extra}>${text}</button>`;
const selectOptions=(values,current)=>values.map(([id,label])=>`<option value="${esc(id)}" ${String(current)===String(id)?'selected':''}>${esc(label)}</option>`).join('');
const empty=(title='Ничего не найдено',text='Попробуйте изменить условия поиска.',action='reset')=>`<div class="empty">${icon('search')}<h2>${title}</h2><p>${text}</p>${action==='reset'?button('Сбросить фильтры','reset'):button('К обзору','go','data-view="overview"')}</div>`;
const switchButton=(on,action,id,label,disabled=false)=>`<span class="switch-label"><button class="switch" role="switch" aria-checked="${on?'true':'false'}" aria-label="${esc(label)}" data-action="${action}" data-id="${esc(id)}" ${!canManage()||disabled?'disabled':''}></button></span>`;
const visibility=(p,key)=>`<button class="visibility ${p[key]?'yes':'no'}" data-action="toggle-${key}" data-id="${p.id}" aria-label="${esc((key==='catalog'?'Каталог':'Поиск сотрудничества')+': '+p.name+', '+(p[key]?'виден':'скрыт'))}" ${!canManage()||p.archived?'disabled':''}>${icon(p[key]?'eye':'eye-off')}<span>${p[key]?'Виден':'Скрыт'}</span></button>`;
function log(action,target){D.audit.unshift({time:'Только что',who:me().name,action,target});}
function notice(text){S.notice=text;document.getElementById('announcer').textContent=text;}
const viewRelease={overview:1,suppliers:2,partners:1,clients:1,team:1,tasks:2,analytics:1,results:1,notifications:1,settings:1};
function setRelease(n){S.release=+n;if(!R(viewRelease[S.view]))S.view='overview';if(!R(2)){if(S.results==='match')S.results='rating';if(S.analytics==='geography')S.analytics='growth';if(S.manager!=='all')S.manager='all';}S.notice='';history.replaceState(null,'','#'+S.view);render();}
function go(view,filters={}){
 if(!R(viewRelease[view]||1))view='overview';
 S.view=view;S.q='';S.page=1;S.selected.clear();S.notice='';S.nav=false;
 if(view==='partners'){S.type='all';S.status='all';S.visibility='all';S.manager='all';S.cohort='';}
 if(view==='clients'){S.clientStage='all';S.clientFresh=false;}
 if(view==='tasks'){S.taskOpen=false;S.taskLate=false;}
 if(view==='results'){S.resType='all';S.resGrade='all';}
 Object.assign(S,filters);history.replaceState(null,'','#'+view);render();window.scrollTo({top:0,behavior:'instant'});
}
function filteredPartners(){
 let ps=D.partners.filter(allowed);
 if(S.status==='archive')ps=ps.filter(p=>p.archived&&!p.removed);
 else if(S.status==='removed')ps=ps.filter(p=>p.removed);
 else ps=ps.filter(p=>!p.archived&&!p.removed&&(S.status==='all'||p.status===S.status));
 if(S.type!=='all')ps=ps.filter(p=>p.type===S.type);
 if(S.manager!=='all')ps=ps.filter(p=>S.manager==='none'?!employee(p.manager)?.active:S.manager==='assigned'?!!employee(p.manager)?.active:p.manager===S.manager);
 if(S.visibility==='catalog')ps=ps.filter(p=>p.catalog);
 if(S.visibility==='hidden')ps=ps.filter(p=>!p.catalog);
 if(S.visibility==='cooperation')ps=ps.filter(p=>p.cooperation);
 if(S.visibility==='not-cooperation')ps=ps.filter(p=>!p.cooperation);
 if(S.visibility==='moderation')ps=ps.filter(p=>p.moderation);
 if(S.visibility==='new')ps=ps.filter(p=>p.createdDays<S.period&&p.status==='active');
 if(S.visibility==='connections')ps=ps.filter(p=>links(p.id).length>0);
 if(S.visibility==='inactive')ps=ps.filter(p=>p.lastDays>14&&p.consent);
 if(S.visibility==='consenting')ps=ps.filter(p=>p.consent);
 if(S.visibility==='no-consent')ps=ps.filter(p=>!p.consent);
 if(S.visibility==='period-active')ps=ps.filter(p=>p.consent&&p.lastDays<S.period);
 if(S.cohort){
  const n=['active','filled','published','search','connected'].indexOf(S.cohort);
  ps=ps.filter(p=>p.status==='active'&&(n<1||p.fill>=80)&&(n<2||p.catalog)&&(n<3||p.cooperation)&&(n<4||links(p.id).length>0));
 }
 if(S.q.trim()){const q=S.q.trim().toLocaleLowerCase('ru');ps=ps.filter(p=>[p.name,p.city,p.id,typeOf(p.type).name,managerName(p)].join(' ').toLocaleLowerCase('ru').includes(q));}
 return ps.sort((a,b)=>S.sort==='name'?a.name.localeCompare(b.name,'ru'):S.sort==='activity'?a.lastDays-b.lastDays:S.sort==='links'?links(b.id).length-links(a.id).length:a.createdDays-b.createdDays);
}
function kpi(label,value,foot,view,filters={},delta=''){
 return `<button class="panel kpi" data-action="drill" data-view="${view}" data-filters="${esc(JSON.stringify(filters))}"><span class="kpi-label">${label}${icon('arrow-up-right')}</span><strong class="kpi-value">${fmt(value)}</strong><span class="kpi-bottom"><span class="${delta?'delta':''}">${foot}</span></span></button>`;
}
function lineChart(){
 const bins=S.period===7?7:S.period===30?8:10,ps=roster().filter(p=>p.status==='active'),cs=scopedClients();
 const series=[ps,cs].map(a=>Array.from({length:bins},(_,i)=>a.filter(x=>x.createdDays<S.period&&Math.min(bins-1,Math.floor((S.period-1-x.createdDays)/S.period*bins))===i).length));
 const max=Math.max(4,...series.flat())+2,W=innerWidth<760?Math.max(240,innerWidth-58):650,H=204,x=i=>42+i*(W-64)/(bins-1),y=v=>H-24-v/max*(H-50);
 const path=a=>a.map((v,i)=>`${i?'L':'M'}${x(i)},${y(v)}`).join(' ');
 const dateLabel=i=>{const dt=new Date('2026-10-29T12:00:00Z');dt.setDate(dt.getDate()-S.period+1+Math.round(i*(S.period-1)/(bins-1)));return dt.toLocaleDateString('ru-RU',{day:'numeric',month:'short'}).replace('.','');};
 return `<svg class="line-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Регистрации за ${S.period} дней: ${series[0].reduce((a,b)=>a+b,0)} партнёров, ${series[1].reduce((a,b)=>a+b,0)} клиентов">
 <defs><linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--brand)" stop-opacity=".14"/><stop offset="1" stop-color="var(--brand)" stop-opacity=".01"/></linearGradient></defs>
 ${[0,1,2,3].map(i=>{const v=Math.round(i*max/3);return `<line x1="42" y1="${y(v)}" x2="${W-8}" y2="${y(v)}" stroke="var(--line)" stroke-dasharray="3 4"/><text x="25" y="${y(v)+4}" text-anchor="end">${v}</text>`;}).join('')}
 <path d="${path(series[0])} L${x(bins-1)},${H-24} L42,${H-24} Z" fill="url(#area)"/>
 <path d="${path(series[1])}" fill="none" stroke="#91a3aa" stroke-width="2" stroke-dasharray="5 5" stroke-linejoin="round"/>
 <path d="${path(series[0])}" fill="none" stroke="var(--brand)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
 ${series[0].map((v,i)=>`<circle cx="${x(i)}" cy="${y(v)}" r="4" fill="var(--surface)" stroke="var(--brand)" stroke-width="2"><title>${dateLabel(i)}: ${v} партнёров, ${series[1][i]} клиентов</title></circle>`).join('')}
 ${(innerWidth<760?[0,Math.round((bins-1)/2),bins-1]:[0,Math.floor((bins-1)/3),Math.floor((bins-1)*2/3),bins-1]).map(i=>`<text x="${x(i)}" y="${H-2}" text-anchor="${i===0?'start':i===bins-1?'end':'middle'}">${dateLabel(i)}</text>`).join('')}
 </svg><div class="chart-legend"><span><i class="legend-dot" style="background:var(--brand)"></i>Партнёры</span><span><i class="legend-dot" style="background:#91a3aa"></i>Клиенты</span></div>`;
}
function chartPanel(){return `<section class="panel"><div class="panel-head"><div><h2>Рост сообщества</h2><small>Новые регистрации за ${S.period} дней</small></div>${button(icon('arrow-up-right'),'go','data-view="analytics"','ghost')}</div><div class="chart-wrap">${lineChart()}</div></section>`;}
function typeVisual(){
 const ps=roster(),types=D.types.filter(t=>t.enabled&&ps.some(p=>p.type===t.id));
 return `<section class="panel"><div class="panel-head"><h2>Партнёрская сеть</h2><span class="pill">${ps.length} всего</span></div><div class="types-visual"><div class="segmented-bar">${types.map(t=>`<button style="background:${t.color};flex:${ps.filter(p=>p.type===t.id).length}" data-action="type-drill" data-id="${t.id}" aria-label="${t.name}"></button>`).join('')}</div>${types.map(t=>{const n=ps.filter(p=>p.type===t.id).length;return `<button class="type-row" data-action="type-drill" data-id="${t.id}"><i class="type-dot" style="background:${t.color}"></i><span>${esc(t.name)}</span><strong>${n}</strong><small>${Math.round(n/Math.max(1,ps.length)*100)}%</small>${icon('chevron-right')}</button>`;}).join('')}</div></section>`;
}
function networkPanel(){
 const ps=roster(),n=ps.filter(p=>p.cooperation).length,percent=Math.round(n/Math.max(1,ps.length)*100);
 return `<section class="panel"><div class="panel-head"><h2>Готовность к сотрудничеству</h2></div><div class="network-stat"><div class="donut"><svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="48" fill="none" stroke="var(--line)" stroke-width="12"/><circle cx="60" cy="60" r="48" fill="none" stroke="var(--brand)" stroke-width="12" stroke-dasharray="${percent*3.016} 301.6" stroke-linecap="round"/></svg><div class="donut-center"><strong>${percent}%</strong><small>видны в поиске</small></div></div><div class="metric-rows">${[['В каталоге',ps.filter(p=>p.catalog).length,{visibility:'catalog'}],['В поиске партнёров',n,{visibility:'cooperation'}],['С партнёрствами',ps.filter(p=>links(p.id).length).length,{visibility:'connections'}],['Новая регистрация',ps.filter(p=>p.status==='active').length,{status:'active'}]].map(([k,v,f])=>`<button class="metric-row" data-action="drill" data-view="partners" data-filters="${esc(JSON.stringify(f))}"><span class="muted">${k}</span><strong>${v}</strong></button>`).join('')}</div></div><div class="mini-note">Каталог и поиск сотрудничества управляются отдельно.</div></section>`;
}
function overview(){
 const ps=roster(),cs=scopedClients(),newP=ps.filter(p=>p.status==='active'&&p.createdDays<S.period).length,newC=cs.filter(c=>c.createdDays<S.period).length;
 const missing=ps.filter(p=>!employee(p.manager)?.active).length,review=ps.filter(p=>p.moderation).length,late=D.tasks.filter(t=>t.due==='Просрочено'&&t.stage!=='done'&&allowed(partner(t.partner))).length;
 return `<div class="kpis">${kpi('Партнёры',ps.length,`${ps.filter(p=>p.status==='active').length} активных · ${ps.filter(p=>p.status==='demo').length} демо`,'partners')}${kpi('Клиенты',cs.length,`+${newC} за ${S.period} дней`,'clients',{},true)}${kpi('В поиске сотрудничества',ps.filter(p=>p.cooperation).length,'Готовы к новым связям','partners',{visibility:'cooperation'})}${kpi('Новые партнёры',newP,`За последние ${S.period} дней`,'partners',{visibility:'new'},true)}</div>
 <div class="dashboard-grid">${chartPanel()}<section class="panel"><div class="panel-head"><div><h2>Требует внимания</h2><small>Следующее полезное действие</small></div>${icon('scan-eye')}</div>
 <button class="queue-row" data-action="drill" data-view="partners" data-filters='{"visibility":"moderation"}'><span class="queue-icon">${icon('clipboard-check')}</span><span><strong>Проверить профили</strong><small>Заявки на модерацию</small></span><span class="count">${review}</span>${icon('chevron-right')}</button>
 ${onlyR(2,`<button class="queue-row" data-action="go" data-view="suppliers"><span class="queue-icon">${icon('factory')}</span><span><strong>Проверить поставщиков</strong><small>Заявки на статус поставщика</small></span><span class="count">${supPending()}</span>${icon('chevron-right')}</button>`)}
 ${onlyR(2,`<button class="queue-row" data-action="drill" data-view="partners" data-filters='{"manager":"none"}'><span class="queue-icon">${icon('user-round-plus')}</span><span><strong>Назначить куратора</strong><small>Партнёры без ответственного</small></span><span class="count">${missing}</span>${icon('chevron-right')}</button>
 <button class="queue-row" data-action="drill" data-view="tasks" data-filters='{"taskOpen":true,"taskLate":true}'><span class="queue-icon">${icon('clock-3')}</span><span><strong>Разобрать просроченное</strong><small>Задачи команды</small></span><span class="count">${late}</span>${icon('chevron-right')}</button>`)}
 ${R(2)?'':`<button class="queue-row" data-action="drill" data-view="results" data-filters='{"results":"reviews"}'><span class="queue-icon">${icon('star')}</span><span><strong>Проверить отзывы</strong><small>Ожидают модерации</small></span><span class="count">${scopedReviews().filter(r=>r.status==='pending').length}</span>${icon('chevron-right')}</button>`}
 <button class="queue-row" data-action="drill" data-view="partners" data-filters='{"visibility":"inactive"}'><span class="queue-icon">${icon('activity')}</span><span><strong>Вернуть в работу</strong><small>Нет визитов более 14 дней*</small></span><span class="count">${ps.filter(p=>p.lastDays>14&&p.consent).length}</span>${icon('chevron-right')}</button>
 </section></div>${resultsSummary()}<div class="dashboard-grid">${typeVisual()}${networkPanel()}</div>
 <section class="panel"><div class="panel-head"><h2>События проекта</h2>${button('Все события '+icon('arrow-right'),'go','data-view="notifications"','ghost')}</div>${eventList(visibleEvents().slice(0,3))}</section><p class="help-tip">* Активность учитывается только при наличии согласия.</p>`;
}
function partnerTable(){
 const ps=filteredPartners(),start=(S.page-1)*10;
 if(start>=ps.length&&S.page>1)S.page=1;
 const rows=ps.slice((S.page-1)*10,S.page*10),chosen=rows.length&&rows.every(p=>S.selected.has(p.id));
 const counters=D.types.filter(t=>t.enabled&&(canManage()||me().types.includes(t.id)));
 return `<div class="filter-chips"><button class="filter-chip ${S.type==='all'?'active':''}" data-action="filter-type" data-id="all">Все типы <span class="type-counter">${roster().length}</span></button>${counters.map(t=>`<button class="filter-chip ${S.type===t.id?'active':''}" data-action="filter-type" data-id="${t.id}">${esc(t.name)} <span class="type-counter">${roster().filter(p=>p.type===t.id).length}</span></button>`).join('')}</div>${S.cohort?`<div class="role-banner"><span>Воронка: ${({active:'новая регистрация',filled:'профиль ≥ 80%',published:'профиль ≥ 80% и каталог',search:'профиль ≥ 80%, каталог и сотрудничество',connected:'все этапы и есть партнёрства'})[S.cohort]}</span><button data-action="reset">Сбросить срез</button></div>`:''}
 <section class="panel"><div class="toolbar"><div class="search-field">${icon('search')}<input data-testid="partner-search" data-input="partner-search" aria-label="Поиск партнёров" placeholder="Имя, компания, город, ID" value="${esc(S.q)}"></div>
 <select class="filter-select" aria-label="Статус регистрации" data-change="status">${selectOptions([['all','Все статусы'],['active','Активные'],['demo','Демо'],['archive','Архив'],['removed','Удалены из проекта']],S.status)}</select>
 <select class="filter-select" aria-label="Видимость" data-change="visibility">${selectOptions([['all','Любая видимость'],['catalog','В каталоге'],['hidden','Скрыты в каталоге'],['cooperation','В поиске сотрудничества'],['not-cooperation','Нет в поиске'],['moderation','На модерации'],['new','Новые за период'],['connections','С партнёрствами'],['inactive','Неактивные более 14 дней'],['consenting','С согласием на аналитику'],['no-consent','Без согласия'],['period-active','Были в кабинете за период']],S.visibility)}</select>
 ${onlyR(2,`<select class="filter-select" aria-label="Куратор" data-change="manager">${selectOptions([['all','Все кураторы'],['none','Без куратора'],['assigned','С назначенным куратором'],...D.employees.filter(e=>e.active&&e.role!=='owner').map(e=>[e.id,e.name])],S.manager)}</select>`)}
 <select class="filter-select" aria-label="Сортировка" data-change="sort">${selectOptions([['recent','Сначала новые'],['name','По имени'],['activity','По активности'],['links','По партнёрствам']],S.sort)}</select></div>
 <div class="toolbar">${button((chosen?'Снять выбор':'Выбрать страницу'),'select-page','','small')}<span class="small">Найдено: <strong data-testid="partner-result-count">${ps.length}</strong></span><span style="margin-left:auto"></span>${S.q||S.type!=='all'||S.status!=='all'||S.visibility!=='all'||S.manager!=='all'?button('Сбросить','reset','','small'):''}</div>
 ${S.selected.size?`<div class="bulk-bar"><strong>Выбрано: <span data-testid="selected-count">${S.selected.size}</span></strong>${canManage()?`${onlyR(2,button('Куратор','assign-bulk','','small'))}${button('Каталог','bulk-catalog','','small')}${button('Сотрудничество','bulk-cooperation','','small')}${['archive','removed'].includes(S.status)?button('Восстановить','bulk-restore','','small'):`${button('В архив','bulk-archive','','small')}${button('Удалить','bulk-remove','','small')}`}`:'<span class="small">Управление доступно руководителю</span>'}${button('Отменить','clear-selection','','small')}</div>`:''}
 ${!ps.length?empty(S.status==='archive'?'Архив пока пуст':S.status==='removed'?'Нет удалённых партнёров':'Ничего не найдено',S.status==='archive'?'Архивные записи появятся после вашего действия.':'Попробуйте изменить условия поиска.'):`
 <div class="table-wrap partners-table"><table><thead><tr><th class="check-cell"><label><input type="checkbox" aria-label="Выбрать страницу" data-change="select-page" ${chosen?'checked':''}></label></th><th>Партнёр</th><th>Регистрация</th><th>Каталог</th><th>Сотрудничество</th>${onlyR(2,'<th class="hide-medium">Куратор</th>')}<th>Визит*</th><th></th></tr></thead><tbody>${rows.map(p=>`<tr data-testid="partner-row-${p.id}"><td class="check-cell"><label><input type="checkbox" aria-label="Выбрать ${esc(p.name)}" data-change="select-partner" data-id="${p.id}" ${S.selected.has(p.id)?'checked':''}></label></td><td>${partnerName(p)}</td><td>${statePill(p)}</td><td>${visibility(p,'catalog')}</td><td>${visibility(p,'cooperation')}<small>Партнёрств: ${links(p.id).length}</small></td>${onlyR(2,`<td class="hide-medium">${esc(managerName(p))}</td>`)}<td><td>${p.consent?recent(p):'<span class="muted">Нет согласия</span>'}</td><td>${button(icon('chevron-right'),'open-partner',`data-id="${p.id}" aria-label="Карточка ${esc(p.name)}"`,'ghost')}</td></tr>`).join('')}</tbody></table></div>
 <div class="partner-cards">${rows.map(p=>`<article class="mobile-card"><div class="card-top"><label class="check-cell"><input type="checkbox" aria-label="Выбрать ${esc(p.name)}" data-change="select-partner" data-id="${p.id}" ${S.selected.has(p.id)?'checked':''}></label>${partnerName(p)}${statePill(p)}</div><div class="mobile-meta"><span class="visibility ${p.catalog?'yes':'no'}">${icon(p.catalog?'eye':'eye-off')}Каталог: ${p.catalog?'да':'нет'}</span><span class="visibility ${p.cooperation?'yes':'no'}">${icon(p.cooperation?'handshake':'minus')}Поиск: ${p.cooperation?'да':'нет'}</span></div><div class="card-bottom"><span>Партнёрств: ${links(p.id).length}</span><span>${p.consent?recent(p):'Визиты без согласия не учитываются'}</span></div></article>`).join('')}</div>
 <div class="table-footer"><span>${(S.page-1)*10+1}–${Math.min(S.page*10,ps.length)} из ${ps.length} партнёров</span><div class="pagination"><button class="icon-button" aria-label="Предыдущая страница" data-action="prev-page" ${S.page===1?'disabled':''}>${icon('chevron-left')}</button><span>${S.page} / ${Math.ceil(ps.length/10)}</span><button class="icon-button" aria-label="Следующая страница" data-action="next-page" ${S.page*10>=ps.length?'disabled':''}>${icon('chevron-right')}</button></div></div>`}</section><p class="help-tip">Активный = новая регистрация. Демо видно только администратору. * Визиты с согласием.</p>`;
}
function partnerName(p){return `<button class="partner-name" data-action="open-partner" data-id="${p.id}"><span class="avatar">${esc(initials(p.name))}</span><span><strong>${esc(p.name)}</strong><small>${esc(typeOf(p.type).one)} · ${esc(p.city)}</small></span></button>`;}
function clientsView(){
 let cs=filteredClients();
 if((S.page-1)*10>=cs.length&&S.page>1)S.page=1;
 return `<div class="kpis">${kpi('Клиентов в базе',scopedClients().length,'Все рекомендации','clients')}${kpi('Новые за период',scopedClients().filter(c=>c.createdDays<S.period).length,`${S.period} дней`,'clients',{clientFresh:true})}${kpi('С заявками',scopedClients().filter(c=>c.stage==='order').length,'В работе партнёров','clients',{clientStage:'order'})}${kpi('Завершённые сделки',scopedClients().filter(c=>c.stage==='done').length,'По демосценарию','clients',{clientStage:'done'})}</div>${S.clientFresh?`<div class="role-banner"><span>Новые клиенты за ${S.period} дней</span><button data-action="reset">Все клиенты</button></div>`:''}
 <section class="panel"><div class="toolbar"><div class="search-field">${icon('search')}<input data-testid="client-search" data-input="client-search" aria-label="Поиск клиентов" placeholder="Клиент, партнёр, город" value="${esc(S.q)}"></div><select class="filter-select" aria-label="Этап клиента" data-change="clientStage">${selectOptions([['all','Все этапы'],...Object.entries(stages)],S.clientStage)}</select><span class="small">${cs.length} клиентов</span></div>
 ${cs.length?`<div class="table-wrap clients-table"><table><thead><tr><th></th><th>Клиент</th><th>Источник</th><th>Этап</th><th>Активность*</th></tr></thead><tbody>${cs.slice((S.page-1)*10,S.page*10).map(c=>`<tr><td></td><td><button class="partner-name" data-action="open-client" data-id="${c.id}"><span><strong>${esc(c.name)}</strong><small>${c.id} · ${c.city}</small></span></button></td><td><button class="button ghost small" data-action="open-partner" data-id="${c.partner}">${esc(partner(c.partner).name)}</button></td><td><span class="pill ${c.stage==='done'?'good':c.stage==='order'?'blue':''}">${stages[c.stage]}</span></td><td>${c.consent?c.lastDays===0?'Сегодня':`${c.lastDays} дн. назад`:'Нет согласия'}</td></tr>`).join('')}</tbody></table></div>
 <div class="clients-cards">${cs.slice((S.page-1)*10,S.page*10).map(c=>`<article class="mobile-card"><div class="card-top"><button class="partner-name" data-action="open-client" data-id="${c.id}"><span><strong>${esc(c.name)}</strong><small>${c.id} · ${esc(c.city)}</small></span></button><span class="pill ${c.stage==='done'?'good':c.stage==='order'?'blue':''}">${stages[c.stage]}</span></div><div class="client-source"><span class="small">От партнёра</span><button data-action="open-partner" data-id="${c.partner}">${esc(partner(c.partner).name)} →</button></div><div class="card-bottom"><span>Последний визит</span><span>${c.consent?c.lastDays===0?'Сегодня':`${c.lastDays} дн. назад`:'Нет согласия'}</span></div></article>`).join('')}</div>
 <div class="table-footer"><span>${Math.min(cs.length,(S.page-1)*10+1)}–${Math.min(cs.length,S.page*10)} из ${cs.length}</span><div class="pagination"><button class="icon-button" data-action="prev-page" aria-label="Предыдущая страница" ${S.page===1?'disabled':''}>${icon('chevron-left')}</button><span>${S.page}</span><button class="icon-button" data-action="next-page" aria-label="Следующая страница" ${S.page*10>=cs.length?'disabled':''}>${icon('chevron-right')}</button></div></div>`:empty()}</section><p class="help-tip">Контакты в прототипе не используются. * Активность только при согласии клиента.</p>`;
}
function teamView(){
 if(!canManage())return empty('Только для руководителя','Куратор видит свою базу и задачи.','overview');
 return `<div class="kpis">${kpi('Сотрудники',D.employees.filter(e=>e.role!=='owner'&&e.active).length,'Без владельца проекта','team')}${R(2)?`${kpi('Партнёры с кураторами',roster().filter(p=>employee(p.manager)?.active).length,'Есть ответственный','partners',{manager:'assigned'})}${kpi('Без куратора',roster().filter(p=>!employee(p.manager)?.active).length,'Нужно распределить','partners',{manager:'none'})}${kpi('Открытые задачи',D.tasks.filter(t=>t.stage!=='done').length,'По всем направлениям','tasks',{taskOpen:true})}`:`${statTile('Доступ активен',D.employees.filter(e=>e.active).length,'Могут войти в кабинет')}${statTile('Доступ закрыт',D.employees.filter(e=>!e.active).length,'Приглашение отозвано')}${statTile('Роли доступа','Владелец · Администратор · Оператор','По StaffRole в PROF; кураторы по направлениям — релиз 2')}`}</div><div class="team-grid">${D.employees.map(e=>{const ps=roster().filter(p=>p.manager===e.id),ts=D.tasks.filter(t=>t.employee===e.id&&t.stage!=='done').length;return `<article class="panel employee"><div class="employee-top"><span class="avatar">${initials(e.name)}</span><div><h2>${esc(e.name)}</h2><p>${roleLabel(e)}</p></div></div><span class="pill ${e.active?'good':''}">${e.active?'Доступ активен':'Доступ закрыт'}</span>${R(2)?`<p class="small">${e.role==='curator'?e.types.map(t=>typeOf(t).name).join(', ')||'Направление не назначено':'Все направления проекта'}</p><div class="employee-stat"><div><strong>${ps.length}</strong><small>партнёров</small></div><div><strong>${ts}</strong><small>открытых задач</small></div></div>`:'<p class="small">Роль задаётся приглашением, без привязки к направлению</p>'}<div class="employee-actions">${onlyR(2,button('Партнёры','employee-partners',`data-id="${e.id}"`))}${e.role!=='owner'?button('Доступ','edit-employee',`data-id="${e.id}"`):button('Все права','edit-employee',`data-id="${e.id}"`)}</div></article>`;}).join('')}</div>`;
}
function tasksView(){
 const ts=D.tasks.filter(t=>allowed(partner(t.partner))&&(canManage()||t.employee===me().id)&&(!S.taskOpen||t.stage!=='done')&&(!S.taskLate||t.due==='Просрочено'));
 return `${S.taskOpen?`<div class="role-banner"><span>${S.taskLate?'Просроченные':'Открытые'} задачи: ${ts.length}</span><button data-action="go" data-view="tasks">Все задачи</button></div>`:''}<div class="kanban">${[['new','К выполнению'],['work','В работе'],['done','Готово']].map(([id,label])=>`<section class="kanban-col"><div class="kanban-head"><span>${label}</span><span class="pill">${ts.filter(t=>t.stage===id).length}</span></div>${ts.filter(t=>t.stage===id).map(t=>`<article class="panel task"><span class="pill ${t.due==='Просрочено'&&id!=='done'?'red':''}">${id==='done'?'Выполнено':t.due}</span><h3>${esc(t.title)}</h3><button class="button ghost small" data-action="open-partner" data-id="${t.partner}">${esc(partner(t.partner).name)} ${icon('arrow-up-right')}</button><div class="task-footer"><span class="avatar" title="${esc(employee(t.employee)?.name||'Не назначено')}">${initials(employee(t.employee)?.name||'Н Н')}</span><select aria-label="Этап задачи ${esc(t.title)} для ${esc(partner(t.partner).name)}" data-change="task-stage" data-id="${t.id}">${selectOptions([['new','К выполнению'],['work','В работе'],['done','Готово']],t.stage)}</select></div></article>`).join('')||'<div class="empty"><p>Задач нет</p></div>'}</section>`).join('')}</div>`;
}
function analyticsView(){
 const ps=roster(),active=ps.filter(p=>p.status==='active'),filled=active.filter(p=>p.fill>=80),published=filled.filter(p=>p.catalog),search=published.filter(p=>p.cooperation),connected=search.filter(p=>links(p.id).length),consenting=ps.filter(p=>p.consent),visits=consenting.filter(p=>p.lastDays<S.period);
 let body='';
 if(S.analytics==='growth')body=`<div class="dashboard-grid">${chartPanel()}<section class="panel"><div class="panel-head"><div><h2>Путь новых партнёров</h2><small>Каждый этап внутри предыдущего · нажмите для списка</small></div></div><div class="panel-pad">${[['Новая регистрация',active.length,'active'],['Профиль ≥ 80%',filled.length,'filled'],['Опубликован в каталоге',published.length,'published'],['Доступен к сотрудничеству',search.length,'search'],['Есть партнёрства',connected.length,'connected']].map(([label,n,id])=>`<button class="bar-row bar-button" data-action="cohort-drill" data-id="${id}"><span>${label}</span><div class="progress-track"><span style="width:${n/Math.max(1,active.length)*100}%"></span></div><strong>${n}</strong></button>`).join('')}</div></section></div><div class="dashboard-grid">${typeVisual()}${networkPanel()}</div>`;
 if(S.analytics==='activity')body=`<div class="kpis">${kpi('С согласием на аналитику',consenting.length,'Учитываются в статистике','partners',{visibility:'consenting'})}${kpi('Были в кабинете',visits.length,`За ${S.period} дней`,'partners',{visibility:'period-active'})}${kpi('Не заходили > 14 дней',consenting.filter(p=>p.lastDays>14).length,'Есть повод связаться','partners',{visibility:'inactive'})}${kpi('Без согласия',ps.length-consenting.length,'Не считаем визиты','partners',{visibility:'no-consent'})}</div><section class="panel"><div class="panel-head"><h2>Активность направлений</h2><small>Уникальные партнёры с согласием</small></div><div class="panel-pad">${D.types.filter(t=>t.enabled).map(t=>{const eligible=consenting.filter(p=>p.type===t.id),n=visits.filter(p=>p.type===t.id).length;return `<div class="bar-row"><span>${esc(t.name)}</span><div class="progress-track"><span style="width:${n/Math.max(1,eligible.length)*100}%;background:${t.color}"></span></div><strong>${n}/${eligible.length}</strong></div>`;}).join('')}</div></section>`;
 if(S.analytics==='quality')body=`<div class="dashboard-grid"><section class="panel"><div class="panel-head"><h2>Заполненность профилей</h2><small>Среднее по направлению</small></div><div class="panel-pad">${D.types.filter(t=>t.enabled).map(t=>{const a=ps.filter(p=>p.type===t.id),v=a.length?Math.round(a.reduce((s,p)=>s+p.fill,0)/a.length):0;return `<div class="bar-row"><span>${esc(t.name)}</span><div class="progress-track"><span style="width:${v}%;background:${t.color}"></span></div><strong>${v}%</strong></div>`;}).join('')}</div></section><section class="panel"><div class="panel-head"><h2>Работа с базой</h2></div>${onlyR(2,`<button class="queue-row" data-action="drill" data-view="partners" data-filters='{"manager":"none"}'><span>Назначить ответственного</span><strong class="count">${ps.filter(p=>!employee(p.manager)?.active).length}</strong>${icon('chevron-right')}</button>`)}<button class="queue-row" data-action="drill" data-view="partners" data-filters='{"visibility":"moderation"}'><span>Проверить профиль</span><strong class="count">${ps.filter(p=>p.moderation).length}</strong>${icon('chevron-right')}</button><button class="queue-row" data-action="drill" data-view="partners" data-filters='{"status":"demo"}'><span>Разобрать старые демо</span><strong class="count">${ps.filter(p=>p.status==='demo').length}</strong>${icon('chevron-right')}</button></section></div>`;
 if(S.analytics==='geography'){const cities=[...new Set(ps.map(p=>p.city))];body=`<section class="panel"><div class="panel-head"><h2>География сообщества</h2><small>Партнёры и клиенты по городам</small></div><div class="region-table">${cities.map(city=>{const n=ps.filter(p=>p.city===city).length;return `<div class="region-row"><span>${city}</span><strong>${n} партнёров</strong><span class="muted">${scopedClients().filter(c=>c.city===city).length} клиентов</span><div class="progress-track"><span style="width:${n/Math.max(1,ps.length)*100*3}%"></span></div></div>`;}).join('')}</div></section>`;}
 return `<div class="subtabs">${[['growth','Рост и воронка'],['activity','Активность'],['quality','Качество базы'],['geography','География',2]].filter(t=>R(t[2]||1)).map(([id,n])=>`<button class="${S.analytics===id?'active':''}" data-action="analytics-tab" data-id="${id}">${n}</button>`).join('')}</div>${body}`;
}
function visibleEvents(){return D.events.filter(e=>allowed(partner(e.partner))&&(S.eventType==='all'||e.type===S.eventType)&&(!S.unread||!e.read));}
function eventList(events){return events.map(e=>`<button class="notification-item ${!e.read?'unread':''}" data-action="open-event" data-id="${e.id}">${icon({partners:'user-round-plus',clients:'users-round',activity:'activity',moderation:'clipboard-check'}[e.type])}<span><h3>${esc(e.text)}</h3><p>${esc(partner(e.partner).name)} · ${typeOf(partner(e.partner).type).one}</p></span><time>${e.time}</time></button>`).join('')||empty('Всё прочитано','Новых событий по выбранным условиям нет.');}
function notificationsView(){return `<section class="panel"><div class="toolbar"><select class="filter-select" aria-label="Тема уведомлений" data-change="eventType">${selectOptions([['all','Все темы'],['partners','Регистрации партнёров'],['clients','Регистрации клиентов'],['activity','Активность'],['moderation','Модерация']],S.eventType)}</select><label class="check"><input type="checkbox" data-change="unread" ${S.unread?'checked':''}>Только непрочитанные</label><span style="margin-left:auto"></span>${button('Прочитать всё','read-all','','small')}</div>${eventList(visibleEvents())}</section>`;}
function settingsView(){
 if(!canManage())return empty('Доступ ограничен','Настройки проекта доступны владельцу и руководителю.','overview');
 return `<div class="subtabs"><button class="${S.settings==='types'?'active':''}" data-action="settings-tab" data-id="types">Типы партнёров</button><button class="${S.settings==='releases'?'active':''}" data-action="settings-tab" data-id="releases">Релизы и развитие</button><button class="${S.settings==='audit'?'active':''}" data-action="settings-tab" data-id="audit">Журнал действий</button></div>${S.settings==='releases'?releasesView():S.settings==='audit'?`<section class="panel panel-pad">${D.audit.length?D.audit.map(a=>`<div class="audit-row"><span class="muted">${a.time}</span><div><strong>${esc(a.action)}</strong><p>${esc(a.target)}</p></div><span>${esc(a.who)}</span></div>`).join(''):empty('Действий пока нет','Изменения в макете появятся здесь.')}</section>`:`
 <div class="settings-layout"><section class="panel"><div class="panel-head"><div><h2>Направления проекта</h2><small>Общая модель, без отдельных кабинетов</small></div>${onlyR(3,button(icon('plus')+' Новый тип','add-type','','small'))}</div><div class="panel-pad">${D.types.filter(t=>t.enabled||R(3)).map(t=>`<div class="settings-row"><div><h3>${esc(t.name)}</h3><p>${D.partners.filter(p=>p.type===t.id&&!p.archived).length} партнёров · ${t.enabled?'доступен для регистрации':'будущее направление'}</p></div>${R(3)?switchButton(t.enabled,'toggle-type',t.id,t.enabled?'Отключить '+t.name:'Включить '+t.name):`<span class="pill ${t.enabled?'good':''}">${t.enabled?'Включён':'Выключен'}</span>`}</div>`).join('')}</div></section><section class="panel panel-pad"><h2>Правила управления</h2><div class="settings-row"><div><h3>Каталог отдельно от сотрудничества</h3><p>Одно действие не меняет вторую видимость</p></div>${icon('check')}</div><div class="settings-row"><div><h3>Удаление с восстановлением</h3><p>Карточка скрыта, история сохранена</p></div>${icon('check')}</div>${onlyR(2,`<div class="settings-row"><div><h3>Работа по направлениям</h3><p>Куратор видит свою назначенную базу</p></div>${icon('check')}</div>`)}<div class="settings-row"><div><h3>Уведомления с контекстом</h3><p>Кабинет, тема, партнёр, переход</p></div>${button('Настроить','notification-settings','','small')}</div></section></div>`}`;
}
function head(){
 let actions='';
 if(['overview','analytics','clients','results'].includes(S.view))actions+=`<select class="period filter-select" aria-label="Период" data-change="period">${selectOptions([[7,'7 дней'],[30,'30 дней'],[90,'90 дней']],S.period)}</select>`;
 if(['partners','clients','analytics','results'].includes(S.view))actions+=button(icon('download')+' Выгрузить','export','','export');
 if(S.view==='team'&&canManage())actions+=button(icon('plus')+' Сотрудник','add-employee','','primary');
 if(S.view==='tasks')actions+=button(icon('plus')+' Задача','add-task','','primary');
 if(S.view==='notifications')actions+=button(icon('sliders-horizontal')+' Настройки','notification-settings','','primary');
 const sc=D.releases.find(x=>x.id===S.release),scopeLine=S.release<3?`<div class="scope-line"><span>${rel(S.release)}</span><p>Кабинет показан в объёме этого релиза: ${esc(sc.note.charAt(0).toLowerCase()+sc.note.slice(1))}.</p>${button('Состав релизов','drill','data-view="settings" data-filters=\'{"settings":"releases"}\'','small ghost')}</div>`:'';
 return `<div class="mobile-demo">Прототип · демонстрационные данные</div>${scopeLine}<div class="page-head"><div><h1>${titles[S.view]}</h1><p>${{overview:'Главное о росте, людях и партнёрской сети',suppliers:'Заявки партнёров на статус поставщика: проверка и показ другим партнёрам',partners:R(2)?'Регистрация, видимость и ответственные':'Регистрация и видимость',clients:'Клиентская база и источники рекомендаций',team:'Люди, направления и доступ',tasks:'Следующее действие по каждому партнёру',analytics:'От показателя к конкретным записям',results:'Сертификаты, сделки, отзывы и каталог по каждому партнёру',notifications:'События проекта в одном месте',settings:'Структура проекта и история изменений'}[S.view]}</p></div><div class="head-actions">${actions}</div></div>`;
}
/* ---------- Поставщики: заявки на статус поставщика ---------- */
const SA=()=>window.RCSupplierApp;
D.supApps=[
 {id:'SA-017',name:'Оптовик',type:'company',city:'Краснодар',role:'regional',flags:['stock','delivery'],cats:['doors','hardware'],brands:'Tandoor, Профильдорс',geo:'south',deliv:['pickup','city','tk'],pay:['invoice','defer'],prices:'on-approve',min:'от 5 000 ₽',days:'2–4 дня',source:'1c',items:4762,docs:{req:true,proof:false,price:true},proofOk:{req:false,price:false},st:'moderation',when:'сегодня, 10:12',decisions:{},q:'',reason:'',reqs:0,orders:0},
 {id:'SA-016',name:'Керамика Юга',type:'store',city:'Ростов-на-Дону',role:'wholesale',flags:['stock','order'],cats:['tiles','plumbing'],brands:'Kerama Marazzi, Cersanit',geo:'ru',deliv:['pickup','tk'],pay:['invoice','prepay'],prices:'open',min:'от 30 000 ₽',days:'5–7 дней',source:'manual',items:640,docs:{req:true,proof:false,price:true},proofOk:{req:true,price:true},st:'moderation',when:'вчера, 16:40',decisions:{},q:'',reason:'',reqs:0,orders:0},
 {id:'SA-015',name:'Фабрика дверей «Дубрава»',type:'company',city:'Усть-Лабинск',role:'maker',flags:['order','delivery'],cats:['doors'],brands:'Дубрава',geo:'south',deliv:['pickup','tk'],pay:['invoice','prepay'],prices:'on-approve',min:'от 5 полотен',days:'10–14 дней',source:'manual',items:310,docs:{req:true,proof:true,price:true},proofOk:{req:true,proof:true,price:true},st:'approved',when:'23 ноября',decisions:{doors:'ok'},q:'',reason:'',reqs:6,orders:3},
 {id:'SA-014',name:'Павел Нечаев',type:'specialist',city:'Краснодар',role:'service',flags:['install'],cats:['svc:doors','svc:windows'],brands:'',geo:'city',deliv:[],pay:['invoice'],prices:'open',min:'',days:'по записи',source:'none',items:0,docs:{req:true,proof:false,price:false},proofOk:{req:true},st:'clarify',when:'22 ноября',decisions:{},q:'Уточните стоимость выезда и виды работ, чтобы партнёры видели условия.',reason:'',reqs:0,orders:0},
 {id:'SA-013',name:'СтройОпт-Юг',type:'company',city:'Новороссийск',role:'official',flags:['stock'],cats:['flooring','wallpaper'],brands:'Tarkett',geo:'ru',deliv:['tk'],pay:['invoice'],prices:'open',min:'от 50 000 ₽',days:'7 дней',source:'manual',items:120,docs:{req:true,proof:false,price:true},proofOk:{req:true,price:true},st:'rejected',when:'20 ноября',decisions:{},q:'',reason:'Не удалось подтвердить статус официального дистрибьютора по документам.',reqs:0,orders:0},
 {id:'SA-012',name:'Тандор',type:'company',city:'Краснодар',role:'maker',flags:['stock','delivery'],cats:['doors','hardware','trim'],brands:'Tandoor',geo:'south',deliv:['pickup','city','tk'],pay:['invoice'],prices:'on-approve',min:'нет',days:'3–5 дней',source:'1c',items:4762,docs:{req:true,proof:true,price:true},proofOk:{req:true,proof:true,price:true},st:'approved',when:'18 ноября',decisions:{doors:'ok',hardware:'ok',trim:'ok'},q:'',reason:'',reqs:14,orders:21},
];
S.supSt='all';S.supDraft={};
const supOf=id=>D.supApps.find(a=>a.id===id);
const supPartners=cat=>{const lab=SA().catName(cat);return D.partners.filter(p=>!p.archived&&!p.removed&&p.categories?.includes(lab));};
const supReach=cat=>{const n=supPartners(cat).length;return n||(SA().CATS.find(c=>c[0]===cat)||[0,0,0])[2];};
const supStPill=a=>{const st=a.st==='approved'&&Object.values(a.decisions).includes('no')?'partial':a.st;const [l]=SA().STATUS[st];return `<span class="pill ${{moderation:'warn',clarify:'blue',approved:'good',partial:'good',rejected:'red',paused:''}[st]||''}">${esc(l)}</span>`;};
const supCatPills=(a,only)=>a.cats.map(c=>{const d=a.decisions[c];return `<span class="pill ${d==='ok'?'good':d==='no'?'red':''}">${esc(SA().catName(c))}</span>`;}).join(' ');
const supPending=()=>D.supApps.filter(a=>a.st==='moderation').length;
function suppliersView(){
 const A=SA(),list=D.supApps.filter(a=>S.supSt==='all'||(S.supSt==='approved'?['approved','partial','paused'].includes(a.st):a.st===S.supSt));
 const cnt=k=>D.supApps.filter(a=>k==='approved'?['approved','partial','paused'].includes(a.st):a.st===k).length;
 const row=a=>`<tr data-testid="sup-row-${a.id}"><td><button class="partner-name" data-action="sup-open" data-id="${a.id}"><span class="avatar">${esc(initials(a.name))}</span><span><strong>${esc(a.name)}</strong><small>${esc(a.id)} · ${esc(typeOf(a.type).one)} · ${esc(a.city)}</small></span></button></td><td>${esc(A.roleOf(a.role).label)}<br><span class="muted">${a.docs.proof?'документ приложен':A.needProof(a.role)?'<b class="red-t">нет документа</b>':'документ не требуется'}</span></td><td>${supCatPills(a)}</td><td>${a.source==='1c'?'1С · ':a.source==='manual'?'прайс · ':''}${a.items?fmt(a.items)+' поз.':'по запросу'}</td><td>${esc(a.when)}</td><td>${supStPill(a)}${['approved','partial'].includes(a.st)?`<br><span class="muted">${a.reqs} запросов · ${a.orders} заказов</span>`:''}</td><td><button class="button small" data-action="sup-open" data-id="${a.id}">${a.st==='moderation'?'Проверить':'Открыть'}</button></td></tr>`;
 return `<div class="kpis">${statTile('На модерации',cnt('moderation'),'Ждут решения администратора')}${statTile('Нужны уточнения',cnt('clarify'),'Вопрос ушёл партнёру')}${statTile('Одобрены',cnt('approved'),'Видны партнёрам по категориям')}${statTile('Отклонены',cnt('rejected'),'С причиной для партнёра')}</div>
 <section class="panel" style="margin-top:var(--s6)"><div class="panel-head"><div><h2>Заявки на статус поставщика</h2><small>Отдельно от модерации профилей и каталога на сайте. Решение принимается по каждой категории.</small></div></div>
 <div class="toolbar"><select class="filter-select" aria-label="Статус заявки" data-change="supSt">${selectOptions([['all','Все заявки'],['moderation','На модерации'],['clarify','Нужны уточнения'],['approved','Одобрены'],['rejected','Отклонены']],S.supSt)}</select></div>
 ${list.length?`<div class="table-wrap"><table><thead><tr><th>Заявка</th><th>Роль</th><th>Категории</th><th>Ассортимент</th><th>Подана</th><th>Статус</th><th></th></tr></thead><tbody>${list.map(row).join('')}</tbody></table></div>`:'<p class="panel-pad small">Заявок с таким статусом нет.</p>'}</section>
 <section class="panel" style="margin-top:var(--s6)"><div class="panel-head"><h2>Что происходит после одобрения</h2></div><ol class="panel-pad sup-flow"><li><strong>Список партнёров</strong><span>Поставщик появляется в кабинете партнёров, которые ведут товары или услуги в одобренных категориях: «Каталог → Поставщики».</span></li><li><strong>Запрос сотрудничества</strong><span>Партнёр отправляет запрос, поставщик подтверждает его и открывает дилерские цены.</span></li><li><strong>Заказ</strong><span>Партнёр заказывает из заявки своего клиента, поставщик выставляет счёт, получает оплату и отгружает.</span></li><li><strong>Расчёт</strong><span>Деньги идут по счёту поставщика напрямую. RemCard платёж не проводит: кошелёк и взаиморасчёты не затрагиваются.</span></li></ol></section>`;
}
function supSummary(a){
 const A=SA(),dr=S.supDraft[a.id]||{},ok=a.cats.filter(c=>dr[c]!=='no'),no=a.cats.filter(c=>dr[c]==='no');
 const names=[...new Set(ok.flatMap(c=>supPartners(c)))].slice(0,3).map(p=>p.name);
 const n=ok.reduce((s,c)=>s+supReach(c),0);
 return ok.length?`<p data-testid="sup-summary"><strong>${ok.length===a.cats.length?'Одобрить все категории':'Одобрить '+ok.length+' из '+a.cats.length}.</strong> После одобрения поставщика увидят ${ok.length>1?'до ':''}<strong>${n}</strong> партнёров в категориях: ${esc(ok.map(A.catName).join(', '))}.${names.length?` Например: ${esc(names.join(', '))}.`:''}</p>${no.length?`<p class="small">Не одобрены: ${esc(no.map(A.catName).join(', '))}. Партнёр увидит причину.</p>`:''}`:`<p data-testid="sup-summary">Ни одна категория не одобрена: заявку можно только вернуть с вопросом или отклонить.</p>`;
}
function openSup(id){
 const a=supOf(id);if(!a)return;const A=SA();
 if(!S.supDraft[id])S.supDraft[id]=Object.fromEntries(a.cats.map(c=>[c,a.decisions[c]||'ok']));
 const dr=S.supDraft[id],open=['moderation','clarify'].includes(a.st)&&canManage();
 const dl=rows=>`<dl class="sup-dl">${rows.map(([k,v])=>`<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>`;
 const docRow=([k,l])=>{const need=k==='req'||(k==='proof'&&A.needProof(a.role));const has=a.docs[k];return `<div class="sup-doc"><span><strong>${esc(l)}</strong><small>${need?'обязателен':'по желанию'}</small></span><span>${has?`<span class="pill ${a.proofOk[k]?'good':'warn'}">${a.proofOk[k]?'Проверен':'Приложен'}</span>${open?button(a.proofOk[k]?'Снять отметку':'Отметить проверенным','sup-doc',`data-id="${a.id}" data-doc="${k}"`,'small'):''}`:`<span class="pill ${need?'red':''}">${need?'Не приложен':'Нет'}</span>`}</span></div>`;};
 const body=`<div class="sup-card" data-testid="sup-card"><p>${supStPill(a)} <span class="muted">${esc(a.id)} · подана: ${esc(a.when)} · ${esc(typeOf(a.type).one)}, ${esc(a.city)}</span></p>
  <h3>Заявка</h3>${dl([['Роль',esc(A.roleOf(a.role).label)+(A.needProof(a.role)?' · нужен документ':'')],['Особенности',a.flags.map(f=>esc(A.label(A.FLAGS,f))).join(', ')||'—'],['Бренды',esc(a.brands||'—')],['Ассортимент',(a.source==='1c'?'каталог из 1С':a.source==='manual'?'прайс-лист':'по запросу')+(a.items?` · ${fmt(a.items)} позиций`:'')],['География',esc(A.label(A.GEO,a.geo))+(a.deliv.length?' · '+a.deliv.map(d=>esc(A.label(A.DELIV,d).toLowerCase())).join(', '):'')],['Условия',`дилерские цены: ${a.prices==='open'?'сразу после запроса':'после подтверждения поставщиком'} · мин. заказ: ${esc(a.min||'—')} · срок: ${esc(a.days||'—')} · оплата: ${a.pay.map(p=>esc(A.label(A.PAY,p).toLowerCase())).join(', ')}`]])}
  <h3>Документы</h3>${A.DOCS.map(docRow).join('')}
  <h3>Решение по категориям</h3>${a.cats.map(c=>`<div class="sup-cat"><span><strong>${esc(A.catName(c))}</strong><small>увидят ${supReach(c)} партнёров сети</small></span>${open?`<span class="sup-seg"><label><input type="radio" name="supcat-${a.id}-${c}" data-supcat="${a.id}:${c}" value="ok" ${dr[c]!=='no'?'checked':''}> Одобрить</label><label><input type="radio" name="supcat-${a.id}-${c}" data-supcat="${a.id}:${c}" value="no" ${dr[c]==='no'?'checked':''}> Отклонить</label></span>`:`<span class="pill ${a.decisions[c]==='ok'?'good':a.decisions[c]==='no'?'red':''}">${a.decisions[c]==='ok'?'Одобрена':a.decisions[c]==='no'?'Отклонена':'Ждёт решения'}</span>`}</div>`).join('')}
  <div class="sup-sum" id="sup-summary">${open?supSummary(a):a.st==='clarify'||a.st==='rejected'?`<p>${esc(a.st==='clarify'?'Вопрос партнёру: '+a.q:'Причина отказа: '+a.reason)}</p>`:`<p>Партнёры видят поставщика в одобренных категориях. Запросов: ${a.reqs}, заказов: ${a.orders}.</p>`}</div>
  ${open?`<label class="sup-f"><span>Вопрос партнёру или причина отказа</span><textarea id="sup-text" rows="3" placeholder="Например: приложите договор дистрибуции" data-testid="sup-text"></textarea></label>`:''}
  ${canManage()?'':'<p class="small">Решения принимают владелец проекта и администратор.</p>'}</div>`;
 const foot=open?button('Одобрить','sup-decide',`data-id="${a.id}" data-kind="ok"`,'primary')+button('Вернуть с вопросом','sup-decide',`data-id="${a.id}" data-kind="ask"`)+button('Отклонить','sup-decide',`data-id="${a.id}" data-kind="no"`):(['approved','partial'].includes(a.st)&&canManage()?button('Приостановить показ','sup-decide',`data-id="${a.id}" data-kind="pause"`):a.st==='paused'&&canManage()?button('Вернуть показ','sup-decide',`data-id="${a.id}" data-kind="resume"`):'')+button('Закрыть','close-dialog');
 openDialog(esc(a.name),body,foot,true);
}
function supDecide(id,kind){
 const a=supOf(id);if(!a||!canManage())return;const dr=S.supDraft[id]||{},A=SA(),txt=(document.getElementById('sup-text')?.value||'').trim();
 if(kind==='ok'){const ok=a.cats.filter(c=>dr[c]!=='no');if(!ok.length){notice('Выберите хотя бы одну категорию или отклоните заявку.');return;}a.decisions=Object.fromEntries(a.cats.map(c=>[c,dr[c]==='no'?'no':'ok']));a.st='approved';a.reason=ok.length<a.cats.length?(txt||'Для части категорий нужны подтверждающие документы.'):'';log(ok.length<a.cats.length?'Одобрил заявку поставщика частично':'Одобрил заявку поставщика',a.name);notice(`Поставщик «${a.name}» одобрен. Партнёр получил уведомление в кабинет и бот, а ${ok.length>1?'до ':''}${ok.reduce((s,c)=>s+supReach(c),0)} партнёров увидят его в категориях: ${ok.map(A.catName).join(', ')}.`);}
 if(kind==='ask'){if(!txt){notice('Напишите вопрос партнёру.');return;}a.st='clarify';a.q=txt;log('Вернул заявку поставщика с вопросом',a.name);notice(`Вопрос отправлен партнёру «${a.name}».`);}
 if(kind==='no'){if(!txt){notice('Укажите причину отказа: партнёр увидит её в кабинете.');return;}a.st='rejected';a.reason=txt;a.decisions={};log('Отклонил заявку поставщика',a.name);notice(`Заявка «${a.name}» отклонена, причина отправлена партнёру.`);}
 if(kind==='pause'){a.prev=a.st;a.st='paused';log('Приостановил показ поставщика',a.name);notice(`Показ «${a.name}» приостановлен. Подтверждённое сотрудничество и открытые заказы сохраняются.`);}
 if(kind==='resume'){a.st='approved';log('Вернул показ поставщика',a.name);notice(`Показ «${a.name}» возвращён.`);}
 delete S.supDraft[id];closeDialog();render();
}

function render(){
 const active=document.activeElement,testid=active?.dataset?.testid,pos=active?.selectionStart;
 const nav=[['overview','layout-dashboard'],['partners','handshake'],['suppliers','factory'],['clients','users-round'],['team','contact-round'],['tasks','check-check'],['analytics','chart-no-axes-combined'],['results','target'],['notifications','bell'],['settings','settings-2']].filter(([id])=>R(viewRelease[id]));
 if(!R(viewRelease[S.view]))S.view='overview';
 const unread=D.events.filter(e=>!e.read&&allowed(partner(e.partner))).length;
 app.innerHTML=`<div class="shell ${S.nav?'nav-open':''}"><button class="backdrop-nav" aria-label="Закрыть меню" data-action="close-nav"></button><aside class="sidebar"><a class="wordmark" href="#overview">remcard<span>.</span></a><p class="brand-sub">УПРАВЛЕНИЕ ПРОЕКТОМ</p><nav class="nav" aria-label="Основное меню">${nav.filter(([id])=>['overview','partners','suppliers','clients','team','tasks'].includes(id)).map(([id,ic])=>navItem(id,ic)).join('')}<span class="nav-caption">КОНТРОЛЬ И РАЗВИТИЕ</span>${nav.filter(([id])=>!['overview','partners','suppliers','clients','team','tasks'].includes(id)).map(([id,ic])=>navItem(id,ic)).join('')}</nav><div class="side-bottom"><div class="side-release show-m"><span class="small">Объём релиза</span>${releaseSwitch(true)}</div><div class="demo-note"><strong>Интерактивный прототип</strong>Демонстрационные данные.<br>Изменения только в этом просмотре.<br><a class="demo-link" href="../index.html">Вход в прототип</a> · <a class="demo-link" href="../partner/index.html">Кабинет партнёра</a> · <a class="demo-link" href="../client/index.html">Сайт для клиентов</a></div><div class="account"><span class="avatar">ВП</span><span><strong>${esc(me().name)}</strong><br><small>${roleNames[me().role]}</small></span></div></div></aside>
 <div class="workspace"><header class="topbar"><button class="icon-button mobile-menu" data-action="open-nav" aria-label="Открыть меню">${icon('menu')}</button><span class="mobile-wordmark">remcard<span style="color:#c12b2f">.</span></span><div class="breadcrumb"><span>Кабинет администратора</span>${icon('chevron-right')}<strong>${titles[S.view]}</strong></div><div class="top-actions">${onlyR(2,`<button class="global-search" data-action="global-search" aria-label="Поиск по проекту">${icon('search')}<span>Поиск по проекту</span><kbd>⌘ K</kbd></button>`)}<select class="release-select" aria-label="Объём релиза" title="Показать кабинет в объёме выбранного релиза" data-change="release">${selectOptions(D.releases.map(r=>[r.id,r.name]),S.release)}</select>${onlyR(2,`<select class="role-select" aria-label="Просмотр роли" data-change="role">${selectOptions(D.employees.filter(e=>e.active).map(e=>[e.id,e.role==='owner'?'Режим владельца':e.name+' · '+roleNames[e.role]]),S.role)}</select>`)}<button class="icon-button" data-action="theme" aria-label="Переключить тему" title="День / ночь">${icon(document.documentElement.dataset.theme==='dark'?'sun':'moon')}</button><button class="icon-button" data-action="go" data-view="notifications" aria-label="Уведомления" title="Уведомления">${icon('bell')}${unread?'<span class="notification-dot"></span>':''}</button></div></header>
 <main id="main" tabindex="-1">${S.role!=='owner'?`<div class="role-banner"><span>Просмотр роли: <strong>${esc(me().name)}</strong>. ${canManage()?'Все направления.':'Только назначенные партнёры своего направления.'}</span><button data-action="owner-role">Вернуться к владельцу</button></div>`:''}${head()}${S.notice?`<div class="status-line" role="status">${esc(S.notice)}</div>`:''}${({overview,partners:partnerTable,clients:clientsView,team:teamView,tasks:tasksView,suppliers:suppliersView,analytics:analyticsView,results:resultsView,notifications:notificationsView,settings:settingsView}[S.view])()}</main></div></div>`;
 function navItem(id,ic){const counts={partners:roster().length,clients:scopedClients().length,team:D.employees.filter(e=>e.active&&e.role!=='owner').length,tasks:D.tasks.filter(t=>t.stage!=='done'&&allowed(partner(t.partner))).length,suppliers:supPending(),notifications:unread};return `<button class="${S.view===id?'active':''}" data-action="go" data-view="${id}" aria-current="${S.view===id?'page':'false'}">${icon(ic)}<span>${titles[id].replace(' проекта','')}</span>${counts[id]!==undefined?`<span class="nav-count">${counts[id]}</span>`:''}</button>`;}
 icons();
 if(testid){const el=app.querySelector(`[data-testid="${testid}"]`);if(el){el.focus();if(pos!==null)el.setSelectionRange(pos,pos);}}
}
function icons(){window.lucide?.createIcons({attrs:{'stroke-width':1.65}});}
function openDialog(title,body,footer='',drawer=false){
 dialog.className=drawer?'drawer':'';
 dialog.innerHTML=`<header class="dialog-head"><h2 id="dialog-title">${title}</h2><button class="icon-button" aria-label="Закрыть окно" data-action="close-dialog">${icon('x')}</button></header><div class="dialog-body">${body}</div>${footer?`<footer class="dialog-footer">${footer}</footer>`:''}`;
 if(!dialog.open)dialog.showModal();document.body.style.overflow='hidden';icons();
}
function closeDialog(){dialog.close();document.body.style.overflow='';S.pending=null;}
dialog.addEventListener('close',()=>{document.body.style.overflow='';});
function confirmAction(title,body,callback,returnId=''){
 S.pending=callback;S.returnId=returnId;
 openDialog(title,`<p>${body}</p>`,button('Отмена','cancel-confirm',returnId?`data-id="${returnId}"`:'')+button('Подтвердить','confirm','','primary'));
}
function openPartner(id){
 const p=partner(id);if(!p||!allowed(p))return;
 const eligibleManagers=D.employees.filter(e=>e.active&&(e.role!=='curator'||e.types.includes(p.type)));
 const linked=links(id).map(e=>partner(e.a===id?e.b:e.a));
 const logs=D.audit.filter(a=>a.target===p.name);
 openDialog('Карточка партнёра',`<div class="detail-top"><span class="avatar">${initials(p.name)}</span><div><h3>${esc(p.name)}</h3><p>${esc(typeOf(p.type).one)} · ${esc(p.city)} · ${p.id}</p></div></div>${statePill(p)}
 <div class="detail-stats"><div><strong>${links(id).length}</strong><small>партнёрства</small></div><div><strong>${p.fill}%</strong><small>профиль заполнен</small></div><div><strong>${p.consent?recent(p):'Не учитывается'}</strong><small>последний визит</small></div></div>
 <div class="detail-list"><div class="settings-row"><div><h3>Публичный каталог</h3><p>${p.catalog?'Виден посетителям remcard.ru':'Не отображается на сайте'}</p></div>${switchButton(p.catalog,'toggle-catalog',p.id,'Видимость в каталоге',p.archived)}</div><div class="settings-row"><div><h3>Поиск сотрудничества</h3><p>${p.cooperation?'Другие партнёры могут найти':'Другие партнёры не видят в поиске'}${p.override?' · выбор администратора':''}</p></div>${switchButton(p.cooperation,'toggle-cooperation',p.id,'Видимость в сотрудничестве',p.archived)}</div></div>
 ${partnerResults(p)}
 ${onlyR(2,`<section class="detail-section"><h3>Ответственный сотрудник</h3><label class="form-field">Куратор<select aria-label="Куратор партнёра" data-change="partner-manager" data-id="${id}" ${!canManage()?'disabled':''}>${selectOptions([['none','Не назначен'],...eligibleManagers.map(e=>[e.id,e.name])],p.manager||'none')}</select></label></section>`)}
 <div class="inline-actions">${button(icon('external-link')+' Публичный вид','public-preview',`data-id="${id}"`)}${onlyR(2,button(icon('plus')+' Задача','add-task',`data-id="${id}"`))}</div>
 ${p.moderation&&canManage()&&!p.archived?`<section class="detail-section"><h3>Ожидает проверки</h3><p class="small">Согласование не меняет видимость в каталоге и сотрудничестве.</p>${button('Согласовать профиль','approve-partner',`data-id="${id}"`)}</section>`:''}
 <section class="detail-section"><h3>Партнёрства <span class="muted">${linked.length}</span></h3>${linked.length?linked.map(x=>`<button class="queue-row" style="padding-inline:0" data-action="${allowed(x)?'open-partner':'restricted-partner'}" data-id="${x.id}"><span><strong>${esc(x.name)}</strong><small>${typeOf(x.type).one} · ${x.archived?'В архиве':'Действующее партнёрство'}</small></span>${icon('chevron-right')}</button>`).join(''):'<p class="small">Партнёрства ещё не заключены.</p>'}</section>
 <section class="detail-section"><h3>История управления</h3>${logs.length?logs.slice(0,5).map(a=>`<div class="audit-row" style="grid-template-columns:1fr"><strong>${esc(a.action)}</strong><span class="muted">${esc(a.who)} · ${a.time}</span></div>`).join(''):'<p class="small">Нет изменений в этом просмотре.</p>'}</section>
 ${canManage()?`<div class="inline-actions">${p.archived?button('Восстановить','restore-partner',`data-id="${id}"`,'primary'):button('В архив','archive-partner',`data-id="${id}"`)}${!p.removed?button('Удалить из проекта','remove-partner',`data-id="${id}"`,'danger'):''}</div>`:''}`, '',true);
}
function openClient(id){
 const c=D.clients.find(x=>x.id===id);if(!c||!allowed(partner(c.partner)))return;
 openDialog('Карточка клиента',`<div class="detail-top"><span class="avatar">${initials(c.name)}</span><div><h3>${esc(c.name)}</h3><p>${c.id} · ${c.city}</p></div></div><span class="pill">${stages[c.stage]}</span><section class="detail-section"><h3>Откуда пришёл</h3>${partnerName(partner(c.partner))}</section><section class="detail-section"><h3>Аналитика</h3><p class="small">${c.consent?'Согласие получено. Последняя активность: '+(c.lastDays?c.lastDays+' дн. назад':'сегодня'):'Нет согласия. Визиты не учитываются.'}</p></section><section class="detail-section"><h3>История клиента</h3><div class="audit-row"><span class="muted">${c.createdDays} дн. назад</span><span>Регистрация по рекомендации</span></div><div class="audit-row"><span class="muted">Текущий этап</span><span>${stages[c.stage]}</span></div></section><p class="help-tip">Синтетическая карточка без настоящих контактов и операций.</p>`,button('Закрыть','close-dialog'),true);
}
function publicPreview(id){
 const p=partner(id);if(!p||!allowed(p))return;
 openDialog('Предпросмотр карточки каталога',`<div class="public-preview"><div class="wordmark">remcard<span>.</span></div><div class="public-avatar">${initials(p.name)}</div><h3>${esc(p.name)}</h3><p>${esc(typeOf(p.type).one)} · ${esc(p.city)}</p><div class="inline-actions"><span class="pill">${p.fill}% профиля заполнено</span></div><p style="margin-top:var(--s5)">Помогаем с ремонтом и обустройством дома.</p><button class="button primary" data-action="preview-contact">Связаться с партнёром</button></div><p class="help-tip">${p.catalog?'Так карточку видит посетитель каталога.':'Сейчас карточка скрыта. Это внутренний предпросмотр.'}</p>`,button('Назад к партнёру','open-partner',`data-id="${id}"`),true);
}
function mutatePartners(ids,operation,value){
 if(!canManage())return;
 const ps=ids.map(partner).filter(p=>p&&allowed(p));
 ps.forEach(p=>{
  if(operation==='catalog'){p.catalog=value&&!p.archived&&!p.removed;log(value?'Показал в каталоге':'Скрыл из каталога',p.name);}
  if(operation==='cooperation'){p.cooperation=value&&!p.archived&&!p.removed;if(p.status==='demo'&&value)p.override=true;log(value?'Включил поиск сотрудничества':'Выключил поиск сотрудничества',p.name);}
  if(operation==='archive'||operation==='remove'){if(!p.archived)p.prior={catalog:p.catalog,cooperation:p.cooperation};p.archived=true;p.removed=operation==='remove';p.catalog=false;p.cooperation=false;log(operation==='remove'?'Удалил из проекта с сохранением истории':'Переместил в архив',p.name);}
  if(operation==='restore'){p.archived=false;p.removed=false;p.catalog=p.prior?.catalog??false;p.cooperation=p.prior?.cooperation??false;log('Восстановил партнёра',p.name);}
 });
 S.selected.clear();notice(`Готово. Обновлено партнёров: ${ps.length}. История сохранена.`);render();
}
function partnerAction(ids,op,back=''){
 const ps=ids.map(partner).filter(Boolean);if(!ps.length||!canManage())return;
 if(['catalog','cooperation'].includes(op)){
  openDialog(op==='catalog'?'Видимость в каталоге':'Видимость для сотрудничества',`<p>${ids.length===1?esc(ps[0].name):'Выбрано партнёров: '+ids.length}</p><p class="help-tip">${op==='catalog'?'Не меняет поиск сотрудничества.':'Не меняет регистрацию и публичный каталог. Старые демо можно включить по выбору админа.'}</p><div class="inline-actions">${button(icon('eye')+' Показать','set-visible',`data-op="${op}" data-value="true"`,'primary')}${button(icon('eye-off')+' Скрыть','set-visible',`data-op="${op}" data-value="false"`)}</div>`,button('Отмена','cancel-confirm',back?`data-id="${back}"`:''));
  S.actionIds=ids;S.returnId=back;return;
 }
 const labels={archive:['Переместить в архив?','Скроем из каталога и поиска сотрудничества. Данные и история останутся, восстановление доступно в архиве.'],remove:['Удалить из проекта?','Партнёр исчезнет из рабочих списков, каталога и поиска. Запись и история останутся в разделе «Удалены из проекта» с возможностью восстановления.'],restore:['Восстановить партнёра?','Вернём в рабочий реестр и восстановим прежние настройки видимости.']};
 confirmAction(labels[op][0],`${ids.length===1?esc(ps[0].name):'Выбрано: '+ids.length}. ${labels[op][1]}`,()=>{mutatePartners(ids,op);if(back)openPartner(back);},back);
}
function assignmentDialog(ids){
 if(!canManage())return;
 const ps=ids.map(partner),opts=D.employees.filter(e=>e.active&&(e.role!=='curator'||ps.every(p=>e.types.includes(p.type))));
 openDialog('Назначить куратора',`<p class="small">Выбрано партнёров: ${ids.length}. Показаны сотрудники с доступом ко всем выбранным направлениям.</p><form id="assign-form" style="margin-top:var(--s5)"><label class="form-field">Ответственный<select name="employee">${selectOptions([['none','Без куратора'],...opts.map(e=>[e.id,e.name])],'none')}</select></label></form>`,button('Отмена','close-dialog')+'<button class="button primary" type="submit" form="assign-form">Назначить</button>');
 S.actionIds=ids;
}
function employeeDialog(id=''){
 if(!canManage())return;
 const e=employee(id),isOwner=e?.role==='owner';
 openDialog(e?'Доступ сотрудника':'Новый сотрудник',`<form id="employee-form" data-id="${id}"><label class="form-field">Имя<input name="name" required maxlength="70" value="${esc(e?.name||'')}" placeholder="Имя и фамилия" ${isOwner?'readonly':''}></label><label class="form-field">Роль<select name="role" ${isOwner?'disabled':''}>${selectOptions(isOwner?[['owner','Владелец проекта']]:[['curator','Куратор направления'],['head','Руководитель']],e?.role||'curator')}</select></label><fieldset style="border:0"><legend class="small">Направления куратора</legend>${D.types.filter(t=>t.enabled).map(t=>`<label class="check"><input type="checkbox" name="types" value="${t.id}" ${e?.types.includes(t.id)?'checked':''} ${isOwner?'disabled':''}>${esc(t.name)}</label>`).join('')}</fieldset><label class="check"><input type="checkbox" name="limit" ${e?.limit!==false?'checked':''} ${isOwner?'disabled':''}>Только назначенные партнёры</label><p id="form-error" class="small" style="color:var(--brand)" role="alert"></p><p class="help-tip">Это настройка сценария макета, не реальная выдача доступа.</p></form>${e&&!isOwner?`<div class="inline-actions">${button('Посмотреть его кабинет','view-role',`data-id="${id}"`)}${button(e.active?'Закрыть доступ':'Вернуть доступ','toggle-employee',`data-id="${id}"`)}</div>`:''}`,button('Закрыть','close-dialog')+(!isOwner?'<button class="button primary" type="submit" form="employee-form">Сохранить</button>':''));
}
function taskEmployees(p){
 return D.employees.filter(e=>e.active&&(canManage()||e.id===me().id)&&(e.role!=='curator'||(e.types.includes(p.type)&&(!e.limit||p.manager===e.id))));
}
function taskDialog(id=''){
 const ps=roster();if(!ps.length)return;
 const target=partner(id)||ps[0],staff=taskEmployees(target);
 openDialog('Новая задача',`<form id="task-form"><label class="form-field">Что нужно сделать<input name="title" required maxlength="100" placeholder="Например, помочь запустить первое партнёрство"></label><label class="form-field">Партнёр<select name="partner" data-change="task-partner">${selectOptions(ps.map(p=>[p.id,p.name]),target.id)}</select></label><div class="form-grid"><label class="form-field">Ответственный<select name="employee">${selectOptions(staff.map(e=>[e.id,e.name]),target.manager||staff[0]?.id)}</select></label><label class="form-field">Срок<select name="due"><option>Сегодня</option><option>Завтра</option><option>На этой неделе</option></select></label></div><p id="form-error" class="small" role="alert"></p></form>`,button('Отмена','close-dialog')+'<button class="button primary" type="submit" form="task-form">Создать задачу</button>');
}
function notificationSettings(){
 const n=D.notifications,disabled=!canManage()?'disabled':'';
 openDialog('Уведомления администратора',`<form id="notifications-form"><h3>Куда доставлять</h3><label class="check"><input type="checkbox" name="telegram" ${n.telegram?'checked':''} ${disabled}>Telegram <span class="pill">Демо-подключение</span></label><label class="check"><input type="checkbox" name="max" ${n.max?'checked':''} ${disabled}>MAX <span class="pill">Демо-подключение</span></label><h3 style="margin-top:var(--s5)">О чём сообщать</h3>${[['clients','Новые клиенты'],['partners','Новые партнёры'],['activity','Активность партнёров']].map(([id,label])=>`<label class="check"><input name="${id}" type="checkbox" ${n[id]?'checked':''} ${disabled}>${label}</label>`).join('')}<label class="form-field">Частота<select name="digest" ${disabled}>${selectOptions([['instant','Сразу после события'],['daily','Дайджест раз в день']],n.digest)}</select></label><div class="message-preview"><strong>Админ RemCard · Новый партнёр</strong>Компания «Проект среды»<br>Новая регистрация в направлении «Компании».<br><span style="color:var(--brand)">Открыть карточку в админке →</span></div><p class="help-tip">Предпросмотр текста. Прототип не отправляет сообщения.</p></form>`,button('Отмена','close-dialog')+(canManage()?'<button class="button primary" form="notifications-form" type="submit">Сохранить настройки</button>':''));
}
function addType(){
 if(!canManage())return;
 openDialog('Новый тип партнёров',`<form id="type-form"><label class="form-field">Название направления<input name="name" placeholder="Например, Производители мебели" maxlength="60" required></label><label class="form-field">Название одного партнёра<input name="one" placeholder="Например, Производитель" maxlength="45" required></label><p class="help-tip">Появится в фильтрах, аналитике и доступах сотрудников.</p><p id="form-error" class="small" style="color:var(--brand)" role="alert"></p></form>`,button('Отмена','close-dialog')+'<button class="button primary" type="submit" form="type-form">Добавить тип</button>');
}
function exportDialog(){
 const rows=S.view==='clients'?filteredClients().map(c=>[c.id,c.name,c.city,stages[c.stage],partner(c.partner).name]):filteredPartners().map(p=>[p.id,p.name,typeOf(p.type).one,p.city,p.status,p.catalog?'Да':'Нет',p.cooperation?'Да':'Нет',managerName(p)]);
 const headers=S.view==='clients'?['ID','Клиент','Город','Этап','Источник']:['ID','Партнёр','Тип','Город','Регистрация','Каталог','Сотрудничество','Куратор'];
 const safe=x=>/^[=+\-@\t\r]/.test(String(x))?"'"+String(x):String(x);
 S.csv='\uFEFF'+[headers,...rows].map(r=>r.map(x=>'"'+safe(x).replaceAll('"','""')+'"').join(';')).join('\r\n');
 openDialog('Выгрузка демонстрационных данных',`<p>Записей: <strong>${rows.length}</strong>. CSV учитывает текущие фильтры.</p><label class="form-field" style="margin-top:var(--s4)">Предпросмотр<textarea readonly rows="6">${esc(S.csv.slice(0,2000))}</textarea></label><p class="help-tip">Только синтетические данные. Это не выгрузка рабочей базы.</p>`,button('Закрыть','close-dialog')+button(icon('download')+' Скачать CSV','download-csv','','primary'));
}
// Events are delegated so state changes never accumulate handlers.
// Результативность партнёров: сертификаты, сделки, отзывы, каталог, коэффициент успешности.
// Все расчёты — поверх синтетических данных data.js. Функции вызываются из app.js после его загрузки.
const money=n=>fmt(Math.round(n))+' ₽';
const pct=(a,b)=>b?Math.round(a/b*100):null;
const pctText=v=>v===null||v===undefined?'—':v+'%';
const stars=r=>r===null?'—':'★ '+Number(r).toFixed(1).replace('.',',');
const convPill=v=>v===null?'<span class="pill">мало данных</span>':v>=60?`<span class="pill good">${v}%</span>`:v<30?`<span class="pill red">${v}%</span>`:`<span class="pill warn">${v}%</span>`;
const gradePill=g=>{const k=g[0];return `<span class="pill grade-${k} ${k==='A'?'good':k==='B'?'blue':'warn'}">${g}</span>`;};
const R=n=>n<=S.release;
const onlyR=(n,html)=>R(n)?html:'';
const releaseSwitch=(compact=false)=>`<div class="release-switch${compact?' compact':''}" role="group" aria-label="Объём релиза">${D.releases.map(r=>`<button class="${S.release===r.id?'active':''}" data-action="set-release" data-id="${r.id}" title="${esc(r.note)}" aria-pressed="${S.release===r.id}">${esc(r.name.split(' · ')[0])}${compact?'':`<span class="hide-m"> · ${esc(r.name.split(' · ')[1])}</span>`}</button>`).join('')}</div>`;
const releaseBar=()=>{const r=D.releases.find(x=>x.id===S.release);return `<div class="release-bar"><div><span class="small">Объём прототипа:</span>${releaseSwitch()}</div><p class="small">${esc(r.scope)}${S.release<3?' Блоки следующих релизов скрыты.':''}</p></div>`;};
const rel=n=>{const r=D.releases.find(x=>x.id===n);return `<span class="pill release ${r.tone}" title="${esc(r.note)}">${esc(r.name.split(' · ')[0])}</span>`;};
const inPeriod=x=>(x.days??x.issuedDays)<S.period;
const statTile=(label,value,foot)=>`<div class="panel kpi static"><span class="kpi-label">${label}</span><strong class="kpi-value">${value}</strong><span class="kpi-bottom"><span>${foot}</span></span></div>`;
const clientName=id=>D.clients.find(c=>c.id===id)?.name||'Клиент';
const leadLabels={new:'Новая',sent:'Отправлена',accepted:'Принята',in_progress:'В работе',sold:'Сделка',refused:'Отказ',thinking:'Клиент думает'};
const sourceLabels={catalog:'Каталог',concierge:'Консьерж',partner:'От партнёра'};

function certsOf(p){return D.certs.filter(c=>(p.type==='store'?c.store:c.issuer)===p.id);}
function ordersOf(p){return D.orders.filter(o=>(p.type==='store'?o.store:o.issuer)===p.id);}
function catalogQuality(p){const c=p.catalog_items;if(!c||!c.items)return null;return Math.round(c.photos/c.items*40+c.prices/c.items*40+(c.priceDays<=30?20:c.priceDays<=60?10:0));}
function metricsOf(p){
 const certs=certsOf(p),orders=ordersOf(p),used=certs.filter(c=>c.status==='used').length,expired=certs.filter(c=>c.status==='expired').length;
 const conv=certs.length>=3?pct(used,certs.length):null,sum=orders.reduce((s,o)=>s+o.amount,0),clients=new Set(orders.map(o=>o.client)).size;
 const published=D.reviews.filter(r=>r.partner===p.id&&r.status==='published'),pending=D.reviews.filter(r=>r.partner===p.id&&r.status==='pending').length;
 const rating=published.length?+(published.reduce((s,r)=>s+r.rating,0)/published.length).toFixed(1):null;
 const leads=D.leads.filter(l=>l.partner===p.id),sold=leads.filter(l=>l.status==='sold').length,catQ=catalogQuality(p);
 const parts=[
  {label:'Сделки по сертификатам',value:conv??50,weight:.35,note:conv===null?'меньше 3 сертификатов, взято нейтральное значение':`${used} из ${certs.length} сертификатов привели к заказу`},
  {label:'Отзывы клиентов',value:published.length>=3?Math.round(rating/5*100):60,weight:.2,note:published.length>=3?`${stars(rating)} по ${published.length} отзывам`:'меньше 3 отзывов, взято нейтральное значение'},
  {label:'Каталог',value:catQ??p.fill,weight:.15,note:catQ===null?`каталога нет, учтена заполненность профиля ${p.fill}%`:`фото, цены и свежесть цен: ${catQ}%`},
  {label:'Скорость отклика',value:p.responseRate??60,weight:.15,note:p.responseRate===null?'нет согласия на аналитику, нейтральное значение':`${p.responseRate}% обращений с ответом за 24 часа`},
  {label:'Активность в кабинете',value:p.consent?(p.lastDays<=7?100:p.lastDays<=14?75:p.lastDays<=30?45:20):50,weight:.15,note:p.consent?`последний визит: ${recent(p).toLowerCase()}`:'без согласия визиты не учитываются'}
 ];
 const score=Math.round(parts.reduce((s,x)=>s+x.value*x.weight,0)),grade=score>=75?'A':score>=55?'B':'C';
 // RemScore — формула, которая уже работает в PROF (partnerRemScore.ts): входы частично прокси
 const edgesN=D.edges.filter(e=>e.a===p.id||e.b===p.id).length,remResp=edgesN?1:0.3,remConv=Math.min(leads.length/10,1),remRepeat=Math.min(p.repeatClients,5),remReviews=Math.min(published.length,10);
 const remParts=[
  {label:'Проверен (виден в каталоге)',value:p.catalog?10:0,max:10,note:p.catalog?'статус каталога APPROVED':'не выведен в каталог'},
  {label:'Есть портфолио или фото',value:(p.catalog_items?.photos||0)>0?5:0,max:5,note:(p.catalog_items?.photos||0)>0?'есть фото в позициях':'фото нет'},
  {label:'Отклик (доля активных партнёрств)',value:Math.round(remResp*20),max:20,note:edgesN?`${edgesN} активных партнёрств`:'партнёрств нет, по умолчанию 0,3 — прокси'},
  {label:'Конверсия (обращений ÷ 10)',value:Math.round(remConv*30),max:30,note:`${leads.length} обращений · реальные сделки не учитываются — прокси`},
  {label:'Повторные клиенты (до 5)',value:Math.round(remRepeat/5*15),max:15,note:`${p.repeatClients} повторных по совпадению имени в заявках`},
  {label:'Число отзывов (до 10)',value:remReviews,max:10,note:`${published.length} опубликованных`},
  {label:'Средняя оценка',value:published.length?Math.round(rating/5*10):0,max:10,note:published.length?stars(rating):'отзывов нет'}
 ];
 const rem=Math.min(100,remParts.reduce((s,x)=>s+x.value,0)),remGrade=rem>=90?'A+':rem>=75?'A':rem>=60?'B+':rem>=40?'B':'C',remGroup=remGrade[0];
 return {certs,used,expired,conv,orders,sum,avg:orders.length?sum/orders.length:0,clients,published,pending,rating,leads,sold,catQ,parts,score,grade,rem,remParts,remGrade,remGroup,thin:certs.length<3&&published.length<3,sc:R(2)?score:rem,sg:R(2)?grade:remGrade,sgroup:R(2)?grade:remGroup};
}
function pairRows(p){
 const mine=certsOf(p),groups={};
 mine.forEach(c=>{const other=p.type==='store'?c.issuer:c.store,key=other+'|'+c.category;(groups[key]=groups[key]||{other,category:c.category,certs:0,used:0,sum:0}).certs++;if(c.status==='used'){groups[key].used++;groups[key].sum+=D.orders.find(o=>o.cert===c.id)?.amount||0;}});
 return Object.values(groups).sort((a,b)=>b.certs-a.certs);
}
function allPairs(){
 const groups={};
 D.certs.forEach(c=>{if(!allowed(partner(c.issuer)))return;const key=c.issuer+'|'+c.store+'|'+c.category;(groups[key]=groups[key]||{issuer:c.issuer,store:c.store,category:c.category,certs:0,used:0,sum:0}).certs++;if(c.status==='used'){groups[key].used++;groups[key].sum+=D.orders.find(o=>o.cert===c.id)?.amount||0;}});
 return Object.values(groups).map(g=>({...g,conv:pct(g.used,g.certs)}));
}
function scopedOrders(){return D.orders.filter(o=>allowed(partner(o.issuer))||allowed(partner(o.store)));}
function scopedCerts(){return D.certs.filter(c=>allowed(partner(c.issuer))||allowed(partner(c.store)));}
function scopedReviews(){return D.reviews.filter(r=>allowed(partner(r.partner)));}
function scopedLeads(){return D.leads.filter(l=>allowed(partner(l.partner)));}

function resultsSummary(){
 const certs=scopedCerts().filter(inPeriod),used=certs.filter(c=>c.status==='used').length,orders=scopedOrders().filter(inPeriod),sum=orders.reduce((s,o)=>s+o.amount,0);
 const published=scopedReviews().filter(r=>r.status==='published'),rating=published.length?published.reduce((s,r)=>s+r.rating,0)/published.length:null,pending=scopedReviews().filter(r=>r.status==='pending').length;
 return `<section class="panel results-summary"><div class="panel-head"><div><h2>Результативность сети</h2><small>Сертификаты, заказы и отзывы за ${S.period} дней</small></div>${button('Подробнее '+icon('arrow-right'),'drill','data-view="results" data-filters=\'{"results":"rating"}\'','ghost')}</div><div class="kpis inset">${kpi('Сертификатов выпущено',certs.length,`${used} использовано · конверсия ${pctText(pct(used,certs.length))}`,'results',{results:'certs'})}${kpi('Сумма заказов',money(sum),`${orders.length} заказов по сертификатам`,'results',{results:'deals'})}${kpi('Средний рейтинг',rating?stars(rating):'—',`${published.length} опубликованных отзывов`,'results',{results:'reviews'})}${kpi('Ожидают модерации',pending,'Отзывы клиентов','results',{results:'reviews'})}</div></section>`;
}

function resultsView(){
 const tabs=[['rating','Рейтинг партнёров',1],['certs','Сертификаты',1],['deals','Сделки и лиды',1],['reviews','Отзывы',1],['catalog','Каталог',1],['match','Рекомендации',2]].filter(t=>R(t[2]));
 if(!tabs.some(t=>t[0]===S.results))S.results='rating';
 const body={rating:ratingTab,certs:certsTab,deals:dealsTab,reviews:reviewsTab,catalog:catalogTab,match:matchTab}[S.results]();
 return `<div class="subtabs">${tabs.map(([id,n,r])=>`<button class="${S.results===id?'active':''}" data-action="results-tab" data-id="${id}">${n}${r>1?' '+rel(r):''}</button>`).join('')}</div>${body}`;
}

function ratingTab(){
 const rows=roster().map(p=>({p,m:metricsOf(p)})).filter(x=>(S.resType==='all'||x.p.type===S.resType)&&(S.resGrade==='all'||x.m.sgroup===S.resGrade));
 const sorters={score:(a,b)=>b.m.sc-a.m.sc,sum:(a,b)=>b.m.sum-a.m.sum,conv:(a,b)=>(b.m.conv??-1)-(a.m.conv??-1),rating:(a,b)=>(b.m.rating??0)-(a.m.rating??0)};
 rows.sort(sorters[S.resSort]);
 const all=roster().map(metricsOf),avg=all.length?Math.round(all.reduce((s,m)=>s+m.sc,0)/all.length):0,byGrade=g=>all.filter(m=>m.sgroup===g).length,v2=R(2);
 return `<div class="kpis">${statTile(v2?'Средний коэффициент':'Средний RemScore',avg,'По всем партнёрам в доступе')}${kpi(v2?'Группа A':'A+ и A',byGrade('A'),'Рекомендуем в первую очередь','results',{results:'rating',resGrade:'A'})}${kpi(v2?'Группа B':'B+ и B',byGrade('B'),'Стабильно, есть что подтянуть','results',{results:'rating',resGrade:'B'})}${kpi('Группа C',byGrade('C'),'Нужна помощь куратора','results',{results:'rating',resGrade:'C'})}</div>
 <section class="panel">${v2?`<div class="panel-head"><div><h2>Коэффициент успешности ${rel(2)}</h2><small>Сделки по сертификатам 35% · отзывы 20% · каталог 15% · отклик 15% · активность 15%</small></div><details class="formula"><summary>Как считается</summary><p>Каждая составляющая приводится к шкале 0–100 и берётся с весом. Если данных мало (меньше 3 сертификатов или отзывов), подставляется нейтральное значение, а в карточке партнёра показывается пометка «мало данных». A — от 75, B — от 55, C — ниже. Веса и пороги — предмет обсуждения перед релизом 2. Заменяет RemScore релиза 1, у которого конверсия и отклик считаются по прокси.</p></details></div>`:`<div class="panel-head"><div><h2>Рейтинг RemScore ${rel(1)}</h2><small>Формула, которая уже работает в PROF: проверен 10 · портфолио 5 · отклик 20 · конверсия 30 · повторные клиенты 15 · число отзывов 10 · средняя оценка 10</small></div><details class="formula"><summary>Как считается сейчас</summary><p>Считается в PROF функцией partnerRemScore и хранится в UserPartnerScore; грейды A+ от 90, A от 75, B+ от 60, B от 40, C ниже. Два входа сейчас прокси: «конверсия» — это число обращений, делённое на 10, а «отклик» — доля активных партнёрств. Сертификаты и заказы в формуле не участвуют. Для релиза 1 нужен только экран с этим рейтингом и фильтрами; пересчёт входов — релиз 2.</p></details></div>`}
 <div class="toolbar"><select class="filter-select" aria-label="Направление" data-change="resType">${selectOptions([['all','Все направления'],...D.types.filter(t=>t.enabled).map(t=>[t.id,t.name])],S.resType)}</select><select class="filter-select" aria-label="Группа" data-change="resGrade">${selectOptions([['all','Все группы'],['A','Группа A'],['B','Группа B'],['C','Группа C']],S.resGrade)}</select><select class="filter-select" aria-label="Сортировка" data-change="resSort">${selectOptions([['score',v2?'По коэффициенту':'По RemScore'],['sum','По сумме заказов'],['conv','По конверсии'],['rating','По рейтингу']],S.resSort)}</select><span class="small">Найдено: <strong data-testid="rating-count">${rows.length}</strong></span></div>
 ${rows.length?`<div class="table-wrap hide-m"><table><thead><tr><th>Партнёр</th><th>Сертификаты</th><th>Заказы</th><th>Рейтинг</th><th>Каталог</th><th>${v2?'Коэффициент':'RemScore'}</th></tr></thead><tbody>${rows.slice(0,40).map(({p,m})=>`<tr><td>${partnerName(p)}</td><td><strong>${m.certs.length}</strong> <span class="muted">→ ${m.used}</span> ${convPill(m.conv)}</td><td><strong>${m.orders.length}</strong><br><span class="muted">${money(m.sum)}</span></td><td>${stars(m.rating)}<br><span class="muted">${m.published.length} отзывов${m.pending?` · ${m.pending} на модерации`:''}</span></td><td>${m.catQ===null?'<span class="muted">нет</span>':`${p.catalog_items.items} поз. · ${m.catQ}%`}</td><td><div class="score-cell"><div class="progress-track"><span style="width:${m.sc}%"></span></div><strong>${m.sc}</strong>${gradePill(m.sg)}</div></td></tr>`).join('')}</tbody></table></div>
 <div class="rating-cards show-m">${rows.slice(0,40).map(({p,m})=>`<article class="mobile-card"><div class="card-top">${partnerName(p)}${gradePill(m.sg)}</div><div class="card-stats"><span><small>${v2?'Коэффициент':'RemScore'}</small><strong>${m.sc}</strong></span><span><small>Сертификаты</small><strong>${m.certs.length} → ${m.used}</strong></span><span><small>Заказы</small><strong>${money(m.sum)}</strong></span><span><small>Рейтинг</small><strong>${stars(m.rating)}</strong></span></div></article>`).join('')}</div>${rows.length>40?`<p class="help-tip" style="padding:0 var(--s6) var(--s4)">Показаны первые 40 партнёров. Полный список — через выгрузку.</p>`:''}`:empty('Нет партнёров с такими условиями')}</section>`;
}

function certsTab(){
 const certs=scopedCerts().filter(inPeriod),used=certs.filter(c=>c.status==='used'),accepted=certs.filter(c=>c.acceptedByStore),expired=certs.filter(c=>c.status==='expired'),orders=scopedOrders().filter(inPeriod),sum=orders.reduce((s,o)=>s+o.amount,0);
 const funnel=[['Выпущено исполнителями',certs.length],['Принято магазином',accepted.length],['Использовано (есть заказ)',used.length],['Заказ завершён',orders.filter(o=>o.status==='completed').length]];
 const byCat=D.categories.map(cat=>{const cs=certs.filter(c=>c.category===cat),u=cs.filter(c=>c.status==='used').length,os=orders.filter(o=>o.category===cat),s=os.reduce((a,o)=>a+o.amount,0);return {cat,n:cs.length,u,conv:cs.length>=3?pct(u,cs.length):null,s,avg:os.length?s/os.length:0};}).filter(x=>x.n).sort((a,b)=>b.n-a.n);
 const pairs=allPairs().filter(g=>g.certs>=4),low=pairs.filter(g=>g.conv<30).sort((a,b)=>a.conv-b.conv).slice(0,6),high=pairs.filter(g=>g.conv>=60).sort((a,b)=>b.conv-a.conv).slice(0,6);
 const suspicious=scopedOrders().filter(o=>o.flagged||o.selfScan);
 const pairRow=g=>`<button class="pair-row" data-action="open-partner" data-id="${g.issuer}"><span><strong>${esc(partner(g.issuer).name)}</strong> ${icon('arrow-right')} <strong>${esc(partner(g.store).name)}</strong><small>${esc(g.category)} · ${g.certs} сертификатов · ${g.used} заказов · ${money(g.sum)}</small></span>${convPill(g.conv)}</button>`;
 return `<div class="kpis">${statTile('Выпущено за период',certs.length,`${accepted.length} приняты магазинами`)}${statTile('Использовано',used.length,`Конверсия ${pctText(pct(used.length,certs.length))}`)}${statTile('Истекли без заказа',scopedCerts().filter(c=>c.status==='expired').length,'За всё время · срок действия 60 дней')}${statTile('Сумма заказов',money(sum),`${orders.length} заказов · средний чек ${money(orders.length?sum/orders.length:0)}`)}</div>
 <div class="dashboard-grid"><section class="panel"><div class="panel-head"><div><h2>Путь сертификата ${rel(1)}</h2><small>Выпуск → приём → заказ → завершение, за ${S.period} дней</small></div></div><div class="panel-pad">${funnel.map(([l,n])=>`<div class="bar-row"><span>${l}</span><div class="progress-track"><span style="width:${pct(n,Math.max(1,certs.length))}%"></span></div><strong>${n}</strong></div>`).join('')}</div></section>
 <section class="panel"><div class="panel-head"><div><h2>Проверка заказов ${rel(1)}</h2><small>Самосканирование и помеченные заказы</small></div></div>${suspicious.length?suspicious.slice(0,5).map(o=>`<button class="queue-row" data-action="open-partner" data-id="${o.store}"><span class="queue-icon">${icon('shield-alert')}</span><span><strong>${esc(partner(o.store).name)}</strong><small>${o.selfScan?'Сертификат отсканирован самим магазином':'Заказ помечен куратором'} · ${money(o.amount)} · ${o.id}</small></span>${icon('chevron-right')}</button>`).join(''):'<p class="panel-pad small">Подозрительных заказов нет.</p>'}</section></div>
 <section class="panel"><div class="panel-head"><div><h2>Конверсия по категориям ${rel(1)}</h2><small>Какие рекомендации клиенты доводят до покупки</small></div></div><div class="table-wrap"><table><thead><tr><th>Категория</th><th>Сертификатов</th><th>Заказов</th><th>Конверсия</th><th class="hide-m">Сумма</th><th class="hide-m">Средний чек</th></tr></thead><tbody>${byCat.map(x=>`<tr><td><strong>${esc(x.cat)}</strong></td><td>${x.n}</td><td>${x.u}</td><td>${convPill(x.conv)}</td><td class="hide-m">${money(x.s)}</td><td class="hide-m">${money(x.avg)}</td></tr>`).join('')}</tbody></table></div></section>
 ${onlyR(2,`<div class="dashboard-grid even"><section class="panel"><div class="panel-head"><div><h2>Связки с низкой отдачей ${rel(2)}</h2><small>Исполнитель → магазин, от 4 сертификатов, конверсия ниже 30%</small></div></div>${low.length?low.map(pairRow).join(''):'<p class="panel-pad small">Таких связок нет.</p>'}</section><section class="panel"><div class="panel-head"><div><h2>Связки, которые работают ${rel(2)}</h2><small>Их стоит предлагать другим партнёрам как пример</small></div></div>${high.length?high.map(pairRow).join(''):'<p class="panel-pad small">Пока нет связок с конверсией выше 60%.</p>'}</section></div>`)}
 <p class="help-tip">Сертификат — это рекомендация исполнителя (агента, специалиста, компании) клиенту обратиться в магазин-партнёр со скидкой. Использование фиксируется заказом в магазине.</p>`;
}

function dealsTab(){
 const orders=scopedOrders().filter(inPeriod),sum=orders.reduce((s,o)=>s+o.amount,0),clients=new Set(orders.map(o=>o.client)).size,bonus=orders.reduce((s,o)=>s+o.bonus,0),discount=orders.reduce((s,o)=>s+o.discount,0);
 const byType=D.types.filter(t=>t.enabled&&t.id!=='store').map(t=>({t,s:orders.filter(o=>partner(o.issuer).type===t.id).reduce((a,o)=>a+o.amount,0),n:orders.filter(o=>partner(o.issuer).type===t.id).length}));
 const top=(key)=>{const g={};orders.forEach(o=>{g[o[key]]=(g[o[key]]||0)+o.amount;});return Object.entries(g).sort((a,b)=>b[1]-a[1]).slice(0,5);};
 const leads=scopedLeads().filter(inPeriod),sources=['catalog','concierge','partner'].map(s=>[s,leads.filter(l=>l.source===s).length]);
 const topList=list=>list.length?list.map(([id,s])=>`<button class="queue-row" data-action="open-partner" data-id="${id}"><span class="avatar">${initials(partner(id).name)}</span><span><strong>${esc(partner(id).name)}</strong><small>${typeOf(partner(id).type).one} · ${orders.filter(o=>o.issuer===id||o.store===id).length} заказов</small></span><strong class="count" style="font-size:var(--text-sm)">${money(s)}</strong></button>`).join(''):'<p class="panel-pad small">Заказов за период нет.</p>';
 return `<div class="kpis">${statTile('Клиентов с заказами',clients,`За ${S.period} дней`)}${statTile('Заказов',orders.length,`Средний чек ${money(orders.length?sum/orders.length:0)}`)}${statTile('Сумма заказов',money(sum),`Скидка клиентам ${money(discount)}`)}${statTile('Бонусы исполнителям',money(bonus),'Начислено по заказам')}</div>
 <div class="dashboard-grid"><section class="panel"><div class="panel-head"><div><h2>Сумма заказов по направлениям ${rel(1)}</h2><small>Кто из исполнителей приводит покупателей</small></div></div><div class="panel-pad">${byType.map(({t,s,n})=>`<div class="bar-row"><span>${esc(t.name)}</span><div class="progress-track"><span style="width:${pct(s,Math.max(1,sum))}%;background:${t.color}"></span></div><strong title="${n} заказов">${fmt(Math.round(s/1000))} тыс.</strong></div>`).join('')}</div></section>
 <section class="panel"><div class="panel-head"><div><h2>Лиды по каталогу ${rel(1)}</h2><small>${leads.length} обращений · ${sources.map(([s,n])=>`${sourceLabels[s].toLowerCase()} ${n}`).join(' · ')}</small></div></div><div class="panel-pad">${Object.keys(leadLabels).map(st=>{const n=leads.filter(l=>l.status===st).length;return `<div class="bar-row"><span>${leadLabels[st]}</span><div class="progress-track"><span style="width:${pct(n,Math.max(1,leads.length))}%;background:${st==='sold'?'var(--green)':st==='refused'?'var(--muted)':'var(--brand)'}"></span></div><strong>${n}</strong></div>`;}).join('')}</div></section></div>
 <div class="dashboard-grid even"><section class="panel"><div class="panel-head"><h2>Магазины по сумме заказов</h2></div>${topList(top('store'))}</section><section class="panel"><div class="panel-head"><h2>Исполнители по сумме заказов</h2></div>${topList(top('issuer'))}</section></div>`;
}

function reviewsTab(){
 const all=scopedReviews(),published=all.filter(r=>r.status==='published'),pending=all.filter(r=>r.status==='pending'),rejected=all.filter(r=>r.status==='rejected');
 const avg=published.length?published.reduce((s,r)=>s+r.rating,0)/published.length:null;
 const weak=roster().map(p=>({p,m:metricsOf(p)})).filter(x=>x.m.published.length>=3&&x.m.rating<3.5).sort((a,b)=>a.m.rating-b.m.rating);
 return `<div class="kpis">${statTile('Опубликовано',published.length,'Видны клиентам на remcard.ru')}${statTile('Средний рейтинг',avg?stars(avg):'—','По опубликованным отзывам')}${statTile('Ожидают модерации',pending.length,'Решение администратора')}${statTile('Отклонено',rejected.length,'Не прошли проверку')}</div>
 <div class="dashboard-grid"><section class="panel"><div class="panel-head"><div><h2>Очередь модерации ${rel(1)}</h2><small>Публикация начисляет бонус клиенту, отклонение — нет</small></div></div>${pending.length?pending.slice(0,8).map(r=>reviewCard(r)).join(''):'<p class="panel-pad small">Все отзывы проверены.</p>'}</section>
 <div><section class="panel"><div class="panel-head"><h2>Распределение оценок</h2></div><div class="panel-pad">${[5,4,3,2,1].map(r=>{const n=published.filter(x=>x.rating===r).length;return `<div class="bar-row"><span>★ ${r}</span><div class="progress-track"><span style="width:${pct(n,Math.max(1,published.length))}%;background:${r>=4?'var(--green)':r===3?'var(--amber)':'var(--brand)'}"></span></div><strong>${n}</strong></div>`;}).join('')}</div></section>
 ${onlyR(2,`<section class="panel" style="margin-top:var(--s6)"><div class="panel-head"><div><h2>Низкий рейтинг ${rel(2)}</h2><small>От 3 отзывов, оценка ниже 3,5 — повод для куратора</small></div></div>${weak.length?weak.slice(0,5).map(({p,m})=>`<button class="queue-row" data-action="open-partner" data-id="${p.id}"><span><strong>${esc(p.name)}</strong><small>${typeOf(p.type).one} · ${m.published.length} отзывов</small></span><span class="pill red">${stars(m.rating)}</span></button>`).join(''):'<p class="panel-pad small">Партнёров с низким рейтингом нет.</p>'}</section>`)}</div></div>`;
}
function reviewCard(r,compact=false){
 const p=partner(r.partner);
 return `<article class="review-card"><div class="review-head"><span class="review-stars ${r.rating>=4?'good':r.rating<=2?'red':''}">${'★'.repeat(r.rating)}<span class="dim">${'★'.repeat(5-r.rating)}</span></span><span class="pill ${r.status==='published'?'good':r.status==='pending'?'warn':'red'}">${{published:'Опубликован',pending:'На модерации',rejected:'Отклонён'}[r.status]}</span></div><p>${esc(r.text)}</p><small>${esc(clientName(r.client))} · ${compact?'':esc(p.name)+' · '}${esc(r.category)} · ${r.days===0?'сегодня':r.days+' дн. назад'}</small>${r.status==='pending'&&canManage()?`<div class="inline-actions" style="margin-top:var(--s3)">${button('Опубликовать','review-publish',`data-id="${r.id}"`,'small primary')}${button('Отклонить','review-reject',`data-id="${r.id}"`,'small')}${compact?'':button('Партнёр','open-partner',`data-id="${p.id}"`,'small ghost')}</div>`:''}</article>`;
}

function catalogTab(){
 const ps=roster().filter(p=>p.type!=='agent'&&!p.archived),withCat=ps.filter(p=>p.catalog_items?.items),items=withCat.reduce((s,p)=>s+p.catalog_items.items,0),photos=withCat.reduce((s,p)=>s+p.catalog_items.photos,0),prices=withCat.reduce((s,p)=>s+p.catalog_items.prices,0);
 const stale=withCat.filter(p=>p.catalog_items.priceDays>60).sort((a,b)=>b.catalog_items.priceDays-a.catalog_items.priceDays),emptyCat=ps.filter(p=>p.status==='active'&&!p.catalog_items?.items);
 const leads=scopedLeads().filter(l=>l.source==='catalog'&&inPeriod(l)),sold=leads.filter(l=>l.status==='sold').length,views=withCat.reduce((s,p)=>s+p.catalog_items.views,0),contacts=withCat.reduce((s,p)=>s+p.catalog_items.contacts,0);
 const byType=D.types.filter(t=>t.enabled&&t.id!=='agent').map(t=>{const a=ps.filter(p=>p.type===t.id),w=a.filter(p=>p.catalog_items?.items),it=w.reduce((s,p)=>s+p.catalog_items.items,0);return {t,a:a.length,w:w.length,it,ph:pct(w.reduce((s,p)=>s+p.catalog_items.photos,0),it),pr:pct(w.reduce((s,p)=>s+p.catalog_items.prices,0),it),fresh:w.filter(p=>p.catalog_items.priceDays<=30).length,views:w.reduce((s,p)=>s+p.catalog_items.views,0),leads:leads.filter(l=>partner(l.partner).type===t.id).length};});
 const v2=R(2);
 return `<div class="kpis">${statTile('Партнёров с каталогом',withCat.length,`из ${ps.length} возможных · ${items} позиций`)}${v2?statTile('Качество представленности',pct(photos,items)+'% / '+pct(prices,items)+'%','С фото / с ценой'):statTile('Просмотры каталога',fmt(views),`За 30 дней · ${contacts} нажатий на контакты`)}${v2?statTile('Цены старше 60 дней',stale.length,'Партнёров с устаревшим каталогом'):statTile('Активных услуг и товаров',items,'Позиции с isActive в PROF')}${statTile('Обращения по каталогу',leads.length,`${sold} дошли до сделки${v2?` · ${fmt(views)} просмотров · ${contacts} контактов`:''}`)}</div>
 <section class="panel"><div class="panel-head"><div><h2>Каталог по направлениям</h2><small>${rel(1)} наполнение и обращения${v2?` · ${rel(2)} качество представленности и актуальность цен`:''}</small></div></div><div class="table-wrap"><table><thead><tr><th>Направление</th><th>С каталогом</th><th>Позиций</th>${v2?'<th>С фото</th><th>С ценой</th><th class="hide-m">Цены ≤ 30 дн.</th>':'<th>Просмотров</th>'}<th>Обращений</th></tr></thead><tbody>${byType.map(x=>`<tr><td><strong>${esc(x.t.name)}</strong></td><td>${x.w} <span class="muted">из ${x.a}</span></td><td>${x.it}</td>${v2?`<td>${pctText(x.ph)}</td><td>${pctText(x.pr)}</td><td class="hide-m">${x.fresh} <span class="muted">из ${x.w}</span></td>`:`<td>${fmt(x.views)}</td>`}<td>${x.leads}</td></tr>`).join('')}</tbody></table></div></section>
 <div class="dashboard-grid even">${onlyR(2,`<section class="panel"><div class="panel-head"><div><h2>Устаревшие цены ${rel(2)}</h2><small>Клиент увидит в каталоге не ту цену, что в магазине</small></div></div>${stale.slice(0,6).map(p=>`<button class="queue-row" data-action="open-partner" data-id="${p.id}"><span><strong>${esc(p.name)}</strong><small>${typeOf(p.type).one} · ${p.catalog_items.items} позиций</small></span><span class="pill ${p.catalog_items.priceDays>90?'red':'warn'}">${p.catalog_items.priceDays} дн.</span></button>`).join('')||'<p class="panel-pad small">Все цены обновлены за последние 60 дней.</p>'}</section>`)}
 <section class="panel"><div class="panel-head"><div><h2>Каталог не заполнен ${rel(1)}</h2><small>Активные партнёры без единой позиции</small></div></div>${emptyCat.slice(0,6).map(p=>`<button class="queue-row" data-action="open-partner" data-id="${p.id}"><span><strong>${esc(p.name)}</strong><small>${typeOf(p.type).one} · ${esc(p.city)} · куратор: ${esc(managerName(p))}</small></span>${icon('chevron-right')}</button>`).join('')||'<p class="panel-pad small">У всех активных партнёров есть позиции.</p>'}</section></div>
 <p class="help-tip">${v2?'Качество представленности = фото (40%) + цены (40%) + свежесть цен (20%: обновлены до 30 дней — полный балл, до 60 — половина). Для свежести цен в PROF нужно отдельное поле даты обновления цены, сейчас есть только updatedAt позиции. ':''}Обращения по каталогу — заявки клиентов с карточек каталога (Lead); просмотры и контакты — PageView и PartnerContactClick по публичным карточкам без идентификации посетителей.</p>`;
}

function matchTab(){
 const pairs=allPairs(),storeConv=(s,cat)=>{const g=pairs.filter(x=>x.store===s.id&&x.category===cat),n=g.reduce((a,x)=>a+x.certs,0),u=g.reduce((a,x)=>a+x.used,0);return n>=3?pct(u,n):null;};
 const suggestions=[];
 roster().filter(p=>p.type!=='store'&&p.cooperation&&p.status==='active').forEach(p=>{
  const existing=D.edges.filter(e=>e.a===p.id).map(e=>e.b);
  p.categories.forEach(cat=>{
   if(D.edges.some(e=>e.a===p.id&&e.category===cat))return;
   const candidates=roster().filter(s=>s.type==='store'&&s.cooperation&&!existing.includes(s.id)&&s.categories.includes(cat)&&s.city===p.city).map(s=>({s,conv:storeConv(s,cat),m:metricsOf(s)})).sort((a,b)=>(b.conv??-1)-(a.conv??-1)||b.m.score-a.m.score);
   if(candidates[0])suggestions.push({p,cat,...candidates[0]});
  });
 });
 const ranked=suggestions.sort((a,b)=>(b.conv??0)-(a.conv??0)).slice(0,10);
 const demand=D.categories.map(cat=>{const l=scopedLeads().filter(x=>x.category===cat).length,st=roster().filter(s=>s.type==='store'&&s.cooperation&&s.categories.includes(cat)).length;return {cat,l,st,ratio:st?+(l/st).toFixed(1):l};}).sort((a,b)=>b.ratio-a.ratio);
 const signals=[];
 pairs.filter(g=>g.certs>=4&&g.conv<30).slice(0,2).forEach(g=>signals.push({icon:'trending-down',text:`Связка ${partner(g.issuer).name} → ${partner(g.store).name} по категории «${g.category}»: конверсия ${g.conv}%`,id:g.issuer}));
 roster().filter(p=>p.catalog_items?.items&&p.catalog_items.priceDays>90).slice(0,2).forEach(p=>signals.push({icon:'tag',text:`${p.name}: цены не обновлялись ${p.catalog_items.priceDays} дней`,id:p.id}));
 scopedOrders().filter(o=>o.selfScan).slice(0,1).forEach(o=>signals.push({icon:'shield-alert',text:`${partner(o.store).name}: сертификат отсканирован самим магазином, заказ ${o.id}`,id:o.store}));
 roster().filter(p=>p.responseRate!==null&&p.responseRate<60).slice(0,2).forEach(p=>signals.push({icon:'clock-3',text:`${p.name}: отвечает за сутки только на ${p.responseRate}% обращений`,id:p.id}));
 return `<div class="dashboard-grid"><section class="panel"><div class="panel-head"><div><h2>Кого предложить друг другу ${rel(2)}</h2><small>Исполнитель без магазина-партнёра в своей категории · магазин того же города с лучшей конверсией по категории</small></div></div>${ranked.length?ranked.map(x=>`<div class="pair-row static"><span><strong>${esc(x.p.name)}</strong> ${icon('arrow-right')} <strong>${esc(x.s.name)}</strong><small>${esc(x.cat)} · ${esc(x.p.city)} · ${x.conv===null?'магазин пока без статистики по категории':`конверсия магазина по категории ${x.conv}%`} · коэффициент ${x.m.score} ${gradePill(x.m.grade)}</small></span>${button('Предложить','suggest-pair',`data-id="${x.p.id}" data-store="${x.s.id}" data-cat="${esc(x.cat)}"`,'small')}</div>`).join(''):'<p class="panel-pad small">Подходящих пар не найдено.</p>'}<p class="help-tip" style="padding:0 var(--s6) var(--s4)">Кнопка в прототипе только фиксирует предложение в журнале. В продукте — уведомление обоим партнёрам с объяснением, почему их рекомендуют.</p></section>
 <div><section class="panel"><div class="panel-head"><div><h2>Сигналы для куратора ${rel(2)}</h2><small>Что изменилось и требует реакции</small></div></div>${signals.map(s=>`<button class="queue-row" data-action="open-partner" data-id="${s.id}"><span class="queue-icon">${icon(s.icon)}</span><span><small style="font-size:var(--text-xs);color:var(--ink)">${esc(s.text)}</small></span>${icon('chevron-right')}</button>`).join('')}</section>
 ${onlyR(3,`<section class="panel" style="margin-top:var(--s6)"><div class="panel-head"><div><h2>Дефицит направлений ${rel(3)}</h2><small>Обращений клиентов на один магазин в поиске</small></div></div><div class="panel-pad">${demand.slice(0,6).map(x=>`<div class="bar-row"><span>${esc(x.cat)}</span><div class="progress-track"><span style="width:${Math.min(100,x.ratio*12)}%;background:${x.ratio>=6?'var(--brand)':'var(--blue)'}"></span></div><strong title="${x.l} обращений · ${x.st} магазинов">${x.ratio}</strong></div>`).join('')}<p class="help-tip">Высокое значение — спрос есть, партнёров мало: сюда стоит привлекать новые магазины и производителей.</p></div></section>`)}</div></div>`;
}

function partnerResults(p){
 const m=metricsOf(p),pairs=pairRows(p).slice(0,6),reviews=D.reviews.filter(r=>r.partner===p.id).sort((a,b)=>(a.status==='pending'?-1:0)-(b.status==='pending'?-1:0)||a.days-b.days).slice(0,3),c=p.catalog_items;
 const v2=R(2);
 return `<section class="detail-section results-block"><div class="results-head"><h3>Результативность</h3>${gradePill(m.sg)}<strong>${m.sc}</strong><span class="small">${v2?'коэффициент':'RemScore'}</span>${m.thin&&v2?'<span class="pill">мало данных</span>':''}</div>
 <div class="progress-track" style="width:100%;margin:var(--s2) 0 var(--s4)"><span style="width:${m.sc}%"></span></div>
 <div class="detail-stats six"><div><strong>${m.certs.length} <span class="muted">→ ${m.used}</span></strong><small>${p.type==='store'?'сертификатов принято → заказов':'сертификатов выпущено → использовано'} · ${pctText(m.conv)}</small></div><div><strong>${money(m.sum)}</strong><small>${m.orders.length} заказов · средний чек ${money(m.avg)}</small></div><div><strong>${m.clients}</strong><small>клиентов с заказами · ${p.repeatClients} повторных</small></div><div><strong>${stars(m.rating)}</strong><small>${m.published.length} отзывов${m.pending?` · <span class="pill warn">${m.pending} на модерации</span>`:''}</small></div><div><strong>${c?c.items?v2?`${c.items} <span class="muted">· ${m.catQ}%</span>`:`${c.items} <span class="muted">· ${c.views}</span>`:'0':'—'}</strong><small>${c?c.items?v2?`позиций · качество · цены ${c.priceDays} дн. назад`:'позиций · просмотров за 30 дней':'каталог не заполнен':'каталог не предусмотрен для агентов'}</small></div>${v2?`<div><strong>${p.responseRate===null?'—':p.responseRate+'%'}</strong><small>${p.responseRate===null?'отклик без согласия не считается':'обращений с ответом за 24 часа'}</small></div>`:`<div><strong>${m.leads.length} <span class="muted">→ ${m.sold}</span></strong><small>обращений → сделок</small></div>`}</div>
 ${v2?`<details class="formula"><summary>Как сложился коэффициент</summary>${m.parts.map(x=>`<div class="formula-row"><span>${x.label}</span><div class="progress-track"><span style="width:${x.value}%"></span></div><strong>${Math.round(x.value)}</strong><small>×${x.weight}</small><p>${esc(x.note)}</p></div>`).join('')}</details>`:`<details class="formula"><summary>Как сложился RemScore (текущая формула PROF)</summary>${m.remParts.map(x=>`<div class="formula-row"><span>${x.label}</span><div class="progress-track"><span style="width:${pct(x.value,x.max)}%"></span></div><strong>${x.value}</strong><small>из ${x.max}</small><p>${esc(x.note)}</p></div>`).join('')}</details>`}
 <details class="formula" ${pairs.length?'open':''}><summary>${p.type==='store'?'От каких исполнителей приходят клиенты':'В какие магазины направляет клиентов'} · ${pairs.length}</summary>${pairs.length?pairs.map(g=>`<button class="pair-row" data-action="${allowed(partner(g.other))?'open-partner':'restricted-partner'}" data-id="${g.other}"><span><strong>${esc(partner(g.other).name)}</strong><small>${esc(g.category)} · ${g.certs} сертификатов · ${g.used} заказов · ${money(g.sum)}</small></span>${v2?convPill(g.certs>=3?pct(g.used,g.certs):null):''}</button>`).join(''):'<p class="small">Сертификатов по партнёрствам ещё нет.</p>'}</details>
 <details class="formula"><summary>Отзывы клиентов · ${D.reviews.filter(r=>r.partner===p.id).length}</summary>${reviews.length?reviews.map(r=>reviewCard(r,true)).join(''):'<p class="small">Отзывов пока нет.</p>'}${D.reviews.filter(r=>r.partner===p.id).length>3?button('Все отзывы','drill','data-view="results" data-filters=\'{"results":"reviews"}\'','small ghost'):''}</details>
 ${c&&c.items?`<details class="formula"><summary>Каталог · ${c.items} позиций</summary><div class="catalog-grid">${v2?`<div><strong>${pct(c.photos,c.items)}%</strong><small>с фото</small></div><div><strong>${pct(c.prices,c.items)}%</strong><small>с ценой</small></div><div><strong>${c.priceDays} дн.</strong><small>с обновления цен</small></div>`:''}<div><strong>${c.views}</strong><small>просмотров за 30 дней</small></div><div><strong>${c.contacts}</strong><small>нажатий на контакты</small></div><div><strong>${m.leads.length} <span class="muted">→ ${m.sold}</span></strong><small>обращений → сделок</small></div></div></details>`:''}
 </section>`;
}

function releasesView(){
 const blocks=[
  {r:1,items:[
   ['Реестр партнёров: поиск, фильтры, статусы, каталог и поиск сотрудничества, групповые действия','Есть в PROF','Партнёры',1],
   ['Карточка партнёра: видимость, модерация, архив и удаление с восстановлением, история','Есть в PROF','Карточка партнёра',1],
   ['Отзывы клиентов: очередь модерации, публикация с бонусом, отклонение','Есть в PROF','Результативность · Отзывы',1],
   ['Уведомления о событиях проекта и их настройка (MAX / Telegram)','Есть в PROF','Уведомления',1],
   ['Обзор: партнёры, клиенты, новые регистрации, «требует внимания»','Есть в PROF','Обзор',1],
   ['Сертификаты по партнёру: выпущено, принято, использовано, заказы и суммы','Есть в PROF','Результативность · Сертификаты',2],
   ['Проверка заказов: самосканирование и помеченные заказы','Есть в PROF','Результативность · Сертификаты',2],
   ['Сделки: клиенты, заказы, суммы, скидки, бонусы по направлениям','Есть в PROF','Результативность · Сделки',2],
   ['Клиентская база: этапы, источник-партнёр, активность с согласием','Есть в PROF','Клиенты',2],
   ['Аналитика: рост и воронка, активность с согласием, качество базы','Есть в PROF','Аналитика',2],
   ['Команда: сотрудники и доступ по ролям StaffRole','Есть в PROF','Команда',3],
   ['Лиды по каталогу и консьерж-заявки с этапами','Есть в PROF','Результативность · Сделки',3],
   ['Наполнение каталога, просмотры, нажатия на контакты','Есть в PROF','Результативность · Каталог',3],
   ['Рейтинг RemScore (A+…C) из UserPartnerScore, без пересчёта формулы','Есть в PROF','Результативность · Рейтинг',3],
   ['Журнал действий администратора (AuditLog) и типы партнёров без редактирования','Есть в PROF','Настройки',3]
  ]},
  {r:2,items:[
   ['Поставщики: очередь заявок на статус поставщика, решение по категориям, показ партнёрам в «Каталог → Поставщики»','Новая логика','Поставщики'],
   ['Кураторы по направлениям: ответственный за партнёра, фильтр и групповое назначение','Новая логика','Партнёры · Команда'],
   ['Задачи команды: следующее действие по партнёру, просроченное на обзоре','Новая логика','Задачи'],
   ['Просмотр кабинета от лица сотрудника и ограничение по направлениям','Новая логика','Шапка · режим роли'],
   ['Глобальный поиск по проекту (⌘ K)','Новая логика','Шапка'],
   ['Коэффициент успешности с прозрачной формулой и весами','Новый расчёт','Результативность · Рейтинг'],
   ['Конверсия по связкам исполнитель → магазин → категория','Новый расчёт','Сертификаты · связки'],
   ['Рекомендации партнёров друг другу по категории, городу и конверсии','Новая логика','Результативность · Рекомендации'],
   ['Качество представленности каталога и актуальность цен','Новый расчёт','Результативность · Каталог'],
   ['Сигналы куратору: падение конверсии, старые цены, долгий отклик','Новая логика','Рекомендации · сигналы'],
   ['Низкий рейтинг как задача куратору','Новая логика','Отзывы · низкий рейтинг'],
   ['Скорость отклика на обращения и доля повторных клиентов','Расширение данных','Карточка партнёра'],
   ['География сообщества: партнёры и клиенты по городам','Новый расчёт','Аналитика · География']
  ]},
  {r:3,items:[
   ['Производители и застройщики как новые типы: включение направлений и собственные метрики','Концепция','Настройки · типы'],
   ['Дефицит направлений: спрос клиентов против числа партнёров','Концепция','Рекомендации · дефицит'],
   ['Сравнение партнёра с медианой направления и города','Концепция','Карточка партнёра'],
   ['Экономика бонусов: начислено, выплачено, доля от суммы заказов','Концепция','Сделки'],
   ['Оценка клиентов после сделки (NPS) и доля сертификатов, использованных за 30 дней','Концепция','Отзывы'],
   ['Прогноз: какие партнёры уйдут в тишину в ближайший месяц','Концепция','Сигналы']
  ]}
 ];
 return `${releaseBar()}<p class="help-tip" style="margin:calc(var(--s4) * -1) 0 var(--s6)">Переключатель (он же в шапке кабинета) скрывает разделы, блоки и действия, которые не входят в выбранный релиз: меню, фильтры, кнопки и карточка партнёра меняются вместе. Так кабинет можно показать Cursor ровно в объёме задания. Релизы накопительные — релиз 2 включает релиз 1.</p><div class="roadmap">${blocks.map(b=>{const r=D.releases.find(x=>x.id===b.r),inScope=R(b.r);return `<section class="panel ${inScope?'in-scope':'out-scope'}"><div class="panel-head"><div><h2>${esc(r.name)}</h2><small>${esc(r.note)}</small></div>${inScope?`<span class="pill ${r.tone||''}">в объёме</span>`:'<span class="pill">скрыто</span>'}</div><div class="panel-pad release-scope"><strong>Задание Cursor</strong><p>${esc(r.scope)}</p>${b.r===1?'<p style="margin-top:var(--s2)">Приоритет 1 — управление тем, что уже идёт: реестр, карточка, модерация профилей и отзывов, уведомления, обзор. Приоритет 2 — показатели по сертификатам, сделкам, клиентам и базовая аналитика. Приоритет 3 — команда, лиды, каталог, текущий рейтинг, журнал.</p>':''}</div><div class="panel-pad roadmap-list">${b.items.map(([t,st,where,pr])=>`<div class="roadmap-item"><strong>${esc(t)}</strong><small>${pr?`<span class="pill warn">Приоритет ${pr}</span>`:''}<span class="pill ${st==='Есть в PROF'?'good':st==='Концепция'?'':'blue'}">${esc(st)}</span> ${esc(where)}</small></div>`).join('')}</div></section>`;}).join('')}</div>
 <section class="panel panel-pad" style="margin-top:var(--s6)"><h2>Принципы, которые держим во всех релизах</h2><div class="settings-row"><div><h3>Счётчик открывает тот же список, что посчитал</h3><p>Каждый показатель ведёт к записям, из которых он сложился</p></div>${icon('check')}</div><div class="settings-row"><div><h3>Мало данных — не ноль</h3><p>Нейтральное значение и пометка вместо ложной оценки</p></div>${icon('check')}</div><div class="settings-row"><div><h3>Активность только с согласия</h3><p>Визиты и отклик не считаются без согласия партнёра</p></div>${icon('check')}</div><div class="settings-row"><div><h3>Формула открыта партнёру</h3><p>Партнёр видит в PROF, из чего сложилась его оценка и что улучшить</p></div>${icon('check')}</div></section>`;
}

document.addEventListener('click',e=>{
 const b=e.target.closest('[data-action]');if(!b||b.disabled)return;
 const a=b.dataset.action,id=b.dataset.id;
 if(a==='results-tab'){S.results=id;render();}
 if(a==='sup-open')openSup(id);
 if(a==='sup-decide')supDecide(id,b.dataset.kind);
 if(a==='sup-doc'){const x=supOf(id);if(x&&canManage()){x.proofOk[b.dataset.doc]=!x.proofOk[b.dataset.doc];openSup(id);}}
 if(a==='set-release'){S.nav=false;setRelease(id);}
 if(a==='review-publish'||a==='review-reject'){const r=D.reviews.find(x=>x.id===id);if(!r||!canManage())return;r.status=a==='review-publish'?'published':'rejected';log(a==='review-publish'?'Опубликовал отзыв клиента':'Отклонил отзыв клиента',partner(r.partner).name);notice(a==='review-publish'?'Отзыв опубликован, бонус клиенту начислен.':'Отзыв отклонён.');if(dialog.open)openPartner(r.partner);else render();}
 if(a==='suggest-pair'){const p=partner(id),s=partner(b.dataset.store);log(`Предложил сотрудничество с «${s.name}» по категории «${b.dataset.cat}»`,p.name);notice(`Предложение зафиксировано: ${p.name} → ${s.name}.`);render();}
});
document.addEventListener('change',e=>{
 const k=e.target.dataset.change;if(['resType','resGrade','resSort','supSt'].includes(k)){S[k]=e.target.value;render();}
 const sc=e.target.dataset.supcat;if(sc){const [sid,cat]=sc.split(':');(S.supDraft[sid]=S.supDraft[sid]||{})[cat]=e.target.value;const x=supOf(sid),box=document.getElementById('sup-summary');if(x&&box)box.innerHTML=supSummary(x);}
});

document.addEventListener('click',e=>{
 const b=e.target.closest('[data-action]');if(!b||b.disabled)return;
 const a=b.dataset.action,id=b.dataset.id;
 if(a==='go')go(b.dataset.view);
 if(a==='drill')go(b.dataset.view,JSON.parse(b.dataset.filters||'{}'));
 if(a==='type-drill')go('partners',{type:id});
 if(a==='cohort-drill')go('partners',{cohort:id});
 if(a==='filter-type'){S.type=id;S.page=1;S.selected.clear();render();}
 if(a==='open-nav'){S.nav=true;render();}
 if(a==='close-nav'){S.nav=false;render();}
 if(a==='theme'){document.documentElement.dataset.theme=document.documentElement.dataset.theme==='dark'?'light':'dark';render();if(dialog.open)icons();}
 if(a==='global-search'){openDialog('Поиск по проекту',`<label class="form-field">Партнёр или клиент<input id="global-query" aria-label="Поиск по проекту" placeholder="Имя, компания, город" autofocus></label><div id="global-results"></div>`);}
 if(a==='reset'){S.q='';S.type='all';S.status='all';S.visibility='all';S.manager='all';S.clientStage='all';S.clientFresh=false;S.cohort='';S.eventType='all';S.unread=false;S.page=1;S.selected.clear();render();}
 if(a==='select-page'){const rows=filteredPartners().slice((S.page-1)*10,S.page*10),all=rows.every(p=>S.selected.has(p.id));rows.forEach(p=>all?S.selected.delete(p.id):S.selected.add(p.id));render();}
 if(a==='clear-selection'){S.selected.clear();render();}
 if(a==='prev-page'){S.page=Math.max(1,S.page-1);render();}
 if(a==='next-page'){S.page++;render();}
 if(a==='open-partner')openPartner(id);
 if(a==='open-client')openClient(id);
 if(a==='public-preview')publicPreview(id);
 if(a==='preview-contact'){const old=dialog.querySelector('.help-tip');if(old)old.textContent='В прототипе отправка отключена. Реальные контакты не используются.';}
 if(a==='restricted-partner'){document.getElementById('announcer').textContent='Карточка вне вашего направления.';}
 if(a==='close-dialog')closeDialog();
 if(a==='cancel-confirm'){const back=id;closeDialog();if(back)openPartner(back);}
 if(a==='confirm'){const cb=S.pending;S.pending=null;closeDialog();cb?.();}
 if(a==='toggle-catalog'||a==='toggle-cooperation'){
  const p=partner(id),key=a==='toggle-catalog'?'catalog':'cooperation';if(!canManage()||p.archived)return;
  const back=dialog.open?id:'',value=!p[key];
  confirmAction(`${value?'Показать':'Скрыть'} ${key==='catalog'?'в каталоге':'в поиске сотрудничества'}?`,`${esc(p.name)}. ${key==='catalog'?'Поиск сотрудничества не изменится.':'Регистрация и публичный каталог не изменятся.'}`,()=>{mutatePartners([id],key,value);if(back)openPartner(back);},back);
 }
 if(a.startsWith('bulk-'))partnerAction([...S.selected],a.slice(5));
 if(a==='set-visible'){const ids=[...S.actionIds],op=b.dataset.op,value=b.dataset.value==='true',back=S.returnId;confirmAction(value?'Показать выбранных партнёров?':'Скрыть выбранных партнёров?',`Количество: ${ids.length}. ${op==='cooperation'?'Каталог и регистрация не изменятся.':'Поиск сотрудничества не изменится.'}`,()=>{mutatePartners(ids,op,value);if(back)openPartner(back);},back);}
 if(a==='archive-partner')partnerAction([id],'archive',id);
 if(a==='remove-partner')partnerAction([id],'remove',id);
 if(a==='restore-partner')partnerAction([id],'restore',id);
 if(a==='approve-partner'){const p=partner(id);if(canManage()&&p&&!p.archived)confirmAction('Согласовать профиль?',`${esc(p.name)}. Видимость в каталоге и поиске не изменится.`,()=>{p.moderation=false;log('Согласовал профиль',p.name);render();openPartner(id);},id);}
 if(a==='assign-bulk')assignmentDialog([...S.selected]);
 if(a==='add-employee')employeeDialog();
 if(a==='edit-employee')employeeDialog(id);
 if(a==='employee-partners')go('partners',{manager:id});
 if(a==='view-role'){const ee=employee(id);if(!ee?.active)return;closeDialog();S.role=id;go('overview');}
 if(a==='owner-role'){S.role='owner';go('overview');}
 if(a==='toggle-employee'){const ee=employee(id);if(!canManage()||ee.role==='owner')return;confirmAction(ee.active?'Закрыть доступ сотруднику?':'Вернуть доступ сотруднику?',`${esc(ee.name)}. Назначенные партнёры сохранятся в истории, их можно перераспределить.`,()=>{ee.active=!ee.active;log(ee.active?'Вернул доступ сотруднику':'Закрыл доступ сотруднику',ee.name);if(S.role===ee.id)S.role='owner';notice('Доступ изменён в прототипе.');render();});}
 if(a==='add-task')taskDialog(id);
 if(a==='analytics-tab'){S.analytics=id;render();}
 if(a==='settings-tab'){S.settings=id;render();}
 if(a==='notification-settings')notificationSettings();
 if(a==='read-all'){visibleEvents().forEach(x=>x.read=true);notice('Уведомления отмечены прочитанными.');render();}
 if(a==='open-event'){const x=D.events.find(x=>x.id===id);x.read=true;render();openPartner(x.partner);}
 if(a==='add-type')addType();
 if(a==='toggle-type'){const t=typeOf(id);if(!canManage())return;if(t.enabled&&D.partners.some(p=>p.type===id&&!p.archived)){openDialog('Тип используется',`<p>У направления ${esc(t.name)} есть партнёры. Нельзя скрыть используемый тип. Сначала распределите записи.</p>`,button('Понятно','close-dialog'));return;}t.enabled=!t.enabled;log(t.enabled?'Включил направление':'Выключил направление',t.name);notice('Список направлений обновлён.');render();}
 if(a==='export')exportDialog();
 if(a==='download-csv'){const url=URL.createObjectURL(new Blob([S.csv],{type:'text/csv;charset=utf-8'}));const link=document.createElement('a');link.href=url;link.download='remcard-demo.csv';link.click();setTimeout(()=>URL.revokeObjectURL(url),10000);const p=dialog.querySelector('.help-tip');if(p)p.textContent='Файл подготовлен. Если браузер блокирует скачивание, скопируйте данные из предпросмотра.';}
});
document.addEventListener('input',e=>{
 if(e.target.dataset.input){S.q=e.target.value;S.page=1;render();}
 if(e.target.id==='global-query'){
  const q=e.target.value.trim().toLowerCase(),ps=roster().filter(p=>[p.name,p.city].join(' ').toLowerCase().includes(q)).slice(0,5),cs=scopedClients().filter(c=>c.name.toLowerCase().includes(q)).slice(0,3);
  document.getElementById('global-results').innerHTML=q?`<h3>Партнёры</h3>${ps.map(partnerName).join('')||'<p class="small">Не найдены</p>'}<h3 style="margin-top:var(--s4)">Клиенты</h3>${cs.map(c=>button(esc(c.name),'open-client',`data-id="${c.id}"`,'ghost')).join('')||'<p class="small">Не найдены</p>'}`:'';
 }
});
document.addEventListener('change',e=>{
 if(e.target.dataset.change==='task-partner'){const p=partner(e.target.value),select=dialog.querySelector('[name="employee"]'),staff=taskEmployees(p);select.innerHTML=selectOptions(staff.map(em=>[em.id,em.name]),p.manager||staff[0]?.id);return;}
 const el=e.target,k=el.dataset.change,id=el.dataset.id;if(!k)return;
 if(['status','visibility','manager','sort','clientStage','eventType'].includes(k)){S[k]=el.value;S.page=1;S.selected.clear();render();}
 if(k==='period'){S.period=Number(el.value);render();}
 if(k==='role'){S.role=el.value;go('overview');}
 if(k==='release'){setRelease(el.value);}
 if(k==='unread'){S.unread=el.checked;render();}
 if(k==='select-partner'){el.checked?S.selected.add(id):S.selected.delete(id);render();}
 if(k==='select-page'){const rows=filteredPartners().slice((S.page-1)*10,S.page*10);rows.forEach(p=>el.checked?S.selected.add(p.id):S.selected.delete(p.id));render();}
 if(k==='task-stage'){const t=D.tasks.find(x=>x.id===id);if(!t||!allowed(partner(t.partner))||(!canManage()&&t.employee!==me().id))return;t.stage=el.value;log('Изменил этап задачи',partner(t.partner).name);notice('Этап задачи обновлён.');render();}
 if(k==='partner-manager'&&canManage()){const p=partner(id),em=employee(el.value);if(em&&em.role==='curator'&&!em.types.includes(p.type))return;p.manager=el.value==='none'?null:el.value;log('Назначил куратора: '+(em?.name||'не назначен'),p.name);render();openPartner(id);}
});
document.addEventListener('submit',e=>{
 const f=e.target;if(!['employee-form','type-form','assign-form','task-form','notifications-form'].includes(f.id))return;e.preventDefault();const fd=new FormData(f);
 if(f.id==='type-form'&&canManage()){
  const name=String(fd.get('name')).trim(),one=String(fd.get('one')).trim();
  if(!name||!one||D.types.some(t=>t.name.toLowerCase()===name.toLowerCase())){document.getElementById('form-error').textContent='Укажите уникальное название и название одного партнёра.';return;}
  D.types.push({id:'type'+(D.types.length+1),name,one,enabled:true,color:'#7c8587'});log('Добавил тип партнёров',name);closeDialog();notice('Новый тип добавлен в фильтры и права сотрудников.');render();
 }
 if(f.id==='employee-form'&&canManage()){
  const types=fd.getAll('types'),role=fd.get('role'),name=String(fd.get('name')).trim();
  if(!name||(role==='curator'&&!types.length)){document.getElementById('form-error').textContent='Введите имя и выберите хотя бы одно направление куратора.';return;}
  const old=employee(f.dataset.id);
  if(old){if(old.role==='owner')return;Object.assign(old,{name,role,types,limit:fd.has('limit')});}
  else D.employees.push({id:'staff'+(D.employees.length+1),name,role,types,limit:fd.has('limit'),active:true});
  log(old?'Изменил доступ сотрудника':'Добавил сотрудника в макет',name);closeDialog();notice('Сотрудник сохранён в прототипе. Приглашения не отправлялись.');render();
 }
 if(f.id==='assign-form'&&canManage()){
  const id=fd.get('employee'),em=employee(id),ps=S.actionIds.map(partner);
  if(em&&(!em.active||(em.role==='curator'&&!ps.every(p=>em.types.includes(p.type)))))return;
  ps.forEach(p=>{p.manager=id==='none'?null:id;log('Назначил куратора: '+(em?.name||'не назначен'),p.name);});
  closeDialog();S.selected.clear();notice('Куратор назначен.');render();
 }
 if(f.id==='task-form'){
  const p=partner(fd.get('partner'));if(!p||!allowed(p))return;
  const em=fd.get('employee'),title=String(fd.get('title')).trim();
  if(!title||!taskEmployees(p).some(e=>e.id===em)){document.getElementById('form-error').textContent='Укажите задачу и сотрудника с доступом к этому партнёру.';return;}
  D.tasks.unshift({id:'T'+(D.tasks.length+1),title,partner:p.id,employee:em,due:fd.get('due'),stage:'new',priority:'normal'});
  log('Создал задачу',p.name);closeDialog();go('tasks');notice('Задача создана в макете.');render();
 }
 if(f.id==='notifications-form'&&canManage()){
  for(const k of ['telegram','max','clients','partners','activity'])D.notifications[k]=fd.has(k);D.notifications.digest=fd.get('digest');log('Изменил настройки уведомлений','MAX / Telegram');closeDialog();notice('Настройки сохранены в прототипе. Реальные сообщения не отправляются.');render();
 }
});
document.addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();document.querySelector('[data-action="global-search"]')?.click();}if(e.key==='Escape'&&S.nav){S.nav=false;render();}});
window.addEventListener('hashchange',()=>{const v=location.hash.slice(1);if(titles[v]&&v!==S.view)go(v);});
let lastWidth=innerWidth;
window.addEventListener('resize',()=>{if(innerWidth!==lastWidth){lastWidth=innerWidth;if(innerWidth>760)S.nav=false;requestAnimationFrame(render);}});
const initial=location.hash.slice(1);if(titles[initial])S.view=initial;
if(matchMedia('(prefers-color-scheme:dark)').matches)document.documentElement.dataset.theme='dark';
render();
})();
