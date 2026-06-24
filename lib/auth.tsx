import { PropsWithChildren, createContext, useContext, useEffect, useMemo, useState } from "react";
import { Session } from "@supabase/supabase-js";
import * as Linking from "expo-linking";

import { createSessionFromUrl, maybeCompleteAuthSession } from "./auth-helpers";
import { supabase } from "./supabase";

type AuthContextValue = {
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Complete OAuth session when returning from browser (required for web)
  useEffect(() => {
    maybeCompleteAuthSession();
  }, []);

  // Initial session fetch and auth state subscription
  useEffect(() => {
    const init = async () => {
      const { data: { session: s } } = await supabase.auth.getSession();
      setSession(s);
      setLoading(false);
    };
    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Handle deep links when the app is already open (warm start).
  // Cold-start deep links are handled by app/auth/callback.tsx via expo-router.
  const url = Linking.useURL();
  useEffect(() => {
    if (!url || (!url.startsWith("flocked://auth/callback") && !url.startsWith("exp+flocked://auth/callback"))) return;
    createSessionFromUrl(url).catch((err) => {
      console.error("Deep link auth error:", err);
    });
  }, [url]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      loading,
      signOut: async () => {
        await supabase.auth.signOut();
      },
    }),
    [session, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
