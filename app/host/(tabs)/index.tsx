import { useCallback, useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { ActivityIndicator, Text } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { AuthGate } from "../../../components/AuthGate";
import { RoleGuard } from "../../../components/RoleGuard";
import { listMyClasses, cancelClass } from "../../../lib/api";
import { ScheduledClass } from "../../../lib/types";

const CATEGORY_COLORS: Record<string, string> = {
  Yoga: "#87A878",
  Dance: "#F4B8C1",
  Tutoring: "#94B4D2",
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatTime(iso: string): string {
  const d = new Date(iso);
  const h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${m.toString().padStart(2, "0")} ${ampm}`;
}

function formatDateLabel(iso: string): string {
  const d = new Date(iso);
  return `${DAYS[d.getDay()]} ${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

export default function InstructorHomeTab() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [classes, setClasses] = useState<ScheduledClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState<string | null>(null);

  const loadClasses = useCallback(async () => {
    try {
      const data = await listMyClasses();
      setClasses(data);
    } catch (err) {
      Alert.alert("Oops", err instanceof Error ? err.message : "Failed to load classes.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadClasses(); }, [loadClasses]);
  useFocusEffect(useCallback(() => { loadClasses(); }, [loadClasses]));

  const now = new Date();
  const weekEnd = new Date(now);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const completed = classes.filter((c) => c.status === "completed");
  const totalStudents = completed.reduce((sum, c) => sum + c.current_students, 0);
  const totalClasses = classes.length;
  const avgAttendance = completed.length > 0 ? (totalStudents / completed.length).toFixed(1) : "—";

  const upcoming = classes.filter(
    (c) => c.status === "scheduled" && new Date(c.scheduled_at) >= now && new Date(c.scheduled_at) < weekEnd
  );

  const handleCancel = (cls: ScheduledClass) => {
    Alert.alert(
      "Cancel Class",
      `Cancel "${cls.title}" on ${formatDateLabel(cls.scheduled_at)}?`,
      [
        { text: "Keep", style: "cancel" },
        {
          text: "Cancel Class",
          style: "destructive",
          onPress: async () => {
            setCancelling(cls.id);
            try {
              await cancelClass(cls.id);
              setClasses((prev) => prev.filter((c) => c.id !== cls.id));
            } catch (err) {
              Alert.alert("Oops", err instanceof Error ? err.message : "Failed to cancel class.");
            } finally {
              setCancelling(null);
            }
          },
        },
      ]
    );
  };

  return (
    <AuthGate>
      <RoleGuard requiredRole="host">
        <ScrollView
          style={[styles.container, { paddingTop: insets.top }]}
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        >
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Dashboard</Text>
            <TouchableOpacity
              style={styles.scheduleBtn}
              onPress={() => router.push("/host/schedule")}
              activeOpacity={0.85}
            >
              <MaterialCommunityIcons name="plus" size={16} color="#FFFFFF" />
              <Text style={styles.scheduleBtnText}>Schedule</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.centered}>
              <ActivityIndicator color="#87A878" />
            </View>
          ) : (
            <>
              {/* Stats */}
              <View style={styles.statsCard}>
                <StatBox label="Students" value={totalStudents.toString()} />
                <View style={styles.statDivider} />
                <StatBox label="Classes" value={totalClasses.toString()} />
                <View style={styles.statDivider} />
                <StatBox label="Avg / Class" value={avgAttendance} />
              </View>

              {/* Growth tip */}
              <View style={styles.tipNote}>
                <MaterialCommunityIcons name="lightning-bolt" size={14} color="#87A878" />
                <Text style={styles.tipText}>
                  Aim for <Text style={styles.tipBold}>2–3 classes/week</Text> to grow your audience.
                </Text>
              </View>

              {/* This Week */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>This Week</Text>

                {upcoming.length === 0 ? (
                  <View style={styles.emptyWeek}>
                    <MaterialCommunityIcons name="calendar-blank-outline" size={32} color="#C0C0C0" />
                    <Text style={styles.emptyWeekText}>No classes scheduled this week</Text>
                    <TouchableOpacity
                      style={styles.scheduleEmptyBtn}
                      onPress={() => router.push("/host/schedule")}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.scheduleEmptyBtnText}>Schedule a Class</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.classesList}>
                    {upcoming.map((cls) => (
                      <View key={cls.id} style={styles.classRow}>
                        <View
                          style={[
                            styles.classColorBar,
                            { backgroundColor: CATEGORY_COLORS[cls.category] ?? "#EEEEEE" },
                          ]}
                        />
                        <View style={styles.classInfo}>
                          <Text style={styles.classDateLabel}>{formatDateLabel(cls.scheduled_at)}</Text>
                          <Text style={styles.classTitle} numberOfLines={1}>{cls.title}</Text>
                          <Text style={styles.classMeta}>
                            {formatTime(cls.scheduled_at)} · {cls.duration_minutes}min · {cls.current_students}/{cls.max_students} spots
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={styles.cancelBtn}
                          onPress={() => handleCancel(cls)}
                          disabled={cancelling === cls.id}
                          activeOpacity={0.7}
                        >
                          {cancelling === cls.id ? (
                            <ActivityIndicator size="small" color="#EF4444" />
                          ) : (
                            <MaterialCommunityIcons name="trash-can-outline" size={18} color="#EF4444" />
                          )}
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </>
          )}
        </ScrollView>
      </RoleGuard>
    </AuthGate>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  content: {
    gap: 0,
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
  scheduleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#87A878",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  scheduleBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  centered: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
  },
  statsCard: {
    flexDirection: "row",
    marginHorizontal: 20,
    backgroundColor: "#F9F9F9",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EEEEEE",
    paddingVertical: 18,
    marginBottom: 12,
  },
  statBox: {
    flex: 1,
    alignItems: "center",
    gap: 3,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "700",
    color: "#2C2C2C",
    letterSpacing: -0.4,
  },
  statLabel: {
    fontSize: 11,
    color: "#888888",
    textAlign: "center",
    fontWeight: "500",
  },
  statDivider: {
    width: 1,
    backgroundColor: "#EEEEEE",
    marginVertical: 6,
  },
  tipNote: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    marginBottom: 24,
    backgroundColor: "#F0F5EE",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: "#D4E8CC",
  },
  tipText: {
    fontSize: 13,
    color: "#888888",
    flex: 1,
    lineHeight: 18,
  },
  tipBold: {
    fontWeight: "600",
    color: "#2C2C2C",
  },
  section: {
    paddingHorizontal: 20,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#2C2C2C",
  },
  emptyWeek: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 10,
  },
  emptyWeekText: {
    fontSize: 14,
    color: "#888888",
    textAlign: "center",
  },
  scheduleEmptyBtn: {
    backgroundColor: "#87A878",
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 11,
    marginTop: 4,
  },
  scheduleEmptyBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  classesList: {
    gap: 8,
  },
  classRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EEEEEE",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  classColorBar: {
    width: 4,
    alignSelf: "stretch",
  },
  classInfo: {
    flex: 1,
    paddingVertical: 12,
    paddingLeft: 12,
    gap: 2,
  },
  classDateLabel: {
    fontSize: 11,
    color: "#888888",
    fontWeight: "500",
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
  cancelBtn: {
    padding: 14,
    alignItems: "center",
    justifyContent: "center",
  },
});
