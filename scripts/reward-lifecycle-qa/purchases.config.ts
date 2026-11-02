import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { cert, meta, purchaseResponse } from "./purchase-fixtures";
export default defineConfig({
  root: __dirname,
  define: {
    "process.env.NEXT_PUBLIC_CERTIFICATE_BASE_URL": JSON.stringify("http://127.0.0.1:5198"),
    "process.env.NEXT_PUBLIC_REMCARD_PUBLIC_URL": JSON.stringify("http://127.0.0.1:5198"),
  },
  plugins: [react(), { name: "owned-purchase-reads", configureServer(server) {
    server.middlewares.use((req, res, next) => {
      const url = new URL(req.url!, "http://127.0.0.1:5198");
      const pathname = url.pathname.replace(/^\/api\/remcard(?=\/)/, "");
      if (!pathname.startsWith("/api/")) return next();
      const send = (data: unknown, status = 200) => { res.statusCode = status;
        res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify(data)); };
      if (req.method !== "GET") return send({ error: "Read-only QA: writes forbidden" }, 405);
      if (pathname === `/api/store/certificate/${cert.id}`) return send(cert);
      if (/\/(agent-certificates|specialist-issuer-certificates|business-owner-certificates)\//.test(pathname)) return send({ certificate: meta });
      if (/\/orders\//.test(pathname)) {
        if (pathname.startsWith("/api/store/") && ["AGENT", "SPECIALIST"].includes(url.searchParams.get("qaRole") ?? "AGENT")) {
          return send({ error: "QA owner issuer uses pro detail route" }, 403);
        }
        const index = cert.orders!.findIndex(o => o.id === pathname.split("/").at(-1));
        return index >= 0 ? send(purchaseResponse(index)) : send({ error: "Не найдено" }, 404);
      }
      if (pathname.includes("/order-rewards/")) return send({ actorId: "qa-only-user", reward: null, permissions: null });
      if (pathname.includes("transactions")) return send({ error: "Owned ancillary failure" }, 503);
      if (pathname.endsWith("settlements")) return send({ receivable: [], payable: [], completed: [] });
      return send({ error: `Unimplemented owned GET: ${pathname}` }, 404);
    });
  } }],
  resolve: { alias: [
    { find: "next/link", replacement: path.resolve(__dirname, "../admin-mobile-visual-harness/stubs/next-link.tsx") },
    { find: "next/navigation", replacement: path.resolve(__dirname, "../admin-mobile-visual-harness/stubs/next-navigation.tsx") },
    { find: "@", replacement: path.resolve(__dirname, "../../src") },
  ] },
  server: { host: "127.0.0.1", port: 5198, strictPort: true },
});
