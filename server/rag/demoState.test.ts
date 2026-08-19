import { describe, expect, it } from "vitest";
import { DEMO_CHUNKS, hybridSearch } from "./pipeline";
import { composeSearchCorpus, filterActiveDemoChunks, resolveDemoStates } from "./demoState";

describe("demo document state", () => {
  it("defaults all demo documents to enabled", () => {
    expect(resolveDemoStates()).toEqual({ "demo-risk": true, "demo-credit": true, "demo-control": true, "demo-tax": true });
  });

  it("excludes disabled demo document chunks from retrieval candidates", () => {
    const states = resolveDemoStates([{ demoId: "demo-risk", enabled: 0 }]);
    const active = filterActiveDemoChunks(DEMO_CHUNKS, states);
    expect(active).toHaveLength(6);
    expect(active.some((chunk) => String(chunk.id).startsWith("risk-"))).toBe(false);
  });

  it("does not return a disabled document in hybrid search results", () => {
    const states = resolveDemoStates([{ demoId: "demo-risk", enabled: 0 }]);
    const candidates = hybridSearch("시장리스크 한도 VaR 보고", composeSearchCorpus(DEMO_CHUNKS, [], states), 3);
    expect(candidates).not.toHaveLength(0);
    expect(candidates.every((candidate) => !String(candidate.id).startsWith("risk-"))).toBe(true);
  });
});
