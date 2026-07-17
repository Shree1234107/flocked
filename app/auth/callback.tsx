import { colors } from "../../lib/colors";
import { useEffect, useRef, useState } from "react";
import { Platform, StyleSheet, TouchableOpacity, View } from "react-native";
import { ActivityIndicator, Text } from "react-native-paper";
import { useLocalSearchParams, useRouter } from "expo-router";

import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth";
import { useRole } from "../../lib/role";
import { getUserRole } from "../../lib/api";
import * as SecureStore from "../../lib/secure-store";

function getWebParams(): Record<string, string> {
  if (Platform.OS !== "web" || typeof window === "undefined") return {};
  const search = window.location.search || window.location.hash.replace(/^#/, "?");
  const p = new URLSearchParams(search);
  const result: Record<string, string> = {};
  p.forEach((v, k) => { result[k] = v; });
  return result;
}

export default function AuthCallbackScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const { setRole } = useRole();
  const routerParams = useLocalSearchParams<{
    code?: string;
    access_token?: string;
    refresh_token?: string;
    error?: string;
    error_description?: string;
  }>();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  // True once the exchange call returns (success or failure handled separately)
  const [exchangeDone, setExchangeDone] = useState(false);
  // Guard so role setup + navigation only fires once even if session re-emits
  const didNavigate = useRef(false);

  // Navigate only after AuthProvider has actually applied the session to React state.
  // Driving this from useEffect + session means we wait for the real state update,
  // avoiding the race where router.replace("/") fires before setSession propagates.
  useEffect(() => {
    console.log("[auth/callback] nav effect:", { exchangeDone, hasSession: !!session, errorMsg });
    if (!exchangeDone || errorMsg || didNavigate.current) return;
    if (session) {
      didNavigate.current = true;
      const resolveAndNavigate = async () => {
        // pending_role is stored by LoginForm before the OTP is sent, so it
        // reflects what the user *actually chose* at login time — use it over
        // user_metadata.role which Supabase ignores for existing accounts.
        const pendingRole = await SecureStore.getItemAsync("flocked.pending_role").catch(() => null);
        await SecureStore.deleteItemAsync("flocked.pending_role").catch(() => {});
        console.log("[auth/callback] pendingRole:", pendingRole, "user_metadata.role:", session.user.user_metadata?.role);

        // Generic email form uses "select" as a sentinel (no role pre-chosen).
        // Route returning users to their existing dashboard; new users to /select-role.
        if (pendingRole === "select") {
          const existingRole = await getUserRole().catch(() => null);
          if (existingRole === "host" || existingRole === "guest") {
            await setRole(existingRole).catch(() => {});
            router.replace("/");
          } else {
            router.replace("/select-role" as never);
          }
          return;
        }

        const chosenRole =
          pendingRole === "host" || pendingRole === "guest"
            ? pendingRole
            : (session.user.user_metadata?.role as string | undefined);

        const persist =
          chosenRole === "host" || chosenRole === "guest"
            ? setRole(chosenRole).catch(() => {})
            : getUserRole()
                .then((backendRole) => {
                  const resolved =
                    backendRole === "host" || backendRole === "guest" ? backendRole : "guest";
                  return setRole(resolved).catch(() => {});
                })
                .catch(() => setRole("guest").catch(() => {}));

        await persist;
        console.log("[auth/callback] role persisted, navigating to /");
        router.replace("/");
      };
      resolveAndNavigate();
      return;
    }
    // Safety net: if session never arrives after 4 s, show an error
    const timer = setTimeout(() => {
      console.error("[auth/callback] timeout — session never arrived after 4s");
      setErrorMsg("Sign-in failed — session could not be established. Please try again.");
    }, 4000);
    return () => clearTimeout(timer);
  }, [exchangeDone, session, errorMsg]);

  useEffect(() => {
    const handle = async () => {
      try {
        const webParams = getWebParams();
        const params = Platform.OS === "web"
          ? { ...routerParams, ...webParams }
          : routerParams;

        if (params.error) {
          setErrorMsg((params.error_description as string | undefined) ?? (params.error as string));
          return;
        }

        const code = params.code as string | undefined;
        const access_token = params.access_token as string | undefined;
        const refresh_token = params.refresh_token as string | undefined;

        console.log("[auth/callback] params:", { code: code ? `${code.slice(0, 12)}…` : undefined, access_token: !!access_token, error: params.error });

        if (code) {
          console.log("[auth/callback] calling exchangeCodeForSession…");
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          console.log("[auth/callback] exchangeCodeForSession result:", { session: !!data?.session, userId: data?.session?.user?.id, error: error?.message });
          if (error) throw error;
        } else if (access_token) {
          console.log("[auth/callback] calling setSession with access_token…");
          const { data, error } = await supabase.auth.setSession({
            access_token,
            refresh_token: refresh_token ?? "",
          });
          console.log("[auth/callback] setSession result:", { session: !!data?.session, error: error?.message });
          if (error) throw error;
        } else {
          console.log("[auth/callback] no code or access_token found in params");
          setErrorMsg("Sign-in link expired or already used. Please request a new one.");
          return;
        }

        console.log("[auth/callback] exchange done, waiting for AuthProvider session…");
        setExchangeDone(true);
      } catch (err) {
        console.error("[auth/callback] caught error:", err);
        setErrorMsg(err instanceof Error ? err.message : "Sign-in failed. Please try again.");
      }
    };

    handle();
  }, []);

  if (errorMsg) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{errorMsg}</Text>
        <TouchableOpacity onPress={() => router.replace("/login")} activeOpacity={0.7}>
          <Text style={styles.backText}>Back to login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.label}>Signing you in…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    paddingHorizontal: 32,
  },
  label: {
    fontSize: 15,
    color: "#888888",
  },
  errorText: {
    fontSize: 15,
    color: "#EF4444",
    textAlign: "center",
    lineHeight: 22,
  },
  backText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.primary,
  },
});
