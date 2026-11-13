import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ObserverPartnersListView } from "@/components/clients/observer/ObserverPartnersListView";
import {
  OBSERVER_FIXTURE_APPEALS,
  OBSERVER_FIXTURE_PARTNERS,
} from "@/lib/clients-parity/fixtures/observer-demo-fixtures";

const params = new URLSearchParams(window.location.search);
const theme = params.get("theme") === "light" ? "light" : "dark";
document.documentElement.setAttribute("data-theme", theme);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ObserverPartnersListView
      showHeading
      appeals={OBSERVER_FIXTURE_APPEALS}
      partners={OBSERVER_FIXTURE_PARTNERS}
      dataContract={{ status: "ready" }}
    />
  </StrictMode>,
);
