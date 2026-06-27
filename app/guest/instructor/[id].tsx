import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { ActivityIndicator, Text } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { AuthGate } from "../../../components/AuthGate";
import { FollowButton } from "../../../components/FollowButton";
import {
  getInstructorPublicProfile,
  getFollowStatus,
  getInstructorReviews,
  listClasses,
  type InstructorPublicProfile,
} from "../../../lib/api";
import type { ScheduledClass, ClassReview } from "../../../lib/types";

const CATEGORY_COLORS: Record<string, { bg: string; dot: string; text: string }> = {
  Yoga: { bg: "#E0F7F5", dot: "#00B4A6", text: "#007A70" },
  Dance: { bg: "#FDF0F2", dot: "#E0F7F5", text: "#A04060" },
  Tutoring: { bg: "#EEF3F8", dot: "#94B4D2", text: "#3A5F80" },
};

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const h = d.getHours();
  const m = d.getMinutes();
  return `${h % 12 || 12}:${m.toString().padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

function StarRow({ rating }: { rating: number }) {
  return (
    <View style={{ flexDirection: "row", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <MaterialCommunityIcons
          key={i}
          name={i <= Math.round(rating) ? "star" : "star-outline"}
          size={13}
          color="#F4A200"
        />
      ))}
    </View>
  );
}

export default function InstructorProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [profile, setProfile] = useState<InstructorPublicProfile | null>(null);
  const [following, setFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [upcomingClasses, setUpcomingClasses] = useState<ScheduledClass[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [totalReviews, setTotalReviews] = useState(0);
  const [bioExpanded, setBioExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!id) return;
      let active = true;
      setLoading(true);
      setError(null);

      Promise.all([
        getInstructorPublicProfile(id),
        getFollowStatus(id),
        getInstructorReviews(id),
        listClasses(),
      ])
        .then(([prof, followStatus, reviewData, allClasses]) => {
          if (!active) return;
          setProfile(prof);
          setFollowing(followStatus.following);
          setfollowerCount(followStatus.follower_count);
          setReviews(reviewData.reviews.slice(0, 5));
          setTotalReviews(reviewData.total);
          const now = new Date();
          setUpcomingClasses(
            allClasses
              .filter((c) => c.host_id === id && new Date(c.scheduled_at) > now)
              .slice(0, 5)
          );
          setLoading(false);
        })
        .catch((err) => {
          if (!active) return;
          setError(err instanceof Error ? err.message : "Failed to load profile.");
          setLoading(false);
        });

      return () => { active = false; };
    }, [id])
  );

  const initials = profile?.display_name
    ? profile.display_name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  return (
    <AuthGate>
      <ScrollView
        style={styles.root}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 32 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Back button */}
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <MaterialCommunityIcons name="arrow-left" size={22} color="#333" />
        </TouchableOpacity>

        {loading && (
          <View style={styles.centerBox}>
            <ActivityIndicator color="#00B4A6" />
          </View>
        )}

        {error && !loading && (
          <View style={styles.centerBox}>
            <MaterialCommunityIcons name="alert-circle-outline" size={36} color="#E0F7F5" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {profile && !loading && (
          <>
            {/* Hero */}
            <View style={styles.hero}>
              <View style={styles.avatar}>
                {profile.photo_url ? (
                  <View style={styles.avatarImg} />
                ) : (
                  <Text style={styles.avatarInitials}>{initials}</Text>
                )}
              </View>

              <Text style={styles.name}>{profile.display_name ?? "Instructor"}</Text>

              {/* Interest tags */}
              <View style={styles.tagRow}>
                {profile.interest_tags.map((tag) => {
                  const colors = CATEGORY_COLORS[tag] ?? { bg: "#F5F5F5", dot: "#CCC", text: "#666" };
                  return (
                    <View key={tag} style={[styles.tagPill, { backgroundColor: colors.bg }]}>
                      <View style={[styles.tagDot, { backgroundColor: colors.dot }]} />
                      <Text style={[styles.tagText, { color: colors.text }]}>{tag}</Text>
                    </View>
                  );
                })}
              </View>

              {/* Bio */}
              {profile.bio ? (
                <View>
                  <Text
                    style={styles.bio}
                    numberOfLines={bioExpanded ? undefined : 3}
                  >
                    {profile.bio}
                  </Text>
                  {profile.bio.length > 100 && (
                    <TouchableOpacity onPress={() => setBioExpanded((e) => !e)} activeOpacity={0.7}>
                      <Text style={styles.readMore}>
                        {bioExpanded ? "Show less" : "Read more"}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : null}

              {/* Stats */}
              <View style={styles.statsRow}>
                {profile.avg_rating != null && (
                  <>
                    <Text style={styles.stat}>★ {profile.avg_rating.toFixed(1)}</Text>
                    <Text style={styles.statDot}>·</Text>
                  </>
                )}
                <Text style={styles.stat}>{profile.total_reviews} reviews</Text>
                <Text style={styles.statDot}>·</Text>
                <Text style={styles.stat}>{followerCount} followers</Text>
                <Text style={styles.statDot}>·</Text>
                <Text style={styles.stat}>{profile.upcoming_classes} classes</Text>
              </View>

              {/* Follow button */}
              <View style={styles.followWrap}>
                <FollowButton
                  hostId={id!}
                  initialFollowing={following}
                  initialCount={followerCount}
                  size="md"
                  onFollowChange={(f) => {
                    setFollowing(f);
                    setFollowerCount((c) => c + (f ? 1 : -1));
                  }}
                />
              </View>
            </View>

            {/* Upcoming classes */}
            <Text style={styles.sectionTitle}>Upcoming Classes</Text>
            {upcomingClasses.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>No classes scheduled yet</Text>
              </View>
            ) : (
              upcomingClasses.map((cls) => {
                const colors = CATEGORY_COLORS[cls.category];
                const spotsLeft = cls.max_students - cls.current_students;
                return (
                  <TouchableOpacity
                    key={cls.id}
                    style={styles.classCard}
                    onPress={() => router.push(`/guest/class/${cls.id}`)}
                    activeOpacity={0.85}
                  >
                    <View style={[styles.classBar, { backgroundColor: colors?.dot ?? "#EEE" }]} />
                    <View style={styles.classBody}>
                      <View style={styles.classTop}>
                        <Text style={styles.classTime}>{formatTime(cls.scheduled_at)}</Text>
                        <View style={[styles.catBadge, { backgroundColor: colors?.bg ?? "#F5F5F5" }]}>
                          <Text style={[styles.catBadgeText, { color: colors?.text ?? "#666" }]}>
                            {cls.category}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.classTitle}>{cls.title}</Text>
                      <Text style={styles.classMeta}>
                        {formatDate(cls.scheduled_at)} · {spotsLeft > 0 ? `${spotsLeft} spots left` : "Full"}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}

            {/* Reviews */}
            {reviews.length > 0 && (
              <>
                <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Reviews</Text>
                {reviews.map((r, i) => (
                  <View key={i} style={styles.reviewCard}>
                    <View style={styles.reviewHeader}>
                      <StarRow rating={r.rating} />
                      <Text style={styles.reviewDate}>{formatDate(r.created_at)}</Text>
                    </View>
                    {r.review_text && (
                      <Text style={styles.reviewText}>{r.review_text}</Text>
                    )}
                  </View>
                ))}
                {totalReviews > 5 && (
                  <TouchableOpacity activeOpacity={0.7} style={styles.seeAllBtn}>
                    <Text style={styles.seeAllText}>See all {totalReviews} reviews</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </>
        )}
      </ScrollView>
    </AuthGate>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FAFAF8" },
  content: { paddingHorizontal: 20 },
  backBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: "#F0F0F0",
    alignItems: "center", justifyContent: "center", marginBottom: 16,
  },
  centerBox: { alignItems: "center", paddingVertical: 60, gap: 12 },
  errorText: { color: "#888", fontSize: 14, textAlign: "center" },

  hero: { alignItems: "center", gap: 10, marginBottom: 28 },
  avatar: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: "#00B4A6",
    alignItems: "center", justifyContent: "center",
  },
  avatarImg: { width: 80, height: 80, borderRadius: 40, backgroundColor: "#DDD" },
  avatarInitials: { fontSize: 28, fontWeight: "700", color: "#fff" },
  name: { fontSize: 22, fontWeight: "800", color: "#1A1A1A", textAlign: "center" },

  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, justifyContent: "center" },
  tagPill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  tagDot: { width: 6, height: 6, borderRadius: 3 },
  tagText: { fontSize: 12, fontWeight: "600" },

  bio: { fontSize: 14, color: "#666", lineHeight: 20, textAlign: "center" },
  readMore: { fontSize: 13, color: "#00B4A6", fontWeight: "600", textAlign: "center", marginTop: 4 },

  statsRow: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap", justifyContent: "center" },
  stat: { fontSize: 13, color: "#555", fontWeight: "500" },
  statDot: { fontSize: 13, color: "#CCC" },

  followWrap: { width: "100%", marginTop: 4 },

  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#1A1A1A", marginBottom: 12 },

  emptyCard: {
    backgroundColor: "#fff", borderRadius: 12, padding: 20, alignItems: "center",
    shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  emptyText: { fontSize: 14, color: "#888" },

  classCard: {
    flexDirection: "row", backgroundColor: "#fff", borderRadius: 12,
    borderWidth: 1, borderColor: "#EEEEEE", overflow: "hidden", marginBottom: 10,
  },
  classBar: { width: 4, alignSelf: "stretch" },
  classBody: { flex: 1, padding: 12, gap: 3 },
  classTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  classTime: { fontSize: 12, fontWeight: "600", color: "#888" },
  catBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  catBadgeText: { fontSize: 10, fontWeight: "600" },
  classTitle: { fontSize: 14, fontWeight: "700", color: "#1A1A1A" },
  classMeta: { fontSize: 12, color: "#888" },

  reviewCard: {
    backgroundColor: "#fff", borderRadius: 12, padding: 14, marginBottom: 10,
    shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2,
    gap: 6,
  },
  reviewHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  reviewDate: { fontSize: 12, color: "#AAA" },
  reviewText: { fontSize: 13, color: "#555", lineHeight: 19 },
  seeAllBtn: { alignItems: "center", paddingVertical: 12 },
  seeAllText: { fontSize: 13, color: "#00B4A6", fontWeight: "600" },
});
