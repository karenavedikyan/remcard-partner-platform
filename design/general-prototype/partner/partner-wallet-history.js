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
  let view = "purchases",
    selectedAccrual = accruals[0];
  let accrualOperationLabel = "Вознаграждение профклиенту";
  const refreshAccrualDetailLabels = () => {
    const focus = document.querySelector("#detail-view .receipt-focus > p:not(.main-amount)");
    if (focus) focus.textContent = accrualOperationLabel;
    document.querySelectorAll("#detail-view .receipt-meta > div").forEach((row) => {
      const dt = row.querySelector("dt");
      if (dt?.textContent?.trim() === "Тип") {
        const dd = row.querySelector("dd");
        if (dd) dd.textContent = accrualOperationLabel;
      }
    });
  };
  const WALLET_CERT = "RC-X9Z0WZ";
  const embedParams = new URLSearchParams(location.search);
  const isCabinetEmbed = embedParams.get("cabinet_embed") === "1";
  function accrualReceiptCtx(accrual) {
    if (!accrual) return null;
    const linkedPurchase = accrual === accruals[0] && purchases[0] ? purchases[0] : null;
    const relatedPurchasePayable = linkedPurchase ? linkedPurchase.amount : undefined;
    return {
      accrualId: accrual.id,
      date: accrual.date,
      dateDisplay: accrual.display,
      amount: accrual.amount,
      partner: accrual.title,
      certCode: WALLET_CERT,
      clientLabel: "Демо-клиент",
      relatedPurchasePayable,
      purchaseCtx: linkedPurchase ? purchaseRowCtx(0) : null,
      hasCalcSnapshot: false,
    };
  }
  function purchaseRowCtx(index) {
    const row = purchases[index];
    if (!row) return null;
    return {
      index,
      amount: row.amount,
      partner: row.title,
      certCode: WALLET_CERT,
      dateDisplay: row.display,
      id: row.id,
      embedSnapshot: true,
      hasCalcSnapshot: false,
      hasRewardSnapshot: false,
      rewardAmount: null,
    };
  }
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
      const embedPurchaseAttrs =
        isCabinetEmbed && linkedPurchase ? ' data-proto-embed-ignore data-purchase-embed="0"' : "";
      return `<${linkedPurchase?'a href="partner-purchase-detail.html"':'button'} class="operation" ${isPurchase?(linkedPurchase?embedPurchaseAttrs:`data-purchase-row="${index}"`):`data-accrual-row="${index}"`}><div class="operation-main"><strong>${isPurchase?"Покупка по сертификату":accrualOperationLabel}</strong><p class="row-partner">Партнёр: ${r.title}</p><p>RC-X9Z0WZ · ${r.display}</p></div><div class="operation-money"><strong>${money(r.amount)}</strong><small class="status ${isPurchase?"":"neutral"}">${isPurchase?"Подтверждена":"Начислено"}</small></div><span class="arrow" aria-hidden="true">›</span></${linkedPurchase?"a":"button"}>`;
    }).join("") : empty("Ничего не найдено","Измените запрос или выбранный период.",true);
  }
  let viewPurposeCopy = null;
  function refreshViewPurpose(){
    const purpose = $("#view-purpose");
    if (!purpose) return;
    if (viewPurposeCopy && viewPurposeCopy[view]) {
      purpose.textContent = viewPurposeCopy[view];
      return;
    }
    purpose.textContent = view === "purchases"
      ? "Принято у меня · суммы покупок после скидки"
      : "Вознаграждения профклиентам · сохранённые суммы";
  }
  function setView(next){
    view = next;
    $("#history-view").hidden=!["purchases","accruals"].includes(view);
    $("#detail-view").hidden=view!=="detail";
    document.querySelectorAll("[data-view]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.view===view)));
    if(["purchases","accruals"].includes(view)){
      refreshViewPurpose();
      $("#status option[value=active]").textContent=view==="purchases"?"Подтверждена":"Начислено";
      renderHistory();
    }
    if(view==="detail"){
      refreshAccrualDetailLabels();
      $("#detail-date").textContent=selectedAccrual.display.replace(","," 2026,");
      $("#detail-id").textContent=selectedAccrual.id || "Номер этой записи не показан на снимке";
      const receiptBtn = $("#open-receipt");
      if (receiptBtn) receiptBtn.hidden = !selectedAccrual.id;
      $("#open-related").innerHTML=selectedAccrual===accruals[0]?'Открыть связанную покупку <span aria-hidden="true">↗</span>':'Покупки по этому сертификату <span aria-hidden="true">↗</span>';
    }
    $("#main").focus({preventScroll:true});
  }
  const walletState = () => ({
    view,
    selectedAccrualId: selectedAccrual?.id || null,
    search: $("#search").value,
    status: $("#status").value,
    from: $("#from").value,
    to: $("#to").value,
  });
  function navigatePurchaseEmbed(purchaseIndex) {
    window.__protoCabinetEmbedNavigate?.(144, "", {
      walletState: walletState(),
      purchaseCtx: purchaseRowCtx(purchaseIndex),
    });
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
  $("#open-related").addEventListener("click",(e)=>{
    if(selectedAccrual===accruals[0]){
      if(isCabinetEmbed){
        e.preventDefault();
        navigatePurchaseEmbed(0);
        return;
      }
      if(window.__protoCabinetEmbedNavigate?.(144))return;
      location.href="partner-purchase-detail.html";
    }
    else{$("#search").value="RC-X9Z0WZ";$("#status").value="all";$("#from").value="";$("#to").value="";setView("purchases");}
  });
  ["#search","#status","#from","#to"].forEach(s=>$(s).addEventListener("input",renderHistory));
  ["#close-dialog","#dialog-return"].forEach(s=>$(s).addEventListener("click",()=>$("#purchase-dialog").close()));
  if (isCabinetEmbed) {
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
      setView(state.view || view);
      renderHistory();
    };
    window.__protoWalletApplyState = applyWalletState;
    window.__protoWalletSetView = setView;
    window.__protoWalletRefreshPurpose = (copy) => {
      viewPurposeCopy = copy;
      refreshViewPurpose();
    };
    window.__protoWalletSetAccrualLabels = (actor) => {
      if (!actor) return;
      if (actor.accrualOperationLabel) accrualOperationLabel = actor.accrualOperationLabel;
      else if (actor.receiptMode === "earned") accrualOperationLabel = "Заработанное вознаграждение";
      refreshAccrualDetailLabels();
      if (view === "accruals") renderHistory();
    };
    $("#open-receipt")?.addEventListener("click", (e) => {
      e.preventDefault();
      if (!selectedAccrual?.id) return;
      window.__protoCabinetEmbedNavigate?.(145, "", {
        walletState: { ...walletState(), view: "detail" },
        receiptCtx: accrualReceiptCtx(selectedAccrual),
      });
    });
    $("#history-rows")?.addEventListener(
      "click",
      (e) => {
        const link = e.target.closest("[data-purchase-embed]");
        if (!link) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        navigatePurchaseEmbed(Number(link.getAttribute("data-purchase-embed")));
      },
      true,
    );
  }
  setView("purchases");
})();
