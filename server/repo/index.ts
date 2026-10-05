import { ENV } from "../_core/env";
import type { DocumentRepository } from "./documentRepository";
import { openSqliteRepository } from "./sqliteRepository";

let instance: DocumentRepository | undefined;

// Opened on first use so that importing the router (e.g. in tests) does not create a database file.
export function getRepository(): DocumentRepository {
  instance ??= openSqliteRepository(ENV.dbPath);
  return instance;
}
