import { Alert, StyleSheet, TouchableOpacity, View } from "react-native";
import { Text } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { AuthGate } from "../../../components/AuthGate";
import { RoleGuard } from "../../../components/RoleGuard";

const CONFIRMED_CLASS = {
  title: "Beginner Morning Yoga",
  category: "Yoga",
  date: "Monday, Jun 16",
  time: "9:00 AM",
  duration: 60,
  instructor: "Sarah Chen",
  dot: "#00B4A6",
  bg: "#E0F7F5",
};

export default function ConfirmationScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <AuthGate>
      <RoleGuard requiredRole="guest">
        <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom + 24 }]}>
          {/* Success icon */}
          <View style={styles.heroSection}>
            <View style={styles.checkRing}>
              <MaterialCommunityIcons name="check" size={40} color="#00B4A6" />
            </View>
            <Text style={styles.youreIn}>You're in!</Text>
            <Text style={styles.subtitle}>
              You've successfully joined this class. See you there.
            </Text>
          </View>

          {/* Class summary card */}
          <View style={styles.classCard}>
            <View style={[styles.classCardHeader, { backgroundColor: CONFIRMED_CLASS.bg }]}>
              <View style={[styles.catDot, { backgroundColor: CONFIRMED_CLASS.dot }]} />
              <Text style={[styles.classCardCategory, { color: "#007A70" }]}>
                {CONFIRMED_CLASS.category}
              </Text>
            </View>
            <View style={styles.classCardBody}>
              <Text style={styles.classCardTitle}>{CONFIRMED_CLASS.title}</Text>
              <View style={styles.classCardMeta}>
                <View style={styles.metaRow}>
                  <MaterialCommunityIcons name="calendar-outline" size={14} color="#C0C0C0" />
                  <Text style={styles.metaText}>{CONFIRMED_CLASS.date}</Text>
                </View>
                <View style={styles.metaRow}>
                  <MaterialCommunityIcons name="clock-outline" size={14} color="#C0C0C0" />
                  <Text style={styles.metaText}>
                    {CONFIRMED_CLASS.time} · {CONFIRMED_CLASS.duration} min
                  </Text>
                </View>
                <View style={styles.metaRow}>
                  <MaterialCommunityIcons name="account-outline" size={14} color="#C0C0C0" />
                  <Text style={styles.metaText}>with {CONFIRMED_CLASS.instructor}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Actions */}
          <View style={styles.actionsSection}>
            <TouchableOpacity
              style={styles.calendarBtn}
              onPress={() => Alert.alert("Add to Calendar", "Calendar integration coming soon!")}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name="calendar-plus" size={17} color="#007A70" />
              <Text style={styles.calendarBtnText}>Add to Calendar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.rateBtn}
              onPress={() =>
                router.push({
                  pathname: "/guest/class/review",
                  params: {
                    classTitle: CONFIRMED_CLASS.title,
                    instructorName: CONFIRMED_CLASS.instructor,
                  },
                })
              }
              activeOpacity={0.85}
            >
              <MaterialCommunityIcons name="star-outline" size={17} color="#FFFFFF" />
              <Text style={styles.rateBtnText}>Rate this class</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.discoverBtn}
              onPress={() => router.push("/guest")}
              activeOpacity={0.85}
            >
              <Text style={styles.discoverBtnText}>Back to Discover</Text>
            </TouchableOpacity>
          </View>
        </View>
      </RoleGuard>
    </AuthGate>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
    gap: 28,
  },
  heroSection: {
    alignItems: "center",
    gap: 10,
  },
  checkRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#E0F7F5",
    borderWidth: 2,
    borderColor: "#00B4A6",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  youreIn: {
    fontSize: 30,
    fontWeight: "700",
    color: "#2C2C2C",
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 14,
    color: "#888888",
    textAlign: "center",
    lineHeight: 21,
    paddingHorizontal: 16,
  },
  classCard: {
    width: "100%",
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
  classCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  catDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  classCardCategory: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  classCardBody: {
    padding: 16,
    gap: 12,
    backgroundColor: "#FFFFFF",
  },
  classCardTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#2C2C2C",
    letterSpacing: -0.2,
  },
  classCardMeta: {
    gap: 8,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  metaText: {
    fontSize: 13,
    color: "#888888",
  },
  actionsSection: {
    width: "100%",
    gap: 10,
  },
  calendarBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#E0F7F5",
    borderRadius: 12,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#00B4A6",
  },
  calendarBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#007A70",
  },
  rateBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#F4A200",
    borderRadius: 12,
    paddingVertical: 14,
  },
  rateBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  discoverBtn: {
    backgroundColor: "#00B4A6",
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
  },
  discoverBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
