import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Text, TextInput } from "react-native-paper";
import { Redirect, useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "../lib/auth";
import { useRole } from "../lib/role";
import { supabase } from "../lib/supabase";
import { getAuthRedirectUri } from "../lib/auth-helpers";
import * as SecureStore from "../lib/secure-store";

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
  const { role, loading: roleLoading } = useRole();

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
    console.log("[bypass] session after login:", data.session ? "found" : "null");

    // Set role in user_profiles via backend using the fresh token directly
    const apiBase = process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:3000";
    try {
      const response = await fetch(`${apiBase}/api/auth/role`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${data.session!.access_token}`,
        },
        body: JSON.stringify({ role: targetRole }),
      });
      console.log("[bypass] set role response:", response.status);
      const body = await response.json().catch(() => null);
      console.log("[bypass] set role body:", body);
    } catch (err) {
      console.log("[bypass] set role error:", err);
    }

    // Write role to SecureStore so RoleProvider picks it up locally
    await SecureStore.setItemAsync("flocked.role", targetRole);
    console.log("[bypass] SecureStore role set:", targetRole);

    // Navigate
    const dest = targetRole === "guest" ? "/guest/(tabs)/index" : "/host/(tabs)/index";
    console.log("[bypass] navigating to:", dest);
    router.replace(dest);
  };

  if (!authLoading && !roleLoading && session && role) {
    return <Redirect href="/" />;
  }

  const brandSection = (
    <View style={styles.brandSection}>
      <View style={styles.logoMark}>
        <MaterialCommunityIcons name="leaf-circle-outline" size={32} color="#00B4A6" />
      </View>
      <Text style={styles.wordmark}>Flockd</Text>
      <Text style={styles.tagline}>Live classes from real instructors</Text>
    </View>
  );

  const formSection = sent ? (
    <View style={styles.sentCard}>
      <View style={styles.sentIconWrap}>
        <MaterialCommunityIcons name="email-check-outline" size={28} color="#00B4A6" />
      </View>
      <Text style={styles.sentTitle}>Check your inbox</Text>
      <Text style={styles.sentBody}>
        We sent a sign-in link to{"\n"}
        <Text style={styles.sentEmail}>{email.trim()}</Text>
      </Text>
      <Text style={styles.sentHint}>
        Didn't get it? Check your spam folder, or tap below to try again.
      </Text>
      <TouchableOpacity
        onPress={() => { setSent(false); setEmail(""); setErrorMsg(null); }}
        activeOpacity={0.7}
        style={styles.resendBtn}
      >
        <Text style={styles.resendText}>Use a different email</Text>
      </TouchableOpacity>
    </View>
  ) : (
    <View style={styles.formSection}>
      <TextInput
        label="Email address"
        value={email}
        onChangeText={(t) => { setEmail(t); setErrorMsg(null); }}
        autoCapitalize="none"
        keyboardType="email-address"
        returnKeyType="send"
        onSubmitEditing={handleSendMagicLink}
        mode="outlined"
        style={styles.emailInput}
        outlineColor={errorMsg ? "#E05555" : "#EEEEEE"}
        activeOutlineColor={errorMsg ? "#E05555" : "#00B4A6"}
        textColor="#2C2C2C"
        theme={{ colors: { onSurfaceVariant: "#888888", background: "#FFFFFF" } }}
      />

      {errorMsg && (
        <View style={styles.errorBox}>
          <MaterialCommunityIcons name="alert-circle-outline" size={15} color="#E05555" />
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
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
          <View style={styles.roleIconWrap}>
            <MaterialCommunityIcons name="account-outline" size={20} color="#00B4A6" />
          </View>
          <View style={styles.roleTextWrap}>
            <Text style={styles.roleTitle}>Student</Text>
            <Text style={styles.roleSub}>Browse and join live classes</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={18} color="#C0C0C0" />
        </TouchableOpacity>

        <View style={styles.roleSep} />

        <TouchableOpacity
          style={styles.roleRow}
          onPress={() => router.push("/login/instructor")}
          activeOpacity={0.75}
        >
          <View style={styles.roleIconWrap}>
            <MaterialCommunityIcons name="school-outline" size={20} color="#00B4A6" />
          </View>
          <View style={styles.roleTextWrap}>
            <Text style={styles.roleTitle}>Teacher</Text>
            <Text style={styles.roleSub}>Teach and run live sessions</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={18} color="#C0C0C0" />
        </TouchableOpacity>
      </View>

      {/* Dev bypass — only shown when EXPO_PUBLIC_DEV_BYPASS_EMAIL is set */}
      {devEmail && (
        <View style={styles.devSection}>
          <View style={styles.devDividerRow}>
            <View style={styles.devDividerLine} />
            <Text style={styles.devDividerText}>dev</Text>
            <View style={styles.devDividerLine} />
          </View>
          <TouchableOpacity
            style={[styles.devBtn, sending && styles.btnDisabled]}
            onPress={() => handleDevBypass("guest")}
            disabled={sending}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="code-tags" size={13} color="#00B4A6" />
            <Text style={styles.devBtnText}>Enter as Student (Dev)</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.devBtn, sending && styles.btnDisabled]}
            onPress={() => handleDevBypass("host")}
            disabled={sending}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="code-tags" size={13} color="#00B4A6" />
            <Text style={styles.devBtnText}>Enter as Instructor (Dev)</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  // Desktop web: split panel
  if (Platform.OS === "web") {
    return (
      <View style={styles.webRoot}>
        <View style={styles.webLeft}>
          <MaterialCommunityIcons name="leaf-circle-outline" size={72} color="rgba(255,255,255,0.45)" />
          <Text style={styles.webHeadline}>{"Learn anything.\nLive."}</Text>
          <Text style={styles.webSubtext}>Intimate live classes from real people.</Text>
        </View>
        <ScrollView
          style={styles.webRight}
          contentContainerStyle={styles.webRightContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.webFormCard}>
            {brandSection}
            {formSection}
          </View>
        </ScrollView>
      </View>
    );
  }

  // Mobile
  return (
    <KeyboardAvoidingView
      style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom + 24 }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.container}>
        {brandSection}
        {formSection}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FFFFFF" },
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 32,
  },

  // ── Web split panel ──────────────────────────────────────────────────────────
  webRoot: { flex: 1, flexDirection: "row" },
  webLeft: {
    flex: 1,
    backgroundColor: "#00B4A6",
    alignItems: "flex-start",
    justifyContent: "flex-end",
    paddingHorizontal: 60,
    paddingVertical: 72,
    gap: 20,
  },
  webHeadline: {
    fontSize: 52,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -1.5,
    lineHeight: 60,
  },
  webSubtext: {
    fontSize: 18,
    color: "rgba(255,255,255,0.8)",
    lineHeight: 28,
    fontWeight: "400",
  },
  webRight: { flex: 1, backgroundColor: "#FAFAFA" },
  webRightContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 48,
    minHeight: 600,
  },
  webFormCard: {
    width: "100%",
    maxWidth: 420,
    gap: 28,
  },

  // ── Brand ──────────────────────────────────────────────────────────────────
  brandSection: { alignItems: "center", gap: 8 },
  logoMark: { marginBottom: 2 },
  wordmark: { fontSize: 32, fontWeight: "700", color: "#2C2C2C", letterSpacing: -0.5 },
  tagline: { fontSize: 14, color: "#888888", fontWeight: "400" },

  // ── Form ──────────────────────────────────────────────────────────────────
  formSection: { width: "100%", gap: 14 },
  emailInput: { backgroundColor: "#FFFFFF" },
  errorBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    backgroundColor: "#FFF0F0",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  errorText: { flex: 1, fontSize: 13, color: "#E05555", lineHeight: 18 },
  primaryBtn: {
    backgroundColor: "#00B4A6",
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
  },
  btnDisabled: { opacity: 0.5 },
  primaryBtnText: { fontSize: 15, fontWeight: "600", color: "#FFFFFF" },
  dividerRow: { flexDirection: "row", alignItems: "center", gap: 12, marginVertical: 4 },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#EEEEEE" },
  dividerText: { fontSize: 13, color: "#888888" },
  roleCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EEEEEE",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  roleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  roleIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#E0F7F5",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  roleTextWrap: { flex: 1, gap: 2 },
  roleTitle: { fontSize: 14, fontWeight: "600", color: "#2C2C2C" },
  roleSub: { fontSize: 12, color: "#888888" },
  roleSep: { height: 1, backgroundColor: "#EEEEEE", marginLeft: 64 },

  // ── Sent card ──────────────────────────────────────────────────────────────
  sentCard: {
    width: "100%",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EEEEEE",
    padding: 32,
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  sentIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#E0F7F5",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  sentTitle: { fontSize: 20, fontWeight: "700", color: "#2C2C2C" },
  sentBody: { fontSize: 14, color: "#888888", textAlign: "center", lineHeight: 22 },
  sentEmail: { fontWeight: "600", color: "#2C2C2C" },
  sentHint: { fontSize: 12, color: "#AAA", textAlign: "center", lineHeight: 18 },
  resendBtn: { paddingVertical: 6, paddingHorizontal: 12, marginTop: 4 },
  resendText: { fontSize: 14, fontWeight: "500", color: "#00B4A6" },

  // ── Dev bypass ──────────────────────────────────────────────────────────────
  devSection: { gap: 4 },
  devDividerRow: { flexDirection: "row", alignItems: "center", gap: 10, marginVertical: 2 },
  devDividerLine: { flex: 1, height: 1, backgroundColor: "#F0F0F0" },
  devDividerText: { fontSize: 10, color: "#C0C0C0", letterSpacing: 0.5, textTransform: "uppercase" },
  devBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
  },
  devBtnText: { fontSize: 12, color: "#00B4A6", fontWeight: "500" },
});
