import { colors } from "../../lib/colors";
import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { ActivityIndicator, Text } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { AuthGate } from "../../components/AuthGate";
import { RoleGuard } from "../../components/RoleGuard";
import { getStudentAnalytics, getStreak, StudentAnalytics, StreakData } from "../../lib/api";

const CATEGORY_COLORS: Record<string, { bg: string; dot: string; text: string }> = {
  Yoga: { bg: colors.primaryTint, dot: colors.primary, text: "#007A70" },
  Dance: { bg: "#FDF0F2", dot: colors.primaryTint, text: "#A04060" },
  Tutoring: { bg: "#EEF3F8", dot: "#94B4D2", text: "#3A5F80" },
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${DAYS[d.getDay()]} ${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

function StatCard({
  icon,
  label,
  value,
  color = colors.primary,
}: {
  icon: string;
  label: string;
  value: string | number;
  color?: string;
}) {
  return (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <MaterialCommunityIcons name={icon as never} size={22} color={color} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function StudentAnalyticsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [analytics, setAnalytics] = useState<StudentAnalytics | null>(null);
  const [streak, setStreak] = useState<StreakData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      setError(null);
      Promise.all([getStudentAnalytics(), getStreak().catch(() => null)])
        .then(([data, streakData]) => {
          if (active) {
            setAnalytics(data);
            setStreak(streakData);
            setLoading(false);
          }
        })
        .catch((err) => {
          if (active) {
            setError(err instanceof Error ? err.message : "Failed to load analytics.");
            setLoading(false);
          }
        });
      return () => {
        active = false;
      };
    }, [])
  );

  const totalCategoryClasses = analytics
    ? Object.values(analytics.category_breakdown).reduce((a, b) => a + b, 0)
    : 0;

  return (
    <AuthGate>
      <RoleGuard role="guest">
        <ScrollView
          style={styles.root}
          contentContainerStyle={[
            styles.content,
            { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <MaterialCommunityIcons name="arrow-left" size={22} color="#333" />
            </TouchableOpacity>
            <Text style={styles.title}>My Activity</Text>
            <View style={{ width: 36 }} />
          </View>

          {loading && (
            <View style={styles.centerBox}>
              <ActivityIndicator color={colors.primary} />
              <Text style={styles.loadingText}>Loading your activity…</Text>
            </View>
          )}

          {error && !loading && (
            <View style={styles.centerBox}>
              <MaterialCommunityIcons name="alert-circle-outline" size={36} color={colors.primaryTint} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {analytics && !loading && (
            <>
              {/* Streak card */}
              {streak !== null && (
                <View style={styles.streakCard}>
                  <Text style={styles.streakEmoji}>🔥</Text>
                  <Text style={styles.streakNumber}>{streak.current_streak}</Text>
                  <Text style={styles.streakLabel}>week streak</Text>
                  <Text style={styles.streakBest}>Best: {streak.longest_streak} weeks</Text>
                </View>
              )}

              {/* Overview */}
              <Text style={styles.sectionTitle}>Overview</Text>
              <View style={styles.statsGrid}>
                <StatCard
                  icon="calendar-check-outline"
                  label="Classes Attended"
                  value={analytics.total_attended}
                  color={colors.primary}
                />
                <StatCard
                  icon="bookmark-outline"
                  label="Enrolled"
                  value={analytics.total_enrolled}
                  color={colors.primaryTint}
                />
                <StatCard
                  icon="account-heart-outline"
                  label="Instructors"
                  value={analytics.unique_instructors}
                  color="#94B4D2"
                />
                <StatCard
                  icon="star-outline"
                  label="Reviews Given"
                  value={analytics.total_reviews_given}
                  color={colors.primary}
                />
              </View>

              {/* Empty state */}
              {analytics.total_enrolled === 0 && (
                <View style={styles.emptyCard}>
                  <MaterialCommunityIcons name="calendar-star" size={40} color="#D0D0D0" />
                  <Text style={styles.emptyTitle}>No classes yet</Text>
                  <Text style={styles.emptyBody}>
                    Browse the discover feed to find your first class!
                  </Text>
                </View>
              )}

              {/* Category breakdown */}
              {Object.keys(analytics.category_breakdown).length > 0 && (
                <>
                  <Text style={styles.sectionTitle}>Interests</Text>
                  <View style={styles.card}>
                    {Object.entries(analytics.category_breakdown).map(([cat, count]) => {
                      const colors = CATEGORY_COLORS[cat] ?? {
                        bg: "#F5F5F5",
                        dot: "#CCC",
                        text: "#666",
                      };
                      const pct =
                        totalCategoryClasses > 0
                          ? Math.round((count / totalCategoryClasses) * 100)
                          : 0;
                      return (
                        <View key={cat} style={styles.categoryRow}>
                          <View style={[styles.catPill, { backgroundColor: colors.bg }]}>
                            <View style={[styles.catDot, { backgroundColor: colors.dot }]} />
                            <Text style={[styles.catName, { color: colors.text }]}>{cat}</Text>
                          </View>
                          <View style={styles.catBarTrack}>
                            <View
                              style={[
                                styles.catBarFill,
                                { width: `${pct}%`, backgroundColor: colors.dot },
                              ]}
                            />
                          </View>
                          <Text style={styles.catCount}>{count}</Text>
                        </View>
                      );
                    })}
                  </View>
                </>
              )}

              {/* Recent classes */}
              {analytics.recent_classes.length > 0 && (
                <>
                  <Text style={styles.sectionTitle}>Recent Classes</Text>
                  {analytics.recent_classes.map((cls) => {
                    const colors = CATEGORY_COLORS[cls.category] ?? {
                      bg: "#F5F5F5",
                      dot: "#CCC",
                      text: "#666",
                    };
                    return (
                      <View key={cls.id} style={styles.classCard}>
                        <View style={[styles.classCatBadge, { backgroundColor: colors.bg }]}>
                          <View style={[styles.classCatDot, { backgroundColor: colors.dot }]} />
                          <Text style={[styles.classCatText, { color: colors.text }]}>
                            {cls.category}
                          </Text>
                        </View>
                        <Text style={styles.classTitle}>{cls.title}</Text>
                        <View style={styles.classMeta}>
                          <MaterialCommunityIcons
                            name="account-outline"
                            size={13}
                            color="#AAA"
                          />
                          <Text style={styles.classMetaText}>{cls.instructor_name}</Text>
                          <MaterialCommunityIcons name="calendar" size={13} color="#AAA" />
                          <Text style={styles.classMetaText}>
                            {formatDate(cls.scheduled_at)}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </>
              )}
            </>
          )}
        </ScrollView>
      </RoleGuard>
    </AuthGate>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FAFAF8" },
  content: { paddingHorizontal: 20 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F0F0F0",
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 18, fontWeight: "700", color: colors.navy },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.navy,
    marginBottom: 12,
    marginTop: 8,
  },
  centerBox: { alignItems: "center", paddingVertical: 60, gap: 12 },
  loadingText: { color: "#888", fontSize: 14 },
  errorText: { color: "#888", fontSize: 14, textAlign: "center" },

  streakCard: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    marginBottom: 20,
    shadowColor: "#009B8E",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  streakEmoji: { fontSize: 40, marginBottom: 4 },
  streakNumber: { fontSize: 56, fontWeight: "800", color: "#FFFFFF", lineHeight: 64 },
  streakLabel: { fontSize: 16, fontWeight: "600", color: "#FFFFFF", opacity: 0.9 },
  streakBest: { fontSize: 13, color: "#FFFFFF", opacity: 0.7, marginTop: 4 },

  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 16 },
  statCard: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    borderLeftWidth: 3,
    gap: 4,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  statValue: { fontSize: 22, fontWeight: "800", color: colors.navy },
  statLabel: { fontSize: 12, color: "#888" },

  emptyCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: colors.navy },
  emptyBody: { fontSize: 13, color: "#888", textAlign: "center" },

  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    gap: 12,
  },

  categoryRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  catPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    width: 90,
  },
  catDot: { width: 6, height: 6, borderRadius: 3 },
  catName: { fontSize: 12, fontWeight: "600" },
  catBarTrack: {
    flex: 1,
    height: 8,
    backgroundColor: "#F0F0F0",
    borderRadius: 4,
    overflow: "hidden",
  },
  catBarFill: { height: "100%", borderRadius: 4 },
  catCount: { fontSize: 13, fontWeight: "700", color: "#333", width: 24, textAlign: "right" },

  classCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    gap: 6,
  },
  classCatBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  classCatDot: { width: 5, height: 5, borderRadius: 3 },
  classCatText: { fontSize: 11, fontWeight: "600" },
  classTitle: { fontSize: 14, fontWeight: "700", color: colors.navy },
  classMeta: { flexDirection: "row", alignItems: "center", gap: 4, flexWrap: "wrap" },
  classMetaText: { fontSize: 12, color: "#888", marginRight: 6 },
});
