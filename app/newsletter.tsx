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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { signUpForNewsletter } from "../lib/api";

export default function NewsletterScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async () => {
    const trimmed = email.trim();
    if (!trimmed || !trimmed.includes("@")) {
      Alert.alert("Invalid email", "Please enter a valid email address.");
      return;
    }

    setLoading(true);
    try {
      await signUpForNewsletter({ email: trimmed, name: name.trim() || undefined });
      setDone(true);
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "Failed to sign up. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom + 24 }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* Back button */}
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
        <MaterialCommunityIcons name="arrow-left" size={22} color="#333" />
      </TouchableOpacity>

      <View style={styles.inner}>
        {done ? (
          // Success state
          <View style={styles.successBox}>
            <View style={styles.successIcon}>
              <MaterialCommunityIcons name="check-circle-outline" size={48} color="#00B4A6" />
            </View>
            <Text style={styles.successTitle}>You're on the list! 🌿</Text>
            <Text style={styles.successBody}>
              We'll keep you posted on new instructors, feature launches, and what's happening
              in Colorado.
            </Text>
            <TouchableOpacity
              style={styles.doneBtn}
              onPress={() => router.back()}
              activeOpacity={0.85}
            >
              <Text style={styles.doneBtnText}>Back to Flocked</Text>
            </TouchableOpacity>
          </View>
        ) : (
          // Form
          <>
            <View style={styles.brandRow}>
              <MaterialCommunityIcons name="leaf-circle-outline" size={28} color="#00B4A6" />
              <Text style={styles.wordmark}>Flocked</Text>
            </View>

            <Text style={styles.headline}>Stay in the loop</Text>
            <Text style={styles.sub}>
              New instructors, features, and local events — delivered to your inbox.
              No spam, ever.
            </Text>

            <View style={styles.form}>
              <TextInput
                label="Your name (optional)"
                value={name}
                onChangeText={setName}
                mode="outlined"
                style={styles.input}
                outlineColor="#E0E0E0"
                activeOutlineColor="#00B4A6"
                autoCapitalize="words"
                left={<TextInput.Icon icon="account-outline" color="#AAA" />}
              />
              <TextInput
                label="Email address"
                value={email}
                onChangeText={setEmail}
                mode="outlined"
                style={styles.input}
                outlineColor="#E0E0E0"
                activeOutlineColor="#00B4A6"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                left={<TextInput.Icon icon="email-outline" color="#AAA" />}
              />

              <TouchableOpacity
                style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
                onPress={handleSubmit}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <Text style={styles.submitBtnText}>Signing up…</Text>
                ) : (
                  <Text style={styles.submitBtnText}>Get updates →</Text>
                )}
              </TouchableOpacity>
            </View>

            <Text style={styles.disclaimer}>
              By signing up you agree to receive occasional emails from Flocked.
              Unsubscribe any time.
            </Text>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FAFAF8" },
  backBtn: {
    margin: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F0F0F0",
    alignItems: "center",
    justifyContent: "center",
  },
  inner: { flex: 1, paddingHorizontal: 24, paddingTop: 8 },

  brandRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 28 },
  wordmark: { fontSize: 20, fontWeight: "800", color: "#1A1A1A", letterSpacing: -0.5 },

  headline: { fontSize: 28, fontWeight: "800", color: "#1A1A1A", marginBottom: 10, lineHeight: 34 },
  sub: { fontSize: 15, color: "#666", lineHeight: 22, marginBottom: 32 },

  form: { gap: 14 },
  input: { backgroundColor: "#fff" },

  submitBtn: {
    backgroundColor: "#00B4A6",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 4,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },

  disclaimer: {
    fontSize: 12,
    color: "#AAA",
    textAlign: "center",
    marginTop: 24,
    lineHeight: 17,
  },

  // Success
  successBox: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16, paddingHorizontal: 8 },
  successIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#E0F7F5",
    alignItems: "center",
    justifyContent: "center",
  },
  successTitle: { fontSize: 24, fontWeight: "800", color: "#1A1A1A", textAlign: "center" },
  successBody: {
    fontSize: 15,
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 300,
  },
  doneBtn: {
    backgroundColor: "#00B4A6",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 32,
    marginTop: 8,
  },
  doneBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
