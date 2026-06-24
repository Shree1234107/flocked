import { makeRedirectUri } from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";

import { supabase } from "./supabase";

export function maybeCompleteAuthSession() {
  WebBrowser.maybeCompleteAuthSession();
}

export function getAuthRedirectUri(): string {
  // On web, redirect directly to the web app's callback route
  if (typeof window !== "undefined" && typeof document !== "undefined") {
    return `${window.location.origin}/auth/callback`;
  }
  // On native, go through the Railway backend HTML bridge which
  // redirects to the exp+flocked:// custom scheme
  const apiBase = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (apiBase) return `${apiBase}/auth/callback`;
  return makeRedirectUri({ scheme: "flocked", path: "auth/callback" });
}

export async function createSessionFromUrl(url: string) {
  if (!url.startsWith("flocked://") && !url.startsWith("exp+flocked://")) return null;

  // expo-auth-session's QueryParams reads fragments (#) only.
  // Our backend forwards tokens as query params (?), so we parse manually.
  // We merge both sources so both flows work.
  const qIdx = url.indexOf("?");
  const hIdx = url.indexOf("#");

  const qString = qIdx !== -1 ? url.slice(qIdx + 1, hIdx > qIdx ? hIdx : undefined) : "";
  const hString = hIdx !== -1 ? url.slice(hIdx + 1) : "";

  const merged = new URLSearchParams(hString);
  new URLSearchParams(qString).forEach((v, k) => merged.set(k, v));

  const errorCode = merged.get("error");
  if (errorCode) throw new Error(merged.get("error_description") ?? errorCode);

  const code = merged.get("code");
  const access_token = merged.get("access_token");
  const refresh_token = merged.get("refresh_token");

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
    return data.session;
  }

  if (!access_token) return null;

  const { data, error } = await supabase.auth.setSession({
    access_token,
    refresh_token: refresh_token ?? "",
  });

  if (error) throw error;
  return data.session;
}

/**
 * Start Google OAuth flow.
 * Opens browser, user signs in, redirects back to app with tokens.
 */
export async function signInWithGoogle(): Promise<void> {
  const redirectTo = getAuthRedirectUri();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  });

  if (error) {
    throw error;
  }

  if (!data?.url) {
    throw new Error("No OAuth URL returned");
  }

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

  if (result.type === "success" && result.url) {
    await createSessionFromUrl(result.url);
  }
}
