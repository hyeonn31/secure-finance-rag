import type { RequestHandler } from "express";

const LOOPBACK_NAMES = ["localhost", "127.0.0.1", "[::1]"];

export function hostnameOf(hostHeader: string | undefined): string {
  if (!hostHeader) return "";
  // "[::1]:3000" keeps its brackets; "localhost:3000" drops the port.
  return hostHeader.startsWith("[") ? hostHeader.slice(0, hostHeader.indexOf("]") + 1) : hostHeader.split(":")[0];
}

// There is no login, so even a loopback-only server is reachable from a malicious web
// page through DNS rebinding (attacker.example resolving to 127.0.0.1). The browser keeps
// the attacker's name in the Host header, so only known host names are let through.
// An intranet deployment lists its own name in ALLOWED_HOSTS.
export function rejectForeignHosts(extraHosts: string[] = []): RequestHandler {
  const allowed = new Set([...LOOPBACK_NAMES, ...extraHosts].map((host) => host.toLowerCase()));
  return (req, res, next) => {
    if (allowed.has(hostnameOf(req.headers.host).toLowerCase())) return next();
    res.status(403).send("Forbidden host");
  };
}
