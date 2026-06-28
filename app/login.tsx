import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Text } from "react-native-paper";
import { Redirect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "../lib/auth";
import { useRole } from "../lib/role";
import { supabase } from "../lib/supabase";
import { getAuthRedirectUri } from "../lib/auth-helpers";
import { fonts } from "../lib/fonts";

function friendlyAuthError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();
  if (lower.includes("email rate limit") || lower.includes("rate limit"))
    return "Too many sign-in attempts. Please wait a minute and try again.";
  if (lower.includes("email already") || lower.includes("already registered"))
    return "This email is already registered. Check your inbox for a sign-in link, or try a different email.";
  if (lower.includes("invalid email"))
    return "Please enter a valid email address.";
  if (lower.includes("network") || lower.includes("fetch"))
    return "Network error — please check your connection and try again.";
  return msg || "Failed to send sign-in link. Please try again.";
}

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { session, loading: authLoading } = useAuth();
  const { role, loading: roleLoading, setRole } = useRole();

  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSendMagicLink = async () => {
    const trimmed = email.trim();
    if (!trimmed || !trimmed.includes("@")) {
      setErrorMsg("Please enter a valid email address.");
      return;
    }
    setErrorMsg(null);
    setSending(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: { emailRedirectTo: getAuthRedirectUri() },
      });
      if (error) throw error;
      setSent(true);
    } catch (err) {
      setErrorMsg(friendlyAuthError(err));
    } finally {
      setSending(false);
    }
  };

  // Dev bypass — only shown when EXPO_PUBLIC_DEV_BYPASS_EMAIL is set
  const devEmail = process.env.EXPO_PUBLIC_DEV_BYPASS_EMAIL;

  const handleDevBypass = async (targetRole: "guest" | "host") => {
    console.log("[bypass] 1. clicked, targetRole:", targetRole);
    const credentials =
      targetRole === "guest"
        ? { email: "student@flockd.test", password: "devbypass123" }
        : { email: "instructor@flockd.test", password: "devbypass123" };

    setSending(true);

    const { data, error } = await supabase.auth.signInWithPassword(credentials);
    if (error) {
      console.log("[bypass] 2. signInWithPassword FAILED:", error.message);
      setSending(false);
      return;
    }
    console.log("[bypass] 2. signInWithPassword OK, user:", data.session?.user?.email);

    await setRole(targetRole);
    console.log("[bypass] role set in state:", targetRole);

    const apiBase = process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:3000";
    fetch(`${apiBase}/api/auth/role`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${data.session!.access_token}`,
      },
      body: JSON.stringify({ role: targetRole }),
    })
      .then((r) => console.log("[bypass] set role response:", r.status))
      .catch((err) => console.log("[bypass] set role error:", err));

    const dest = targetRole === "guest" ? "/guest/(tabs)/index" : "/host/(tabs)/index";
    console.log("[bypass] navigating to:", dest);
    router.replace(dest);
  };

  if (!authLoading && !roleLoading && session && role) {
    return <Redirect href="/" />;
  }

  // ── Inner form ─────────────────────────────────────────────────────────────

  const formContent = sent ? (
    <View style={styles.sentContainer}>
      <Text style={styles.sentTitle}>Check your inbox</Text>
      <Text style={styles.sentBody}>
        We sent a sign-in link to{" "}
        <Text style={styles.sentEmail}>{email.trim()}</Text>
      </Text>
      <Text style={styles.sentHint}>
        Didn't get it? Check your spam folder.
      </Text>
      <TouchableOpacity
        onPress={() => { setSent(false); setEmail(""); setErrorMsg(null); }}
        activeOpacity={0.7}
        style={styles.backLink}
      >
        <Text style={styles.backLinkText}>← Use a different email</Text>
      </TouchableOpacity>
    </View>
  ) : (
    <>
      {/* Email input — native for full style control */}
      {/* @ts-ignore — web input */}
      <input
        type="email"
        placeholder="you@example.com"
        value={email}
        onChange={(e: any) => { setEmail(e.target.value); setErrorMsg(null); }}
        onKeyDown={(e: any) => { if (e.key === "Enter") handleSendMagicLink(); }}
        style={{
          width: "100%",
          boxSizing: "border-box",
          border: errorMsg ? "1px solid #E5484D" : "1px solid #E8E8E8",
          borderRadius: 6,
          padding: "10px 14px",
          fontSize: 14,
          color: "#0F0F0F",
          backgroundColor: "#FFFFFF",
          fontFamily: "inherit",
          outline: "none",
          transition: "border-color 0.15s",
        } as any}
        onFocus={(e: any) => {
          if (!errorMsg) e.target.style.borderColor = "#0F0F0F";
        }}
        onBlur={(e: any) => {
          if (!errorMsg) e.target.style.borderColor = "#E8E8E8";
        }}
      />

      {errorMsg && (
        <Text style={styles.errorText}>{errorMsg}</Text>
      )}

      <TouchableOpacity
        style={[styles.primaryBtn, sending && styles.btnDisabled]}
        onPress={handleSendMagicLink}
        disabled={sending}
        activeOpacity={0.85}
      >
        <Text style={styles.primaryBtnText}>
          {sending ? "Sending…" : "Continue with email"}
        </Text>
      </TouchableOpacity>

      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or sign in as</Text>
        <View style={styles.dividerLine} />
      </View>

      <View style={styles.roleCard}>
        <TouchableOpacity
          style={styles.roleRow}
          onPress={() => router.push("/login/guest")}
          activeOpacity={0.75}
        >
          <View style={styles.roleTextWrap}>
            <Text style={styles.roleTitle}>Student</Text>
            <Text style={styles.roleSub}>Browse and join live classes</Text>
          </View>
          <Text style={styles.roleChevron}>›</Text>
        </TouchableOpacity>

        <View style={styles.roleSep} />

        <TouchableOpacity
          style={styles.roleRow}
          onPress={() => router.push("/login/instructor")}
          activeOpacity={0.75}
        >
          <View style={styles.roleTextWrap}>
            <Text style={styles.roleTitle}>Teacher</Text>
            <Text style={styles.roleSub}>Teach and run live sessions</Text>
          </View>
          <Text style={styles.roleChevron}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Dev bypass — small text links */}
      {devEmail && (
        <View style={styles.devSection}>
          <View style={styles.devDividerRow}>
            <View style={styles.devDividerLine} />
            <Text style={styles.devDividerText}>dev</Text>
            <View style={styles.devDividerLine} />
          </View>
          <View style={styles.devLinks}>
            <TouchableOpacity
              onPress={() => handleDevBypass("guest")}
              disabled={sending}
              activeOpacity={0.7}
            >
              <Text style={[styles.devLink, sending && styles.devLinkDisabled]}>
                Enter as Student
              </Text>
            </TouchableOpacity>
            <Text style={styles.devLinkSep}>·</Text>
            <TouchableOpacity
              onPress={() => handleDevBypass("host")}
              disabled={sending}
              activeOpacity={0.7}
            >
              <Text style={[styles.devLink, sending && styles.devLinkDisabled]}>
                Enter as Instructor
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </>
  );

  // ── Web: centered card on white page ───────────────────────────────────────
  if (Platform.OS === "web") {
    return (
      <View style={styles.webRoot}>
        <ScrollView
          contentContainerStyle={styles.webScroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.webCard}>
            <Text style={styles.wordmark}>Flocked</Text>
            <View style={styles.cardHeader}>
              <Text style={styles.welcomeText}>Welcome back</Text>
              <Text style={styles.welcomeSub}>Sign in to your account</Text>
            </View>
            <View style={styles.formGap}>
              {formContent}
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  // ── Mobile ────────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={[styles.mobileRoot, { paddingTop: insets.top, paddingBottom: insets.bottom + 24 }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.mobileScroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.wordmark}>Flocked</Text>
        <View style={styles.cardHeader}>
          <Text style={styles.welcomeText}>Welcome back</Text>
          <Text style={styles.welcomeSub}>Sign in to your account</Text>
        </View>
        <View style={styles.formGap}>
          {/* Mobile email input with react-native TextInput */}
          {!sent && (
            <>
              <View style={[styles.nativeInputWrap, errorMsg ? styles.nativeInputError : null]}>
                <Text
                  style={styles.nativeInputPlaceholder}
                  onPress={() => {}}
                />
              </View>
            </>
          )}
          {formContent}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  // ── Web ────────────────────────────────────────────────────────────────────
  webRoot: { flex: 1, backgroundColor: "#FFFFFF" },
  webScroll: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    paddingHorizontal: 24,
    minHeight: "100vh" as any,
  },
  webCard: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E8E8E8",
    borderRadius: 8,
    padding: 40,
    gap: 24,
  },

  // ── Mobile ─────────────────────────────────────────────────────────────────
  mobileRoot: { flex: 1, backgroundColor: "#FFFFFF" },
  mobileScroll: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 24,
    paddingVertical: 40,
  },
  nativeInputWrap: {
    borderWidth: 1,
    borderColor: "#E8E8E8",
    borderRadius: 6,
    height: 44,
  },
  nativeInputError: { borderColor: "#E5484D" },
  nativeInputPlaceholder: { flex: 1 },

  // ── Shared ────────────────────────────────────────────────────────────────
  wordmark: {
    fontSize: 18,
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: "#0F0F0F",
    letterSpacing: -0.3,
    textAlign: "center",
  },
  cardHeader: { gap: 4, alignItems: "center" },
  welcomeText: {
    fontSize: 24,
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: "#0F0F0F",
    lineHeight: 28,
    letterSpacing: -0.3,
    textAlign: "center",
  },
  welcomeSub: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: "#6B6B6B",
    textAlign: "center",
  },
  formGap: { gap: 12, width: "100%" },

  errorText: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: "#E5484D",
    marginTop: -4,
  },

  primaryBtn: {
    backgroundColor: "#0F0F0F",
    borderRadius: 6,
    paddingVertical: 11,
    alignItems: "center",
    width: "100%",
  },
  btnDisabled: { opacity: 0.4 },
  primaryBtnText: {
    fontSize: 14,
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  dividerRow: { flexDirection: "row", alignItems: "center", gap: 12, marginVertical: 4 },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#E8E8E8" },
  dividerText: { fontSize: 13, fontFamily: fonts.regular, color: "#B0B0B0" },

  roleCard: {
    borderWidth: 1,
    borderColor: "#E8E8E8",
    borderRadius: 8,
    overflow: "hidden",
    width: "100%",
  },
  roleRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  roleTextWrap: { flex: 1, gap: 2 },
  roleTitle: {
    fontSize: 14,
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: "#0F0F0F",
  },
  roleSub: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#6B6B6B",
  },
  roleChevron: {
    fontSize: 18,
    color: "#B0B0B0",
  },
  roleSep: { height: 1, backgroundColor: "#E8E8E8" },

  // ── Sent state ────────────────────────────────────────────────────────────
  sentContainer: { gap: 8, width: "100%" },
  sentTitle: {
    fontSize: 20,
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: "#0F0F0F",
    textAlign: "center",
  },
  sentBody: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: "#6B6B6B",
    textAlign: "center",
    lineHeight: 22,
  },
  sentEmail: { color: "#0F0F0F", fontFamily: fonts.bold, fontWeight: "700" },
  sentHint: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#B0B0B0",
    textAlign: "center",
  },
  backLink: { alignSelf: "center", paddingVertical: 8 },
  backLinkText: {
    fontSize: 13,
    fontFamily: fonts.medium,
    fontWeight: "500",
    color: "#6B6B6B",
  },

  // ── Dev bypass ────────────────────────────────────────────────────────────
  devSection: { gap: 8, width: "100%", marginTop: 4 },
  devDividerRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  devDividerLine: { flex: 1, height: 1, backgroundColor: "#F0F0F0" },
  devDividerText: {
    fontSize: 10,
    fontFamily: fonts.regular,
    color: "#C0C0C0",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  devLinks: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  devLink: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#B0B0B0",
    textDecorationLine: "underline",
  },
  devLinkDisabled: { opacity: 0.4 },
  devLinkSep: { fontSize: 12, color: "#D0D0D0" },
});
