// Uploaded originals are written to a local directory and never served over HTTP.
// Only the parsed chunks reach the database; the file stays on this machine's disk.

import { promises as fs } from "node:fs";
import path from "node:path";
import { ENV } from "./_core/env";

export function createLocalStorage(rootDir: string) {
  const root = path.resolve(rootDir);

  function resolveKey(key: string): string {
    const target = path.resolve(root, key);
    if (!target.startsWith(root + path.sep)) throw new Error("Invalid storage key");
    return target;
  }

  return {
    async put(key: string, data: Buffer | Uint8Array): Promise<{ key: string }> {
      const target = resolveKey(key);
      await fs.mkdir(path.dirname(target), { recursive: true });
      // "wx" refuses to overwrite: keys carry a random component, so a clash means a bug.
      await fs.writeFile(target, data, { flag: "wx" });
      return { key };
    },
    async remove(key: string): Promise<void> {
      await fs.rm(resolveKey(key), { force: true });
    },
  };
}

export const storage = createLocalStorage(ENV.storageDir);
