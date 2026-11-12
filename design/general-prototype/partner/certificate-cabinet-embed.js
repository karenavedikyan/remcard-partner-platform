import { h as renderGuestMain, i as hydrateGuestCert } from "./chunk-QXOSRGZH.js";
import { certificatePublicModel } from "./certificate-view.js";

const params = new URLSearchParams(location.search);
const embedded = params.get("cabinet_embed") === "1";

function post(msg) {
  try {
    parent.postMessage(Object.assign({ source: "proto-cabinet-embed" }, msg), "*");
  } catch (_) {}
}

if (!embedded) {
  const mod = document.createElement("script");
  mod.type = "module";
  mod.src = "./certificate-guest.js";
  document.body.appendChild(mod);
} else {
  const root = document.getElementById("certificate-root");
  if (!root) {
    // eslint-disable-next-line no-console
    console.warn("certificate-root missing");
  } else {
    function renderPublic(publicModel) {
      if (!publicModel?.code) {
        root.innerHTML =
          '<main class="cert-error"><p>Выберите сертификат в кабинете и откройте гостевой просмотр снова.</p></main>';
        return;
      }
      root.innerHTML = renderGuestMain(publicModel);
      hydrateGuestCert(root);
    }

    window.addEventListener("message", (ev) => {
      const data = ev.data;
      if (!data || data.source !== "proto-cabinet-host" || data.type !== "context") return;
      if (Number(data.pageN) !== 139) return;
      const model =
        data.payload?.publicModel ||
        (data.payload?.record ? certificatePublicModel(data.payload.record) : null);
      renderPublic(model);
    });

    post({ type: "need-context", pageN: 139 });
  }
}
