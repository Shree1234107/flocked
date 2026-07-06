import { colors } from "../lib/colors";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Text } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as SecureStore from "../lib/secure-store";

const PERKS = [
  { icon: "alarm-outline", text: "Reminders before your class starts" },
  { icon: "calendar-check-outline", text: "New classes from your saved instructors" },
  { icon: "star-outline", text: "Early access to limited-spot sessions" },
];

export default function NotificationPermissionScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const handleEnable = async () => {
    await SecureStore.setItemAsync("flocked.notif_asked", "true");
    router.replace("/");
  };

  const handleSkip = async () => {
    await SecureStore.setItemAsync("flocked.notif_asked", "true");
    router.replace("/");
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 32 }]}>
      {/* Icon */}
      <View style={styles.iconWrap}>
        <MaterialCommunityIcons name="bell-ring-outline" size={48} color={colors.primary} />
      </View>

      {/* Copy */}
      <View style={styles.copyBlock}>
        <Text style={styles.title}>Stay in the loop</Text>
        <Text style={styles.subtitle}>
          Get notified when your class is starting and discover new sessions from instructors you love.
        </Text>
      </View>

      {/* Perks */}
      <View style={styles.perksList}>
        {PERKS.map((p, i) => (
          <View key={i} style={styles.perkRow}>
            <View style={styles.perkIconWrap}>
              <MaterialCommunityIcons name={p.icon as never} size={18} color={colors.primary} />
            </View>
            <Text style={styles.perkText}>{p.text}</Text>
          </View>
        ))}
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.enableBtn} onPress={handleEnable} activeOpacity={0.85}>
          <MaterialCommunityIcons name="bell-outline" size={18} color="#FFFFFF" />
          <Text style={styles.enableBtnText}>Enable Notifications</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.skipBtn} onPress={handleSkip} activeOpacity={0.7}>
          <Text style={styles.skipBtnText}>Maybe later</Text>
        </TouchableOpacity>
      </View>

      {/* Fine print */}
      <Text style={styles.finePrint}>
        You can change this anytime in Settings
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    paddingHorizontal: 32,
    gap: 32,
  },
  iconWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primaryTint,
    borderWidth: 2,
    borderColor: "#D4E8CC",
    alignItems: "center",
    justifyContent: "center",
  },
  copyBlock: {
    alignItems: "center",
    gap: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.navy,
    letterSpacing: -0.4,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    color: "#888888",
    textAlign: "center",
    lineHeight: 23,
  },
  perksList: {
    width: "100%",
    gap: 12,
  },
  perkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#F9F9F9",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#EEEEEE",
  },
  perkIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryTint,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  perkText: {
    flex: 1,
    fontSize: 14,
    color: colors.navy,
    lineHeight: 20,
  },
  actions: {
    width: "100%",
    gap: 10,
  },
  enableBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  enableBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  skipBtn: {
    paddingVertical: 12,
    alignItems: "center",
  },
  skipBtnText: {
    fontSize: 14,
    color: "#888888",
    fontWeight: "500",
  },
  finePrint: {
    fontSize: 12,
    color: "#C0C0C0",
    textAlign: "center",
  },
});
