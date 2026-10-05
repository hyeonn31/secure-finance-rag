import path from "node:path";

const dataDir = path.resolve(process.env.DATA_DIR ?? "./data");

export const ENV = {
  host: process.env.HOST ?? "127.0.0.1",
  port: parseInt(process.env.PORT ?? "3000", 10),
  // Extra Host header names to accept besides localhost, e.g. "rag.internal" on an intranet server.
  allowedHosts: (process.env.ALLOWED_HOSTS ?? "").split(",").map((host) => host.trim()).filter(Boolean),
  dataDir,
  storageDir: path.resolve(process.env.STORAGE_DIR ?? path.join(dataDir, "uploads")),
  dbPath: process.env.DB_PATH ?? path.join(dataDir, "rag.db"),
  isProduction: process.env.NODE_ENV === "production",
};
