/* RemCard — предпросмотр каталога продавца (прототип).
   Кабинет партнёра открывает сайт с параметрами ?rc_preview=<id продавца>&rc_hidden=<id моделей через точку>
   (или передаёт их объектом window.__RC_PREVIEW__, когда встраивает сайт в свою страницу),
   чтобы показать каталог так, как его видит клиент: без моделей, которые партнёр скрыл.
   Товары поставщика (признак supplierOnly) клиенту видны, только если партнёр добавил их в свой каталог:
   кабинет передаёт их в ?rc_added=<id или id-цена через точку> либо в window.__RC_PREVIEW__.added.
   Скрипт подключается после catalog-data.js и catalog-facets.js (когда список товаров собран) и ничего не хранит. */
(function () {
  /* Кабинет встраивает сайт готовым документом (srcdoc) и передаёт параметры в window.__RC_PREVIEW__:
     у такого документа нет адреса с параметрами. При открытии в новой вкладке параметры приходят в адресе. */
  const boot = window.__RC_PREVIEW__ && typeof window.__RC_PREVIEW__ === 'object' ? window.__RC_PREVIEW__ : null;
  let params;
  try { params = new URLSearchParams(window.location.search); } catch (e) { params = new URLSearchParams(''); }
  const clean = (x) => String(x == null ? '' : x).slice(0, 16);
  const ok = (x) => /^[a-z0-9]+$/i.test(x);
  if (!window.RCCatalogData) return;
  /* Модели поставщика: остаются только добавленные партнёром; цена — та, что партнёр назначил клиентам. */
  const addedRaw = boot ? (Array.isArray(boot.added) ? boot.added : []) : (params.get('rc_added') || '').split('.');
  const added = new Map();
  addedRaw.slice(0, 200).forEach((x) => {
    const m = /^([a-z0-9]{1,16})(?:-(\d{1,7}))?$/i.exec(String(x == null ? '' : x));
    if (m) added.set(m[1], m[2] ? Number(m[2]) : null);
  });
  const all = window.RCCatalogData.products;
  for (let i = all.length - 1; i >= 0; i -= 1) {
    if (!all[i].supplierOnly) continue;
    if (!added.has(all[i].id)) all.splice(i, 1);
    else if (added.get(all[i].id) > 0) { all[i].rrc = all[i].price; all[i].price = added.get(all[i].id); }
  }
  window.RCSupplierAdded = [...added.keys()];
  const seller = clean(boot ? boot.seller : params.get('rc_preview'));
  if (!ok(seller)) return;
  const list = boot ? (Array.isArray(boot.hidden) ? boot.hidden : []) : (params.get('rc_hidden') || '').split('.');
  const hidden = new Set(list.map(clean).filter(ok).slice(0, 500));
  const products = window.RCCatalogData.products;
  for (let i = products.length - 1; i >= 0; i -= 1) {
    if (products[i].seller === seller && hidden.has(products[i].id)) products.splice(i, 1);
  }
  window.RCSellerPreview = { seller, hidden: hidden.size, embedded: !!boot };
  document.documentElement.classList.add('rc-seller-preview');
  /* Сообщаем кабинету, что сайт отрисован: без этого сигнала он покажет подсказку вместо пустой рамки. */
  if (window.parent && window.parent !== window) {
    let told = false;
    document.addEventListener('rc:rendered', () => {
      if (told) return; told = true;
      try { window.parent.postMessage({ source: 'rc-seller-preview', type: 'ready' }, '*'); } catch (e) { /* кабинет недоступен */ }
    });
  }
})();
