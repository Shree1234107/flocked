import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
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

// ── Friendly error messages for common Supabase auth errors ──────────────────

function friendlyAuthError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();

  if (lower.includes("email rate limit") || lower.includes("rate limit")) {
    return "Too many sign-in attempts. Please wait a minute and try again.";
  }
  if (lower.includes("email already") || lower.includes("already registered")) {
    return "This email is already registered. Check your inbox for a sign-in link, or try a different email.";
  }
  if (lower.includes("invalid email")) {
    return "Please enter a valid email address.";
  }
  if (lower.includes("network") || lower.includes("fetch")) {
    return "Network error — please check your connection and try again.";
  }
  return msg || "Failed to send sign-in link. Please try again.";
}

// ─────────────────────────────────────────────────────────────────────────────

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

  // Dev bypass — set DEV_BYPASS_EMAIL in your .env to enable
  const devEmail = process.env.EXPO_PUBLIC_DEV_BYPASS_EMAIL;
  const handleDevBypass = async () => {
    if (!devEmail) return;
    setSending(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: devEmail,
        options: { emailRedirectTo: getAuthRedirectUri() },
      });
      if (error) throw error;
      setEmail(devEmail);
      setSent(true);
    } catch (err) {
      Alert.alert("Dev bypass failed", friendlyAuthError(err));
    } finally {
      setSending(false);
    }
  };

  const handleDevBypassHost = async () => {
    if (!devEmail) return;
    setSending(true);
    try {
      await setRole("host");
      if (session) {
        router.replace("/");
        return;
      }
      const { error } = await supabase.auth.signInWithOtp({
        email: devEmail,
        options: { emailRedirectTo: getAuthRedirectUri() },
      });
      if (error) throw error;
      setEmail(devEmail);
      setSent(true);
    } catch (err) {
      Alert.alert("Dev bypass failed", friendlyAuthError(err));
    } finally {
      setSending(false);
    }
  };

  if (!authLoading && !roleLoading && session && role) {
    return <Redirect href="/" />;
  }

  return (
    <KeyboardAvoidingView
      style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom + 24 }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.container}>
        {/* Wordmark */}
        <View style={styles.brandSection}>
          <View style={styles.logoMark}>
            <MaterialCommunityIcons name="leaf-circle-outline" size={32} color="#87A878" />
          </View>
          <Text style={styles.wordmark}>Flocked</Text>
          <Text style={styles.tagline}>Live classes from real instructors</Text>
        </View>

        {sent ? (
          <View style={styles.sentCard}>
            <View style={styles.sentIconWrap}>
              <MaterialCommunityIcons name="email-check-outline" size={28} color="#87A878" />
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
              activeOutlineColor={errorMsg ? "#E05555" : "#87A878"}
              textColor="#2C2C2C"
              theme={{ colors: { onSurfaceVariant: "#888888", background: "#FFFFFF" } }}
            />

            {/* Error message inline */}
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
                  <MaterialCommunityIcons name="account-outline" size={20} color="#87A878" />
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
                  <MaterialCommunityIcons name="school-outline" size={20} color="#87A878" />
                </View>
                <View style={styles.roleTextWrap}>
                  <Text style={styles.roleTitle}>Teacher</Text>
                  <Text style={styles.roleSub}>Teach and run live sessions</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={18} color="#C0C0C0" />
              </TouchableOpacity>
            </View>

            {/* Dev bypass buttons — only rendered when env var is set */}
            {devEmail && (
              <TouchableOpacity
                style={styles.devBtn}
                onPress={handleDevBypass}
                disabled={sending}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons name="code-tags" size={13} color="#AAA" />
                <Text style={styles.devBtnText}>Dev bypass ({devEmail})</Text>
              </TouchableOpacity>
            )}
            {devEmail && (
              <TouchableOpacity
                style={styles.devBtnHost}
                onPress={handleDevBypassHost}
                disabled={sending}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons name="code-tags" size={13} color="#87A878" />
                <Text style={styles.devBtnHostText}>Dev: sign in as instructor</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
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
  brandSection: { alignItems: "center", gap: 8 },
  logoMark: { marginBottom: 2 },
  wordmark: { fontSize: 32, fontWeight: "700", color: "#2C2C2C", letterSpacing: -0.5 },
  tagline: { fontSize: 14, color: "#888888", fontWeight: "400" },

  formSection: { width: "100%", gap: 12 },
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
    backgroundColor: "#87A878",
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
    backgroundColor: "#F0F5EE",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  roleTextWrap: { flex: 1, gap: 2 },
  roleTitle: { fontSize: 14, fontWeight: "600", color: "#2C2C2C" },
  roleSub: { fontSize: 12, color: "#888888" },
  roleSep: { height: 1, backgroundColor: "#EEEEEE", marginLeft: 64 },

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
    backgroundColor: "#F0F5EE",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  sentTitle: { fontSize: 20, fontWeight: "700", color: "#2C2C2C" },
  sentBody: { fontSize: 14, color: "#888888", textAlign: "center", lineHeight: 22 },
  sentEmail: { fontWeight: "600", color: "#2C2C2C" },
  sentHint: { fontSize: 12, color: "#AAA", textAlign: "center", lineHeight: 18 },
  resendBtn: { paddingVertical: 6, paddingHorizontal: 12, marginTop: 4 },
  resendText: { fontSize: 14, fontWeight: "500", color: "#87A878" },

  devBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 10,
    opacity: 0.6,
  },
  devBtnText: { fontSize: 12, color: "#AAA" },
  devBtnHost: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 10,
  },
  devBtnHostText: { fontSize: 12, color: "#87A878" },
});
