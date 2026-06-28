import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
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
import { useAuth } from "../../../lib/auth";
import { listClasses, listFollowingClasses } from "../../../lib/api";
import { useBreakpoint } from "../../../lib/useBreakpoint";
import type { ScheduledClass } from "../../../lib/types";
import { fonts } from "../../../lib/fonts";

const FILTER_TAGS = ["All", "Yoga", "Dance", "Tutoring"] as const;
type FilterTag = (typeof FILTER_TAGS)[number];
type TimeFilter = "Today" | "Tomorrow" | "This Week" | "All";
type FeedTab = "For You" | "Following";

const CATEGORY_COLORS: Record<string, { bg: string; dot: string; label: string }> = {
  yoga:     { bg: "#E0F7F5", dot: "#00B4A6", label: "#007A70" },
  dance:    { bg: "#FEE8EC", dot: "#F4B8C1", label: "#C0406A" },
  tutoring: { bg: "#FFF9E6", dot: "#FFD66B", label: "#A0820A" },
  Yoga:     { bg: "#E0F7F5", dot: "#00B4A6", label: "#007A70" },
  Dance:    { bg: "#FEE8EC", dot: "#F4B8C1", label: "#C0406A" },
  Tutoring: { bg: "#FFF9E6", dot: "#FFD66B", label: "#A0820A" },
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

function formatFullDateTime(iso: string): string {
  const d = new Date(iso);
  return `${DAYS_ABB[d.getDay()]}, ${MONTHS_ABB[d.getMonth()]} ${d.getDate()} · ${formatTime(iso)}`;
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

// ── Featured instructor card (desktop only) ───────────────────────────────────

function FeaturedInstructorCard({
  id,
  name,
  rating,
  initials,
  onPress,
}: {
  id: string;
  name: string;
  rating: number | null;
  initials: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={(state: any) => [
        styles.featuredCard,
        state.hovered && styles.featuredCardHovered,
      ]}
      onPress={onPress}
    >
      <View style={styles.featuredAvatar}>
        <Text style={styles.featuredInitials}>{initials}</Text>
      </View>
      <Text style={styles.featuredName} numberOfLines={1}>{name}</Text>
      {rating != null && (
        <Text style={styles.featuredRating}>★ {rating.toFixed(1)}</Text>
      )}
      <View style={styles.featuredFollowBtn}>
        <Text style={styles.featuredFollowText}>Follow</Text>
      </View>
    </Pressable>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function GuestDiscoverTab() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { filters, hasActiveFilters } = useFilters();
  const { isDesktop } = useBreakpoint();
  const { session } = useAuth();

  const [selectedTag, setSelectedTag] = useState<FilterTag>("All");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("All");
  const [feedTab, setFeedTab] = useState<FeedTab>("For You");
  const [searchQuery, setSearchQuery] = useState("");

  const [forYouClasses, setForYouClasses] = useState<ScheduledClass[]>([]);
  const [followingClasses, setFollowingClasses] = useState<ScheduledClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Greeting
  const firstName = session?.user?.email?.split("@")[0]?.split(".")[0] ?? "there";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const loadData = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    setError(null);
    const base = process.env.EXPO_PUBLIC_API_BASE_URL ?? "(no API_BASE_URL set)";
    console.log("[Discover] loadData — API_BASE_URL:", base);
    try {
      const [forYou, following] = await Promise.all([
        listClasses().catch((err) => {
          console.error("[Discover] GET", `${base}/api/classes`, "→", err);
          throw err;
        }),
        listFollowingClasses().catch((err) => {
          console.error("[Discover] GET", `${base}/api/classes/following`, "→", err);
          throw err;
        }),
      ]);
      setForYouClasses(forYou);
      setFollowingClasses(following);
    } catch (err) {
      console.error("[Discover] loadData failed:", err);
      setError(err instanceof Error ? err.message : "Failed to load classes.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const onRefresh = () => { setRefreshing(true); loadData(true); };

  const featuredInstructors = useMemo(() => {
    const seen = new Set<string>();
    return forYouClasses.reduce<Array<{ id: string; name: string; rating: number | null; initials: string }>>((acc, cls) => {
      if (!seen.has(cls.host_id)) {
        seen.add(cls.host_id);
        const name = (cls.host as any)?.display_name ?? "Instructor";
        acc.push({ id: cls.host_id, name, rating: (cls.host as any)?.avg_rating ?? null, initials: name.slice(0, 2).toUpperCase() });
      }
      return acc;
    }, []).slice(0, 8);
  }, [forYouClasses]);

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

    result.sort((a, b) => smartScore(b) - smartScore(a));
    return result;
  };

  const activeClasses = applyFilters(
    feedTab === "For You" ? forYouClasses : followingClasses
  );

  const grouped: { date: Date; classes: ScheduledClass[] }[] = [];
  for (const cls of activeClasses) {
    const d = new Date(cls.scheduled_at);
    const existing = grouped.find((g) => isSameDay(g.date, d));
    if (existing) existing.classes.push(cls);
    else grouped.push({ date: d, classes: [cls] });
  }

  const TIME_FILTERS: TimeFilter[] = ["Today", "Tomorrow", "This Week", "All"];

  const renderCard = (cls: ScheduledClass) => {
    const colors = CATEGORY_COLORS[cls.category];
    const spotsLeft = cls.max_students - cls.current_students;
    const full = spotsLeft <= 0;
    const urgent = spotsLeft <= 3 && !full;
    const hostName = (cls.host as any)?.display_name ?? "Instructor";
    const avgRating = (cls.host as any)?.avg_rating;
    const bio: string | null = (cls as any)?.host?.bio ?? cls.description ?? null;

    return (
      <Pressable
        key={cls.id}
        style={(state: any) => [
          styles.classCard,
          isDesktop && styles.classCardDesktop,
          state.hovered && styles.classCardHovered,
        ]}
        onPress={() => router.push(`/guest/class/${cls.id}`)}
      >
        <View style={[styles.classCardBar, { backgroundColor: colors?.dot ?? "#EEEEEE" }]} />
        <View style={[styles.classCardBody, isDesktop && styles.classCardBodyDesktop]}>
          <View style={styles.classCardTop}>
            <Text style={[styles.classCardTime, isDesktop && styles.classCardTimeDesktop]}>
              {isDesktop ? formatFullDateTime(cls.scheduled_at) : formatTime(cls.scheduled_at)}
            </Text>
            <View style={[styles.categoryBadge, { backgroundColor: colors?.bg ?? "#F9F9F9" }]}>
              <Text style={[styles.categoryBadgeText, { color: colors?.label ?? "#888888" }]}>
                {cls.category}
              </Text>
            </View>
          </View>
          <Text style={[styles.classCardTitle, isDesktop && styles.classCardTitleDesktop]} numberOfLines={1}>
            {cls.title}
          </Text>
          <Pressable onPress={() => router.push(`/guest/instructor/${cls.host_id}`)}>
            <Text style={styles.classCardHost}>with {hostName}</Text>
          </Pressable>
          {isDesktop && bio && (
            <Text style={styles.classCardBio} numberOfLines={1}>{bio}</Text>
          )}
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
                {full ? "Full" : `${spotsLeft} spot${spotsLeft === 1 ? "" : "s"} left`}
              </Text>
            </View>
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <AuthGate>
      <RoleGuard requiredRole="guest">
        <View style={[styles.container, { paddingTop: isDesktop ? 0 : insets.top }]}>

          {/* Header with greeting */}
          <View style={[styles.header, isDesktop && styles.headerDesktop]}>
            <View style={styles.headerLeft}>
              <Text style={[styles.greetingLine, isDesktop && styles.greetingLineDesktop]}>
                {greeting},
              </Text>
              <Text style={[styles.headerTitle, isDesktop && styles.headerTitleDesktop]}>
                {firstName}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.bellBtn}
              onPress={() => router.push("/notifications")}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="bell-outline" size={22} color="#1A1A1A" />
              <View style={styles.bellDot} />
            </TouchableOpacity>
          </View>

          {/* Search bar */}
          <View style={[styles.searchRow, isDesktop && styles.searchRowDesktop]}>
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
                color={hasActiveFilters ? "#FFFFFF" : "#1A1A1A"}
              />
            </TouchableOpacity>
          </View>

          {/* Time filter tabs */}
          {isDesktop ? (
            <View style={styles.desktopFiltersRow}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.timeFilterRowInline}
              >
                {TIME_FILTERS.map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={styles.timeFilterBtn}
                    onPress={() => setTimeFilter(t)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.timeFilterText, timeFilter === t && styles.timeFilterTextActive]}>
                      {t}
                    </Text>
                    {timeFilter === t && <View style={styles.timeFilterUnderline} />}
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <View style={styles.desktopFilterDivider} />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterRowInline}
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
            </View>
          ) : (
            <>
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
                    <Text style={[styles.timeFilterText, timeFilter === t && styles.timeFilterTextActive]}>
                      {t}
                    </Text>
                    {timeFilter === t && <View style={styles.timeFilterUnderline} />}
                  </TouchableOpacity>
                ))}
              </ScrollView>
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
            </>
          )}

          {/* Feed tabs — pill switcher */}
          <View style={[styles.feedTabPillRow, isDesktop && styles.feedTabPillRowDesktop]}>
            {(["For You", "Following"] as FeedTab[]).map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[styles.feedTabPill, feedTab === tab && styles.feedTabPillActive]}
                onPress={() => setFeedTab(tab)}
                activeOpacity={0.7}
              >
                <Text style={[styles.feedTabPillText, feedTab === tab && styles.feedTabPillTextActive]}>
                  {tab}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Content */}
          {loading ? (
            <View style={styles.centered}>
              <ActivityIndicator color="#00B4A6" />
            </View>
          ) : error ? (
            <View style={styles.centered}>
              <MaterialCommunityIcons name="alert-circle-outline" size={36} color="#E0F7F5" />
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={() => loadData()} activeOpacity={0.7}>
                <Text style={styles.retryText}>Try again</Text>
              </TouchableOpacity>
            </View>
          ) : feedTab === "Following" && followingClasses.length === 0 ? (
            <View style={styles.centered}>
              <MaterialCommunityIcons name="account-heart-outline" size={40} color="#D0D0D0" />
              <Text style={styles.emptyText}>No classes from people you follow</Text>
              <Text style={styles.emptySubtext}>Follow instructors to see their classes here</Text>
              <TouchableOpacity style={styles.emptyHint} onPress={() => setFeedTab("For You")} activeOpacity={0.7}>
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
                isDesktop && styles.listContentDesktop,
                { paddingBottom: isDesktop ? 40 : insets.bottom + 32 },
              ]}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00B4A6" />
              }
            >
              {/* Featured instructors (desktop only) */}
              {isDesktop && featuredInstructors.length > 0 && (
                <View style={styles.featuredSection}>
                  <Text style={styles.featuredTitle}>Featured Instructors</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.featuredScroll}
                  >
                    {featuredInstructors.map((inst) => (
                      <FeaturedInstructorCard
                        key={inst.id}
                        {...inst}
                        onPress={() => router.push(`/guest/instructor/${inst.id}`)}
                      />
                    ))}
                  </ScrollView>
                </View>
              )}

              {grouped.map(({ date, classes: dayCls }) => (
                <View key={date.toISOString()} style={styles.daySection}>
                  <Text style={styles.dayHeader}>{fmtDayHeader(date)}</Text>
                  {isDesktop ? (
                    <View style={styles.cardGrid}>
                      {dayCls.map((cls) => (
                        <View key={cls.id} style={styles.cardGridItem}>
                          {renderCard(cls)}
                        </View>
                      ))}
                      {dayCls.length % 2 !== 0 && <View style={styles.cardGridItem} />}
                    </View>
                  ) : (
                    dayCls.map((cls) => renderCard(cls))
                  )}
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

  // ── Header ──────────────────────────────────────────────────────────────────
  header: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerDesktop: { paddingTop: 28, paddingBottom: 16, paddingHorizontal: 32 },
  headerLeft: { gap: 1 },
  greetingLine: { fontSize: 13, fontFamily: fonts.regular, color: "#888888" },
  greetingLineDesktop: { fontSize: 15 },
  headerTitle: { fontSize: 24, fontWeight: "700", fontFamily: fonts.bold, color: "#1A1A1A", letterSpacing: -0.5 },
  headerTitleDesktop: { fontSize: 36, letterSpacing: -0.8 },
  bellBtn: { position: "relative", padding: 4, marginBottom: 2 },
  bellDot: {
    position: "absolute", top: 4, right: 4, width: 7, height: 7,
    borderRadius: 4, backgroundColor: "#00B4A6", borderWidth: 1.5, borderColor: "#FFFFFF",
  },

  // ── Search ──────────────────────────────────────────────────────────────────
  searchRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 20, paddingBottom: 10 },
  searchRowDesktop: { paddingHorizontal: 32 },
  searchInputWrap: {
    flex: 1, flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#F7F7F7", borderRadius: 10, borderWidth: 1,
    borderColor: "#F0F0F0", paddingHorizontal: 12, height: 44,
  },
  searchInput: { flex: 1, fontSize: 14, fontFamily: fonts.regular, color: "#1A1A1A", height: 44 },
  filterBtn: {
    width: 44, height: 44, borderRadius: 10, backgroundColor: "#F7F7F7",
    borderWidth: 1, borderColor: "#F0F0F0", alignItems: "center", justifyContent: "center",
  },
  filterBtnActive: { backgroundColor: "#00B4A6", borderColor: "#00B4A6" },

  // ── Filters ─────────────────────────────────────────────────────────────────
  desktopFiltersRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 32,
    paddingBottom: 12,
    gap: 8,
  },
  desktopFilterDivider: { width: 1, height: 20, backgroundColor: "#F0F0F0" },
  timeFilterRow: { paddingHorizontal: 20, paddingBottom: 8, gap: 4 },
  timeFilterRowInline: { gap: 4 },
  timeFilterBtn: { paddingHorizontal: 12, paddingVertical: 6, alignItems: "center" },
  timeFilterText: { fontSize: 14, fontWeight: "500", fontFamily: fonts.medium, color: "#888888" },
  timeFilterTextActive: { fontWeight: "700", fontFamily: fonts.bold, color: "#1A1A1A" },
  timeFilterUnderline: {
    position: "absolute", bottom: 0, left: 12, right: 12,
    height: 2, backgroundColor: "#00B4A6", borderRadius: 1,
  },
  filterRow: { paddingHorizontal: 20, paddingBottom: 10, gap: 8 },
  filterRowInline: { gap: 8 },
  filterChip: {
    paddingHorizontal: 16, paddingVertical: 7, borderRadius: 9999,
    backgroundColor: "#F7F7F7", borderWidth: 1, borderColor: "#F0F0F0",
  },
  filterChipActive: { backgroundColor: "#00B4A6", borderColor: "#00B4A6" },
  filterChipText: { fontSize: 13, fontWeight: "500", fontFamily: fonts.medium, color: "#666666" },
  filterChipTextActive: { color: "#FFFFFF", fontWeight: "600", fontFamily: fonts.bold },

  // ── Feed tabs — pill switcher ────────────────────────────────────────────────
  feedTabPillRow: {
    flexDirection: "row",
    backgroundColor: "#F7F7F7",
    borderRadius: 9999,
    padding: 3,
    marginHorizontal: 20,
    marginBottom: 14,
    alignSelf: "flex-start",
  },
  feedTabPillRowDesktop: { marginHorizontal: 32, alignSelf: "flex-start" },
  feedTabPill: {
    paddingHorizontal: 22,
    paddingVertical: 8,
    borderRadius: 9999,
  },
  feedTabPillActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  feedTabPillText: { fontSize: 14, fontFamily: fonts.medium, color: "#888888" },
  feedTabPillTextActive: { color: "#1A1A1A", fontWeight: "700", fontFamily: fonts.bold },

  // ── States ──────────────────────────────────────────────────────────────────
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, paddingBottom: 60 },
  errorText: { fontSize: 14, fontFamily: fonts.regular, color: "#888", textAlign: "center" },
  retryBtn: { backgroundColor: "#E0F7F5", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 9999 },
  retryText: { fontSize: 13, fontWeight: "600", fontFamily: fonts.bold, color: "#00B4A6" },
  emptyText: { fontSize: 16, fontWeight: "600", fontFamily: fonts.bold, color: "#1A1A1A" },
  emptySubtext: { fontSize: 13, fontFamily: fonts.regular, color: "#888888", textAlign: "center", paddingHorizontal: 32 },
  emptyHint: { backgroundColor: "#E0F7F5", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 9999, marginTop: 4 },
  emptyHintText: { fontSize: 13, fontWeight: "500", fontFamily: fonts.medium, color: "#007A70" },

  // ── List / grid ──────────────────────────────────────────────────────────────
  listContent: { paddingHorizontal: 20, paddingTop: 4, gap: 24 },
  listContentDesktop: { paddingHorizontal: 32 },
  daySection: { gap: 12 },
  dayHeader: {
    fontSize: 12, fontWeight: "600", fontFamily: fonts.bold, color: "#888888",
    textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2,
  },

  // Desktop 2-column grid
  cardGrid: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
  cardGridItem: { flex: 1, minWidth: 260, maxWidth: "50%" as any },

  // ── Class card ──────────────────────────────────────────────────────────────
  classCard: {
    flexDirection: "row", backgroundColor: "#FFFFFF", borderRadius: 16,
    borderWidth: 1, borderColor: "#F0F0F0", overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  classCardDesktop: {
    borderRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 4,
  },
  classCardHovered: {
    borderColor: "#9FE0DC",
    shadowColor: "#00B4A6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 14,
    elevation: 4,
  },
  classCardBar: { width: 4, alignSelf: "stretch" },
  classCardBody: { flex: 1, padding: 14, gap: 4 },
  classCardBodyDesktop: { padding: 20, gap: 6 },
  classCardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  classCardTime: { fontSize: 12, fontWeight: "600", fontFamily: fonts.medium, color: "#888888" },
  classCardTimeDesktop: { fontSize: 13 },
  categoryBadge: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 9999 },
  categoryBadgeText: { fontSize: 10, fontWeight: "600", fontFamily: fonts.medium },
  classCardTitle: { fontSize: 15, fontWeight: "600", fontFamily: fonts.bold, color: "#1A1A1A" },
  classCardTitleDesktop: { fontSize: 17 },
  classCardHost: { fontSize: 12, color: "#00B4A6", fontWeight: "500", fontFamily: fonts.medium },
  classCardBio: { fontSize: 13, fontFamily: fonts.regular, color: "#666666", lineHeight: 18 },
  ratingText: { fontSize: 11, color: "#F4A200", fontWeight: "600", fontFamily: fonts.bold },
  classCardMeta: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 2 },
  urgencyText: { fontSize: 11, color: "#E5484D", fontWeight: "600", fontFamily: fonts.bold },
  spotsBadge: { backgroundColor: "#E0F7F5", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 9999 },
  spotsBadgeFull: { backgroundColor: "#FEF2F2" },
  spotsText: { fontSize: 11, fontWeight: "500", fontFamily: fonts.medium, color: "#007A70" },
  spotsTextFull: { color: "#E5484D" },

  // ── Featured instructors (desktop) ──────────────────────────────────────────
  featuredSection: { gap: 12, marginBottom: 8 },
  featuredTitle: { fontSize: 16, fontWeight: "700", fontFamily: fonts.bold, color: "#1A1A1A" },
  featuredScroll: { gap: 12, paddingBottom: 4 },
  featuredCard: {
    width: 140,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F0F0F0",
    padding: 16,
    alignItems: "center",
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  featuredCardHovered: {
    borderColor: "#9FE0DC",
    shadowColor: "#00B4A6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 4,
  },
  featuredAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#E0F7F5",
    alignItems: "center",
    justifyContent: "center",
  },
  featuredInitials: { fontSize: 18, fontWeight: "700", fontFamily: fonts.bold, color: "#00B4A6" },
  featuredName: { fontSize: 13, fontWeight: "600", fontFamily: fonts.bold, color: "#1A1A1A", textAlign: "center" },
  featuredRating: { fontSize: 12, color: "#F4A200", fontWeight: "500", fontFamily: fonts.medium },
  featuredFollowBtn: {
    backgroundColor: "#E0F7F5",
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 9999,
    marginTop: 2,
  },
  featuredFollowText: { fontSize: 12, fontWeight: "600", fontFamily: fonts.bold, color: "#007A70" },
});
