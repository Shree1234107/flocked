// TODO: re-enable auth before launch
// Magic link / OTP flow is temporarily disabled for dev testing.
// To restore: git diff HEAD~1 -- app/login.tsx

import { useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Text } from "react-native-paper";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useRole } from "../lib/role";

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { setRole } = useRole();
  const [loading, setLoading] = useState(false);

  const enterAs = async (role: "guest" | "host") => {
    setLoading(true);
    await setRole(role);
    router.replace(role === "guest" ? "/guest" : "/host");
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom + 32 }]}>
      {/* Logo */}
      <View style={styles.brand}>
        <MaterialCommunityIcons name="leaf-circle-outline" size={40} color="#87A878" />
        <Text style={styles.wordmark}>Flockd</Text>
        <Text style={styles.tagline}>Live classes from real instructors</Text>
      </View>

      {/* Role buttons */}
      <View style={styles.buttons}>
        <TouchableOpacity
          style={[styles.btn, styles.btnPrimary, loading && styles.btnDisabled]}
          onPress={() => enterAs("guest")}
          disabled={loading}
          activeOpacity={0.85}
        >
          <MaterialCommunityIcons name="account-outline" size={20} color="#FFFFFF" />
          <Text style={styles.btnPrimaryText}>Enter as Student</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btn, styles.btnOutline, loading && styles.btnDisabled]}
          onPress={() => enterAs("host")}
          disabled={loading}
          activeOpacity={0.85}
        >
          <MaterialCommunityIcons name="school-outline" size={20} color="#87A878" />
          <Text style={styles.btnOutlineText}>Enter as Instructor</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.devNote}>dev mode — auth disabled</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 40,
  },
  brand: { alignItems: "center", gap: 10 },
  wordmark: { fontSize: 34, fontWeight: "700", color: "#2C2C2C", letterSpacing: -0.5 },
  tagline: { fontSize: 14, color: "#888888" },
  buttons: { width: "100%", gap: 14 },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 14,
    paddingVertical: 17,
  },
  btnPrimary: { backgroundColor: "#87A878" },
  btnPrimaryText: { fontSize: 16, fontWeight: "700", color: "#FFFFFF" },
  btnOutline: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#87A878",
  },
  btnOutlineText: { fontSize: 16, fontWeight: "700", color: "#87A878" },
  btnDisabled: { opacity: 0.5 },
  devNote: { fontSize: 11, color: "#C0C0C0", letterSpacing: 0.3 },
});
