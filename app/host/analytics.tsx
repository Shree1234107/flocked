import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { ActivityIndicator, Text } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { AuthGate } from "../../components/AuthGate";
import { RoleGuard } from "../../components/RoleGuard";
import { getInstructorAnalytics, InstructorAnalytics } from "../../lib/api";

const CATEGORY_COLORS: Record<string, string> = {
  Yoga: "#87A878",
  Dance: "#F4B8C1",
  Tutoring: "#94B4D2",
};

function StarRating({ rating }: { rating: number }) {
  return (
    <View style={{ flexDirection: "row", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <MaterialCommunityIcons
          key={i}
          name={i <= Math.round(rating) ? "star" : "star-outline"}
          size={14}
          color="#F4B8C1"
        />
      ))}
    </View>
  );
}

function StatCard({
  icon,
  label,
  value,
  color = "#87A878",
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

function MonthBar({
  month,
  count,
  maxCount,
}: {
  month: string;
  count: number;
  maxCount: number;
}) {
  const heightPct = maxCount > 0 ? (count / maxCount) * 100 : 0;
  const label = month.slice(5); // "2025-06" → "06"
  return (
    <View style={styles.barCol}>
      <Text style={styles.barCount}>{count}</Text>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { height: `${heightPct}%` }]} />
      </View>
      <Text style={styles.barLabel}>{label}</Text>
    </View>
  );
}

export default function InstructorAnalyticsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [analytics, setAnalytics] = useState<InstructorAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      setError(null);
      getInstructorAnalytics()
        .then((data) => {
          if (active) {
            setAnalytics(data);
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

  const maxMonthly = analytics
    ? Math.max(...(analytics.monthly_enrollments.map((m) => m.count) ?? [1]), 1)
    : 1;

  return (
    <AuthGate>
      <RoleGuard role="host">
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
            <Text style={styles.title}>Analytics</Text>
            <View style={{ width: 36 }} />
          </View>

          {loading && (
            <View style={styles.centerBox}>
              <ActivityIndicator color="#87A878" />
              <Text style={styles.loadingText}>Loading your stats…</Text>
            </View>
          )}

          {error && !loading && (
            <View style={styles.centerBox}>
              <MaterialCommunityIcons name="alert-circle-outline" size={36} color="#F4B8C1" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {analytics && !loading && (
            <>
              {/* Overview stats */}
              <Text style={styles.sectionTitle}>Overview</Text>
              <View style={styles.statsGrid}>
                <StatCard
                  icon="school-outline"
                  label="Total Classes"
                  value={analytics.total_classes}
                  color="#87A878"
                />
                <StatCard
                  icon="account-group-outline"
                  label="Total Students"
                  value={analytics.total_students}
                  color="#F4B8C1"
                />
                <StatCard
                  icon="check-circle-outline"
                  label="Completed"
                  value={analytics.completed_classes}
                  color="#94B4D2"
                />
                <StatCard
                  icon="calendar-clock"
                  label="Upcoming"
                  value={analytics.upcoming_classes}
                  color="#87A878"
                />
              </View>

              {/* Rating + revenue */}
              <View style={styles.highlightRow}>
                <View style={[styles.highlightCard, { flex: 1.2 }]}>
                  <Text style={styles.highlightLabel}>Average Rating</Text>
                  {analytics.avg_rating != null ? (
                    <>
                      <Text style={styles.highlightValue}>{analytics.avg_rating.toFixed(1)}</Text>
                      <StarRating rating={analytics.avg_rating} />
                      <Text style={styles.highlightSub}>
                        {analytics.total_reviews} review{analytics.total_reviews !== 1 ? "s" : ""}
                      </Text>
                    </>
                  ) : (
                    <Text style={styles.highlightSub}>No reviews yet</Text>
                  )}
                </View>
                <View style={[styles.highlightCard, { flex: 1 }]}>
                  <Text style={styles.highlightLabel}>Est. Revenue</Text>
                  <Text style={[styles.highlightValue, { color: "#87A878" }]}>
                    ${analytics.estimated_revenue}
                  </Text>
                  <Text style={styles.highlightSub}>Stripe coming soon</Text>
                </View>
              </View>

              {/* Monthly enrollments chart */}
              {analytics.monthly_enrollments.length > 0 && (
                <>
                  <Text style={styles.sectionTitle}>Monthly Enrollments</Text>
                  <View style={styles.chartCard}>
                    <View style={styles.barChart}>
                      {analytics.monthly_enrollments.map((m) => (
                        <MonthBar
                          key={m.month}
                          month={m.month}
                          count={m.count}
                          maxCount={maxMonthly}
                        />
                      ))}
                    </View>
                  </View>
                </>
              )}

              {/* Category breakdown */}
              {Object.keys(analytics.category_breakdown).length > 0 && (
                <>
                  <Text style={styles.sectionTitle}>By Category</Text>
                  <View style={styles.card}>
                    {Object.entries(analytics.category_breakdown).map(([cat, count]) => {
                      const pct =
                        analytics.completed_classes > 0
                          ? Math.round((count / analytics.completed_classes) * 100)
                          : 0;
                      return (
                        <View key={cat} style={styles.categoryRow}>
                          <View
                            style={[
                              styles.categoryDot,
                              { backgroundColor: CATEGORY_COLORS[cat] ?? "#ccc" },
                            ]}
                          />
                          <Text style={styles.categoryName}>{cat}</Text>
                          <View style={styles.categoryBarTrack}>
                            <View
                              style={[
                                styles.categoryBarFill,
                                {
                                  width: `${pct}%`,
                                  backgroundColor: CATEGORY_COLORS[cat] ?? "#ccc",
                                },
                              ]}
                            />
                          </View>
                          <Text style={styles.categoryCount}>{count}</Text>
                        </View>
                      );
                    })}
                  </View>
                </>
              )}

              {/* Top classes */}
              {analytics.top_classes.length > 0 && (
                <>
                  <Text style={styles.sectionTitle}>Top Classes</Text>
                  <View style={styles.card}>
                    {analytics.top_classes.map((cls, i) => (
                      <View
                        key={cls.id}
                        style={[
                          styles.topClassRow,
                          i < analytics.top_classes.length - 1 && styles.divider,
                        ]}
                      >
                        <View
                          style={[
                            styles.rankBadge,
                            { backgroundColor: i === 0 ? "#87A878" : "#F0F0F0" },
                          ]}
                        >
                          <Text
                            style={[styles.rankText, { color: i === 0 ? "#fff" : "#888" }]}
                          >
                            #{i + 1}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.topClassName}>{cls.title}</Text>
                          <Text style={styles.topClassCat}>{cls.category}</Text>
                        </View>
                        <Text style={styles.topClassCount}>
                          {cls.enrollment_count} student{cls.enrollment_count !== 1 ? "s" : ""}
                        </Text>
                      </View>
                    ))}
                  </View>
                </>
              )}

              {/* Recent reviews */}
              {analytics.recent_reviews.length > 0 && (
                <>
                  <Text style={styles.sectionTitle}>Recent Reviews</Text>
                  {analytics.recent_reviews.map((r, i) => (
                    <View key={i} style={styles.reviewCard}>
                      <View style={styles.reviewHeader}>
                        <StarRating rating={r.rating} />
                        <Text style={styles.reviewDate}>
                          {new Date(r.created_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </Text>
                      </View>
                      {r.review_text && (
                        <Text style={styles.reviewText}>{r.review_text}</Text>
                      )}
                    </View>
                  ))}
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
  title: { fontSize: 18, fontWeight: "700", color: "#1A1A1A" },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 12,
    marginTop: 8,
  },
  centerBox: { alignItems: "center", paddingVertical: 60, gap: 12 },
  loadingText: { color: "#888", fontSize: 14 },
  errorText: { color: "#888", fontSize: 14, textAlign: "center" },

  // Stats grid
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 16,
  },
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
  statValue: { fontSize: 22, fontWeight: "800", color: "#1A1A1A" },
  statLabel: { fontSize: 12, color: "#888" },

  // Highlight row
  highlightRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  highlightCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    gap: 4,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  highlightLabel: { fontSize: 12, color: "#888", marginBottom: 2 },
  highlightValue: { fontSize: 26, fontWeight: "800", color: "#1A1A1A" },
  highlightSub: { fontSize: 11, color: "#AAA", marginTop: 2 },

  // Chart
  chartCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  barChart: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-around",
    height: 100,
  },
  barCol: { alignItems: "center", gap: 4, flex: 1 },
  barCount: { fontSize: 10, color: "#888", fontWeight: "600" },
  barTrack: {
    flex: 1,
    width: 20,
    backgroundColor: "#F0F0F0",
    borderRadius: 4,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  barFill: { backgroundColor: "#87A878", borderRadius: 4, minHeight: 4 },
  barLabel: { fontSize: 10, color: "#AAA" },

  // Generic card
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

  // Category
  categoryRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  categoryDot: { width: 8, height: 8, borderRadius: 4 },
  categoryName: { fontSize: 13, color: "#333", width: 70 },
  categoryBarTrack: {
    flex: 1,
    height: 8,
    backgroundColor: "#F0F0F0",
    borderRadius: 4,
    overflow: "hidden",
  },
  categoryBarFill: { height: "100%", borderRadius: 4 },
  categoryCount: { fontSize: 13, fontWeight: "700", color: "#333", width: 24, textAlign: "right" },

  // Top classes
  topClassRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 4 },
  divider: { borderBottomWidth: 1, borderBottomColor: "#F5F5F5", paddingBottom: 12 },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  rankText: { fontSize: 11, fontWeight: "700" },
  topClassName: { fontSize: 14, fontWeight: "600", color: "#1A1A1A" },
  topClassCat: { fontSize: 12, color: "#888" },
  topClassCount: { fontSize: 13, color: "#87A878", fontWeight: "600" },

  // Reviews
  reviewCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  reviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  reviewDate: { fontSize: 12, color: "#AAA" },
  reviewText: { fontSize: 13, color: "#555", lineHeight: 19 },
});
