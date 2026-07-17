import * as SecureStore from "./secure-store";
import { PropsWithChildren, createContext, useContext, useEffect, useMemo, useState } from "react";

import { getUserRole, setUserRole } from "./api";

export type Role = "guest" | "host";

type RoleContextValue = {
  role: Role | null;
  loading: boolean;
  setRole: (nextRole: Role) => Promise<void>;
  clearRole: () => Promise<void>;
};

const ROLE_KEY = "flocked.role";

const RoleContext = createContext<RoleContextValue | null>(null);

export function RoleProvider({ children }: PropsWithChildren) {
  const [role, setRoleState] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadRole = async () => {
      // Always resolve from SecureStore immediately — never block on network
      const cached = await SecureStore.getItemAsync(ROLE_KEY);
      if (isMounted) {
        if (cached) setRoleState(cached as Role);
        setLoading(false);
      }
      // Sync with server in background to fix any stale cache.
      // Use a functional updater so we never overwrite a role that setRole()
      // has already applied (e.g. the auth callback setting "guest" while this
      // request is in-flight with a stale "host" value from the server).
      getUserRole().then((serverRole) => {
        if (!isMounted || !serverRole) return;
        if (serverRole !== cached) {
          setRoleState((current) => {
            if (current !== cached) return current; // setRole() already moved it — don't overwrite
            SecureStore.setItemAsync(ROLE_KEY, serverRole);
            return serverRole as Role;
          });
        }
      }).catch(() => {/* network unavailable — local value is fine */});
    };

    loadRole();
    return () => { isMounted = false; };
  }, []);

  const value = useMemo<RoleContextValue>(
    () => ({
      role,
      loading,
      setRole: async (nextRole) => {
        // Store locally first so login never blocks on the network
        await SecureStore.setItemAsync(ROLE_KEY, nextRole);
        setRoleState(nextRole);
        // Sync to server in background — non-blocking
        setUserRole(nextRole).catch(() => {/* retried on next app load */});
      },
      clearRole: async () => {
        await SecureStore.deleteItemAsync(ROLE_KEY);
        setRoleState(null);
      },
    }),
    [role, loading]
  );

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useRole() {
  const context = useContext(RoleContext);
  if (!context) throw new Error("useRole must be used within RoleProvider");
  return context;
}
