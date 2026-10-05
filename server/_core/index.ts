import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { ENV } from "./env";
import { rejectForeignHosts } from "./hostGuard";
import { serveStatic, setupVite } from "./vite";

function isPortAvailable(host: string, port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, host, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(host: string, startPort: number): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(host, port)) return port;
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  app.use(rejectForeignHosts(ENV.allowedHosts));
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  app.use("/api/trpc", createExpressMiddleware({ router: appRouter, createContext }));
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = await findAvailablePort(ENV.host, ENV.port);
  if (port !== ENV.port) console.log(`Port ${ENV.port} is busy, using port ${port} instead`);

  // Loopback by default: there is no login in local mode, so the server must
  // not be reachable from other machines unless HOST is set on purpose.
  server.listen(port, ENV.host, () => {
    console.log(`Server running on http://${ENV.host === "127.0.0.1" ? "localhost" : ENV.host}:${port}/`);
  });
}

startServer().catch(console.error);
