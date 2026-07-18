import { colors } from "../lib/colors";
import { useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Text, TextInput } from "react-native-paper";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "../lib/auth";
import { useRole, Role } from "../lib/role";
import { supabase } from "../lib/supabase";
import { getAuthRedirectUri, signInWithGoogle } from "../lib/auth-helpers";
import * as SecureStore from "../lib/secure-store";

type Props = {
  role: Role;
  title: string;
  subtitle: string;
};

function friendlyAuthError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();
  if (lower.includes("email rate limit") || lower.includes("rate limit"))
    return "Too many sign-in attempts. Please wait a minute and try again.";
  if (lower.includes("invalid email"))
    return "Please enter a valid email address.";
  if (lower.includes("network") || lower.includes("fetch"))
    return "Network error — please check your connection and try again.";
  return msg || "Failed to send sign-in link. Please try again.";
}

export function LoginForm({ role, title, subtitle }: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { setRole } = useRole();
  const { session } = useAuth();

  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Prevent the session useEffect from racing against dev bypass navigation
  const devBypassActive = useRef(false);

  const handleSendMagicLink = async () => {
    const trimmed = email.trim();
    if (!trimmed || !trimmed.includes("@")) {
      setErrorMsg("Please enter a valid email address.");
      return;
    }
    setErrorMsg(null);
    setSending(true);
    try {
      await SecureStore.setItemAsync("flocked.pending_role", role).catch(() => {});
      const { error } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: {
          emailRedirectTo: getAuthRedirectUri(),
          data: { role },
        },
      });
      if (error) throw error;
      setSent(true);
    } catch (err) {
      setErrorMsg(friendlyAuthError(err));
    } finally {
      setSending(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setSending(true);
    try {
      await signInWithGoogle();
      await setRole(role);
    } catch (err) {
      Alert.alert("Sign-in failed", friendlyAuthError(err));
    } finally {
      setSending(false);
    }
  };

  const devEmail = process.env.EXPO_PUBLIC_DEV_BYPASS_EMAIL;
  const devCredentials =
    role === "guest"
      ? { email: "student@flockd.test", password: "devbypass123" }
      : { email: "instructor@flockd.test", password: "devbypass123" };

  const handleDevBypass = async () => {
    devBypassActive.current = true;
    setSending(true);
    try {
      const { error } = await supabase.auth.signInWithPassword(devCredentials);
      if (error) throw error;
      await setRole(role);
      router.replace(role === "host" ? "/host" : "/guest");
    } catch (err) {
      devBypassActive.current = false;
      Alert.alert("Dev bypass failed", friendlyAuthError(err));
      setSending(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.root, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 24 }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.content}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
        <MaterialCommunityIcons name="arrow-left" size={20} color={colors.navy} />
      </TouchableOpacity>

      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>

      {sent ? (
        <View style={styles.sentCard}>
          <View style={styles.sentIconWrap}>
            <MaterialCommunityIcons name="email-check-outline" size={28} color={colors.primary} />
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
          {/* Google sign-in */}
          <TouchableOpacity
            style={[styles.googleBtn, sending && styles.btnDisabled]}
            onPress={handleGoogleSignIn}
            disabled={sending}
            activeOpacity={0.85}
          >
            <MaterialCommunityIcons name="google" size={18} color="#4285F4" />
            <Text style={styles.googleBtnText}>Continue with Google</Text>
          </TouchableOpacity>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or use email</Text>
            <View style={styles.dividerLine} />
          </View>

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
            activeOutlineColor={errorMsg ? "#E05555" : colors.primary}
            textColor={colors.navy}
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
              {sending ? "Sending…" : "Send sign-in link"}
            </Text>
          </TouchableOpacity>

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
                onPress={handleDevBypass}
                disabled={sending}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons name="code-tags" size={13} color={colors.primary} />
                <Text style={styles.devBtnText}>
                  {role === "host" ? "Enter as Instructor (Dev)" : "Enter as Student (Dev)"}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.cream,
    paddingHorizontal: 24,
  },
  content: {
    width: "100%",
    maxWidth: 520,
    alignSelf: "center",
    gap: 24,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F9F9F9",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
  },
  header: { gap: 6 },
  title: { fontSize: 26, fontWeight: "700", color: colors.navy, letterSpacing: -0.3 },
  subtitle: { fontSize: 14, color: "#888888", lineHeight: 20 },

  formSection: { gap: 12 },
  googleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#DDDDDD",
    paddingVertical: 14,
  },
  googleBtnText: { fontSize: 15, fontWeight: "600", color: colors.navy },

  dividerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#EEEEEE" },
  dividerText: { fontSize: 13, color: "#888888" },

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
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
  },
  btnDisabled: { opacity: 0.5 },
  primaryBtnText: { fontSize: 15, fontWeight: "600", color: "#FFFFFF" },

  sentCard: {
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
    backgroundColor: colors.primaryTint,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  sentTitle: { fontSize: 20, fontWeight: "700", color: colors.navy },
  sentBody: { fontSize: 14, color: "#888888", textAlign: "center", lineHeight: 22 },
  sentEmail: { fontWeight: "600", color: colors.navy },
  sentHint: { fontSize: 12, color: "#AAA", textAlign: "center", lineHeight: 18 },
  resendBtn: { paddingVertical: 6, paddingHorizontal: 12, marginTop: 4 },
  resendText: { fontSize: 14, fontWeight: "500", color: colors.primary },

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
  devBtnText: { fontSize: 12, color: colors.primary, fontWeight: "500" },
});
