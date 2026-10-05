import { defineConfig } from "drizzle-kit";

// The app creates its tables on startup (server/repo/sqliteRepository.ts).
// This config is only for inspecting the local database with `pnpm db:studio`.
export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./drizzle/migrations",
  dialect: "sqlite",
  dbCredentials: { url: process.env.DB_PATH ?? "./data/rag.db" },
});
