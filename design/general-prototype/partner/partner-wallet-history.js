/* Isolated visual prototype. No network, storage, financial actions or production integration. */
(() => {
  const $ = (s) => document.querySelector(s);
  const money = (n) => n.toLocaleString("ru-RU") + " ₽";
  const purchases = [
    {date:"2026-11-10",display:"10 ноября, 15:48",amount:162000,title:"Артем",id:"purchase-1"},
    {date:"2026-11-09",display:"9 ноября, 16:17",amount:103500,title:"Артем",id:"purchase-2"}
  ];
  const accruals = [
    {date:"2026-11-10",display:"10 ноября, 15:48",amount:0,title:"Артем",id:"cmwaor7m00014o30k7lrqpa0s"},
    {date:"2026-11-10",display:"10 ноября, 10:39",amount:0,title:"Артем",id:null},
    {date:"2026-11-10",display:"10 ноября, 09:23",amount:0,title:"Артем",id:null},
    {date:"2026-11-09",display:"9 ноября, 16:17",amount:0,title:"Артем",id:null}
  ];
  let view = "purchases", selectedAccrual = accruals[0];
  let theme = matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  const setTheme = () => {
    document.documentElement.dataset.theme = theme;
    $("#theme").setAttribute("aria-label",`Включить ${theme === "dark" ? "светлую" : "тёмную"} тему`);
  };
  $("#theme").addEventListener("click",()=>{theme=theme==="dark"?"light":"dark";setTheme();});
  setTheme();
  const empty = (title,text,reset) => `<div class="empty"><strong>${title}</strong><p>${text}</p>${reset?'<button class="text-button" data-reset>Сбросить отбор</button>':""}</div>`;
  function renderHistory(){
    const isPurchase = view === "purchases";
    const all = isPurchase ? purchases : accruals;
    const search = $("#search").value.trim().toLocaleLowerCase("ru-RU");
    const status = $("#status").value, from = $("#from").value, to = $("#to").value;
    const matches = all.filter(r => (`${r.title} RC-X9Z0WZ`).toLocaleLowerCase("ru-RU").includes(search) && status !== "paid" && (!from || r.date >= from) && (!to || r.date <= to));
    $("#result-count").textContent = `${isPurchase?"Покупки":"Начисления"}: ${matches.length} из ${all.length}`;
    $("#clear-search").hidden = !search;
    const count = [status!=="all",!!from,!!to].filter(Boolean).length;
    $("#filter-count").hidden = count===0; $("#filter-count").textContent=String(count);
    $("#history-rows").innerHTML = matches.length ? matches.map(r=>{
      const index=all.indexOf(r);
      const linkedPurchase=isPurchase&&index===0;
      return `<${linkedPurchase?'a href="partner-purchase-detail.html"':'button'} class="operation" ${isPurchase?(linkedPurchase?"":`data-purchase-row="${index}"`):`data-accrual-row="${index}"`}><div class="operation-main"><strong>${isPurchase?"Покупка по сертификату":"Вознаграждение профклиенту"}</strong><p class="row-partner">Партнёр: ${r.title}</p><p>RC-X9Z0WZ · ${r.display}</p></div><div class="operation-money"><strong>${money(r.amount)}</strong><small class="status ${isPurchase?"":"neutral"}">${isPurchase?"Подтверждена":"Начислено"}</small></div><span class="arrow" aria-hidden="true">›</span></${linkedPurchase?"a":"button"}>`;
    }).join("") : empty("Ничего не найдено","Измените запрос или выбранный период.",true);
  }
  function setView(next){
    view = next;
    $("#history-view").hidden=!["purchases","accruals"].includes(view);
    $("#detail-view").hidden=view!=="detail";
    document.querySelectorAll("[data-view]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.view===view)));
    if(["purchases","accruals"].includes(view)){
      $("#view-purpose").textContent=view==="purchases"?"Принято у меня · суммы покупок после скидки":"Вознаграждения профклиентам · сохранённые суммы";
      $("#status option[value=active]").textContent=view==="purchases"?"Подтверждена":"Начислено";
      renderHistory();
    }
    if(view==="detail"){
      $("#detail-date").textContent=selectedAccrual.display.replace(","," 2026,");
      $("#detail-id").textContent=selectedAccrual.id || "Номер этой записи не показан на снимке";
      $("#open-related").innerHTML=selectedAccrual===accruals[0]?'Открыть связанную покупку <span aria-hidden="true">↗</span>':'Покупки по этому сертификату <span aria-hidden="true">↗</span>';
    }
    $("#main").focus({preventScroll:true});
  }
  document.addEventListener("click",e=>{
    const b = e.target.closest("button"); if(!b)return;
    if(b.dataset.view)setView(b.dataset.view);
    if(b.hasAttribute("data-reset")){
      $("#search").value="";$("#status").value="all";$("#from").value="";$("#to").value="";renderHistory();
    }
    if(b.dataset.purchaseRow!==undefined){
      $("#dialog-title").textContent="Покупка";$("#dialog-status").textContent="Подтверждена";$("#dialog-amount").textContent="103 500 ₽";
      $("#dialog-partner").textContent="Артем";$("#dialog-certificate").textContent="RC-X9Z0WZ";$("#dialog-order").textContent="9 ноября 2026, 16:17";
      $("#dialog-note").textContent="К оплате за покупку. До скидки: 115 000 ₽, скидка: 11 500 ₽.";$("#dialog-return").textContent="Вернуться к истории";$("#purchase-dialog").showModal();
    }
    if(b.dataset.accrualRow!==undefined){selectedAccrual=accruals[Number(b.dataset.accrualRow)];setView("detail");}
  });
  $("#filter-button").addEventListener("click",()=>{
    const open=$("#filters").hidden;$("#filters").hidden=!open;$("#filter-button").setAttribute("aria-expanded",String(open));
  });
  $("#clear-filters").addEventListener("click",()=>{$("#status").value="all";$("#from").value="";$("#to").value="";renderHistory();});
  $("#clear-search").addEventListener("click",()=>{$("#search").value="";renderHistory();$("#search").focus();});
  $("#open-related").addEventListener("click",()=>{
    if(selectedAccrual===accruals[0]){
      if(window.__protoCabinetEmbedNavigate?.(144))return;
      location.href="partner-purchase-detail.html";
    }
    else{$("#search").value="RC-X9Z0WZ";$("#status").value="all";$("#from").value="";$("#to").value="";setView("purchases");}
  });
  ["#search","#status","#from","#to"].forEach(s=>$(s).addEventListener("input",renderHistory));
  ["#close-dialog","#dialog-return"].forEach(s=>$(s).addEventListener("click",()=>$("#purchase-dialog").close()));
  setView("purchases");

  const embedParams = new URLSearchParams(location.search);
  if (embedParams.get("cabinet_embed") === "1") {
    const post = (msg) => {
      try {
        parent.postMessage(Object.assign({ source: "proto-cabinet-embed" }, msg), "*");
      } catch (_) {}
    };
    const walletState = () => ({
      view,
      selectedAccrualId: selectedAccrual?.id || null,
      search: $("#search").value,
      status: $("#status").value,
      from: $("#from").value,
      to: $("#to").value,
    });
    const applyWalletState = (state) => {
      if (!state) return;
      if (state.search != null) $("#search").value = state.search;
      if (state.status != null) $("#status").value = state.status;
      if (state.from != null) $("#from").value = state.from;
      if (state.to != null) $("#to").value = state.to;
      if (state.selectedAccrualId) {
        const hit = accruals.find((row) => row.id === state.selectedAccrualId);
        if (hit) selectedAccrual = hit;
      }
      setView(state.view || "purchases");
    };
    window.addEventListener("message", (ev) => {
      const data = ev.data;
      if (!data || data.source !== "proto-cabinet-host" || data.type !== "context") return;
      if (Number(data.pageN) !== 147) return;
      applyWalletState(data.payload?.walletState);
    });
    post({ type: "need-context", pageN: 147 });
    const openRelated = $("#open-related");
    openRelated?.addEventListener(
      "click",
      () => {
        if (selectedAccrual === accruals[0]) {
          if (
            window.__protoCabinetEmbedNavigate?.(144, "", {
              walletState: walletState(),
              purchaseCtx: { from: "wallet-147", accrualId: selectedAccrual.id },
            })
          ) {
            return;
          }
        }
      },
      true,
    );
  }
})();
