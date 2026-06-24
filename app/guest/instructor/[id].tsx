import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Text } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { AuthGate } from "../../../components/AuthGate";
import { RoleGuard } from "../../../components/RoleGuard";
import { FollowButton } from "../../../components/FollowButton";
import {
  getInstructorPublicProfile,
  getFollowStatus,
  getInstructorReviews,
  listClasses,
} from "../../../lib/api";
import type { InstructorPublicProfile, ScheduledClass } from "../../../lib/types";

const CATEGORY_COLORS: Record<string, { bg: string; dot: string; label: string }> = {
  Yoga:     { bg: "#F0F5EE", dot: "#87A878", label: "#4A7A40" },
  Dance:    { bg: "#FDF0F2", dot: "#F4B8C1", label: "#A04060" },
  Tutoring: { bg: "#EEF3F8", dot: "#94B4D2", label: "#3A5F80" },
};

const MONTHS_ABB = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function formatTime(iso: string): string {
  const d = new Date(iso);
  const h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${m.toString().padStart(2, "0")} ${ampm}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const days = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  return `${days[d.getDay()]}, ${MONTHS_ABB[d.getMonth()]} ${d.getDate()}`;
}

export default function InstructorProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [profile, setProfile] = useState<InstructorPublicProfile | null>(null);
  const [followStatus, setFollowStatus] = useState<{ following: boolean; follower_count: number } | null>(null);
  const [reviews, setReviews] = useState<Array<{ id: string; rating: number; review_text: string | null; created_at: string; student_id: string }>>([]);
  const [classes, setClasses] = useState<ScheduledClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bioExpanded, setBioExpanded] = useState(false);

  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [profileData, followData, reviewData, classData] = await Promise.all([
        getInstructorPublicProfile(id),
        getFollowStatus(id).catch(() => ({ following: false, follower_count: 0 })),
        getInstructorReviews(id).catch(() => ({ reviews: [], total: 0, avg_rating: null })),
        listClasses({ hostId: id }).catch(() => [] as ScheduledClass[]),
      ]);
      setProfile(profileData);
      setFollowStatus(followData);
      setReviews(reviewData.reviews.slice(0, 5));
      setClasses(classData);
    } catch {
      setError("Failed to load instructor profile.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const displayName = profile?.display_name ?? "Instructor";
  const initials = displayName.trim().slice(0, 2).toUpperCase();

  if (loading) {
    return (
      <AuthGate>
        <RoleGuard requiredRole="guest">
          <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
            <ActivityIndicator color="#87A878" />
          </View>
        </RoleGuard>
      </AuthGate>
    );
  }

  if (error || !profile) {
    return (
      <AuthGate>
        <RoleGuard requiredRole="guest">
          <View style={[styles.container, { paddingTop: insets.top }]}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => router.back()}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="arrow-left" size={20} color="#2C2C2C" />
            </TouchableOpacity>
            <View style={styles.centered}>
              <MaterialCommunityIcons name="account-off-outline" size={40} color="#C0C0C0" />
              <Text style={styles.errorText}>{error ?? "Instructor not found."}</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={loadData} activeOpacity={0.7}>
                <MaterialCommunityIcons name="refresh" size={14} color="#87A878" />
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          </View>
        </RoleGuard>
      </AuthGate>
    );
  }

  const bioText = profile.bio ?? "";
  const bioLines = bioText.split("\n");
  const bioPreview = bioLines.slice(0, 3).join("\n");
  const bioTruncated = !bioExpanded && bioLines.length > 3;

  return (
    <AuthGate>
      <RoleGuard requiredRole="guest">
        <View style={[styles.container, { paddingTop: insets.top }]}>
          {/* Back button */}
          <TouchableOpacity
            style={[styles.backBtn, { marginHorizontal: 20, marginTop: 12 }]}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="arrow-left" size={20} color="#2C2C2C" />
          </TouchableOpacity>

          <ScrollView
            contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
            showsVerticalScrollIndicator={false}
          >
            {/* Hero */}
            <View style={styles.heroSection}>
              <View style={styles.avatar}>
                <Text style={styles.avatarInitials}>{initials}</Text>
              </View>
              <Text style={styles.displayName}>{displayName}</Text>

              {profile.interest_tags.length > 0 && (
                <View style={styles.tagsRow}>
                  {profile.interest_tags.map((tag) => {
                    const colors = CATEGORY_COLORS[tag];
                    return (
                      <View key={tag} style={[styles.tagPill, { backgroundColor: colors?.bg ?? "#F9F9F9" }]}>
                        <View style={[styles.tagDot, { backgroundColor: colors?.dot ?? "#EEEEEE" }]} />
                        <Text style={[styles.tagText, { color: colors?.label ?? "#888888" }]}>{tag}</Text>
                      </View>
                    );
                  })}
                </View>
              )}

              {bioText ? (
                <View style={styles.bioWrap}>
                  <Text style={styles.bioText}>{bioTruncated ? bioPreview : bioText}</Text>
                  {bioLines.length > 3 && (
                    <TouchableOpacity onPress={() => setBioExpanded((e) => !e)} activeOpacity={0.7}>
                      <Text style={styles.bioToggle}>{bioTruncated ? "Read more" : "Show less"}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : null}
            </View>

            {/* Stats row */}
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {profile.avg_rating != null ? `★ ${profile.avg_rating.toFixed(1)}` : "—"}
                </Text>
                <Text style={styles.statLabel}>Rating</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{profile.total_reviews}</Text>
                <Text style={styles.statLabel}>Reviews</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{followStatus?.follower_count ?? profile.follower_count}</Text>
                <Text style={styles.statLabel}>Followers</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{profile.upcoming_classes}</Text>
                <Text style={styles.statLabel}>Classes</Text>
              </View>
            </View>

            {/* Follow button */}
            {followStatus && (
              <View style={styles.followSection}>
                <FollowButton
                  hostId={id!}
                  initialFollowing={followStatus.following}
                  initialCount={followStatus.follower_count}
                  size="md"
                  onFollowChange={(f) =>
                    setFollowStatus((s) => s ? { ...s, following: f, follower_count: s.follower_count + (f ? 1 : -1) } : s)
                  }
                />
              </View>
            )}

            {/* Upcoming Classes */}
            {classes.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Upcoming Classes</Text>
                <View style={styles.classList}>
                  {classes.map((cls) => {
                    const colors = CATEGORY_COLORS[cls.category];
                    const spotsLeft = cls.max_students - cls.current_students;
                    const full = spotsLeft <= 0;
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
                            <Text style={styles.classCardDate}>{formatDate(cls.scheduled_at)}</Text>
                            <View style={[styles.spotsBadge, full && styles.spotsBadgeFull]}>
                              <Text style={[styles.spotsText, full && styles.spotsTextFull]}>
                                {full ? "Full" : `${spotsLeft} spot${spotsLeft === 1 ? "" : "s"} left`}
                              </Text>
                            </View>
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Reviews */}
            {reviews.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Reviews</Text>
                <View style={styles.classList}>
                  {reviews.map((r) => {
                    const d = new Date(r.created_at);
                    const dateStr = `${MONTHS_ABB[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
                    const initials2 = r.student_id.slice(0, 2).toUpperCase();
                    return (
                      <View key={r.id} style={styles.reviewCard}>
                        <View style={styles.reviewTop}>
                          <View style={styles.reviewAvatar}>
                            <Text style={styles.reviewInitials}>{initials2}</Text>
                          </View>
                          <View style={styles.reviewMeta}>
                            <View style={styles.reviewStarsRow}>
                              {[1, 2, 3, 4, 5].map((i) => (
                                <MaterialCommunityIcons
                                  key={i}
                                  name={i <= r.rating ? "star" : "star-outline"}
                                  size={11}
                                  color="#F4A200"
                                />
                              ))}
                              <Text style={styles.reviewDate}>{dateStr}</Text>
                            </View>
                          </View>
                        </View>
                        {r.review_text ? (
                          <Text style={styles.reviewText}>{r.review_text}</Text>
                        ) : null}
                      </View>
                    );
                  })}
                </View>
              </View>
            )}
          </ScrollView>
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
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F9F9F9",
    borderWidth: 1,
    borderColor: "#EEEEEE",
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 0,
  },
  heroSection: {
    alignItems: "center",
    paddingVertical: 20,
    gap: 8,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#87A878",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  avatarInitials: {
    fontSize: 28,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  displayName: {
    fontSize: 22,
    fontWeight: "700",
    color: "#2C2C2C",
    letterSpacing: -0.3,
  },
  tagsRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
    justifyContent: "center",
    marginTop: 2,
  },
  tagPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  tagDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  tagText: {
    fontSize: 12,
    fontWeight: "600",
  },
  bioWrap: {
    width: "100%",
    gap: 4,
  },
  bioText: {
    fontSize: 14,
    color: "#888888",
    lineHeight: 21,
    textAlign: "center",
  },
  bioToggle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#87A878",
    textAlign: "center",
  },
  statsRow: {
    flexDirection: "row",
    backgroundColor: "#F9F9F9",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EEEEEE",
    paddingVertical: 16,
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    gap: 3,
  },
  statValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#2C2C2C",
  },
  statLabel: {
    fontSize: 10,
    color: "#888888",
    textAlign: "center",
  },
  statDivider: {
    width: 1,
    backgroundColor: "#EEEEEE",
    marginVertical: 4,
  },
  followSection: {
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#2C2C2C",
  },
  classList: {
    gap: 8,
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
    fontSize: 14,
    fontWeight: "600",
    color: "#2C2C2C",
  },
  classCardMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 2,
  },
  classCardDate: {
    fontSize: 12,
    color: "#888888",
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
    alignItems: "center",
    gap: 10,
  },
  reviewAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F0F5EE",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  reviewInitials: {
    fontSize: 11,
    fontWeight: "700",
    color: "#87A878",
  },
  reviewMeta: {
    flex: 1,
  },
  reviewStarsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  reviewDate: {
    fontSize: 11,
    color: "#888888",
    marginLeft: 6,
  },
  reviewText: {
    fontSize: 13,
    color: "#444444",
    lineHeight: 19,
  },
  errorText: {
    fontSize: 15,
    color: "#888888",
    textAlign: "center",
  },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F0F5EE",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#4A7A40",
  },
});
