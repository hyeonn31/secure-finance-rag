import type { Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";
import { hostnameOf, rejectForeignHosts } from "./hostGuard";

function run(hostHeader: string | undefined, extraHosts: string[] = []) {
  const next = vi.fn();
  const status = vi.fn(() => ({ send: vi.fn() }));
  rejectForeignHosts(extraHosts)({ headers: { host: hostHeader } } as Request, { status } as unknown as Response, next);
  return { allowed: next.mock.calls.length === 1, status: (status.mock.calls[0] as unknown[] | undefined)?.[0] };
}

describe("host guard", () => {
  it("parses host names with and without ports", () => {
    expect(hostnameOf("localhost:3000")).toBe("localhost");
    expect(hostnameOf("[::1]:3000")).toBe("[::1]");
    expect(hostnameOf(undefined)).toBe("");
  });

  it("allows loopback hosts", () => {
    expect(run("localhost:3000").allowed).toBe(true);
    expect(run("LOCALHOST:3000").allowed).toBe(true);
    expect(run("127.0.0.1:3000").allowed).toBe(true);
    expect(run("[::1]:3000").allowed).toBe(true);
  });

  it("blocks DNS-rebound or missing hosts", () => {
    expect(run("attacker.example:3000")).toEqual({ allowed: false, status: 403 });
    expect(run("localhost.attacker.example")).toEqual({ allowed: false, status: 403 });
    expect(run(undefined)).toEqual({ allowed: false, status: 403 });
  });

  it("allows host names configured for an intranet deployment", () => {
    expect(run("rag.internal:3000", ["rag.internal"]).allowed).toBe(true);
    expect(run("other.internal:3000", ["rag.internal"]).allowed).toBe(false);
  });
});
