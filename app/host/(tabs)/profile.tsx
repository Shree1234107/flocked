import { Alert, Image, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { ActivityIndicator, Text } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCallback, useState } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";

import { AuthGate } from "../../../components/AuthGate";
import { RoleGuard } from "../../../components/RoleGuard";
import { useRole } from "../../../lib/role";
import { getHostProfile } from "../../../lib/api";
import { supabase } from "../../../lib/supabase";
import type { HostProfile } from "../../../lib/types";

function MenuRow({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.menuRow} onPress={onPress} activeOpacity={0.7}>
      <MaterialCommunityIcons name={icon as never} size={18} color="#888888" />
      <Text style={styles.menuRowLabel}>{label}</Text>
      <MaterialCommunityIcons name="chevron-right" size={18} color="#D0D0D0" />
    </TouchableOpacity>
  );
}

const MOCK_UPCOMING = [
  { id: "1", title: "Beginner Morning Yoga", date: "Mon, Jun 16", time: "9:00 AM", duration: 60, category: "Yoga", current: 8, max: 15 },
  { id: "2", title: "Evening Flow", date: "Wed, Jun 18", time: "6:00 PM", duration: 45, category: "Yoga", current: 3, max: 10 },
  { id: "3", title: "Hip Hop Basics", date: "Fri, Jun 20", time: "4:00 PM", duration: 60, category: "Dance", current: 12, max: 20 },
];

const MOCK_REVIEWS = [
  { id: "r1", author: "Maya T.", initials: "MT", rating: 5, date: "Jun 10", text: "Sarah's energy is incredible. Left feeling refreshed every time." },
  { id: "r2", author: "James L.", initials: "JL", rating: 5, date: "Jun 5", text: "Best online yoga class I've taken. Clear cues, great pacing." },
  { id: "r3", author: "Priya K.", initials: "PK", rating: 4, date: "May 28", text: "Really enjoyed this class! Would love more time on cool-down." },
];

const CATEGORY_COLORS: Record<string, { bg: string; dot: string; text: string }> = {
  Yoga: { bg: "#E0F7F5", dot: "#00B4A6", text: "#007A70" },
  Dance: { bg: "#FDF0F2", dot: "#E0F7F5", text: "#A04060" },
  Tutoring: { bg: "#EEF3F8", dot: "#94B4D2", text: "#3A5F80" },
};

export default function InstructorProfileTab() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { clearRole } = useRole();
  const [signingOut, setSigningOut] = useState(false);
  const [profile, setProfile] = useState<HostProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getHostProfile()
        .then((p) => { if (active) { setProfile(p); setProfileLoading(false); } })
        .catch(() => { if (active) setProfileLoading(false); });
      return () => { active = false; };
    }, [])
  );

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await supabase.auth.signOut();
      await clearRole();
    } catch {
      Alert.alert("Oops", "Sign out failed. Please try again.");
    } finally {
      setSigningOut(false);
    }
  };

  const displayName = profile?.display_name || "Teacher";
  const photoUrl = profile?.photo_url ?? null;
  const initials = displayName.trim().slice(0, 2).toUpperCase();
  const teaches = profile?.interest_tags ?? [];
  const bio = profile?.bio ?? "";

  return (
    <AuthGate>
      <RoleGuard requiredRole="host">
        {profileLoading ? (
          <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
            <ActivityIndicator color="#00B4A6" />
          </View>
        ) : null}
        <ScrollView
          style={[styles.container, { paddingTop: insets.top, opacity: profileLoading ? 0 : 1 }]}
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Profile</Text>
            <TouchableOpacity
              style={styles.editBtn}
              onPress={() => router.push("/host/edit/profile")}
              activeOpacity={0.8}
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
            {teaches.length > 0 && (
              <View style={styles.teachesRow}>
                {teaches.map((tag) => {
                  const colors = CATEGORY_COLORS[tag];
                  return (
                    <View key={tag} style={[styles.teachTag, { backgroundColor: colors?.bg ?? "#F9F9F9" }]}>
                      <View style={[styles.teachDot, { backgroundColor: colors?.dot ?? "#EEEEEE" }]} />
                      <Text style={[styles.teachTagText, { color: colors?.text ?? "#888888" }]}>{tag}</Text>
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          {/* Bio */}
          {bio ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>About</Text>
              <View style={styles.bioCard}>
                <Text style={styles.bioText}>{bio}</Text>
              </View>
            </View>
          ) : null}

          {/* Upcoming classes */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Upcoming Classes</Text>
            <View style={styles.classList}>
              {MOCK_UPCOMING.map((cls) => {
                const colors = CATEGORY_COLORS[cls.category];
                return (
                  <View key={cls.id} style={styles.classRow}>
                    <View style={[styles.classBar, { backgroundColor: colors?.dot ?? "#EEEEEE" }]} />
                    <View style={styles.classInfo}>
                      <Text style={styles.classDate}>{cls.date} · {cls.time}</Text>
                      <Text style={styles.classTitle} numberOfLines={1}>{cls.title}</Text>
                      <Text style={styles.classMeta}>{cls.duration}min · {cls.current}/{cls.max} spots taken</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Reviews */}
          <View style={styles.section}>
            <View style={styles.reviewsHeaderRow}>
              <Text style={styles.sectionTitle}>Reviews</Text>
              <View style={styles.reviewsBadge}>
                <MaterialCommunityIcons name="star" size={12} color="#F4A200" />
                <Text style={styles.reviewsBadgeText}>4.8 · 47</Text>
              </View>
            </View>
            <View style={styles.classList}>
              {MOCK_REVIEWS.map((r) => (
                <View key={r.id} style={styles.reviewCard}>
                  <View style={styles.reviewTop}>
                    <View style={styles.reviewAvatar}>
                      <Text style={styles.reviewInitials}>{r.initials}</Text>
                    </View>
                    <View style={styles.reviewMeta}>
                      <Text style={styles.reviewAuthor}>{r.author}</Text>
                      <View style={styles.reviewStarsRow}>
                        {[1, 2, 3, 4, 5].map((i) => (
                          <MaterialCommunityIcons
                            key={i}
                            name={i <= r.rating ? "star" : "star-outline"}
                            size={11}
                            color="#F4A200"
                          />
                        ))}
                        <Text style={styles.reviewDate}>{r.date}</Text>
                      </View>
                    </View>
                  </View>
                  <Text style={styles.reviewText}>{r.text}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Account menu */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account</Text>
            <View style={styles.menuCard}>
              <MenuRow icon="cash-multiple" label="Earnings" onPress={() => router.push("/host/earnings")} />
              <View style={styles.menuDivider} />
              <MenuRow icon="account-multiple-outline" label="My Followers" onPress={() => router.push("/host/followers")} />
              <View style={styles.menuDivider} />
              <MenuRow icon="chart-line" label="Analytics" onPress={() => router.push("/host/analytics")} />
              <View style={styles.menuDivider} />
              <MenuRow icon="account-group-outline" label="Invite Friends" onPress={() => router.push("/referral")} />
              <View style={styles.menuDivider} />
              <MenuRow icon="bell-outline" label="Notifications" onPress={() => router.push("/notifications")} />
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
    backgroundColor: "#FFFFFF",
  },
  centered: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
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
    color: "#2C2C2C",
    letterSpacing: -0.3,
  },
  editBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#EEEEEE",
    backgroundColor: "#F9F9F9",
  },
  editBtnText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#2C2C2C",
  },
  heroSection: {
    alignItems: "center",
    paddingVertical: 24,
    paddingHorizontal: 20,
    gap: 8,
  },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: "#E0F7F5",
    borderWidth: 2,
    borderColor: "#00B4A6",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  avatarImage: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 2,
    borderColor: "#00B4A6",
    marginBottom: 4,
  },
  avatarInitials: {
    fontSize: 28,
    fontWeight: "700",
    color: "#00B4A6",
  },
  displayName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#2C2C2C",
    letterSpacing: -0.2,
  },
  teachesRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 2,
  },
  teachTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  teachDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  teachTagText: {
    fontSize: 12,
    fontWeight: "600",
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginTop: 2,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#2C2C2C",
    marginLeft: 4,
  },
  ratingCount: {
    fontSize: 13,
    color: "#888888",
  },
  statsCard: {
    flexDirection: "row",
    marginHorizontal: 20,
    backgroundColor: "#F9F9F9",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EEEEEE",
    paddingVertical: 18,
    marginBottom: 24,
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
    fontWeight: "500",
    textAlign: "center",
  },
  statDivider: {
    width: 1,
    backgroundColor: "#EEEEEE",
    marginVertical: 6,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2C2C2C",
  },
  bioCard: {
    backgroundColor: "#F9F9F9",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EEEEEE",
    padding: 14,
  },
  bioText: {
    fontSize: 14,
    color: "#888888",
    lineHeight: 21,
  },
  classList: {
    gap: 8,
  },
  classRow: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EEEEEE",
    overflow: "hidden",
  },
  classBar: {
    width: 4,
    alignSelf: "stretch",
  },
  classInfo: {
    flex: 1,
    padding: 12,
    gap: 2,
  },
  classDate: {
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
  reviewsHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  reviewsBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFF8E6",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "#F4D080",
  },
  reviewsBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#A07000",
  },
  reviewCard: {
    backgroundColor: "#F9F9F9",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EEEEEE",
    padding: 12,
    gap: 8,
  },
  reviewTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  reviewAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#E0F7F5",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  reviewInitials: {
    fontSize: 11,
    fontWeight: "700",
    color: "#00B4A6",
  },
  reviewMeta: {
    flex: 1,
    gap: 3,
  },
  reviewAuthor: {
    fontSize: 13,
    fontWeight: "600",
    color: "#2C2C2C",
  },
  reviewStarsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  reviewDate: {
    fontSize: 11,
    color: "#888888",
    marginLeft: 4,
  },
  reviewText: {
    fontSize: 13,
    color: "#444444",
    lineHeight: 19,
  },
  menuCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EEEEEE",
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
    color: "#2C2C2C",
  },
  menuDivider: {
    height: 1,
    backgroundColor: "#EEEEEE",
    marginLeft: 44,
  },
  footerSection: {
    paddingHorizontal: 20,
    alignItems: "center",
    gap: 4,
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
