import { colors } from "../../../lib/colors";
import { Alert, Image, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { ActivityIndicator, Text } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCallback, useMemo, useState } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";

import { AuthGate } from "../../../components/AuthGate";
import { RoleGuard } from "../../../components/RoleGuard";
import { useFavorites } from "../../../lib/favorites";
import { useRole } from "../../../lib/role";
import { getStudentProfile, listEnrolledClasses } from "../../../lib/api";
import { supabase } from "../../../lib/supabase";
import type { StudentProfile, ScheduledClass } from "../../../lib/types";

function MenuRow({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.menuRow} onPress={onPress} activeOpacity={0.7}>
      <MaterialCommunityIcons name={icon as never} size={18} color="#6B6B6B" />
      <Text style={styles.menuRowLabel}>{label}</Text>
      <MaterialCommunityIcons name="chevron-right" size={18} color="#D0D0D0" />
    </TouchableOpacity>
  );
}

const DAYS_ABB   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const MONTHS_ABB = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function formatClassDate(iso: string): string {
  const d = new Date(iso);
  return `${DAYS_ABB[d.getDay()]}, ${MONTHS_ABB[d.getMonth()]} ${d.getDate()}`;
}

function formatClassTime(iso: string): string {
  const d = new Date(iso);
  const h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${m.toString().padStart(2, "0")} ${ampm}`;
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  Yoga: { bg: colors.primaryTint, text: "#007A70", dot: colors.primary },
  Dance: { bg: "#FDF0F2", text: "#A04060", dot: colors.primaryTint },
  Tutoring: { bg: "#EEF3F8", text: "#3A5F80", dot: "#94B4D2" },
};

export default function GuestProfileTab() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { clearRole } = useRole();
  const { favoriteList, toggleFavorite } = useFavorites();
  const [signingOut, setSigningOut] = useState(false);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [enrolledClasses, setEnrolledClasses] = useState<ScheduledClass[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      Promise.all([getStudentProfile(), listEnrolledClasses()])
        .then(([p, cls]) => {
          if (active) {
            setProfile(p);
            setEnrolledClasses(cls);
            setLoading(false);
          }
        })
        .catch(() => { if (active) setLoading(false); });
      return () => { active = false; };
    }, [])
  );

  const instructorMap = useMemo(() => {
    const map: Record<string, { name: string; teaches: string; initials: string }> = {};
    for (const cls of enrolledClasses) {
      if (cls.host_id && !map[cls.host_id]) {
        const name = cls.host?.display_name ?? cls.host?.full_name ?? "Instructor";
        map[cls.host_id] = {
          name,
          teaches: cls.category,
          initials: name.trim().slice(0, 2).toUpperCase(),
        };
      }
    }
    return map;
  }, [enrolledClasses]);

  const thisWeekCount = useMemo(() => {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);
    return enrolledClasses.filter((c) => {
      const d = new Date(c.scheduled_at);
      return d >= weekStart && d <= weekEnd;
    }).length;
  }, [enrolledClasses]);

  const savedInstructors = favoriteList
    .map((id) => ({ id, ...instructorMap[id] }))
    .filter((i) => i.name);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await supabase.auth.signOut();
      await clearRole();
    } catch {
      Alert.alert("Error", "Sign out failed. Please try again.");
    } finally {
      setSigningOut(false);
    }
  };

  const displayName = profile?.display_name || "Student";
  const photoUrl = profile?.photo_url ?? null;
  const initials = displayName.trim().slice(0, 2).toUpperCase();

  if (loading) {
    return (
      <AuthGate>
        <RoleGuard requiredRole="guest">
          <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
            <ActivityIndicator color={colors.primary} />
          </View>
        </RoleGuard>
      </AuthGate>
    );
  }

  return (
    <AuthGate>
      <RoleGuard requiredRole="guest">
        <ScrollView
          style={[styles.container, { paddingTop: insets.top }]}
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Profile</Text>
            <TouchableOpacity
              style={styles.editBtn}
              onPress={() => router.push("/guest/edit-profile")}
              activeOpacity={0.7}
            >
              <Text style={styles.editBtnText}>Edit</Text>
            </TouchableOpacity>
          </View>

          {/* Avatar + name */}
          <View style={styles.heroSection}>
            {photoUrl ? (
              <Image source={{ uri: photoUrl }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarInitials}>{initials}</Text>
              </View>
            )}
            <Text style={styles.displayName}>{displayName}</Text>
            {profile?.email ? <Text style={styles.emailText}>{profile.email}</Text> : null}
          </View>

          {/* Stats */}
          <View style={styles.statsCard}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{enrolledClasses.length}</Text>
              <Text style={styles.statLabel}>Classes Joined</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{thisWeekCount}</Text>
              <Text style={styles.statLabel}>This Week</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{savedInstructors.length}</Text>
              <Text style={styles.statLabel}>Saved</Text>
            </View>
          </View>

          {/* Saved Instructors */}
          {savedInstructors.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Saved Instructors</Text>
                <MaterialCommunityIcons name="heart" size={14} color={colors.primaryTint} />
              </View>
              <View style={styles.classList}>
                {savedInstructors.map((inst) => (
                  <View key={inst.id} style={styles.savedCard}>
                    <View style={styles.savedAvatar}>
                      <Text style={styles.savedInitials}>{inst.initials}</Text>
                    </View>
                    <View style={styles.savedInfo}>
                      <Text style={styles.savedName}>{inst.name}</Text>
                      <Text style={styles.savedTeaches}>{inst.teaches}</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => toggleFavorite(inst.id)}
                      activeOpacity={0.7}
                      style={styles.heartBtn}
                    >
                      <MaterialCommunityIcons name="heart" size={20} color={colors.primaryTint} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Joined classes */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Classes Joined</Text>
            {enrolledClasses.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons name="calendar-blank-outline" size={32} color="#C0C0C0" />
                <Text style={styles.emptyText}>No classes yet</Text>
                <Text style={styles.emptySubtext}>Head to Discover to find your first class</Text>
              </View>
            ) : (
              <View style={styles.classList}>
                {enrolledClasses.map((cls) => {
                  const categoryColors = CATEGORY_COLORS[cls.category] ?? { bg: "#F5F0E8", text: "#6B6B6B", dot: "#C0B9A8" };
                  return (
                    <View key={cls.id} style={styles.classCard}>
                      <View style={[styles.classCardAccent, { backgroundColor: categoryColors.dot }]} />
                      <View style={styles.classCardBody}>
                        <View style={styles.classCardTopRow}>
                          <Text style={styles.classDate}>
                            {formatClassDate(cls.scheduled_at)} · {formatClassTime(cls.scheduled_at)}
                          </Text>
                          <View style={[styles.catBadge, { backgroundColor: categoryColors.bg }]}>
                            <Text style={[styles.catBadgeText, { color: categoryColors.text }]}>{cls.category}</Text>
                          </View>
                        </View>
                        <Text style={styles.classTitle} numberOfLines={1}>{cls.title}</Text>
                        <Text style={styles.classMeta}>
                          with {cls.host?.display_name ?? cls.host?.full_name ?? "Instructor"}
                        </Text>
                      </View>
                      <View style={styles.checkWrap}>
                        <MaterialCommunityIcons name="check-circle" size={18} color={colors.primary} />
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          {/* Account */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account</Text>
            <View style={styles.menuCard}>
              <MenuRow icon="chart-bar" label="My Activity" onPress={() => router.push("/guest/analytics")} />
              <View style={styles.menuDivider} />
              <MenuRow icon="bell-outline" label="Notifications" onPress={() => router.push("/notifications")} />
              <View style={styles.menuDivider} />
              <MenuRow icon="account-group-outline" label="Invite Friends" onPress={() => router.push("/referral")} />
              <View style={styles.menuDivider} />
              <MenuRow icon="chat-outline" label="Support" onPress={() => router.push("/support-chat")} />
              <View style={styles.menuDivider} />
              <MenuRow icon="cog-outline" label="Settings" onPress={() => router.push("/settings")} />
            </View>
          </View>

          {/* Sign out */}
          <View style={styles.footerSection}>
            <TouchableOpacity
              style={styles.signOutBtn}
              onPress={handleSignOut}
              disabled={signingOut}
              activeOpacity={0.7}
            >
              <Text style={styles.signOutText}>{signingOut ? "Signing out…" : "Sign Out"}</Text>
            </TouchableOpacity>
            <Text style={styles.version}>Flocked v1.0</Text>
          </View>
        </ScrollView>
      </RoleGuard>
    </AuthGate>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FDFBF7",
  },
  centered: {
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    gap: 0,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.navy,
    letterSpacing: -0.3,
  },
  editBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#F0EDE5",
    backgroundColor: "#FFFFFF",
  },
  editBtnText: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.navy,
  },
  heroSection: {
    alignItems: "center",
    paddingVertical: 24,
    paddingHorizontal: 20,
    gap: 6,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primaryTint,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 4,
  },
  avatarInitials: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.primary,
  },
  displayName: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.navy,
    letterSpacing: -0.2,
  },
  emailText: {
    fontSize: 14,
    color: "#6B6B6B",
  },
  memberBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.primaryTint,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginTop: 4,
  },
  memberBadgeText: {
    fontSize: 12,
    color: "#007A70",
    fontWeight: "500",
  },
  statsCard: {
    flexDirection: "row",
    marginHorizontal: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F0EDE5",
    paddingVertical: 18,
    marginBottom: 24,
  },
  statBox: {
    flex: 1,
    alignItems: "center",
    gap: 3,
  },
  statValue: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.navy,
    letterSpacing: -0.3,
  },
  statLabel: {
    fontSize: 11,
    color: "#6B6B6B",
    textAlign: "center",
  },
  statDivider: {
    width: 1,
    backgroundColor: "#F0EDE5",
    marginVertical: 6,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
    gap: 10,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.navy,
  },
  savedCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F0EDE5",
    padding: 12,
    gap: 12,
  },
  savedAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryTint,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  savedInitials: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.primary,
  },
  savedInfo: {
    flex: 1,
    gap: 2,
  },
  savedName: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.navy,
  },
  savedTeaches: {
    fontSize: 12,
    color: "#6B6B6B",
  },
  heartBtn: {
    padding: 4,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 32,
    gap: 6,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.navy,
    marginTop: 4,
  },
  emptySubtext: {
    fontSize: 13,
    color: "#6B6B6B",
    textAlign: "center",
  },
  classList: {
    gap: 8,
  },
  classCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F0EDE5",
    overflow: "hidden",
  },
  classCardAccent: {
    width: 4,
    alignSelf: "stretch",
  },
  classCardBody: {
    flex: 1,
    padding: 12,
    gap: 2,
  },
  classCardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  classDate: {
    fontSize: 11,
    color: "#6B6B6B",
    fontWeight: "500",
  },
  catBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  catBadgeText: {
    fontSize: 10,
    fontWeight: "600",
  },
  classTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.navy,
  },
  classMeta: {
    fontSize: 12,
    color: "#6B6B6B",
  },
  checkWrap: {
    padding: 14,
  },
  menuCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F0EDE5",
    overflow: "hidden",
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  menuRowLabel: {
    flex: 1,
    fontSize: 14,
    color: colors.navy,
  },
  menuDivider: {
    height: 1,
    backgroundColor: "#F0EDE5",
    marginLeft: 44,
  },
  footerSection: {
    paddingHorizontal: 20,
    alignItems: "center",
    gap: 4,
    paddingTop: 8,
  },
  signOutBtn: {
    paddingVertical: 14,
    alignItems: "center",
    width: "100%",
  },
  signOutText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#EF4444",
  },
  version: {
    fontSize: 12,
    color: "#C0C0C0",
    marginTop: 4,
  },
});
