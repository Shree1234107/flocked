import { Share, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { Text } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useState } from "react";

import { AuthGate } from "../../../components/AuthGate";
import { RoleGuard } from "../../../components/RoleGuard";
import { useFavorites } from "../../../lib/favorites";

const MOCK_CLASS = {
  id: "1",
  title: "Beginner Morning Yoga",
  category: "Yoga" as const,
  instructor: {
    id: "inst-1",
    name: "Sarah Chen",
    initials: "SC",
    subtitle: "Certified Yoga & Dance Instructor",
  },
  date: "Monday, Jun 16",
  time: "9:00 AM",
  duration: 60,
  currentStudents: 15,
  maxStudents: 15,
  description:
    "Perfect for beginners! We'll focus on foundational poses, breathing techniques, and building body awareness. No experience needed — all levels welcome.\n\nWhat to bring: a yoga mat, water bottle, and comfortable clothing.",
};

const MOCK_REVIEWS = [
  { id: "r1", author: "Maya T.", initials: "MT", rating: 5, date: "Jun 10", text: "Sarah's energy is incredible. I came in nervous and left feeling so refreshed. The pacing was perfect for beginners." },
  { id: "r2", author: "James L.", initials: "JL", rating: 5, date: "Jun 5", text: "Best online yoga class I've taken. The video quality was great and she gave really clear cues throughout." },
  { id: "r3", author: "Priya K.", initials: "PK", rating: 4, date: "May 28", text: "Really enjoyed this class! Would love slightly more time on cool-down poses. Will definitely be back." },
];

const CATEGORY_COLORS = {
  Yoga: { headerBg: "#F0F5EE", dot: "#87A878", text: "#4A7A40" },
  Dance: { headerBg: "#FDF0F2", dot: "#F4B8C1", text: "#A04060" },
  Tutoring: { headerBg: "#EEF3F8", dot: "#94B4D2", text: "#3A5F80" },
};

function StarRow({ rating, count }: { rating: number; count: number }) {
  return (
    <View style={styles.starRow}>
      {[1, 2, 3, 4, 5].map((i) => (
        <MaterialCommunityIcons
          key={i}
          name={i <= Math.floor(rating) ? "star" : i - rating < 1 ? "star-half-full" : "star-outline"}
          size={14}
          color="#F4A200"
        />
      ))}
      <Text style={styles.starCount}>{rating.toFixed(1)} ({count} reviews)</Text>
    </View>
  );
}

export default function ClassDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isFavorite, toggleFavorite } = useFavorites();
  const [waitlistJoined, setWaitlistJoined] = useState(false);

  const cls = MOCK_CLASS;
  const colors = CATEGORY_COLORS[cls.category];
  const spotsLeft = cls.maxStudents - cls.currentStudents;
  const isFull = spotsLeft <= 0;
  const fillPct = cls.currentStudents / cls.maxStudents;
  const favored = isFavorite(cls.instructor.id);

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out "${cls.title}" with ${cls.instructor.name} on Flocked! ${cls.date} at ${cls.time}. Join me — download the app at flocked.app`,
        title: cls.title,
      });
    } catch {
      // user dismissed
    }
  };

  const handleWaitlist = () => {
    setWaitlistJoined(true);
  };

  return (
    <AuthGate>
      <RoleGuard requiredRole="guest">
        <View style={[styles.container, { paddingTop: insets.top }]}>
          {/* Hero */}
          <View style={[styles.heroSection, { backgroundColor: colors.headerBg }]}>
            <View style={styles.heroNav}>
              <TouchableOpacity
                style={styles.backBtn}
                onPress={() => router.back()}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons name="arrow-left" size={20} color="#2C2C2C" />
              </TouchableOpacity>
              <View style={styles.heroActions}>
                <TouchableOpacity
                  style={styles.heroActionBtn}
                  onPress={() => toggleFavorite(cls.instructor.id)}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons
                    name={favored ? "heart" : "heart-outline"}
                    size={20}
                    color={favored ? "#F4B8C1" : "#2C2C2C"}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.heroActionBtn}
                  onPress={handleShare}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons name="share-outline" size={20} color="#2C2C2C" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={[styles.categoryBadge, { backgroundColor: colors.dot }]}>
              <Text style={styles.categoryBadgeText}>{cls.category}</Text>
            </View>

            <Text style={styles.heroTitle}>{cls.title}</Text>
            <StarRow rating={4.8} count={47} />
          </View>

          <ScrollView
            contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
          >
            {/* Instructor card */}
            <View style={styles.instructorCard}>
              <View style={[styles.instructorAvatar, { backgroundColor: colors.headerBg }]}>
                <Text style={[styles.instructorInitials, { color: colors.text }]}>
                  {cls.instructor.initials}
                </Text>
              </View>
              <View style={styles.instructorInfo}>
                <Text style={styles.instructorName}>{cls.instructor.name}</Text>
                <Text style={styles.instructorSubtitle}>{cls.instructor.subtitle}</Text>
              </View>
              <TouchableOpacity
                onPress={() => toggleFavorite(cls.instructor.id)}
                activeOpacity={0.7}
                style={styles.heartBtn}
              >
                <MaterialCommunityIcons
                  name={favored ? "heart" : "heart-outline"}
                  size={22}
                  color={favored ? "#F4B8C1" : "#C0C0C0"}
                />
              </TouchableOpacity>
            </View>

            {/* Info card */}
            <View style={styles.infoCard}>
              <InfoRow icon="calendar-outline" label="Date" value={cls.date} />
              <View style={styles.infoDivider} />
              <InfoRow icon="clock-outline" label="Time" value={`${cls.time} · ${cls.duration} min`} />
              <View style={styles.infoDivider} />
              <InfoRow
                icon="account-group-outline"
                label="Spots"
                value={isFull ? "Class full" : `${spotsLeft} of ${cls.maxStudents} remaining`}
                valueColor={isFull ? "#EF4444" : spotsLeft <= 3 ? "#F97316" : "#2C2C2C"}
              />
            </View>

            {/* Capacity bar */}
            <View style={styles.progressSection}>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${Math.round(fillPct * 100)}%` as unknown as number,
                      backgroundColor: isFull ? "#EF4444" : colors.dot,
                    },
                  ]}
                />
              </View>
              <Text style={styles.progressLabel}>
                {cls.currentStudents}/{cls.maxStudents} enrolled
              </Text>
            </View>

            {/* Waitlist banner */}
            {isFull && (
              <View style={styles.waitlistBanner}>
                <MaterialCommunityIcons name="clock-alert-outline" size={16} color="#A04060" />
                <Text style={styles.waitlistBannerText}>
                  This class is full. Join the waitlist and we'll notify you if a spot opens.
                </Text>
              </View>
            )}

            {/* Description */}
            <View style={styles.descSection}>
              <Text style={styles.descLabel}>About this class</Text>
              <Text style={styles.descText}>{cls.description}</Text>
            </View>

            {/* Ratings & Reviews */}
            <View style={styles.reviewsSection}>
              <View style={styles.reviewsHeader}>
                <Text style={styles.reviewsTitle}>Reviews</Text>
                <View style={styles.reviewsSummary}>
                  <Text style={styles.reviewsBig}>4.8</Text>
                  <View>
                    <StarRow rating={4.8} count={47} />
                    <Text style={styles.reviewsSubtext}>47 reviews</Text>
                  </View>
                </View>
              </View>
              {MOCK_REVIEWS.map((r) => (
                <View key={r.id} style={styles.reviewCard}>
                  <View style={styles.reviewTop}>
                    <View style={styles.reviewAvatar}>
                      <Text style={styles.reviewInitials}>{r.initials}</Text>
                    </View>
                    <View style={styles.reviewMeta}>
                      <Text style={styles.reviewAuthor}>{r.author}</Text>
                      <View style={styles.reviewMetaRow}>
                        <View style={styles.reviewStars}>
                          {[1, 2, 3, 4, 5].map((i) => (
                            <MaterialCommunityIcons
                              key={i}
                              name={i <= r.rating ? "star" : "star-outline"}
                              size={12}
                              color="#F4A200"
                            />
                          ))}
                        </View>
                        <Text style={styles.reviewDate}>{r.date}</Text>
                      </View>
                    </View>
                  </View>
                  <Text style={styles.reviewText}>{r.text}</Text>
                </View>
              ))}
            </View>
          </ScrollView>

          {/* Bottom action */}
          <View style={[styles.joinBar, { paddingBottom: insets.bottom + 16 }]}>
            {isFull ? (
              waitlistJoined ? (
                <View style={styles.waitlistConfirmed}>
                  <MaterialCommunityIcons name="check-circle" size={18} color="#87A878" />
                  <Text style={styles.waitlistConfirmedText}>You're #3 on the waitlist</Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.waitlistBtn}
                  onPress={handleWaitlist}
                  activeOpacity={0.85}
                >
                  <MaterialCommunityIcons name="bell-plus-outline" size={18} color="#A04060" />
                  <Text style={styles.waitlistBtnText}>Join Waitlist</Text>
                </TouchableOpacity>
              )
            ) : (
              <TouchableOpacity
                style={styles.joinBtn}
                onPress={() => router.push("/guest/class/confirmation")}
                activeOpacity={0.85}
              >
                <Text style={styles.joinBtnText}>Join Class</Text>
                <MaterialCommunityIcons name="arrow-right" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </RoleGuard>
    </AuthGate>
  );
}

function InfoRow({
  icon,
  label,
  value,
  valueColor = "#2C2C2C",
}: {
  icon: string;
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <View style={styles.infoRow}>
      <MaterialCommunityIcons name={icon as never} size={16} color="#C0C0C0" />
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, { color: valueColor }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  heroSection: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
    gap: 10,
  },
  heroNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.85)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#EEEEEE",
  },
  heroActions: {
    flexDirection: "row",
    gap: 8,
  },
  heroActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.85)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#EEEEEE",
  },
  categoryBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: "700",
    color: "#2C2C2C",
    letterSpacing: -0.4,
    lineHeight: 32,
  },
  starRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  starCount: {
    fontSize: 12,
    color: "#888888",
    marginLeft: 2,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 16,
  },
  instructorCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EEEEEE",
    padding: 14,
    gap: 12,
  },
  instructorAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  instructorInitials: {
    fontSize: 17,
    fontWeight: "700",
  },
  instructorInfo: {
    flex: 1,
    gap: 2,
  },
  instructorName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#2C2C2C",
  },
  instructorSubtitle: {
    fontSize: 12,
    color: "#888888",
  },
  heartBtn: {
    padding: 4,
  },
  infoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EEEEEE",
    paddingHorizontal: 16,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 13,
  },
  infoLabel: {
    fontSize: 13,
    color: "#888888",
    fontWeight: "500",
    width: 44,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
  },
  infoDivider: {
    height: 1,
    backgroundColor: "#EEEEEE",
  },
  progressSection: {
    gap: 6,
  },
  progressTrack: {
    height: 6,
    backgroundColor: "#F0F0F0",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  progressLabel: {
    fontSize: 12,
    color: "#888888",
    fontWeight: "500",
  },
  waitlistBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "#FDF0F2",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F4B8C1",
    padding: 14,
  },
  waitlistBannerText: {
    flex: 1,
    fontSize: 13,
    color: "#A04060",
    lineHeight: 20,
  },
  descSection: {
    gap: 8,
  },
  descLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2C2C2C",
  },
  descText: {
    fontSize: 14,
    color: "#888888",
    lineHeight: 22,
  },
  reviewsSection: {
    gap: 12,
  },
  reviewsHeader: {
    gap: 10,
  },
  reviewsTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#2C2C2C",
  },
  reviewsSummary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  reviewsBig: {
    fontSize: 40,
    fontWeight: "700",
    color: "#2C2C2C",
    lineHeight: 44,
  },
  reviewsSubtext: {
    fontSize: 11,
    color: "#888888",
    marginTop: 2,
  },
  reviewCard: {
    backgroundColor: "#F9F9F9",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EEEEEE",
    padding: 14,
    gap: 8,
  },
  reviewTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  reviewAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F0F5EE",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  reviewInitials: {
    fontSize: 13,
    fontWeight: "700",
    color: "#87A878",
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
  reviewMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  reviewStars: {
    flexDirection: "row",
    gap: 2,
  },
  reviewDate: {
    fontSize: 11,
    color: "#888888",
  },
  reviewText: {
    fontSize: 13,
    color: "#444444",
    lineHeight: 20,
  },
  joinBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#EEEEEE",
  },
  joinBtn: {
    backgroundColor: "#87A878",
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  joinBtnText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  waitlistBtn: {
    backgroundColor: "#FDF0F2",
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#F4B8C1",
  },
  waitlistBtnText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#A04060",
  },
  waitlistConfirmed: {
    backgroundColor: "#F0F5EE",
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#D4E8CC",
  },
  waitlistConfirmedText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#4A7A40",
  },
});
