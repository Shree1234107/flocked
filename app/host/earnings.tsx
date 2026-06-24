import { ScrollView, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { AuthGate } from "../../components/AuthGate";
import { RoleGuard } from "../../components/RoleGuard";

const MOCK_CLASSES = [
  { id: "1", title: "Beginner Morning Yoga", students: 8, status: "completed", date: "Jun 9" },
  { id: "2", title: "Evening Flow", students: 3, status: "completed", date: "Jun 11" },
  { id: "3", title: "Hip Hop Basics", students: 5, status: "completed", date: "Jun 12" },
  { id: "4", title: "Stretch & Recover", students: 4, status: "completed", date: "Jun 13" },
  { id: "5", title: "Beginner Morning Yoga", students: 3, status: "completed", date: "Jun 14" },
  { id: "6", title: "Evening Flow", students: 0, status: "scheduled", date: "Jun 16" },
  { id: "7", title: "Hip Hop Basics", students: 0, status: "scheduled", date: "Jun 17" },
  { id: "8", title: "Stretch & Recover", students: 0, status: "scheduled", date: "Jun 19" },
];

const RATE_PER_STUDENT = 15;
const PLATFORM_CUT = 0.85;
const TOTAL_PROJECTED = 127.5;
const PAYOUT_DATE = "July 1, 2026";

export default function EarningsScreen() {
  const insets = useSafeAreaInsets();

  const completed = MOCK_CLASSES.filter((c) => c.status === "completed");
  const scheduled = MOCK_CLASSES.filter((c) => c.status === "scheduled");
  const totalStudents = completed.reduce((sum, c) => sum + c.students, 0);

  return (
    <AuthGate>
      <RoleGuard requiredRole="host">
        <ScrollView
          style={[styles.container, { paddingTop: insets.top }]}
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        >
          {/* Projected earnings card */}
          <View style={styles.projectedCard}>
            <Text style={styles.projectedLabel}>Projected This Month</Text>
            <Text style={styles.projectedAmount}>${TOTAL_PROJECTED.toFixed(2)}</Text>
            <Text style={styles.projectedSub}>Based on {completed.length} completed classes</Text>

            <View style={styles.cardDivider} />

            <View style={styles.formulaRow}>
              <MaterialCommunityIcons name="information-outline" size={13} color="#87A878" />
              <Text style={styles.formulaText}>
                avg. students × ${RATE_PER_STUDENT}/seat × {Math.round(PLATFORM_CUT * 100)}% = earnings per class
              </Text>
            </View>
          </View>

          {/* Stats row */}
          <View style={styles.statsRow}>
            <View style={styles.statCell}>
              <Text style={styles.statValue}>{scheduled.length}</Text>
              <Text style={styles.statLabel}>Scheduled</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCell}>
              <Text style={styles.statValue}>{completed.length}</Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCell}>
              <Text style={styles.statValue}>{totalStudents}</Text>
              <Text style={styles.statLabel}>Students</Text>
            </View>
          </View>

          {/* Payout info */}
          <View style={styles.payoutCard}>
            <View style={styles.payoutRow}>
              <MaterialCommunityIcons name="calendar-check-outline" size={20} color="#87A878" />
              <View style={styles.payoutInfo}>
                <Text style={styles.payoutTitle}>Next Payout</Text>
                <Text style={styles.payoutDate}>{PAYOUT_DATE}</Text>
              </View>
            </View>
            <View style={styles.payoutBanner}>
              <Text style={styles.payoutBannerText}>Payments launching soon</Text>
            </View>
          </View>

          {/* Class breakdown */}
          <Text style={styles.sectionTitle}>Completed Classes</Text>
          <View style={styles.classList}>
            {completed.map((cls) => {
              const earn = cls.students * RATE_PER_STUDENT * PLATFORM_CUT;
              return (
                <View key={cls.id} style={styles.classRow}>
                  <View style={styles.classLeft}>
                    <View style={styles.classDateBadge}>
                      <Text style={styles.classDateText}>{cls.date}</Text>
                    </View>
                    <Text style={styles.classTitle} numberOfLines={1}>{cls.title}</Text>
                    <Text style={styles.classMeta}>{cls.students} students</Text>
                  </View>
                  <Text style={styles.classEarn}>${earn.toFixed(2)}</Text>
                </View>
              );
            })}
          </View>

          {/* Disclaimer */}
          <View style={styles.disclaimer}>
            <MaterialCommunityIcons name="alert-circle-outline" size={13} color="#C0C0C0" />
            <Text style={styles.disclaimerText}>
              Earnings are estimates. Final amounts confirmed once payments launch.
            </Text>
          </View>
        </ScrollView>
      </RoleGuard>
    </AuthGate>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 16,
  },
  projectedCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 24,
    borderWidth: 1,
    borderColor: "#EEEEEE",
    alignItems: "center",
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  projectedLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#888888",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  projectedAmount: {
    fontSize: 48,
    fontWeight: "700",
    color: "#2C2C2C",
    letterSpacing: -1,
    marginVertical: 4,
  },
  projectedSub: {
    fontSize: 13,
    color: "#888888",
  },
  cardDivider: {
    height: 1,
    backgroundColor: "#EEEEEE",
    alignSelf: "stretch",
    marginVertical: 12,
  },
  formulaRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
  },
  formulaText: {
    flex: 1,
    fontSize: 12,
    color: "#888888",
    lineHeight: 18,
  },
  statsRow: {
    flexDirection: "row",
    backgroundColor: "#F9F9F9",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EEEEEE",
    paddingVertical: 18,
  },
  statCell: {
    flex: 1,
    alignItems: "center",
    gap: 3,
  },
  statValue: {
    fontSize: 22,
    fontWeight: "700",
    color: "#2C2C2C",
    letterSpacing: -0.4,
  },
  statLabel: {
    fontSize: 11,
    color: "#888888",
    fontWeight: "500",
    textAlign: "center",
  },
  statDivider: {
    width: 1,
    backgroundColor: "#EEEEEE",
    marginVertical: 6,
  },
  payoutCard: {
    backgroundColor: "#F0F5EE",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D4E8CC",
    padding: 14,
    gap: 10,
  },
  payoutRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  payoutInfo: {
    gap: 2,
  },
  payoutTitle: {
    fontSize: 11,
    color: "#4A7A40",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  payoutDate: {
    fontSize: 16,
    fontWeight: "700",
    color: "#2C2C2C",
  },
  payoutBanner: {
    backgroundColor: "rgba(255,255,255,0.6)",
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D4E8CC",
  },
  payoutBannerText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#4A7A40",
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2C2C2C",
    marginTop: 4,
    marginBottom: -4,
  },
  classList: {
    gap: 8,
  },
  classRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EEEEEE",
    padding: 14,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  classLeft: {
    flex: 1,
    gap: 2,
  },
  classDateBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#F0F5EE",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginBottom: 2,
  },
  classDateText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#4A7A40",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  classTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2C2C2C",
  },
  classMeta: {
    fontSize: 12,
    color: "#888888",
  },
  classEarn: {
    fontSize: 16,
    fontWeight: "700",
    color: "#87A878",
  },
  disclaimer: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 12,
    color: "#C0C0C0",
    lineHeight: 18,
  },
});
