import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("./_core/env", () => ({
  ENV: { forgeApiUrl: "https://forge.example.test", forgeApiKey: "test-key" },
}));

import { storageDelete } from "./storage";

describe("storageDelete", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("requests a delete presign and deletes the returned object URL", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ url: "https://s3.example.test/delete" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    await storageDelete("secure-rag/7/1700000000000-abcdef0123456789abcd.pdf");

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("v1/storage/presign/delete?path=secure-rag%2F7%2F1700000000000-abcdef0123456789abcd.pdf");
    expect(fetchMock.mock.calls[1]).toEqual(["https://s3.example.test/delete", { method: "DELETE" }]);
  });
});
