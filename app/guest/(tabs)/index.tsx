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
import { listClasses, listFollowingClasses } from "../../../lib/api";
import { useBreakpoint } from "../../../lib/useBreakpoint";
import type { ScheduledClass } from "../../../lib/types";
import { fonts } from "../../../lib/fonts";

const FILTER_TAGS = ["All", "Yoga", "Dance", "Tutoring"] as const;
type FilterTag = (typeof FILTER_TAGS)[number];
type TimeFilter = "Today" | "Tomorrow" | "This Week" | "All";
type FeedTab = "For You" | "Following";

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  yoga:     { bg: "#D4EDE8", text: "#0F7B6B" },
  dance:    { bg: "#F9E0E4", text: "#B03050" },
  chess:    { bg: "#DDE8F5", text: "#2060A0" },
  piano:    { bg: "#EDE0F5", text: "#7030A0" },
  cooking:  { bg: "#F5EBD8", text: "#A06020" },
  tutoring: { bg: "#F5F0D8", text: "#806020" },
  Yoga:     { bg: "#D4EDE8", text: "#0F7B6B" },
  Dance:    { bg: "#F9E0E4", text: "#B03050" },
  Chess:    { bg: "#DDE8F5", text: "#2060A0" },
  Piano:    { bg: "#EDE0F5", text: "#7030A0" },
  Cooking:  { bg: "#F5EBD8", text: "#A06020" },
  Tutoring: { bg: "#F5F0D8", text: "#806020" },
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
    const colors = CATEGORY_COLORS[cls.category] ?? { bg: "#F5F5F5", text: "#6B6B6B" };
    const spotsLeft = cls.max_students - cls.current_students;
    const full = spotsLeft <= 0;
    const urgent = spotsLeft <= 3 && !full;
    const hostName = (cls.host as any)?.display_name ?? "Instructor";
    const avgRating = (cls.host as any)?.avg_rating;
    const bio: string | null = (cls as any)?.host?.bio ?? cls.description ?? null;
    const isSeries = cls.class_type === "series";
    const isDropin = cls.class_type === "dropin";
    const priceDollars = cls.price_cents ? (cls.price_cents / 100).toFixed(0) : null;

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
        <View style={styles.cardTopRow}>
          <Text style={[styles.classCardCategory, { color: colors.text }]}>
            {cls.category.toUpperCase()}
          </Text>
          <View style={styles.badgeRow}>
            {isSeries && cls.series_week != null && cls.total_weeks != null && (
              <View style={styles.seriesBadge}>
                <Text style={styles.seriesBadgeText}>Week {cls.series_week} of {cls.total_weeks}</Text>
              </View>
            )}
            {isDropin && (
              <View style={styles.dropinBadge}>
                <Text style={styles.dropinBadgeText}>Drop-in</Text>
              </View>
            )}
            {cls.is_series_enrolled && (
              <View style={styles.enrolledBadge}>
                <Text style={styles.enrolledBadgeText}>✓ Enrolled</Text>
              </View>
            )}
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
          <Text style={styles.classCardTime}>
            {isDesktop ? formatFullDateTime(cls.scheduled_at) : formatTime(cls.scheduled_at)}
          </Text>
          <View style={styles.classCardRight}>
            {priceDollars && (
              <Text style={styles.priceText}>${priceDollars}</Text>
            )}
            {urgent && (
              <Text style={styles.urgencyText}>{spotsLeft} left</Text>
            )}
            <View style={[styles.spotsBadge, full && styles.spotsBadgeFull]}>
              <Text style={[styles.spotsText, full && styles.spotsTextFull]}>
                {full ? "Full" : `${spotsLeft}/${cls.max_students}`}
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

          {/* Header */}
          <View style={[styles.header, isDesktop && styles.headerDesktop]}>
            <Text style={[styles.headerTitle, isDesktop && styles.headerTitleDesktop]}>
              Discover classes
            </Text>
            <TouchableOpacity
              style={styles.bellBtn}
              onPress={() => router.push("/notifications")}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="bell-outline" size={20} color="#0F0F0F" />
            </TouchableOpacity>
          </View>

          {/* Search bar */}
          <View style={[styles.searchRow, isDesktop && styles.searchRowDesktop]}>
            <View style={styles.searchInputWrap}>
              <MaterialCommunityIcons name="magnify" size={16} color="#B0B0B0" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by class or instructor…"
                placeholderTextColor="#B0B0B0"
                value={searchQuery}
                onChangeText={setSearchQuery}
                returnKeyType="search"
                autoCorrect={false}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery("")} activeOpacity={0.7}>
                  <MaterialCommunityIcons name="close-circle" size={14} color="#C0C0C0" />
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
                size={16}
                color={hasActiveFilters ? "#FFFFFF" : "#0F0F0F"}
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

          {/* Feed tabs — simple underline tabs */}
          <View style={[styles.feedTabRow, isDesktop && styles.feedTabRowDesktop]}>
            {(["For You", "Following"] as FeedTab[]).map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[styles.feedTab, feedTab === tab && styles.feedTabActive]}
                onPress={() => setFeedTab(tab)}
                activeOpacity={0.7}
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
              <ActivityIndicator color="#0F0F0F" />
            </View>
          ) : error ? (
            <View style={styles.centered}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={() => loadData()} activeOpacity={0.7}>
                <Text style={styles.retryText}>Try again</Text>
              </TouchableOpacity>
            </View>
          ) : feedTab === "Following" && followingClasses.length === 0 ? (
            <View style={styles.centered}>
              <Text style={styles.emptyText}>No classes from people you follow</Text>
              <Text style={styles.emptySubtext}>Follow instructors to see their classes here</Text>
              <TouchableOpacity style={styles.emptyHint} onPress={() => setFeedTab("For You")} activeOpacity={0.7}>
                <Text style={styles.emptyHintText}>Browse classes →</Text>
              </TouchableOpacity>
            </View>
          ) : grouped.length === 0 ? (
            <View style={styles.centered}>
              <Text style={styles.emptyText}>No classes found</Text>
              <Text style={styles.emptySubtext}>Try a different filter</Text>
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
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0F0F0F" />
              }
            >
              {/* Featured instructors (desktop only) */}
              {isDesktop && featuredInstructors.length > 0 && (
                <View style={styles.featuredSection}>
                  <Text style={styles.featuredTitle}>INSTRUCTORS</Text>
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
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
  },
  headerDesktop: { paddingTop: 32, paddingBottom: 16, paddingHorizontal: 32 },
  headerTitle: {
    fontSize: 24,
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: "#0F0F0F",
    letterSpacing: -0.5,
  },
  headerTitleDesktop: { fontSize: 28, letterSpacing: -0.5 },
  bellBtn: { padding: 4 },

  // ── Search ──────────────────────────────────────────────────────────────────
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  searchRowDesktop: { paddingHorizontal: 32 },
  searchInputWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#E8E8E8",
    paddingHorizontal: 12,
    height: 40,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: fonts.regular,
    color: "#0F0F0F",
    height: 40,
  },
  filterBtn: {
    width: 40,
    height: 40,
    borderRadius: 6,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E8E8E8",
    alignItems: "center",
    justifyContent: "center",
  },
  filterBtnActive: { backgroundColor: "#0F0F0F", borderColor: "#0F0F0F" },

  // ── Filters ─────────────────────────────────────────────────────────────────
  desktopFiltersRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 32,
    paddingBottom: 8,
    gap: 8,
  },
  desktopFilterDivider: { width: 1, height: 16, backgroundColor: "#E8E8E8", marginHorizontal: 4 },
  timeFilterRow: { paddingHorizontal: 24, paddingBottom: 8, gap: 0 },
  timeFilterRowInline: { gap: 0 },
  timeFilterBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: "center",
    position: "relative",
  },
  timeFilterText: {
    fontSize: 14,
    fontFamily: fonts.medium,
    fontWeight: "500",
    color: "#6B6B6B",
  },
  timeFilterTextActive: {
    color: "#0F0F0F",
    fontFamily: fonts.bold,
    fontWeight: "700",
  },
  timeFilterUnderline: {
    position: "absolute",
    bottom: 0,
    left: 12,
    right: 12,
    height: 2,
    backgroundColor: "#0F0F0F",
  },
  filterRow: { paddingHorizontal: 24, paddingBottom: 12, gap: 6 },
  filterRowInline: { gap: 6 },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 4,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E8E8E8",
  },
  filterChipActive: { backgroundColor: "#0F0F0F", borderColor: "#0F0F0F" },
  filterChipText: {
    fontSize: 12,
    fontFamily: fonts.medium,
    fontWeight: "500",
    color: "#6B6B6B",
  },
  filterChipTextActive: { color: "#FFFFFF", fontFamily: fonts.bold, fontWeight: "700" },

  // ── Feed tabs — simple underline ─────────────────────────────────────────────
  feedTabRow: {
    flexDirection: "row",
    paddingHorizontal: 24,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E8E8E8",
    gap: 24,
  },
  feedTabRowDesktop: { paddingHorizontal: 32 },
  feedTab: {
    paddingBottom: 10,
    paddingTop: 4,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
    marginBottom: -1,
  },
  feedTabActive: { borderBottomColor: "#0F0F0F" },
  feedTabText: {
    fontSize: 14,
    fontFamily: fonts.medium,
    fontWeight: "500",
    color: "#6B6B6B",
  },
  feedTabTextActive: {
    color: "#0F0F0F",
    fontFamily: fonts.bold,
    fontWeight: "700",
  },

  // ── States ──────────────────────────────────────────────────────────────────
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8, paddingBottom: 60 },
  errorText: { fontSize: 14, fontFamily: fonts.regular, color: "#6B6B6B", textAlign: "center" },
  retryBtn: {
    borderWidth: 1,
    borderColor: "#E8E8E8",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    marginTop: 4,
  },
  retryText: { fontSize: 13, fontFamily: fonts.medium, color: "#0F0F0F" },
  emptyText: {
    fontSize: 15,
    fontFamily: fonts.medium,
    fontWeight: "500",
    color: "#6B6B6B",
  },
  emptySubtext: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: "#B0B0B0",
    textAlign: "center",
  },
  emptyHint: { paddingVertical: 6, marginTop: 4 },
  emptyHintText: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: "#6B6B6B",
  },

  // ── List / grid ──────────────────────────────────────────────────────────────
  listContent: { paddingHorizontal: 24, paddingTop: 8, gap: 24 },
  listContentDesktop: { paddingHorizontal: 32 },
  daySection: { gap: 8 },
  dayHeader: {
    fontSize: 11,
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: "#B0B0B0",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },

  // Desktop 2-column grid
  cardGrid: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
  cardGridItem: { flex: 1, minWidth: 260, maxWidth: "50%" as any },

  // ── Class card ──────────────────────────────────────────────────────────────
  classCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E8E8E8",
    padding: 20,
    gap: 4,
    cursor: "pointer",
  } as any,
  classCardDesktop: {},
  classCardHovered: { backgroundColor: "#FAFAFA" },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  badgeRow: { flexDirection: "row", gap: 4, alignItems: "center" },
  seriesBadge: {
    backgroundColor: "#EDE0F5",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  seriesBadgeText: { fontSize: 10, fontFamily: fonts.medium, fontWeight: "500", color: "#7030A0" },
  dropinBadge: {
    backgroundColor: "#DDE8F5",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  dropinBadgeText: { fontSize: 10, fontFamily: fonts.medium, fontWeight: "500", color: "#2060A0" },
  enrolledBadge: {
    backgroundColor: "#D4EDE8",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  enrolledBadgeText: { fontSize: 10, fontFamily: fonts.medium, fontWeight: "500", color: "#0F7B6B" },
  priceText: { fontSize: 11, fontFamily: fonts.medium, fontWeight: "500", color: "#6B6B6B" },
  classCardCategory: {
    fontSize: 10,
    fontFamily: fonts.medium,
    fontWeight: "500",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  classCardTitle: {
    fontSize: 15,
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: "#0F0F0F",
    lineHeight: 20,
  },
  classCardTitleDesktop: { fontSize: 16 },
  classCardHost: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: "#6B6B6B",
  },
  classCardBio: { fontSize: 13, fontFamily: fonts.regular, color: "#6B6B6B", lineHeight: 18 },
  ratingText: { fontSize: 11, color: "#A08020", fontFamily: fonts.medium },
  classCardMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
  },
  classCardTime: { fontSize: 12, fontFamily: fonts.regular, color: "#6B6B6B" },
  classCardRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  urgencyText: {
    fontSize: 11,
    fontFamily: fonts.medium,
    color: "#E5484D",
  },
  spotsBadge: {
    backgroundColor: "#F5F5F5",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  spotsBadgeFull: { backgroundColor: "#FEF2F2" },
  spotsText: { fontSize: 11, fontFamily: fonts.medium, color: "#6B6B6B" },
  spotsTextFull: { color: "#E5484D" },

  // ── Featured instructors (desktop) ──────────────────────────────────────────
  featuredSection: { gap: 10, marginBottom: 8 },
  featuredTitle: {
    fontSize: 11,
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: "#B0B0B0",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  featuredScroll: { gap: 8, paddingBottom: 4 },
  featuredCard: {
    width: 140,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E8E8E8",
    padding: 16,
    alignItems: "center",
    gap: 6,
    cursor: "pointer",
  } as any,
  featuredCardHovered: { backgroundColor: "#F5F5F5" },
  featuredAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F5F5F5",
    alignItems: "center",
    justifyContent: "center",
  },
  featuredInitials: {
    fontSize: 16,
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: "#0F0F0F",
  },
  featuredName: {
    fontSize: 13,
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: "#0F0F0F",
    textAlign: "center",
  },
  featuredRating: { fontSize: 11, color: "#A08020", fontFamily: fonts.medium },
  featuredFollowBtn: {
    backgroundColor: "#0F0F0F",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
    marginTop: 2,
  },
  featuredFollowText: {
    fontSize: 11,
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
