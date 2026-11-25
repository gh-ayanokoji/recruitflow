import express from "express";
import { createServer as createHttpServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createApiRouter } from "./server/app.mjs";

const root = path.dirname(fileURLToPath(import.meta.url));
const isDev = process.argv.includes("--dev");
const port = Number(process.env.PORT) || 5178;

async function main() {
  const app = express();
  const httpServer = createHttpServer(app);
  app.disable("x-powered-by");
  app.use(express.json({ limit: "8mb" }));
  app.use("/api", createApiRouter());

  if (isDev) {
    const { createServer } = await import("vite");
    const vite = await createServer({
      root,
      appType: "custom",
      server: { middlewareMode: true, host: "127.0.0.1", hmr: { server: httpServer } }
    });
    app.use(vite.middlewares);
    app.use("*", async (req, res, next) => {
      if (req.originalUrl.startsWith("/api")) return next();
      try {
        const template = await vite.transformIndexHtml(
          req.originalUrl,
          await (await import("node:fs/promises")).readFile(path.join(root, "index.html"), "utf8")
        );
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } catch (error) {
        vite.ssrFixStacktrace(error);
        next(error);
      }
    });
  } else {
    const dist = path.join(root, "dist");
    app.use(express.static(dist, { index: false }));
    app.get("*", (req, res) => {
      res.sendFile(path.join(dist, "index.html"));
    });
  }

  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    console.error(error);
    res.status(500).json({ error: error.message || "Unexpected server error" });
  });

  httpServer.listen(port, "127.0.0.1", () => {
    console.log(`RecruitFlow listening on http://127.0.0.1:${port} (${isDev ? "dev" : "production"})`);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
