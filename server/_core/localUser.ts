// Local mode has a single operator on the machine that runs the server.
// There is no login: the server only listens on loopback (see index.ts),
// so whoever can reach it is already on this PC.

export type AppUser = {
  id: number;
  name: string;
  email: string | null;
  loginMethod: string;
  role: "admin" | "user";
};

export const LOCAL_USER: AppUser = {
  id: 1,
  name: "Local Analyst",
  email: null,
  loginMethod: "local",
  role: "admin",
};
