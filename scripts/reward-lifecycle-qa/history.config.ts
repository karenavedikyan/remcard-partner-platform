import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import {
  orderDetail,
  proOrdersList,
  settlementsForScene,
  storeOrdersList,
} from "./history-fixtures";

function sceneFromUrl(url: URL): string {
  return url.searchParams.get("qaScene") ?? "default";
}

export default defineConfig({
  root: __dirname,
  define: {
    "process.env.NEXT_PUBLIC_CERTIFICATE_BASE_URL": JSON.stringify("http://127.0.0.1:5199"),
    "process.env.NEXT_PUBLIC_REMCARD_PUBLIC_URL": JSON.stringify("http://127.0.0.1:5199"),
  },
  plugins: [
    react(),
    {
      name: "history-focus-qa-reads",
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          const url = new URL(req.url!, "http://127.0.0.1:5199");
          const pathname = url.pathname.replace(/^\/api\/remcard(?=\/)/, "");
          if (!pathname.startsWith("/api/")) {
            return next();
          }
          const send = (data: unknown, status = 200) => {
            res.statusCode = status;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify(data));
          };
          if (req.method !== "GET") {
            return send({ error: "Read-only QA: writes forbidden" }, 405);
          }

          const scene = sceneFromUrl(url);

          if (pathname === "/api/pro/wallet/balance") {
            return send({ role: "MASTER", balance: 0 });
          }
          if (pathname === "/api/pro/wallet/transactions") {
            if (scene === "history-error") {
              return send({ error: "wallet transactions unavailable" }, 500);
            }
            return send({ transactions: [] });
          }
          if (pathname.endsWith("/settlements")) {
            if (scene === "history-error") {
              return send({ error: "settlements unavailable" }, 500);
            }
            try {
              return send(settlementsForScene(scene));
            } catch {
              return send({ error: "settlements unavailable" }, 500);
            }
          }
          if (pathname === "/api/store/orders") {
            const cursor = url.searchParams.get("cursor");
            const result = storeOrdersList(scene, cursor);
            if ("status" in result && result.status) {
              return send({ error: result.error }, result.status);
            }
            return send(result.body);
          }
          if (pathname === "/api/pro/orders") {
            const result = proOrdersList(scene);
            if ("status" in result && result.status) {
              return send({ error: result.error }, result.status);
            }
            return send(result.body);
          }
          if (pathname.startsWith("/api/store/orders/")) {
            const orderId = pathname.split("/").at(-1)!;
            const result = orderDetail(orderId);
            if (result.error) {
              return send({ error: result.error }, result.status ?? 404);
            }
            return send(result.body);
          }
          if (pathname.startsWith("/api/pro/orders/")) {
            const orderId = pathname.split("/").at(-1)!;
            const result = orderDetail(orderId);
            if (result.error) {
              return send({ error: result.error }, result.status ?? 404);
            }
            return send(result.body);
          }
          if (pathname.includes("/order-rewards/")) {
            return send({ actorId: "qa-only-user", reward: null, permissions: null });
          }
          if (/\/payout-actions$/.test(pathname)) {
            return send({ canRecordCash: false, canRecordTransfer: false });
          }
          return send({ error: `Unimplemented owned GET: ${pathname}` }, 404);
        });
      },
    },
  ],
  resolve: {
    alias: [
      {
        find: "next/link",
        replacement: path.resolve(__dirname, "../admin-mobile-visual-harness/stubs/next-link.tsx"),
      },
      {
        find: "next/navigation",
        replacement: path.resolve(__dirname, "../admin-mobile-visual-harness/stubs/next-navigation.tsx"),
      },
      { find: "@", replacement: path.resolve(__dirname, "../../src") },
    ],
  },
  server: { host: "127.0.0.1", port: 5199, strictPort: true },
});
