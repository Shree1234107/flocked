import { colors } from "../lib/colors";
import { useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { ActivityIndicator, Text } from "react-native-paper";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useRole } from "../lib/role";

export default function SelectRoleScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { setRole } = useRole();
  const [loading, setLoading] = useState(false);

  const handleSelect = async (role: "guest" | "host") => {
    setLoading(true);
    try {
      await setRole(role);
      router.replace("/");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View
      style={[
        styles.root,
        { paddingTop: insets.top + 48, paddingBottom: insets.bottom + 32 },
      ]}
    >
      <View style={styles.logoBadge}>
        <Text style={styles.logoF}>F</Text>
      </View>

      <Text style={styles.heading}>What brings you to Flocked?</Text>
      <Text style={styles.sub}>Choose how you'd like to use the app.</Text>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <View style={styles.cards}>
          <TouchableOpacity
            style={styles.card}
            onPress={() => handleSelect("guest")}
            activeOpacity={0.75}
          >
            <View style={styles.cardIcon}>
              <MaterialCommunityIcons name="school-outline" size={32} color={colors.primary} />
            </View>
            <Text style={styles.cardTitle}>I'm a Student</Text>
            <Text style={styles.cardBody}>
              Browse live classes and join sessions taught by real instructors.
            </Text>
            <View style={styles.cardArrow}>
              <MaterialCommunityIcons name="arrow-right" size={18} color={colors.primary} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.card}
            onPress={() => handleSelect("host")}
            activeOpacity={0.75}
          >
            <View style={styles.cardIcon}>
              <MaterialCommunityIcons name="teach" size={32} color={colors.primary} />
            </View>
            <Text style={styles.cardTitle}>I'm a Teacher</Text>
            <Text style={styles.cardBody}>
              Host live classes, build your audience, and earn from your expertise.
            </Text>
            <View style={styles.cardArrow}>
              <MaterialCommunityIcons name="arrow-right" size={18} color={colors.primary} />
            </View>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#FDFBF7",
    alignItems: "center",
    paddingHorizontal: 28,
  },
  logoBadge: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
  },
  logoF: {
    fontSize: 26,
    fontWeight: "700",
    color: "#fff",
  },
  heading: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1A1A2E",
    textAlign: "center",
    marginBottom: 8,
  },
  sub: {
    fontSize: 15,
    color: "#6B6B6B",
    textAlign: "center",
    marginBottom: 40,
  },
  cards: {
    width: "100%",
    gap: 16,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F0EDE5",
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  cardIcon: {
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A1A2E",
    marginBottom: 4,
  },
  cardBody: {
    fontSize: 14,
    color: "#6B6B6B",
    lineHeight: 20,
  },
  cardArrow: {
    position: "absolute",
    right: 20,
    top: "50%",
  },
});
