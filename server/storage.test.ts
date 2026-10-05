import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createLocalStorage } from "./storage";

describe("local storage", () => {
  let root: string;

  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), "rag-storage-"));
  });

  afterEach(async () => {
    await fs.rm(root, { recursive: true, force: true });
  });

  it("writes under the root and removes the file again", async () => {
    const storage = createLocalStorage(root);
    await storage.put("secure-rag/1/a.pdf", Buffer.from("hello"));
    expect(await fs.readFile(path.join(root, "secure-rag/1/a.pdf"), "utf8")).toBe("hello");

    await storage.remove("secure-rag/1/a.pdf");
    await expect(fs.access(path.join(root, "secure-rag/1/a.pdf"))).rejects.toThrow();
  });

  it("rejects keys that escape the storage root", async () => {
    const storage = createLocalStorage(root);
    await expect(storage.put("../escape.pdf", Buffer.from("x"))).rejects.toThrow("Invalid storage key");
    await expect(storage.put("/etc/passwd", Buffer.from("x"))).rejects.toThrow("Invalid storage key");
    await expect(storage.remove("a/../../escape.pdf")).rejects.toThrow("Invalid storage key");
  });

  it("refuses to overwrite an existing file", async () => {
    const storage = createLocalStorage(root);
    await storage.put("k.pdf", Buffer.from("first"));
    await expect(storage.put("k.pdf", Buffer.from("second"))).rejects.toThrow();
    expect(await fs.readFile(path.join(root, "k.pdf"), "utf8")).toBe("first");
  });
});
