import { useCallback, useMemo, useState } from "react";
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
import { useFocusEffect, useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { AuthGate } from "../../../components/AuthGate";
import { RoleGuard } from "../../../components/RoleGuard";
import { useFilters } from "../../../lib/filtersContext";
import { listClasses, listFollowingClasses } from "../../../lib/api";
import type { ScheduledClass } from "../../../lib/types";

const FILTER_TAGS = ["All", "Yoga", "Dance", "Tutoring"] as const;
type FilterTag = typeof FILTER_TAGS[number];
type TimeFilter = "Today" | "Tomorrow" | "This Week" | "All";
type FeedTab = "For You" | "Following";

const TIME_FILTERS: TimeFilter[] = ["Today", "Tomorrow", "This Week", "All"];
const FEED_TABS: FeedTab[] = ["For You", "Following"];

const CATEGORY_COLORS: Record<string, { bg: string; dot: string; label: string }> = {
  Yoga:     { bg: "#F0F5EE", dot: "#87A878", label: "#4A7A40" },
  Dance:    { bg: "#FDF0F2", dot: "#F4B8C1", label: "#A04060" },
  Tutoring: { bg: "#EEF3F8", dot: "#94B4D2", label: "#3A5F80" },
};

const DAYS_ABB   = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
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
  const spotsPct = 1 - (cls.current_students / cls.max_students);
  const rating = cls.host?.avg_rating ?? 3;
  return (rating * 20) + (spotsPct * 30) + (hoursUntil < 24 ? 20 : 0) - (hoursUntil / 168 * 10);
}

function getTimeRange(filter: TimeFilter): { start: Date; end: Date } | null {
  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  if (filter === "Today") {
    const end = new Date(today);
    end.setHours(23, 59, 59, 999);
    return { start: today, end };
  }
  if (filter === "Tomorrow") {
    const start = new Date(today);
    start.setDate(today.getDate() + 1);
    const end = new Date(start);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }
  if (filter === "This Week") {
    const end = new Date(today);
    end.setDate(today.getDate() + 7);
    end.setHours(23, 59, 59, 999);
    return { start: today, end };
  }
  return null;
}

function getHour(iso: string): number {
  return new Date(iso).getHours();
}

export default function GuestDiscoverTab() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { filters, hasActiveFilters } = useFilters();

  const [allClasses, setAllClasses] = useState<ScheduledClass[]>([]);
  const [followingClasses, setFollowingClasses] = useState<ScheduledClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedTag, setSelectedTag] = useState<FilterTag>("All");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("All");
  const [feedTab, setFeedTab] = useState<FeedTab>("For You");
  const [searchQuery, setSearchQuery] = useState("");

  const loadData = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    setError(null);
    try {
      const [cls, followCls] = await Promise.all([
        listClasses(),
        listFollowingClasses().catch(() => [] as ScheduledClass[]),
      ]);
      setAllClasses(cls);
      setFollowingClasses(followCls);
    } catch {
      setError("Failed to load classes.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData(true);
  }, [loadData]);

  const baseClasses = feedTab === "For You" ? allClasses : followingClasses;

  const filteredClasses = useMemo(() => {
    let result = [...baseClasses];

    if (selectedTag !== "All") {
      result = result.filter((c) => c.category === selectedTag);
    }

    const range = getTimeRange(timeFilter);
    if (range) {
      result = result.filter((c) => {
        const d = new Date(c.scheduled_at);
        return d >= range.start && d <= range.end;
      });
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((c) =>
        c.title.toLowerCase().includes(q) ||
        (c.host?.display_name ?? c.host?.full_name ?? "").toLowerCase().includes(q)
      );
    }

    if (filters.days.length > 0) {
      result = result.filter((c) => {
        const dow = DAYS_ABB[new Date(c.scheduled_at).getDay()];
        return filters.days.includes(dow as never);
      });
    }

    if (filters.times.length > 0) {
      result = result.filter((c) => {
        const h = getHour(c.scheduled_at);
        return filters.times.some((t) => {
          if (t === "morning")   return h >= 6  && h < 12;
          if (t === "afternoon") return h >= 12 && h < 17;
          if (t === "evening")   return h >= 17 && h < 22;
          return false;
        });
      });
    }

    if (feedTab === "For You") {
      result.sort((a, b) => smartScore(b) - smartScore(a));
    }

    return result;
  }, [baseClasses, selectedTag, timeFilter, searchQuery, filters, feedTab]); // eslint-disable-line react-hooks/exhaustive-deps

  const sections = useMemo(() => {
    const dayMap = new Map<string, { date: Date; classes: ScheduledClass[] }>();
    for (const cls of filteredClasses) {
      const d = new Date(cls.scheduled_at);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!dayMap.has(key)) {
        const dayStart = new Date(d);
        dayStart.setHours(0, 0, 0, 0);
        dayMap.set(key, { date: dayStart, classes: [] });
      }
      dayMap.get(key)!.classes.push(cls);
    }
    return Array.from(dayMap.values()).sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [filteredClasses]);

  const isFiltering = searchQuery.trim().length > 0 || hasActiveFilters;

  const renderEmpty = () => {
    if (feedTab === "Following" && followingClasses.length === 0) {
      return (
        <View style={styles.centered}>
          <View style={styles.emptyIconWrap}>
            <MaterialCommunityIcons name="account-heart-outline" size={36} color="#C0C0C0" />
          </View>
          <Text style={styles.emptyText}>No instructors followed yet</Text>
          <Text style={styles.emptySubtext}>Follow instructors to see their classes here</Text>
          <TouchableOpacity
            style={styles.emptyHint}
            onPress={() => setFeedTab("For You")}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="arrow-right" size={14} color="#87A878" />
            <Text style={styles.emptyHintText}>Browse classes →</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <View style={styles.centered}>
        <View style={styles.emptyIconWrap}>
          <MaterialCommunityIcons
            name={isFiltering ? "filter-remove-outline" : "calendar-blank-outline"}
            size={36}
            color="#C0C0C0"
          />
        </View>
        <Text style={styles.emptyText}>
          {isFiltering ? "No matching classes" : "No classes found"}
        </Text>
        <Text style={styles.emptySubtext}>
          {isFiltering ? "Try adjusting your search or filters" : "Check back soon for new classes"}
        </Text>
        {isFiltering && (
          <TouchableOpacity
            style={styles.emptyHint}
            onPress={() => setSearchQuery("")}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="close" size={14} color="#87A878" />
            <Text style={styles.emptyHintText}>Clear search</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

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

          {/* Search bar + filter icon */}
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

          {/* Time filter tab bar */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.timeFilterRow}
          >
            {TIME_FILTERS.map((tf) => (
              <TouchableOpacity
                key={tf}
                style={styles.timeFilterItem}
                onPress={() => setTimeFilter(tf)}
                activeOpacity={0.75}
              >
                <Text style={[styles.timeFilterText, timeFilter === tf && styles.timeFilterTextActive]}>
                  {tf}
                </Text>
                {timeFilter === tf && <View style={styles.timeFilterUnderline} />}
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
                <Text style={[styles.filterChipText, selectedTag === tag && styles.filterChipTextActive]}>
                  {tag}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Feed tabs */}
          <View style={styles.feedTabsRow}>
            {FEED_TABS.map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[styles.feedTab, feedTab === tab && styles.feedTabActive]}
                onPress={() => setFeedTab(tab)}
                activeOpacity={0.75}
              >
                <Text style={[styles.feedTabText, feedTab === tab && styles.feedTabTextActive]}>
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
              <View style={styles.emptyIconWrap}>
                <MaterialCommunityIcons name="wifi-off" size={36} color="#C0C0C0" />
              </View>
              <Text style={styles.emptyText}>Couldn't load classes</Text>
              <TouchableOpacity
                style={styles.emptyHint}
                onPress={() => loadData()}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons name="refresh" size={14} color="#87A878" />
                <Text style={styles.emptyHintText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : sections.length === 0 ? (
            renderEmpty()
          ) : (
            <ScrollView
              contentContainerStyle={[styles.calendarContent, { paddingBottom: insets.bottom + 32 }]}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#87A878" />
              }
            >
              {sections.map(({ date, classes: dayCls }) => (
                <View key={date.toISOString()} style={styles.daySection}>
                  <Text style={styles.dayHeader}>{fmtDayHeader(date)}</Text>
                  {dayCls.map((cls) => {
                    const colors = CATEGORY_COLORS[cls.category];
                    const spotsLeft = cls.max_students - cls.current_students;
                    const full = spotsLeft <= 0;
                    const avgRating = cls.host?.avg_rating;
                    const instructorName = cls.host?.display_name ?? cls.host?.full_name ?? "Instructor";
                    return (
                      <TouchableOpacity
                        key={cls.id}
                        style={styles.classCard}
                        onPress={() => router.push(`/guest/class/${cls.id}`)}
                        activeOpacity={0.85}
                      >
                        <View style={[styles.classCardBar, { backgroundColor: colors?.dot ?? "#EEEEEE" }]} />
                        <View style={styles.classCardBody}>
                          <View style={styles.classCardTop}>
                            <Text style={styles.classCardTime}>{formatTime(cls.scheduled_at)}</Text>
                            <View style={[styles.categoryBadge, { backgroundColor: colors?.bg ?? "#F9F9F9" }]}>
                              <Text style={[styles.categoryBadgeText, { color: colors?.label ?? "#888888" }]}>
                                {cls.category}
                              </Text>
                            </View>
                          </View>
                          <Text style={styles.classCardTitle} numberOfLines={1}>{cls.title}</Text>
                          <View style={styles.classCardMeta}>
                            <View style={styles.classCardHostCol}>
                              <TouchableOpacity
                                onPress={(e) => {
                                  e.stopPropagation();
                                  router.push(`/guest/instructor/${cls.host_id}`);
                                }}
                                activeOpacity={0.7}
                              >
                                <Text style={styles.classCardHost}>with {instructorName}</Text>
                              </TouchableOpacity>
                              {avgRating != null && (
                                <Text style={styles.classCardRating}>★ {avgRating.toFixed(1)}</Text>
                              )}
                            </View>
                            <View style={styles.classCardBadges}>
                              {!full && spotsLeft <= 3 && (
                                <Text style={styles.urgencyText}>🔥 {spotsLeft} left</Text>
                              )}
                              <View style={[styles.spotsBadge, full && styles.spotsBadgeFull]}>
                                <Text style={[styles.spotsText, full && styles.spotsTextFull]}>
                                  {full ? "Full" : `${spotsLeft} spot${spotsLeft === 1 ? "" : "s"} left`}
                                </Text>
                              </View>
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
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#2C2C2C",
    letterSpacing: -0.3,
  },
  bellBtn: {
    position: "relative",
    padding: 4,
  },
  bellDot: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#87A878",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  searchInputWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F9F9F9",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#EEEEEE",
    paddingHorizontal: 12,
    height: 40,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#2C2C2C",
    height: 40,
  },
  filterBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#F9F9F9",
    borderWidth: 1,
    borderColor: "#EEEEEE",
    alignItems: "center",
    justifyContent: "center",
  },
  filterBtnActive: {
    backgroundColor: "#87A878",
    borderColor: "#87A878",
  },
  timeFilterRow: {
    paddingHorizontal: 16,
    paddingBottom: 4,
    gap: 4,
  },
  timeFilterItem: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: "center",
    position: "relative",
  },
  timeFilterText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#888888",
  },
  timeFilterTextActive: {
    fontWeight: "700",
    color: "#2C2C2C",
  },
  timeFilterUnderline: {
    position: "absolute",
    bottom: 0,
    left: 14,
    right: 14,
    height: 2,
    borderRadius: 1,
    backgroundColor: "#87A878",
  },
  filterRow: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: "#F9F9F9",
    borderWidth: 1,
    borderColor: "#EEEEEE",
  },
  filterChipActive: {
    backgroundColor: "#87A878",
    borderColor: "#87A878",
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#888888",
  },
  filterChipTextActive: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  feedTabsRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#EEEEEE",
  },
  feedTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 8,
    backgroundColor: "#F9F9F9",
    borderWidth: 1,
    borderColor: "#EEEEEE",
  },
  feedTabActive: {
    backgroundColor: "#F0F5EE",
    borderColor: "#87A878",
  },
  feedTabText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#888888",
  },
  feedTabTextActive: {
    fontWeight: "700",
    color: "#4A7A40",
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingBottom: 60,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#F9F9F9",
    borderWidth: 1,
    borderColor: "#EEEEEE",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2C2C2C",
  },
  emptySubtext: {
    fontSize: 13,
    color: "#888888",
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 32,
  },
  emptyHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F0F5EE",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 4,
  },
  emptyHintText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#4A7A40",
  },
  calendarContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 24,
  },
  daySection: {
    gap: 8,
  },
  dayHeader: {
    fontSize: 12,
    fontWeight: "600",
    color: "#888888",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  classCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EEEEEE",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  classCardBar: {
    width: 4,
    alignSelf: "stretch",
  },
  classCardBody: {
    flex: 1,
    padding: 12,
    gap: 3,
  },
  classCardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  classCardTime: {
    fontSize: 12,
    fontWeight: "600",
    color: "#888888",
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  categoryBadgeText: {
    fontSize: 10,
    fontWeight: "600",
  },
  classCardTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#2C2C2C",
  },
  classCardMeta: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginTop: 2,
  },
  classCardHostCol: {
    flex: 1,
    gap: 2,
  },
  classCardHost: {
    fontSize: 12,
    color: "#888888",
  },
  classCardRating: {
    fontSize: 11,
    fontWeight: "600",
    color: "#F4A200",
  },
  classCardBadges: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  urgencyText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#F97316",
  },
  spotsBadge: {
    backgroundColor: "#F0F5EE",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  spotsBadgeFull: {
    backgroundColor: "#FEF2F2",
  },
  spotsText: {
    fontSize: 11,
    fontWeight: "500",
    color: "#4A7A40",
  },
  spotsTextFull: {
    color: "#EF4444",
  },
});
