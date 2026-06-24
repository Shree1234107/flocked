import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Text } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { AuthGate } from "../../../components/AuthGate";
import { RoleGuard } from "../../../components/RoleGuard";
import { useFilters } from "../../../lib/filtersContext";
import { listClasses, listFollowingClasses } from "../../../lib/api";
import type { ScheduledClass } from "../../../lib/types";

const FILTER_TAGS = ["All", "Yoga", "Dance", "Tutoring"] as const;
type FilterTag = (typeof FILTER_TAGS)[number];
type TimeFilter = "Today" | "Tomorrow" | "This Week" | "All";
type FeedTab = "For You" | "Following";

const CATEGORY_COLORS: Record<string, { bg: string; dot: string; label: string }> = {
  Yoga: { bg: "#F0F5EE", dot: "#87A878", label: "#4A7A40" },
  Dance: { bg: "#FDF0F2", dot: "#F4B8C1", label: "#A04060" },
  Tutoring: { bg: "#EEF3F8", dot: "#94B4D2", label: "#3A5F80" },
};

const DAYS_ABB = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS_ABB = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function formatTime(iso: string): string {
  const d = new Date(iso);
  const h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${m.toString().padStart(2, "0")} ${ampm}`;
}

function fmtDayHeader(d: Date): string {
  return `${DAYS_ABB[d.getDay()]}, ${MONTHS_ABB[d.getMonth()]} ${d.getDate()}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function smartScore(cls: ScheduledClass): number {
  const hoursUntil = (new Date(cls.scheduled_at).getTime() - Date.now()) / 3600000;
  const spotsPct = 1 - cls.current_students / cls.max_students;
  const rating = (cls.host as any)?.avg_rating ?? 3;
  return (
    rating * 20 +
    spotsPct * 30 +
    (hoursUntil < 24 ? 20 : 0) -
    (hoursUntil / 168) * 10
  );
}

function filterByTime(classes: ScheduledClass[], timeFilter: TimeFilter): ScheduledClass[] {
  const now = new Date();
  const today = new Date(now); today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  const dayAfter = new Date(tomorrow); dayAfter.setDate(tomorrow.getDate() + 1);
  const weekEnd = new Date(today); weekEnd.setDate(today.getDate() + 7);

  return classes.filter((c) => {
    const d = new Date(c.scheduled_at);
    if (timeFilter === "Today") return isSameDay(d, today);
    if (timeFilter === "Tomorrow") return isSameDay(d, tomorrow);
    if (timeFilter === "This Week") return d >= today && d <= weekEnd;
    return true;
  });
}

export default function GuestDiscoverTab() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { filters, hasActiveFilters } = useFilters();

  const [selectedTag, setSelectedTag] = useState<FilterTag>("All");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("All");
  const [feedTab, setFeedTab] = useState<FeedTab>("For You");
  const [searchQuery, setSearchQuery] = useState("");

  const [forYouClasses, setForYouClasses] = useState<ScheduledClass[]>([]);
  const [followingClasses, setFollowingClasses] = useState<ScheduledClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    setError(null);
    try {
      const [forYou, following] = await Promise.all([
        listClasses(),
        listFollowingClasses(),
      ]);
      setForYouClasses(forYou);
      setFollowingClasses(following);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load classes.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const onRefresh = () => { setRefreshing(true); loadData(true); };

  const applyFilters = (classes: ScheduledClass[]): ScheduledClass[] => {
    let result = [...classes];

    if (selectedTag !== "All") result = result.filter((c) => c.category === selectedTag);
    result = filterByTime(result, timeFilter);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          ((c.host as any)?.display_name ?? "").toLowerCase().includes(q)
      );
    }

    if (filters.days?.length > 0) {
      result = result.filter((c) => {
        const dow = DAYS_ABB[new Date(c.scheduled_at).getDay()];
        return filters.days.includes(dow as never);
      });
    }

    if (filters.times?.length > 0) {
      result = result.filter((c) => {
        const h = new Date(c.scheduled_at).getHours();
        return filters.times.some((t: string) => {
          if (t === "morning") return h >= 6 && h < 12;
          if (t === "afternoon") return h >= 12 && h < 17;
          if (t === "evening") return h >= 17 && h < 22;
          return false;
        });
      });
    }

    // Smart sort
    result.sort((a, b) => smartScore(b) - smartScore(a));
    return result;
  };

  const activeClasses = applyFilters(
    feedTab === "For You" ? forYouClasses : followingClasses
  );

  // Group by day
  const grouped: { date: Date; classes: ScheduledClass[] }[] = [];
  for (const cls of activeClasses) {
    const d = new Date(cls.scheduled_at);
    const existing = grouped.find((g) => isSameDay(g.date, d));
    if (existing) existing.classes.push(cls);
    else grouped.push({ date: d, classes: [cls] });
  }

  const TIME_FILTERS: TimeFilter[] = ["Today", "Tomorrow", "This Week", "All"];

  return (
    <AuthGate>
      <RoleGuard requiredRole="guest">
        <View style={[styles.container, { paddingTop: insets.top }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Discover</Text>
            <TouchableOpacity
              style={styles.bellBtn}
              onPress={() => router.push("/notifications")}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="bell-outline" size={22} color="#2C2C2C" />
              <View style={styles.bellDot} />
            </TouchableOpacity>
          </View>

          {/* Search bar */}
          <View style={styles.searchRow}>
            <View style={styles.searchInputWrap}>
              <MaterialCommunityIcons name="magnify" size={18} color="#C0C0C0" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by class or instructor…"
                placeholderTextColor="#C0C0C0"
                value={searchQuery}
                onChangeText={setSearchQuery}
                returnKeyType="search"
                autoCorrect={false}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery("")} activeOpacity={0.7}>
                  <MaterialCommunityIcons name="close-circle" size={16} color="#C0C0C0" />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity
              style={[styles.filterBtn, hasActiveFilters && styles.filterBtnActive]}
              onPress={() => router.push("/guest/filters")}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons
                name="tune-variant"
                size={18}
                color={hasActiveFilters ? "#FFFFFF" : "#2C2C2C"}
              />
            </TouchableOpacity>
          </View>

          {/* Time filter tabs */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.timeFilterRow}
          >
            {TIME_FILTERS.map((t) => (
              <TouchableOpacity
                key={t}
                style={styles.timeFilterBtn}
                onPress={() => setTimeFilter(t)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.timeFilterText,
                    timeFilter === t && styles.timeFilterTextActive,
                  ]}
                >
                  {t}
                </Text>
                {timeFilter === t && <View style={styles.timeFilterUnderline} />}
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Category chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
          >
            {FILTER_TAGS.map((tag) => (
              <TouchableOpacity
                key={tag}
                style={[styles.filterChip, selectedTag === tag && styles.filterChipActive]}
                onPress={() => setSelectedTag(tag)}
                activeOpacity={0.75}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    selectedTag === tag && styles.filterChipTextActive,
                  ]}
                >
                  {tag}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Feed tabs */}
          <View style={styles.feedTabRow}>
            {(["For You", "Following"] as FeedTab[]).map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[styles.feedTab, feedTab === tab && styles.feedTabActive]}
                onPress={() => setFeedTab(tab)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.feedTabText,
                    feedTab === tab && styles.feedTabTextActive,
                  ]}
                >
                  {tab}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Content */}
          {loading ? (
            <View style={styles.centered}>
              <ActivityIndicator color="#87A878" />
            </View>
          ) : error ? (
            <View style={styles.centered}>
              <MaterialCommunityIcons name="alert-circle-outline" size={36} color="#F4B8C1" />
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={() => loadData()} activeOpacity={0.7}>
                <Text style={styles.retryText}>Try again</Text>
              </TouchableOpacity>
            </View>
          ) : feedTab === "Following" && followingClasses.length === 0 ? (
            <View style={styles.centered}>
              <MaterialCommunityIcons name="account-heart-outline" size={40} color="#D0D0D0" />
              <Text style={styles.emptyText}>No classes from people you follow</Text>
              <Text style={styles.emptySubtext}>
                Follow instructors to see their classes here
              </Text>
              <TouchableOpacity
                style={styles.emptyHint}
                onPress={() => setFeedTab("For You")}
                activeOpacity={0.7}
              >
                <Text style={styles.emptyHintText}>Browse classes →</Text>
              </TouchableOpacity>
            </View>
          ) : grouped.length === 0 ? (
            <View style={styles.centered}>
              <MaterialCommunityIcons name="calendar-blank-outline" size={36} color="#C0C0C0" />
              <Text style={styles.emptyText}>No classes found</Text>
              <Text style={styles.emptySubtext}>Try a different filter or time range</Text>
            </View>
          ) : (
            <ScrollView
              contentContainerStyle={[
                styles.listContent,
                { paddingBottom: insets.bottom + 32 },
              ]}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#87A878" />
              }
            >
              {grouped.map(({ date, classes: dayCls }) => (
                <View key={date.toISOString()} style={styles.daySection}>
                  <Text style={styles.dayHeader}>{fmtDayHeader(date)}</Text>
                  {dayCls.map((cls) => {
                    const colors = CATEGORY_COLORS[cls.category];
                    const spotsLeft = cls.max_students - cls.current_students;
                    const full = spotsLeft <= 0;
                    const urgent = spotsLeft <= 3 && !full;
                    const hostName =
                      (cls.host as any)?.display_name ?? "Instructor";
                    const avgRating = (cls.host as any)?.avg_rating;

                    return (
                      <TouchableOpacity
                        key={cls.id}
                        style={styles.classCard}
                        onPress={() => router.push(`/guest/class/${cls.id}`)}
                        activeOpacity={0.85}
                      >
                        <View
                          style={[
                            styles.classCardBar,
                            { backgroundColor: colors?.dot ?? "#EEEEEE" },
                          ]}
                        />
                        <View style={styles.classCardBody}>
                          <View style={styles.classCardTop}>
                            <Text style={styles.classCardTime}>
                              {formatTime(cls.scheduled_at)}
                            </Text>
                            <View
                              style={[
                                styles.categoryBadge,
                                { backgroundColor: colors?.bg ?? "#F9F9F9" },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.categoryBadgeText,
                                  { color: colors?.label ?? "#888888" },
                                ]}
                              >
                                {cls.category}
                              </Text>
                            </View>
                          </View>
                          <Text style={styles.classCardTitle} numberOfLines={1}>
                            {cls.title}
                          </Text>
                          <TouchableOpacity
                            onPress={() =>
                              router.push(`/guest/instructor/${cls.host_id}`)
                            }
                            activeOpacity={0.7}
                          >
                            <Text style={styles.classCardHost}>with {hostName}</Text>
                          </TouchableOpacity>
                          {avgRating && (
                            <Text style={styles.ratingText}>★ {avgRating.toFixed(1)}</Text>
                          )}
                          <View style={styles.classCardMeta}>
                            {urgent && (
                              <Text style={styles.urgencyText}>
                                🔥 {spotsLeft} spot{spotsLeft === 1 ? "" : "s"} left
                              </Text>
                            )}
                            <View style={[styles.spotsBadge, full && styles.spotsBadgeFull]}>
                              <Text style={[styles.spotsText, full && styles.spotsTextFull]}>
                                {full
                                  ? "Full"
                                  : `${spotsLeft} spot${spotsLeft === 1 ? "" : "s"} left`}
                              </Text>
                            </View>
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      </RoleGuard>
    </AuthGate>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  headerTitle: { fontSize: 22, fontWeight: "700", color: "#2C2C2C", letterSpacing: -0.3 },
  bellBtn: { position: "relative", padding: 4 },
  bellDot: {
    position: "absolute", top: 4, right: 4, width: 7, height: 7,
    borderRadius: 4, backgroundColor: "#87A878", borderWidth: 1.5, borderColor: "#FFFFFF",
  },
  searchRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingBottom: 10 },
  searchInputWrap: {
    flex: 1, flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#F9F9F9", borderRadius: 10, borderWidth: 1,
    borderColor: "#EEEEEE", paddingHorizontal: 12, height: 40,
  },
  searchInput: { flex: 1, fontSize: 14, color: "#2C2C2C", height: 40 },
  filterBtn: {
    width: 40, height: 40, borderRadius: 10, backgroundColor: "#F9F9F9",
    borderWidth: 1, borderColor: "#EEEEEE", alignItems: "center", justifyContent: "center",
  },
  filterBtnActive: { backgroundColor: "#87A878", borderColor: "#87A878" },

  timeFilterRow: { paddingHorizontal: 16, paddingBottom: 8, gap: 4 },
  timeFilterBtn: { paddingHorizontal: 12, paddingVertical: 6, alignItems: "center" },
  timeFilterText: { fontSize: 14, fontWeight: "500", color: "#888888" },
  timeFilterTextActive: { fontWeight: "700", color: "#2C2C2C" },
  timeFilterUnderline: {
    position: "absolute", bottom: 0, left: 12, right: 12,
    height: 2, backgroundColor: "#87A878", borderRadius: 1,
  },

  filterRow: { paddingHorizontal: 16, paddingBottom: 10, gap: 8 },
  filterChip: {
    paddingHorizontal: 16, paddingVertical: 7, borderRadius: 8,
    backgroundColor: "#F9F9F9", borderWidth: 1, borderColor: "#EEEEEE",
  },
  filterChipActive: { backgroundColor: "#87A878", borderColor: "#87A878" },
  filterChipText: { fontSize: 13, fontWeight: "500", color: "#888888" },
  filterChipTextActive: { color: "#FFFFFF", fontWeight: "600" },

  feedTabRow: {
    flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#EEEEEE",
    marginHorizontal: 16, marginBottom: 8,
  },
  feedTab: { flex: 1, paddingVertical: 10, alignItems: "center" },
  feedTabActive: { borderBottomWidth: 2, borderBottomColor: "#87A878" },
  feedTabText: { fontSize: 14, fontWeight: "500", color: "#888888" },
  feedTabTextActive: { fontWeight: "700", color: "#2C2C2C" },

  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, paddingBottom: 60 },
  errorText: { fontSize: 14, color: "#888", textAlign: "center" },
  retryBtn: { backgroundColor: "#F0F5EE", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  retryText: { fontSize: 13, fontWeight: "600", color: "#87A878" },
  emptyText: { fontSize: 16, fontWeight: "600", color: "#2C2C2C" },
  emptySubtext: { fontSize: 13, color: "#888888", textAlign: "center", paddingHorizontal: 32 },
  emptyHint: {
    backgroundColor: "#F0F5EE", paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 8, marginTop: 4,
  },
  emptyHintText: { fontSize: 13, fontWeight: "500", color: "#4A7A40" },

  listContent: { paddingHorizontal: 16, paddingTop: 8, gap: 24 },
  daySection: { gap: 8 },
  dayHeader: {
    fontSize: 12, fontWeight: "600", color: "#888888",
    textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2,
  },
  classCard: {
    flexDirection: "row", backgroundColor: "#FFFFFF", borderRadius: 12,
    borderWidth: 1, borderColor: "#EEEEEE", overflow: "hidden",
  },
  classCardBar: { width: 4, alignSelf: "stretch" },
  classCardBody: { flex: 1, padding: 12, gap: 3 },
  classCardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  classCardTime: { fontSize: 12, fontWeight: "600", color: "#888888" },
  categoryBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  categoryBadgeText: { fontSize: 10, fontWeight: "600" },
  classCardTitle: { fontSize: 15, fontWeight: "600", color: "#2C2C2C" },
  classCardHost: { fontSize: 12, color: "#87A878", fontWeight: "500" },
  ratingText: { fontSize: 11, color: "#F4A200", fontWeight: "600" },
  classCardMeta: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 2 },
  urgencyText: { fontSize: 11, color: "#E05555", fontWeight: "600" },
  spotsBadge: { backgroundColor: "#F0F5EE", paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  spotsBadgeFull: { backgroundColor: "#FEF2F2" },
  spotsText: { fontSize: 11, fontWeight: "500", color: "#4A7A40" },
  spotsTextFull: { color: "#EF4444" },
});
