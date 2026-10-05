import { trpc } from "@/lib/trpc";

// Local mode: the server always answers with the single local operator.
// `isAuthenticated` is only false while loading or if the server is down.
export function useAuth() {
  const meQuery = trpc.auth.me.useQuery(undefined, { retry: false, refetchOnWindowFocus: false });
  return {
    user: meQuery.data ?? null,
    loading: meQuery.isLoading,
    error: meQuery.error ?? null,
    isAuthenticated: Boolean(meQuery.data),
    refresh: () => meQuery.refetch(),
  };
}
