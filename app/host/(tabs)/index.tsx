import { useCallback, useState } from "react";
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
import { listMyClasses, cancelClass } from "../../../lib/api";
import type { ScheduledClass } from "../../../lib/types";
import { fonts } from "../../../lib/fonts";

// Handle both legacy title-case and new lowercase category values from backend
const CATEGORY_COLORS: Record<string, { bg: string; text: string; bar: string }> = {
  yoga:     { bg: "#E0F7F5", text: "#007A70", bar: "#00B4A6" },
  dance:    { bg: "#FEE8EC", text: "#C0406A", bar: "#F4B8C1" },
  tutoring: { bg: "#FFF9E6", text: "#A0820A", bar: "#FFD66B" },
  Yoga:     { bg: "#E0F7F5", text: "#007A70", bar: "#00B4A6" },
  Dance:    { bg: "#FEE8EC", text: "#C0406A", bar: "#F4B8C1" },
  Tutoring: { bg: "#FFF9E6", text: "#A0820A", bar: "#FFD66B" },
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

type Tab = "upcoming" | "past";

export default function InstructorHomeTab() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const isWeb = Platform.OS === "web";

  const [classes, setClasses] = useState<ScheduledClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("upcoming");
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);

  const loadClasses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listMyClasses();
      setClasses(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load classes.");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadClasses(); }, [loadClasses]));

  const now = new Date();
  const upcoming = classes.filter(
    (c) => new Date(c.scheduled_at) >= now && c.status !== "cancelled" && c.status !== "completed"
  ).sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());

  const past = classes.filter(
    (c) => new Date(c.scheduled_at) < now || c.status === "completed" || c.status === "cancelled"
  ).sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime());

  // Stats
  const totalStudentsEnrolled = upcoming.reduce((sum, c) => sum + c.current_students, 0);
  const liveNow = classes.filter((c) => c.status === "live").length;

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
            <Text style={styles.headerTitle}>My Classes</Text>
            <TouchableOpacity
              style={styles.scheduleBtn}
              onPress={() => router.push("/host/schedule")}
              activeOpacity={0.85}
            >
              <MaterialCommunityIcons name="plus" size={16} color="#FFFFFF" />
              <Text style={styles.scheduleBtnText}>Schedule</Text>
            </TouchableOpacity>
          </View>

          {/* Stats row */}
          {!loading && !error && (
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={styles.statNum}>{upcoming.length}</Text>
                <Text style={styles.statLabel}>Upcoming</Text>
              </View>
              <View style={[styles.statCard, styles.statCardMiddle]}>
                <Text style={styles.statNum}>{totalStudentsEnrolled}</Text>
                <Text style={styles.statLabel}>Enrolled</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={[styles.statNum, liveNow > 0 && styles.statNumLive]}>{liveNow}</Text>
                <Text style={styles.statLabel}>Live Now</Text>
              </View>
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
              <ActivityIndicator color="#00B4A6" />
            </View>
          ) : error ? (
            <View style={styles.centered}>
              <MaterialCommunityIcons name="wifi-off" size={36} color="#C0C0C0" />
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={loadClasses} activeOpacity={0.7}>
                <MaterialCommunityIcons name="refresh" size={14} color="#00B4A6" />
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : displayed.length === 0 ? (
            <View style={styles.centered}>
              <MaterialCommunityIcons
                name={tab === "upcoming" ? "calendar-blank-outline" : "history"}
                size={40}
                color="#D0D0D0"
              />
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
                    <Text style={styles.emptyScheduleBtnText}>Schedule a Class</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          ) : (
            <ScrollView
              contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 100 }]}
              showsVerticalScrollIndicator={false}
            >
              {displayed.map((cls) => {
                const colors = CATEGORY_COLORS[cls.category] ?? { bg: "#F7F7F7", text: "#666666", bar: "#EEEEEE" };
                const isConfirming = confirmCancelId === cls.id;
                const isCancelling = cancelling === cls.id;
                const fillPct = cls.max_students > 0 ? cls.current_students / cls.max_students : 0;

                return (
                  <View key={cls.id} style={styles.card}>
                    {/* Color bar */}
                    <View style={[styles.cardBar, { backgroundColor: colors.bar }]} />

                    <View style={styles.cardBody}>
                      {/* Top row: title + category badge */}
                      <View style={styles.cardTopRow}>
                        <Text style={styles.cardTitle} numberOfLines={2}>{cls.title}</Text>
                        <View style={[styles.categoryBadge, { backgroundColor: colors.bg }]}>
                          <Text style={[styles.categoryBadgeText, { color: colors.text }]}>
                            {cls.category.charAt(0).toUpperCase() + cls.category.slice(1)}
                          </Text>
                        </View>
                      </View>

                      {/* Date/time */}
                      <View style={styles.metaRow}>
                        <MaterialCommunityIcons name="clock-outline" size={13} color="#888888" />
                        <Text style={styles.metaText}>
                          {tab === "upcoming" ? formatSmartDate(cls.scheduled_at) : formatPastDate(cls.scheduled_at)}
                        </Text>
                      </View>

                      {/* Duration */}
                      <View style={styles.metaRow}>
                        <MaterialCommunityIcons name="timer-outline" size={13} color="#888888" />
                        <Text style={styles.metaText}>{cls.duration_minutes} min</Text>
                      </View>

                      {/* Students + progress bar */}
                      <View style={styles.metaRow}>
                        <MaterialCommunityIcons name="account-group-outline" size={13} color="#888888" />
                        <Text style={styles.metaText}>
                          {tab === "upcoming"
                            ? `${cls.current_students}/${cls.max_students} students enrolled`
                            : `${cls.current_students} student${cls.current_students !== 1 ? "s" : ""} attended`}
                        </Text>
                      </View>

                      {/* Enrollment progress bar (upcoming only) */}
                      {tab === "upcoming" && (
                        <View style={styles.progressBg}>
                          <View
                            style={[
                              styles.progressFill,
                              { width: `${Math.min(fillPct * 100, 100)}%` as any },
                              fillPct >= 1 && styles.progressFillFull,
                            ]}
                          />
                        </View>
                      )}

                      {/* Upcoming actions */}
                      {tab === "upcoming" && (
                        <View style={styles.actions}>
                          {isConfirming ? (
                            <View style={styles.confirmRow}>
                              <Text style={styles.confirmText}>Cancel this class?</Text>
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
                                    <Text style={styles.confirmCancelText}>Yes, Cancel</Text>
                                  )}
                                </TouchableOpacity>
                              </View>
                            </View>
                          ) : (
                            <>
                              <TouchableOpacity
                                style={styles.startBtn}
                                onPress={() => router.push(`/host/room/${cls.id}` as never)}
                                activeOpacity={0.85}
                              >
                                <MaterialCommunityIcons name="play-circle-outline" size={18} color="#FFFFFF" />
                                <Text style={styles.startBtnText}>Start Class</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={styles.cancelClassBtn}
                                onPress={() => handleCancel(cls)}
                                disabled={isCancelling}
                                activeOpacity={0.7}
                              >
                                {isCancelling ? (
                                  <ActivityIndicator size="small" color="#E5484D" />
                                ) : (
                                  <Text style={styles.cancelClassBtnText}>Cancel Class</Text>
                                )}
                              </TouchableOpacity>
                            </>
                          )}
                        </View>
                      )}
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          )}

          {/* FAB — Schedule New Class */}
          <TouchableOpacity
            style={[styles.fab, { bottom: insets.bottom + 24 }]}
            onPress={() => router.push("/host/schedule")}
            activeOpacity={0.85}
          >
            <MaterialCommunityIcons name="plus" size={28} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </RoleGuard>
    </AuthGate>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FFFFFF" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerTitle: { fontSize: 24, fontWeight: "700", fontFamily: fonts.bold, color: "#1A1A1A", letterSpacing: -0.5 },
  scheduleBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "#00B4A6", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
  },
  scheduleBtnText: { fontSize: 13, fontWeight: "600", fontFamily: fonts.bold, color: "#FFFFFF" },

  // ── Stats row ────────────────────────────────────────────────────────────────
  statsRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#F7F7F7",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: "center",
    gap: 2,
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  statCardMiddle: {
    backgroundColor: "#E0F7F5",
    borderColor: "#B0E8E3",
  },
  statNum: { fontSize: 24, fontWeight: "700", fontFamily: fonts.bold, color: "#1A1A1A", letterSpacing: -0.5 },
  statNumLive: { color: "#00B4A6" },
  statLabel: { fontSize: 11, fontFamily: fonts.regular, color: "#888888", textAlign: "center" },

  tabRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
    marginHorizontal: 20,
    marginBottom: 4,
  },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: "center" },
  tabBtnActive: { borderBottomWidth: 2, borderBottomColor: "#00B4A6" },
  tabBtnText: { fontSize: 15, fontWeight: "500", fontFamily: fonts.medium, color: "#888888" },
  tabBtnTextActive: { color: "#1A1A1A", fontWeight: "700", fontFamily: fonts.bold },
  tabCount: { fontSize: 13, fontFamily: fonts.regular, color: "#C0C0C0" },
  tabCountActive: { fontSize: 13, fontFamily: fonts.medium, color: "#00B4A6" },

  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingBottom: 60 },
  errorText: { fontSize: 14, fontFamily: fonts.regular, color: "#888888", textAlign: "center", paddingHorizontal: 32 },
  retryBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#E0F7F5", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 9999,
  },
  retryText: { fontSize: 13, fontWeight: "500", fontFamily: fonts.medium, color: "#007A70" },

  emptyTitle: { fontSize: 16, fontWeight: "600", fontFamily: fonts.bold, color: "#1A1A1A" },
  emptySubtext: { fontSize: 13, fontFamily: fonts.regular, color: "#888888" },
  emptyScheduleBtn: {
    backgroundColor: "#00B4A6", borderRadius: 10,
    paddingHorizontal: 20, paddingVertical: 11, marginTop: 4,
  },
  emptyScheduleBtnText: { fontSize: 14, fontWeight: "600", fontFamily: fonts.bold, color: "#FFFFFF" },

  list: { paddingHorizontal: 16, paddingTop: 12, gap: 14 },

  card: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F0F0F0",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  cardBar: { width: 5, alignSelf: "stretch" },
  cardBody: { flex: 1, padding: 16, gap: 6 },

  cardTopRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 2 },
  cardTitle: { flex: 1, fontSize: 17, fontWeight: "700", fontFamily: fonts.bold, color: "#1A1A1A", lineHeight: 22 },
  categoryBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 9999, flexShrink: 0 },
  categoryBadgeText: { fontSize: 11, fontWeight: "600", fontFamily: fonts.medium },

  metaRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  metaText: { fontSize: 13, fontFamily: fonts.regular, color: "#666666" },

  // Progress bar
  progressBg: {
    height: 4,
    backgroundColor: "#F0F0F0",
    borderRadius: 9999,
    marginTop: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: 4,
    backgroundColor: "#00B4A6",
    borderRadius: 9999,
  },
  progressFillFull: { backgroundColor: "#E5484D" },

  actions: { marginTop: 8, gap: 8 },
  startBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, backgroundColor: "#00B4A6", borderRadius: 10,
    paddingVertical: 12,
  },
  startBtnText: { fontSize: 14, fontWeight: "600", fontFamily: fonts.bold, color: "#FFFFFF" },
  cancelClassBtn: { alignItems: "center", paddingVertical: 6 },
  cancelClassBtnText: { fontSize: 13, color: "#E5484D", fontWeight: "500", fontFamily: fonts.medium },

  confirmRow: { gap: 8 },
  confirmText: { fontSize: 13, color: "#1A1A1A", fontWeight: "500", fontFamily: fonts.medium, textAlign: "center" },
  confirmBtns: { flexDirection: "row", gap: 10 },
  confirmKeepBtn: {
    flex: 1, alignItems: "center", paddingVertical: 9,
    borderRadius: 10, borderWidth: 1, borderColor: "#F0F0F0",
  },
  confirmKeepText: { fontSize: 13, color: "#888888", fontWeight: "500", fontFamily: fonts.medium },
  confirmCancelBtn: {
    flex: 1, alignItems: "center", paddingVertical: 9,
    borderRadius: 10, backgroundColor: "#FEF2F2",
  },
  confirmCancelText: { fontSize: 13, color: "#E5484D", fontWeight: "600", fontFamily: fonts.bold },

  fab: {
    position: "absolute",
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#00B4A6",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#00B4A6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
});
