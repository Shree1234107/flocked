import { colors } from "../../../lib/colors";
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { ActivityIndicator, Text } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { AuthGate } from "../../../components/AuthGate";
import { RoleGuard } from "../../../components/RoleGuard";
import { ClassChat } from "../../../components/ClassChat";
import { listMyClasses, cancelClass, getMySeries } from "../../../lib/api";
import type { ScheduledClass, ClassSeries } from "../../../lib/types";
import { supabase } from "../../../lib/supabase";
import { fonts } from "../../../lib/fonts";

const CATEGORY_COLORS: Record<string, { dot: string; bg: string; text: string }> = {
  yoga:     { dot: "#0F7B6B", bg: colors.primaryTint, text: "#0F7B6B" },
  dance:    { dot: "#B03050", bg: "#F9E0E4", text: "#B03050" },
  tutoring: { dot: "#806020", bg: "#F5F0D8", text: "#806020" },
  chess:    { dot: "#2060A0", bg: "#DDE8F5", text: "#2060A0" },
  piano:    { dot: "#7030A0", bg: "#EDE0F5", text: "#7030A0" },
  cooking:  { dot: "#A06020", bg: "#F5EBD8", text: "#A06020" },
  Yoga:     { dot: "#0F7B6B", bg: colors.primaryTint, text: "#0F7B6B" },
  Dance:    { dot: "#B03050", bg: "#F9E0E4", text: "#B03050" },
  Tutoring: { dot: "#806020", bg: "#F5F0D8", text: "#806020" },
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatSmartDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
  const tomorrowStart = new Date(todayStart); tomorrowStart.setDate(todayStart.getDate() + 1);
  const dayAfter = new Date(tomorrowStart); dayAfter.setDate(tomorrowStart.getDate() + 1);
  const h = d.getHours(); const m = d.getMinutes();
  const ampm = h >= 12 ? "PM" : "AM";
  const time = `${h % 12 || 12}:${m.toString().padStart(2, "0")} ${ampm}`;
  if (d >= todayStart && d < tomorrowStart) return `Today at ${time}`;
  if (d >= tomorrowStart && d < dayAfter) return `Tomorrow at ${time}`;
  return `${DAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()} at ${time}`;
}

function formatPastDate(iso: string): string {
  const d = new Date(iso);
  return `${DAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

function getTodayLabel(): string {
  const d = new Date();
  return `${DAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

type Tab = "upcoming" | "past";

export default function InstructorHomeTab() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const isWeb = Platform.OS === "web";

  const [classes, setClasses] = useState<ScheduledClass[]>([]);
  const [series, setSeries] = useState<ClassSeries[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("upcoming");
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);
  const [expandedChatId, setExpandedChatId] = useState<string | null>(null);
  const [hostUserId, setHostUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setHostUserId(session?.user?.id ?? null);
    });
  }, []);

  const loadClasses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [data, seriesData] = await Promise.all([
        listMyClasses(),
        getMySeries().catch(() => [] as ClassSeries[]),
      ]);
      setClasses(data);
      setSeries(seriesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load classes.");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadClasses(); }, [loadClasses]));

  const now = new Date();
  const upcoming = classes.filter(
    (c) => (new Date(c.scheduled_at) >= now || c.status === "live") && c.status !== "cancelled" && c.status !== "completed"
  ).sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());

  const past = classes.filter(
    (c) => new Date(c.scheduled_at) < now || c.status === "completed" || c.status === "cancelled"
  ).sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime());

  const totalStudentsEnrolled = upcoming.reduce((sum, c) => sum + c.current_students, 0);
  const liveNow = classes.filter((c) => c.status === "live").length;

  // Group series classes; non-series remain as standalone rows
  const seriesClassMap = new Map<string, ScheduledClass[]>();
  const standaloneUpcoming: ScheduledClass[] = [];
  for (const cls of upcoming) {
    if (cls.series_id) {
      const arr = seriesClassMap.get(cls.series_id) ?? [];
      arr.push(cls);
      seriesClassMap.set(cls.series_id, arr);
    } else {
      standaloneUpcoming.push(cls);
    }
  }

  const doCancel = async (id: string) => {
    setCancelling(id);
    setConfirmCancelId(null);
    try {
      await cancelClass(id);
      setClasses((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      if (isWeb) {
        setError(err instanceof Error ? err.message : "Failed to cancel class.");
      } else {
        Alert.alert("Oops", err instanceof Error ? err.message : "Failed to cancel class.");
      }
    } finally {
      setCancelling(null);
    }
  };

  const handleCancel = (cls: ScheduledClass) => {
    if (isWeb) {
      setConfirmCancelId(cls.id);
    } else {
      Alert.alert(
        "Cancel Class",
        `Cancel "${cls.title}"?`,
        [
          { text: "Keep", style: "cancel" },
          { text: "Cancel Class", style: "destructive", onPress: () => doCancel(cls.id) },
        ]
      );
    }
  };

  const displayed = tab === "upcoming" ? upcoming : past;

  return (
    <AuthGate>
      <RoleGuard requiredRole="host">
        <View style={[styles.root, { paddingTop: insets.top }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.headerTitle}>Dashboard</Text>
              <Text style={styles.headerDate}>{getTodayLabel()}</Text>
            </View>
          </View>

          {/* Stats row */}
          {!loading && !error && (
            <View style={styles.statsRow}>
              {[
                { value: upcoming.length, label: "Upcoming" },
                { value: totalStudentsEnrolled, label: "Enrolled" },
                { value: liveNow, label: "Live now" },
                { value: past.length, label: "Completed" },
              ].map((stat) => (
                <View key={stat.label} style={styles.statCard}>
                  <Text style={styles.statNum}>{stat.value}</Text>
                  <Text style={styles.statLabel}>{stat.label}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Tab row */}
          <View style={styles.tabRow}>
            {(["upcoming", "past"] as Tab[]).map((t) => (
              <Pressable
                key={t}
                style={[styles.tabBtn, tab === t && styles.tabBtnActive]}
                onPress={() => setTab(t)}
              >
                <Text style={[styles.tabBtnText, tab === t && styles.tabBtnTextActive]}>
                  {t === "upcoming" ? "Upcoming" : "Past"}
                  {t === "upcoming" && upcoming.length > 0 && (
                    <Text style={tab === t ? styles.tabCountActive : styles.tabCount}>
                      {"  "}{upcoming.length}
                    </Text>
                  )}
                </Text>
              </Pressable>
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
              <TouchableOpacity style={styles.retryBtn} onPress={loadClasses} activeOpacity={0.7}>
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : displayed.length === 0 ? (
            <View style={styles.centered}>
              <Text style={styles.emptyTitle}>
                {tab === "upcoming" ? "No upcoming classes" : "No past classes yet"}
              </Text>
              {tab === "upcoming" && (
                <>
                  <Text style={styles.emptySubtext}>Schedule one to get started</Text>
                  <TouchableOpacity
                    style={styles.emptyScheduleBtn}
                    onPress={() => router.push("/host/schedule")}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.emptyScheduleBtnText}>Schedule a class</Text>
                  </TouchableOpacity>
                </>
              )}
              {tab === "past" && (
                <Text style={styles.emptyPastSubtext}>Classes you've taught will appear here</Text>
              )}
            </View>
          ) : (
            <ScrollView
              contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 100 }]}
              showsVerticalScrollIndicator={false}
            >
              {/* Series groups (upcoming tab only) */}
              {tab === "upcoming" && series.filter((s) => seriesClassMap.has(s.id)).map((s) => {
                const seriesClasses = (seriesClassMap.get(s.id) ?? []).sort(
                  (a, b) => (a.series_week ?? 0) - (b.series_week ?? 0)
                );
                const nextClass = seriesClasses[0];
                const priceDollars = s.price_cents ? (s.price_cents / 100).toFixed(0) : null;
                return (
                  <View key={s.id} style={styles.seriesBlock}>
                    <View style={styles.seriesHeader}>
                      <View style={styles.seriesHeaderLeft}>
                        <View style={styles.seriesLabelBadge}>
                          <Text style={styles.seriesLabelText}>SERIES</Text>
                        </View>
                        <Text style={styles.seriesTitle} numberOfLines={1}>{s.title}</Text>
                      </View>
                      <View style={styles.seriesHeaderRight}>
                        <Text style={styles.seriesEnrolled}>{s.current_students}/{s.max_students}</Text>
                        {priceDollars && <Text style={styles.seriesPrice}>${priceDollars}</Text>}
                      </View>
                    </View>
                    <Text style={styles.seriesMeta}>
                      {seriesClasses.length} of {s.total_weeks} weeks remaining · {s.duration_minutes}m/session
                    </Text>
                    {nextClass && (
                      <Text style={styles.seriesNextDate}>
                        Next: {formatSmartDate(nextClass.scheduled_at)}
                      </Text>
                    )}
                    {seriesClasses.map((cls) => (
                      <View key={cls.id} style={styles.seriesWeekRow}>
                        <Text style={styles.seriesWeekNum}>Wk {cls.series_week}</Text>
                        <Text style={styles.seriesWeekDate} numberOfLines={1}>
                          {formatSmartDate(cls.scheduled_at)}
                        </Text>
                        <Text style={styles.seriesWeekStudents}>{cls.current_students}/{cls.max_students}</Text>
                        <TouchableOpacity
                          style={[styles.chatBtn, expandedChatId === cls.id && styles.chatBtnActive]}
                          onPress={() => setExpandedChatId(expandedChatId === cls.id ? null : cls.id)}
                          activeOpacity={0.85}
                        >
                          <MaterialCommunityIcons
                            name="chat-outline"
                            size={13}
                            color={expandedChatId === cls.id ? "#FFFFFF" : "#6B6B6B"}
                          />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.startBtn}
                          onPress={() => router.push(`/host/room/${cls.id}` as never)}
                          activeOpacity={0.85}
                        >
                          <Text style={styles.startBtnText}>{cls.status === "live" ? "Rejoin" : "Start"}</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                    {expandedChatId && hostUserId &&
                      seriesClasses.find((c) => c.id === expandedChatId) && (
                      <ClassChat
                        classId={expandedChatId}
                        currentUserId={hostUserId}
                        isInstructor
                      />
                    )}
                  </View>
                );
              })}

              {/* Standalone (non-series) classes */}
              {(tab === "upcoming" ? standaloneUpcoming : past).map((cls) => {
                const colors = CATEGORY_COLORS[cls.category] ?? { dot: "#B0B0B0", bg: "#F5F5F5", text: "#6B6B6B" };
                const isConfirming = confirmCancelId === cls.id;
                const isCancelling = cancelling === cls.id;
                const fillPct = cls.max_students > 0 ? cls.current_students / cls.max_students : 0;

                return (
                  <View key={cls.id} style={styles.classRow}>
                    <View style={styles.classRowLeft}>
                      <View style={[styles.categoryDot, { backgroundColor: colors.dot }]} />
                      <View style={styles.classRowInfo}>
                        <Text style={styles.classRowTitle} numberOfLines={1}>{cls.title}</Text>
                        <Text style={styles.classRowDate}>
                          {tab === "upcoming" ? formatSmartDate(cls.scheduled_at) : formatPastDate(cls.scheduled_at)}
                          {" · "}{cls.duration_minutes}m
                        </Text>
                      </View>
                    </View>

                    <View style={styles.classRowRight}>
                      <Text style={styles.classRowStudents}>
                        {tab === "upcoming"
                          ? `${cls.current_students}/${cls.max_students}`
                          : `${cls.current_students} attended`}
                      </Text>
                      <TouchableOpacity
                        style={[styles.chatBtn, expandedChatId === cls.id && styles.chatBtnActive]}
                        onPress={() => setExpandedChatId(expandedChatId === cls.id ? null : cls.id)}
                        activeOpacity={0.85}
                      >
                        <MaterialCommunityIcons
                          name="chat-outline"
                          size={13}
                          color={expandedChatId === cls.id ? "#FFFFFF" : "#6B6B6B"}
                        />
                        <Text style={[styles.chatBtnText, expandedChatId === cls.id && styles.chatBtnTextActive]}>
                          Chat
                        </Text>
                      </TouchableOpacity>
                      {tab === "upcoming" && !isConfirming && (
                        <TouchableOpacity
                          style={styles.startBtn}
                          onPress={() => router.push(`/host/room/${cls.id}` as never)}
                          activeOpacity={0.85}
                        >
                          <Text style={styles.startBtnText}>{cls.status === "live" ? "Rejoin" : "Start"}</Text>
                        </TouchableOpacity>
                      )}
                    </View>

                    {tab === "upcoming" && (
                      <>
                        <View style={styles.progressRow}>
                          <View style={styles.progressBg}>
                            <View
                              style={[
                                styles.progressFill,
                                { width: `${Math.min(fillPct * 100, 100)}%` as any },
                                fillPct >= 1 && styles.progressFillFull,
                              ]}
                            />
                          </View>
                        </View>
                        {isConfirming ? (
                          <View style={styles.confirmRow}>
                            <Text style={styles.confirmText}>Cancel "{cls.title}"?</Text>
                            <View style={styles.confirmBtns}>
                              <TouchableOpacity
                                style={styles.confirmKeepBtn}
                                onPress={() => setConfirmCancelId(null)}
                                activeOpacity={0.7}
                              >
                                <Text style={styles.confirmKeepText}>Keep</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={styles.confirmCancelBtn}
                                onPress={() => doCancel(cls.id)}
                                disabled={isCancelling}
                                activeOpacity={0.7}
                              >
                                {isCancelling ? (
                                  <ActivityIndicator size="small" color="#E5484D" />
                                ) : (
                                  <Text style={styles.confirmCancelText}>Yes, cancel</Text>
                                )}
                              </TouchableOpacity>
                            </View>
                          </View>
                        ) : (
                          <TouchableOpacity
                            style={styles.cancelClassBtn}
                            onPress={() => handleCancel(cls)}
                            disabled={isCancelling}
                            activeOpacity={0.7}
                          >
                            {isCancelling ? (
                              <ActivityIndicator size="small" color="#E5484D" />
                            ) : (
                              <Text style={styles.cancelClassBtnText}>Cancel class</Text>
                            )}
                          </TouchableOpacity>
                        )}
                      </>
                    )}
                    {expandedChatId === cls.id && hostUserId && (
                      <ClassChat
                        classId={cls.id}
                        currentUserId={hostUserId}
                        isInstructor
                      />
                    )}
                  </View>
                );
              })}
            </ScrollView>
          )}

          {/* FAB */}
          <TouchableOpacity
            style={[styles.fab, { bottom: insets.bottom + 24 }]}
            onPress={() => router.push("/host/schedule")}
            activeOpacity={0.85}
          >
            <MaterialCommunityIcons name="plus" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </RoleGuard>
    </AuthGate>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },

  // ── Header ──────────────────────────────────────────────────────────────────
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 8,
  },
  headerLeft: { gap: 2 },
  headerTitle: {
    fontSize: 28,
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: "#0F0F0F",
    letterSpacing: -0.5,
  },
  headerDate: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: "#6B6B6B",
  },

  // ── Stats row ────────────────────────────────────────────────────────────────
  statsRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#EDE9E3",
    borderTopWidth: 2,
    borderTopColor: colors.primary,
  },
  statNum: {
    fontSize: 28,
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: "#0F0F0F",
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#6B6B6B",
    marginTop: 4,
  },

  // ── Tabs ─────────────────────────────────────────────────────────────────────
  tabRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#EDE9E3",
    paddingHorizontal: 24,
    marginBottom: 4,
  },
  tabBtn: {
    paddingVertical: 12,
    paddingHorizontal: 4,
    marginRight: 24,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
    marginBottom: -1,
  },
  tabBtnActive: { borderBottomColor: colors.primary },
  tabBtnText: {
    fontSize: 14,
    fontFamily: fonts.medium,
    fontWeight: "500",
    color: "#6B6B6B",
  },
  tabBtnTextActive: {
    color: colors.primary,
    fontFamily: fonts.bold,
    fontWeight: "700",
  },
  tabCount: { fontSize: 13, fontFamily: fonts.regular, color: "#C0C0C0" },
  tabCountActive: { fontSize: 13, fontFamily: fonts.medium, color: "#6B6B6B" },

  // ── States ───────────────────────────────────────────────────────────────────
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, paddingBottom: 60 },
  errorText: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: "#6B6B6B",
    textAlign: "center",
    paddingHorizontal: 32,
  },
  retryBtn: {
    borderWidth: 1,
    borderColor: "#EDE9E3",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
    marginTop: 4,
  },
  retryText: { fontSize: 13, fontFamily: fonts.medium, color: colors.navy },
  emptyTitle: {
    fontSize: 15,
    fontFamily: fonts.medium,
    fontWeight: "500",
    color: "#6B6B6B",
  },
  emptySubtext: { fontSize: 13, fontFamily: fonts.regular, color: "#B0B0B0" },
  emptyPastSubtext: { fontSize: 13, fontFamily: fonts.regular, color: "#B0B0B0" },
  emptyScheduleBtn: {
    backgroundColor: colors.primary,
    borderRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginTop: 8,
  },
  emptyScheduleBtnText: {
    fontSize: 13,
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  // ── Class rows ───────────────────────────────────────────────────────────────
  list: { paddingHorizontal: 24, paddingTop: 8, gap: 0 },
  classRow: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#EDE9E3",
    gap: 8,
  },
  classRowLeft: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    flex: 1,
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
    flexShrink: 0,
  },
  classRowInfo: { flex: 1, gap: 3 },
  classRowTitle: {
    fontSize: 15,
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: "#0F0F0F",
    lineHeight: 20,
  },
  classRowDate: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: "#6B6B6B",
  },
  classRowRight: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingLeft: 20,
  },
  classRowStudents: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: "#6B6B6B",
  },
  startBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
  },
  startBtnText: {
    fontSize: 12,
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  chatBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#EDE9E3",
    backgroundColor: "#FFFFFF",
  },
  chatBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chatBtnText: {
    fontSize: 12,
    fontFamily: fonts.medium,
    fontWeight: "500",
    color: "#6B6B6B",
  },
  chatBtnTextActive: {
    color: "#FFFFFF",
  },
  progressRow: { paddingLeft: 20 },
  progressBg: {
    height: 3,
    backgroundColor: "#EDE9E3",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: 3,
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  progressFillFull: { backgroundColor: "#E5484D" },

  cancelClassBtn: { alignSelf: "flex-start", paddingLeft: 20 },
  cancelClassBtnText: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#B0B0B0",
  },

  confirmRow: { gap: 8, paddingLeft: 20 },
  confirmText: {
    fontSize: 13,
    color: "#0F0F0F",
    fontFamily: fonts.medium,
  },
  confirmBtns: { flexDirection: "row", gap: 8 },
  confirmKeepBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#EDE9E3",
  },
  confirmKeepText: {
    fontSize: 12,
    fontFamily: fonts.medium,
    color: "#6B6B6B",
  },
  confirmCancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 6,
    backgroundColor: "#FEF2F2",
  },
  confirmCancelText: {
    fontSize: 12,
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: "#E5484D",
  },

  // ── Series block ─────────────────────────────────────────────────────────────
  seriesBlock: {
    borderWidth: 1,
    borderColor: "#EDE9E3",
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
    gap: 6,
    backgroundColor: "#F5F2EC",
  },
  seriesHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  seriesHeaderLeft: { flex: 1, gap: 4 },
  seriesLabelBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#EDE0F5",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  seriesLabelText: {
    fontSize: 9,
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: "#7030A0",
    letterSpacing: 1,
  },
  seriesTitle: {
    fontSize: 15,
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: "#0F0F0F",
    lineHeight: 20,
  },
  seriesHeaderRight: { alignItems: "flex-end", gap: 2 },
  seriesEnrolled: { fontSize: 13, fontFamily: fonts.medium, color: "#6B6B6B" },
  seriesPrice: { fontSize: 12, fontFamily: fonts.regular, color: "#B0B0B0" },
  seriesMeta: { fontSize: 12, fontFamily: fonts.regular, color: "#6B6B6B" },
  seriesNextDate: { fontSize: 12, fontFamily: fonts.medium, fontWeight: "500", color: "#0F0F0F" },
  seriesWeekRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#EDE9E3",
    marginTop: 4,
  },
  seriesWeekNum: {
    fontSize: 11,
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: "#B0B0B0",
    width: 28,
  },
  seriesWeekDate: { flex: 1, fontSize: 12, fontFamily: fonts.regular, color: "#6B6B6B" },
  seriesWeekStudents: { fontSize: 12, fontFamily: fonts.regular, color: "#6B6B6B" },

  // ── FAB ──────────────────────────────────────────────────────────────────────
  fab: {
    position: "absolute",
    right: 24,
    width: 44,
    height: 44,
    borderRadius: 6,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
});
