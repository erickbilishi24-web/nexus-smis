import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  // Proxy the public PrinceJS build into the app's origin so the arcade touch
  // controls can send keyboard events into the game iframe. Cross-origin
  // postMessage calls alone are ignored by PrinceJS because it has no listener.
  app.get("/arcade-prince/*", async (req, res) => {
    try {
      const requestedPath = String((req.params as Record<string, string>)["0"] || "");
      const upstreamUrl = `https://princejs.com/${requestedPath}`;
      const upstream = await fetch(upstreamUrl);
      if (!upstream.ok) {
        res.status(upstream.status).send("Arcade asset unavailable");
        return;
      }
      const contentType = upstream.headers.get("content-type") || "application/octet-stream";
      res.setHeader("Content-Type", contentType);
      res.setHeader("Cache-Control", "public, max-age=3600");
      if (contentType.includes("text/html")) {
        let html = await upstream.text();
        const bridge = `<script>
          (() => {
            const codes = { ArrowUp: 38, ArrowDown: 40, ArrowLeft: 37, ArrowRight: 39, Shift: 16, Enter: 13, Space: 32, Escape: 27 };
            window.addEventListener('message', event => {
              if (!event.data || event.data.type !== 'nexus-arcade-key') return;
              const key = String(event.data.key || '');
              const code = codes[key] || 0;
              if (!code) return;
              const type = event.data.action === 'up' ? 'keyup' : 'keydown';
              const init = { key, code: key, keyCode: code, which: code, bubbles: true, cancelable: true };
              document.dispatchEvent(new KeyboardEvent(type, init));
              window.dispatchEvent(new KeyboardEvent(type, init));
              const canvas = document.querySelector('canvas');
              if (canvas) canvas.dispatchEvent(new KeyboardEvent(type, init));
            });
          })();
        </script>`;
        html = html.replace("</head>", `${bridge}</head>`);
        res.send(html);
      } else {
        res.send(Buffer.from(await upstream.arrayBuffer()));
      }
    } catch {
      res.status(502).send("Arcade relay unavailable");
    }
  });
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  // Bind externally so managed container health checks and reverse proxies can reach the app.
  const host = process.env.HOST || "0.0.0.0";
  server.listen(port, host, () => {
    console.log(`Server running on http://${host === "0.0.0.0" ? "<host-lan-ip>" : host}:${port}/`);
  });
}

startServer().catch(console.error);
