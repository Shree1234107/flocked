// TODO: re-enable auth before launch
// Google sign-in, magic link, and OTP flow are temporarily disabled for dev testing.
// To restore: git diff HEAD~1 -- components/LoginForm.tsx

import { useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useRole, Role } from "../lib/role";

type Props = {
  role: Role;
  title: string;
  subtitle: string;
};

export function LoginForm({ role, title, subtitle }: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { setRole } = useRole();
  const [loading, setLoading] = useState(false);

  const handleEnter = async () => {
    setLoading(true);
    await setRole(role);
    router.replace(role === "host" ? "/host" : "/guest");
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 24 }]}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
        <MaterialCommunityIcons name="arrow-left" size={20} color="#2C2C2C" />
      </TouchableOpacity>

      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>

      <TouchableOpacity
        style={[styles.btn, loading && styles.btnDisabled]}
        onPress={handleEnter}
        disabled={loading}
        activeOpacity={0.85}
      >
        <MaterialCommunityIcons
          name={role === "host" ? "school-outline" : "account-outline"}
          size={20}
          color="#FFFFFF"
        />
        <Text style={styles.btnText}>
          {role === "host" ? "Enter as Instructor" : "Enter as Student"}
        </Text>
      </TouchableOpacity>

      <Text style={styles.devNote}>dev mode — auth disabled</Text>
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
  header: { gap: 6 },
  title: { fontSize: 26, fontWeight: "700", color: "#2C2C2C", letterSpacing: -0.3 },
  subtitle: { fontSize: 14, color: "#888888", lineHeight: 20 },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#87A878",
    borderRadius: 14,
    paddingVertical: 17,
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { fontSize: 16, fontWeight: "700", color: "#FFFFFF" },
  devNote: { fontSize: 11, color: "#C0C0C0", textAlign: "center", letterSpacing: 0.3 },
});
