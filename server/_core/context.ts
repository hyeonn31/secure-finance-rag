import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { LOCAL_USER, type AppUser } from "./localUser";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: AppUser | null;
};

export async function createContext(opts: CreateExpressContextOptions): Promise<TrpcContext> {
  return { req: opts.req, res: opts.res, user: LOCAL_USER };
}
