import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { ActivityIndicator, Text, TextInput } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { getAuthRedirectUri, signInWithGoogle } from "../lib/auth-helpers";
import { useAuth } from "../lib/auth";
import { useRole, Role } from "../lib/role";
import { supabase } from "../lib/supabase";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = {
  role: Role;
  title: string;
  subtitle: string;
};

export function LoginForm({ role, title, subtitle }: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session, loading } = useAuth();
  const { setRole } = useRole();
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!loading && session) {
      setRole(role)
        .then(() => router.replace("/"))
        .catch(() => router.replace("/"));
    }
  }, [loading, session]);

  const handleSendLink = async () => {
    setError(null);
    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }
    setSending(true);
    const { error: signInError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: getAuthRedirectUri() },
    });
    setSending(false);
    if (signInError) {
      const msg = signInError.message ?? "";
      if (msg.toLowerCase().includes("already registered") || msg.toLowerCase().includes("already exists")) {
        setSent(true);
      } else if (msg.toLowerCase().includes("rate limit") || msg.includes("only request this after")) {
        setError("Please wait a moment before requesting another link.");
      } else if (msg.toLowerCase().includes("invalid") && msg.toLowerCase().includes("email")) {
        setError("Please enter a valid email address.");
      } else {
        setError(msg || "Something went wrong. Please try again.");
      }
      return;
    }
    setSent(true);
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign-in failed.");
    } finally {
      setGoogleLoading(false);
    }
  };

  const devEmail = process.env.EXPO_PUBLIC_DEV_BYPASS_EMAIL;
  const handleDevBypass = async () => {
    if (!devEmail) return;
    setSending(true);
    const { error: signInError } = await supabase.auth.signInWithOtp({
      email: devEmail,
      options: { emailRedirectTo: getAuthRedirectUri() },
    });
    setSending(false);
    if (signInError) {
      setError(signInError.message || "Dev bypass failed.");
      return;
    }
    setEmail(devEmail);
    setSent(true);
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 24 }]}>
      {/* Back */}
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
        <MaterialCommunityIcons name="arrow-left" size={20} color="#2C2C2C" />
      </TouchableOpacity>

      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
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
          <TouchableOpacity
            onPress={() => { setSent(false); setEmail(""); }}
            activeOpacity={0.7}
            style={styles.resendBtn}
          >
            <Text style={styles.resendText}>Use a different email</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.form}>
          <TouchableOpacity
            style={[styles.googleBtn, googleLoading && styles.btnDisabled]}
            onPress={handleGoogleSignIn}
            disabled={googleLoading}
            activeOpacity={0.85}
          >
            {googleLoading ? (
              <ActivityIndicator size="small" color="#2C2C2C" />
            ) : (
              <MaterialCommunityIcons name="google" size={18} color="#2C2C2C" />
            )}
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
            autoCapitalize="none"
            keyboardType="email-address"
            onChangeText={(t) => { setEmail(t); setError(null); }}
            mode="outlined"
            style={styles.input}
            outlineColor="#EEEEEE"
            activeOutlineColor="#87A878"
            textColor="#2C2C2C"
            theme={{ colors: { onSurfaceVariant: "#888888", background: "#FFFFFF" } }}
          />

          {error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : null}

          <TouchableOpacity
            style={[styles.primaryBtn, sending && styles.btnDisabled]}
            onPress={handleSendLink}
            disabled={sending}
            activeOpacity={0.85}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryBtnText}>Send magic link</Text>
            )}
          </TouchableOpacity>

          {devEmail && (
            <TouchableOpacity
              style={styles.devBtn}
              onPress={handleDevBypass}
              disabled={sending}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="code-tags" size={13} color="#87A878" />
              <Text style={styles.devBtnText}>
                {role === "host" ? "Dev: sign in as instructor" : "Dev: sign in as guest"}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 24,
    gap: 28,
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
  header: {
    gap: 6,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: "#2C2C2C",
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
    color: "#888888",
    lineHeight: 20,
  },
  form: {
    gap: 12,
  },
  googleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#F9F9F9",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EEEEEE",
    paddingVertical: 14,
  },
  googleBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#2C2C2C",
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginVertical: 2,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#EEEEEE",
  },
  dividerText: {
    fontSize: 13,
    color: "#888888",
  },
  input: {
    backgroundColor: "#FFFFFF",
  },
  errorText: {
    fontSize: 13,
    color: "#EF4444",
    marginTop: -4,
  },
  primaryBtn: {
    backgroundColor: "#87A878",
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
  },
  btnDisabled: {
    opacity: 0.5,
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
  },
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
    backgroundColor: "#F0F5EE",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  sentTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#2C2C2C",
  },
  sentBody: {
    fontSize: 14,
    color: "#888888",
    textAlign: "center",
    lineHeight: 22,
  },
  sentEmail: {
    fontWeight: "600",
    color: "#2C2C2C",
  },
  resendBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginTop: 4,
  },
  resendText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#87A878",
  },
  devBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 10,
  },
  devBtnText: { fontSize: 12, color: "#87A878" },
});
