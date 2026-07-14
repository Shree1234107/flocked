import { colors } from "../../../lib/colors";
import { Component, useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Text } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { AuthGate } from "../../../components/AuthGate";
import { ClassChat } from "../../../components/ClassChat";
import { getClass, getSeries, joinClass, enrollInSeries, joinWaitlist } from "../../../lib/api";
import type { ScheduledClass, ClassSeries } from "../../../lib/types";
import { supabase } from "../../../lib/supabase";
import { fonts } from "../../../lib/fonts";

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  yoga:     { bg: colors.primaryTint, text: "#0F7B6B" },
  dance:    { bg: "#F9E0E4", text: "#B03050" },
  tutoring: { bg: "#F5F0D8", text: "#806020" },
  Yoga:     { bg: colors.primaryTint, text: "#0F7B6B" },
  Dance:    { bg: "#F9E0E4", text: "#B03050" },
  Tutoring: { bg: "#F5F0D8", text: "#806020" },
};

const DAYS_ABB = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS_ABB = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function formatSmartDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
  const tomorrowStart = new Date(todayStart); tomorrowStart.setDate(todayStart.getDate() + 1);
  const dayAfterStart = new Date(tomorrowStart); dayAfterStart.setDate(tomorrowStart.getDate() + 1);
  const h = d.getHours(); const m = d.getMinutes();
  const ampm = h >= 12 ? "PM" : "AM";
  const time = `${h % 12 || 12}:${m.toString().padStart(2, "0")} ${ampm}`;
  if (d >= todayStart && d < tomorrowStart) return `Today at ${time}`;
  if (d >= tomorrowStart && d < dayAfterStart) return `Tomorrow at ${time}`;
  return `${DAYS_ABB[d.getDay()]}, ${MONTHS_ABB[d.getMonth()]} ${d.getDate()} at ${time}`;
}

function formatShortDate(iso: string): string {
  const d = new Date(iso);
  return `${DAYS_ABB[d.getDay()]}, ${MONTHS_ABB[d.getMonth()]} ${d.getDate()}`;
}

class ErrorBoundary extends Component<
  { children: React.ReactNode },
  { hasError: boolean; message: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(err: unknown) {
    const message = err instanceof Error ? err.message : "Something went wrong.";
    return { hasError: true, message };
  }

  componentDidCatch(err: unknown, info: unknown) {
    console.error("[ClassDetail] render error:", err, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.centered}>
          <MaterialCommunityIcons name="alert-circle-outline" size={32} color="#B0B0B0" />
          <Text style={styles.errorMsg}>{this.state.message}</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

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
      <Text style={styles.starCount}>{rating.toFixed(1)} ({count})</Text>
    </View>
  );
}

export default function ClassDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const isWeb = Platform.OS === "web";

  const [cls, setCls] = useState<ScheduledClass | null>(null);
  const [series, setSeries] = useState<ClassSeries | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [joined, setJoined] = useState(false);
  const [seriesEnrolled, setSeriesEnrolled] = useState(false);
  const [waitlistJoined, setWaitlistJoined] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUserId(session?.user?.id ?? null);
    });
  }, []);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.25, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const classData = await getClass(id);
      console.log("[ClassDetail] loadData — status:", classData.status, "is_enrolled:", classData.is_enrolled, "is_series_enrolled:", classData.is_series_enrolled);
      setCls(classData);
      setJoined(classData.is_enrolled ?? false);
      setSeriesEnrolled(classData.is_series_enrolled ?? false);
      if (classData.series_id) {
        try {
          const seriesData = await getSeries(classData.series_id);
          setSeries(seriesData);
        } catch {
          // series load failed — non-fatal
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load class.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(useCallback(() => {
    loadData();
    const poll = setInterval(async () => {
      if (!id) return;
      try {
        const fresh = await getClass(id);
        console.log("[ClassDetail] poll — status:", fresh.status, "is_enrolled:", fresh.is_enrolled, "is_series_enrolled:", fresh.is_series_enrolled);
        setCls(fresh);
        setJoined(fresh.is_enrolled ?? false);
        setSeriesEnrolled(fresh.is_series_enrolled ?? false);
      } catch (err) {
        console.warn("[ClassDetail] poll failed:", err instanceof Error ? err.message : err);
      }
    }, 15000);
    return () => clearInterval(poll);
  }, [loadData, id]));

  const handleJoinClass = async () => {
    if (!cls) return;
    setActionLoading(true);
    try {
      await joinClass(cls.id);
      setJoined(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to join class.";
      if (isWeb) { setError(msg); } else { Alert.alert("Oops", msg); }
    } finally {
      setActionLoading(false);
    }
  };

  const handleEnrollSeries = async () => {
    if (!series) return;
    setActionLoading(true);
    try {
      await enrollInSeries(series.id);
      setSeriesEnrolled(true);
      setJoined(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to enroll in series.";
      if (isWeb) { setError(msg); } else { Alert.alert("Oops", msg); }
    } finally {
      setActionLoading(false);
    }
  };

  const handleJoinWaitlist = async () => {
    if (!cls) return;
    setActionLoading(true);
    try {
      await joinWaitlist(cls.id);
      setWaitlistJoined(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to join waitlist.";
      if (isWeb) { setError(msg); } else { Alert.alert("Oops", msg); }
    } finally {
      setActionLoading(false);
    }
  };

  const handleShare = async () => {
    if (!cls) return;
    try {
      await Share.share({
        message: `Check out "${cls.title}" on Flocked! ${formatSmartDate(cls.scheduled_at)}`,
        title: cls.title,
      });
    } catch {
      // user dismissed
    }
  };

  if (loading) {
    return (
      <AuthGate>
        <View style={styles.centered}>
          <ActivityIndicator color="#0F0F0F" />
        </View>
      </AuthGate>
    );
  }

  if (error || !cls) {
    return (
      <AuthGate>
        <View style={styles.centered}>
          <Text style={styles.errorMsg}>{error ?? "Class not found."}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadData} activeOpacity={0.7}>
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>
        </View>
      </AuthGate>
    );
  }

  const colors = CATEGORY_COLORS[cls.category] ?? { bg: "#F5F5F5", text: "#6B6B6B" };
  const spotsLeft = cls.max_students - cls.current_students;
  const isFull = spotsLeft <= 0;
  const fillPct = cls.max_students > 0 ? cls.current_students / cls.max_students : 0;
  const hostName = cls.host?.display_name ?? "Instructor";
  const hostInitials = hostName.slice(0, 2).toUpperCase();
  const isSeries = cls.class_type === "series";
  const isDropin = cls.class_type === "dropin";
  const dropinPriceDollars = series?.dropin_price_cents ? (series.dropin_price_cents / 100).toFixed(0) : null;
  const seriesPriceDollars = series?.price_cents ? (series.price_cents / 100).toFixed(0) : null;

  const avgRating = cls.avg_rating ?? cls.host?.avg_rating;
  const reviews = cls.reviews ?? [];

  return (
    <AuthGate>
      <ErrorBoundary>
        <View style={[styles.container, { paddingTop: insets.top }]}>
          {/* Header */}
          <View style={styles.topBar}>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
              <MaterialCommunityIcons name="arrow-left" size={20} color="#0F0F0F" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.shareBtn} onPress={handleShare} activeOpacity={0.7}>
              <MaterialCommunityIcons name="share-outline" size={20} color="#0F0F0F" />
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
            showsVerticalScrollIndicator={false}
          >
            {/* Title area */}
            <View style={styles.titleSection}>
              <View style={styles.titleTopRow}>
                <View style={[styles.categoryBadge, { backgroundColor: colors.bg }]}>
                  <Text style={[styles.categoryBadgeText, { color: colors.text }]}>
                    {cls.category.toUpperCase()}
                  </Text>
                </View>
                {isSeries && cls.series_week != null && cls.total_weeks != null && (
                  <View style={styles.seriesWeekBadge}>
                    <Text style={styles.seriesWeekBadgeText}>Week {cls.series_week} of {cls.total_weeks}</Text>
                  </View>
                )}
                {isDropin && (
                  <View style={styles.dropinBadge}>
                    <Text style={styles.dropinBadgeText}>Drop-in</Text>
                  </View>
                )}
              </View>
              <Text style={styles.titleText}>{cls.title}</Text>
              {avgRating != null && (
                <StarRow rating={avgRating} count={reviews.length} />
              )}
            </View>

            {/* Instructor */}
            <Pressable
              style={(state: any) => [
                styles.instructorCard,
                state.hovered && styles.instructorCardHovered,
              ]}
              onPress={() => router.push(`/guest/instructor/${cls.host_id}`)}
            >
              <View style={[styles.instructorAvatar, { backgroundColor: colors.bg }]}>
                {cls.host?.photo_url ? null : (
                  <Text style={[styles.instructorInitials, { color: colors.text }]}>{hostInitials}</Text>
                )}
              </View>
              <View style={styles.instructorInfo}>
                <Text style={styles.instructorName}>with {hostName}</Text>
                {cls.host?.avg_rating != null && (
                  <Text style={styles.instructorRating}>★ {cls.host.avg_rating.toFixed(1)} instructor rating</Text>
                )}
              </View>
              <MaterialCommunityIcons name="chevron-right" size={16} color="#B0B0B0" />
            </Pressable>

            {/* Class info */}
            <View style={styles.infoCard}>
              <InfoRow icon="calendar-outline" label="Date" value={formatSmartDate(cls.scheduled_at)} />
              <View style={styles.infoDivider} />
              <InfoRow icon="clock-outline" label="Duration" value={`${cls.duration_minutes} min`} />
              <View style={styles.infoDivider} />
              <InfoRow
                icon="account-group-outline"
                label="Spots"
                value={isFull ? "Class full" : `${spotsLeft} of ${cls.max_students} open`}
                valueColor={isFull ? "#E5484D" : spotsLeft <= 3 ? "#E08030" : "#0F0F0F"}
              />
              {isSeries && series && (
                <>
                  <View style={styles.infoDivider} />
                  <InfoRow
                    icon="refresh"
                    label="Format"
                    value={`${series.total_weeks}-week series · ${DAYS_ABB[series.day_of_week]}s`}
                  />
                </>
              )}
            </View>

            {/* Enrollment progress */}
            <View style={styles.progressSection}>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${Math.min(fillPct * 100, 100)}%` as any },
                    isFull && styles.progressFillFull,
                  ]}
                />
              </View>
              <Text style={styles.progressLabel}>
                {cls.current_students}/{cls.max_students} enrolled
              </Text>
            </View>

            {/* Series enrollment panel */}
            {isSeries && series && !seriesEnrolled && (
              <View style={styles.seriesPanel}>
                <Text style={styles.seriesPanelTitle}>Enroll in the series</Text>
                <Text style={styles.seriesPanelSub}>
                  {series.total_weeks} weekly sessions every {DAYS_ABB[series.day_of_week]}
                </Text>

                {/* Week dots */}
                <View style={styles.weekDotsRow}>
                  {Array.from({ length: series.total_weeks }, (_, i) => {
                    const isPast = (cls.series_week ?? 1) > i + 1;
                    const isCurrent = (cls.series_week ?? 1) === i + 1;
                    return (
                      <View
                        key={i}
                        style={[
                          styles.weekDot,
                          isPast && styles.weekDotPast,
                          isCurrent && styles.weekDotCurrent,
                        ]}
                      />
                    );
                  })}
                </View>

                {/* Upcoming dates */}
                {series.classes && series.classes.length > 0 && (
                  <View style={styles.datesList}>
                    {series.classes.slice(0, 4).map((sc) => (
                      <View key={sc.id} style={styles.datesRow}>
                        <Text style={styles.datesWeek}>Wk {sc.series_week}</Text>
                        <Text style={styles.datesDate}>{formatShortDate(sc.scheduled_at)}</Text>
                      </View>
                    ))}
                    {series.classes.length > 4 && (
                      <Text style={styles.datesMore}>+{series.classes.length - 4} more sessions</Text>
                    )}
                  </View>
                )}
              </View>
            )}

            {/* Series enrolled confirmation */}
            {isSeries && seriesEnrolled && (
              <View style={styles.enrolledBanner}>
                <MaterialCommunityIcons name="check-circle" size={16} color="#0F7B6B" />
                <Text style={styles.enrolledBannerText}>You're enrolled in this series</Text>
              </View>
            )}

            {/* Description */}
            {cls.description && (
              <View style={styles.descSection}>
                <Text style={styles.sectionTitle}>About this class</Text>
                <Text style={styles.descText}>{cls.description}</Text>
              </View>
            )}

            {/* Reviews */}
            {reviews.length > 0 && (
              <View style={styles.reviewsSection}>
                <View style={styles.reviewsHeader}>
                  <Text style={styles.sectionTitle}>Reviews</Text>
                  {avgRating != null && (
                    <View style={styles.reviewsSummaryRow}>
                      <Text style={styles.reviewsBigNum}>{avgRating.toFixed(1)}</Text>
                      <View>
                        <StarRow rating={avgRating} count={reviews.length} />
                        <Text style={styles.reviewsSubtext}>{reviews.length} review{reviews.length !== 1 ? "s" : ""}</Text>
                      </View>
                    </View>
                  )}
                </View>
                {reviews.map((r) => (
                  <View key={r.id} style={styles.reviewCard}>
                    <View style={styles.reviewTop}>
                      <View style={styles.reviewAvatar}>
                        <Text style={styles.reviewInitials}>
                          {r.student_id.slice(0, 2).toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.reviewMeta}>
                        <View style={styles.reviewStarRow}>
                          {[1, 2, 3, 4, 5].map((i) => (
                            <MaterialCommunityIcons
                              key={i}
                              name={i <= r.rating ? "star" : "star-outline"}
                              size={12}
                              color="#F4A200"
                            />
                          ))}
                        </View>
                        <Text style={styles.reviewDate}>
                          {formatShortDate(r.created_at)}
                        </Text>
                      </View>
                    </View>
                    {r.review_text && (
                      <Text style={styles.reviewText}>{r.review_text}</Text>
                    )}
                  </View>
                ))}
              </View>
            )}
            {/* Class chat */}
            {currentUserId && (joined || seriesEnrolled || new Date(cls.scheduled_at) < new Date()) && (
              <View style={styles.chatSection}>
                <Text style={styles.sectionTitle}>Chat</Text>
                <ClassChat classId={cls.id} currentUserId={currentUserId} />
              </View>
            )}
          </ScrollView>

          {/* Bottom action bar */}
          <View style={[styles.actionBar, { paddingBottom: insets.bottom + 16 }]}>
            {/* ── Class is live and student is enrolled ── */}
            {cls.status === "live" && (joined || seriesEnrolled) ? (
              <TouchableOpacity
                style={styles.joinLiveBtn}
                onPress={() => router.push(`/guest/room/${cls.id}` as never)}
                activeOpacity={0.88}
              >
                <MaterialCommunityIcons name="video-outline" size={20} color="#FFFFFF" />
                <View style={styles.livePillBadge}>
                  <Animated.View style={[styles.livePulseDot, { opacity: pulseAnim }]} />
                  <Text style={styles.livePillText}>LIVE</Text>
                </View>
                <Text style={styles.joinLiveBtnText}>Join Live Class</Text>
                <MaterialCommunityIcons name="arrow-right" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            ) : (cls.status === "completed" || cls.status === "cancelled") ? (
              /* ── Class has ended or was cancelled ── */
              <View style={styles.classEndedState}>
                <MaterialCommunityIcons name="flag-checkered" size={18} color="#B0B0B0" />
                <Text style={styles.classEndedText}>This class has ended</Text>
              </View>
            ) : joined && !isSeries ? (
              /* ── Enrolled, class upcoming ── */
              <View style={styles.enrolledUpcomingWrap}>
                <View style={styles.joinedConfirmed}>
                  <MaterialCommunityIcons name="check-circle" size={18} color="#0F7B6B" />
                  <Text style={styles.joinedConfirmedText}>
                    You're enrolled — {formatSmartDate(cls.scheduled_at)}
                  </Text>
                </View>
                <View style={styles.joinWhenLiveBtn}>
                  <MaterialCommunityIcons name="video-outline" size={15} color="#B0B0B0" />
                  <Text style={styles.joinWhenLiveBtnText}>Join when live</Text>
                </View>
              </View>
            ) : isSeries && !seriesEnrolled ? (
              /* ── Series enrollment ── */
              <View style={styles.seriesActionCol}>
                {seriesPriceDollars && (
                  <TouchableOpacity
                    style={[styles.primaryBtn, actionLoading && styles.btnDisabled]}
                    onPress={handleEnrollSeries}
                    disabled={actionLoading}
                    activeOpacity={0.85}
                  >
                    {actionLoading ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <Text style={styles.primaryBtnText}>
                        Enroll in series — ${seriesPriceDollars} for {series?.total_weeks} weeks
                      </Text>
                    )}
                  </TouchableOpacity>
                )}
                {dropinPriceDollars && (
                  <TouchableOpacity
                    style={[styles.secondaryBtn, actionLoading && styles.btnDisabled]}
                    onPress={handleJoinClass}
                    disabled={actionLoading}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.secondaryBtnText}>
                      Drop in this week — ${dropinPriceDollars}
                    </Text>
                  </TouchableOpacity>
                )}
                {!seriesPriceDollars && !dropinPriceDollars && (
                  <TouchableOpacity
                    style={[styles.primaryBtn, actionLoading && styles.btnDisabled]}
                    onPress={handleEnrollSeries}
                    disabled={actionLoading}
                    activeOpacity={0.85}
                  >
                    {actionLoading ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <Text style={styles.primaryBtnText}>Enroll in series</Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            ) : isFull && !joined ? (
              /* ── Class full ── */
              waitlistJoined ? (
                <View style={styles.joinedConfirmed}>
                  <MaterialCommunityIcons name="check-circle" size={18} color="#0F7B6B" />
                  <Text style={styles.joinedConfirmedText}>You're on the waitlist</Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.waitlistBtn, actionLoading && styles.btnDisabled]}
                  onPress={handleJoinWaitlist}
                  disabled={actionLoading}
                  activeOpacity={0.85}
                >
                  {actionLoading ? (
                    <ActivityIndicator color="#6B6B6B" size="small" />
                  ) : (
                    <Text style={styles.waitlistBtnText}>Join Waitlist</Text>
                  )}
                </TouchableOpacity>
              )
            ) : !joined ? (
              /* ── Not yet joined ── */
              <TouchableOpacity
                style={[styles.primaryBtn, actionLoading && styles.btnDisabled]}
                onPress={handleJoinClass}
                disabled={actionLoading}
                activeOpacity={0.85}
              >
                {actionLoading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.primaryBtnText}>
                    Join Class{cls.price_cents ? ` — $${(cls.price_cents / 100).toFixed(0)}` : ""}
                  </Text>
                )}
              </TouchableOpacity>
            ) : (
              /* ── Series-enrolled, class upcoming ── */
              <View style={styles.enrolledUpcomingWrap}>
                <View style={styles.joinedConfirmed}>
                  <MaterialCommunityIcons name="check-circle" size={18} color="#0F7B6B" />
                  <Text style={styles.joinedConfirmedText}>
                    You're enrolled — {formatSmartDate(cls.scheduled_at)}
                  </Text>
                </View>
                <View style={styles.joinWhenLiveBtn}>
                  <MaterialCommunityIcons name="video-outline" size={15} color="#B0B0B0" />
                  <Text style={styles.joinWhenLiveBtnText}>Join when live</Text>
                </View>
              </View>
            )}
          </View>
        </View>
      </ErrorBoundary>
    </AuthGate>
  );
}

function InfoRow({
  icon,
  label,
  value,
  valueColor = "#0F0F0F",
}: {
  icon: string;
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <View style={styles.infoRow}>
      <MaterialCommunityIcons name={icon as never} size={16} color="#B0B0B0" />
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, { color: valueColor }]} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, backgroundColor: "#FFFFFF" },
  errorMsg: { fontSize: 14, fontFamily: fonts.regular, color: "#6B6B6B", textAlign: "center", paddingHorizontal: 32 },
  retryBtn: {
    borderWidth: 1,
    borderColor: "#E8E8E8",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  retryText: { fontSize: 13, fontFamily: fonts.medium, color: "#0F0F0F" },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 6,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E8E8E8",
    alignItems: "center",
    justifyContent: "center",
  },
  shareBtn: {
    width: 36,
    height: 36,
    borderRadius: 6,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E8E8E8",
    alignItems: "center",
    justifyContent: "center",
  },

  scrollContent: { paddingHorizontal: 20, paddingTop: 8, gap: 16 },

  titleSection: { gap: 8 },
  titleTopRow: { flexDirection: "row", gap: 6, flexWrap: "wrap", alignItems: "center" },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  categoryBadgeText: { fontSize: 10, fontFamily: fonts.bold, fontWeight: "700", letterSpacing: 1 },
  seriesWeekBadge: {
    backgroundColor: "#EDE0F5",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  seriesWeekBadgeText: { fontSize: 10, fontFamily: fonts.medium, fontWeight: "500", color: "#7030A0" },
  dropinBadge: {
    backgroundColor: "#DDE8F5",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  dropinBadgeText: { fontSize: 10, fontFamily: fonts.medium, fontWeight: "500", color: "#2060A0" },
  titleText: {
    fontSize: 26,
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: "#0F0F0F",
    letterSpacing: -0.5,
    lineHeight: 32,
  },
  starRow: { flexDirection: "row", alignItems: "center", gap: 2 },
  starCount: { fontSize: 12, fontFamily: fonts.regular, color: "#6B6B6B", marginLeft: 4 },

  instructorCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E8E8E8",
    padding: 14,
    gap: 12,
    cursor: "pointer",
  } as any,
  instructorCardHovered: { backgroundColor: "#F5F5F5" },
  instructorAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  instructorInitials: { fontSize: 16, fontFamily: fonts.bold, fontWeight: "700" },
  instructorInfo: { flex: 1, gap: 2 },
  instructorName: { fontSize: 14, fontFamily: fonts.bold, fontWeight: "700", color: "#0F0F0F" },
  instructorRating: { fontSize: 12, fontFamily: fonts.regular, color: "#6B6B6B" },

  infoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E8E8E8",
    paddingHorizontal: 16,
  },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 12 },
  infoLabel: { fontSize: 13, fontFamily: fonts.regular, color: "#6B6B6B", width: 64 },
  infoValue: { fontSize: 13, fontFamily: fonts.medium, fontWeight: "500", flex: 1 },
  infoDivider: { height: 1, backgroundColor: "#F0F0F0" },

  progressSection: { gap: 6 },
  progressTrack: { height: 4, backgroundColor: "#F0F0F0", borderRadius: 2, overflow: "hidden" },
  progressFill: { height: 4, backgroundColor: "#0F0F0F", borderRadius: 2 },
  progressFillFull: { backgroundColor: "#E5484D" },
  progressLabel: { fontSize: 12, fontFamily: fonts.regular, color: "#6B6B6B" },

  seriesPanel: {
    backgroundColor: "#F5F5F5",
    borderRadius: 8,
    padding: 16,
    gap: 10,
  },
  seriesPanelTitle: {
    fontSize: 15,
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: "#0F0F0F",
  },
  seriesPanelSub: { fontSize: 13, fontFamily: fonts.regular, color: "#6B6B6B" },
  weekDotsRow: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  weekDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#E8E8E8",
    borderWidth: 1,
    borderColor: "#D0D0D0",
  },
  weekDotPast: { backgroundColor: "#B0B0B0", borderColor: "#B0B0B0" },
  weekDotCurrent: { backgroundColor: "#0F0F0F", borderColor: "#0F0F0F" },
  datesList: { gap: 4 },
  datesRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  datesWeek: { fontSize: 11, fontFamily: fonts.bold, fontWeight: "700", color: "#B0B0B0", width: 28 },
  datesDate: { fontSize: 13, fontFamily: fonts.regular, color: "#6B6B6B" },
  datesMore: { fontSize: 12, fontFamily: fonts.regular, color: "#B0B0B0", marginTop: 2 },

  enrolledBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.primaryTint,
    borderRadius: 8,
    padding: 12,
  },
  enrolledBannerText: { fontSize: 13, fontFamily: fonts.medium, fontWeight: "500", color: "#0F7B6B" },

  descSection: { gap: 8 },
  sectionTitle: {
    fontSize: 15,
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: "#0F0F0F",
  },
  descText: { fontSize: 14, fontFamily: fonts.regular, color: "#6B6B6B", lineHeight: 22 },

  reviewsSection: { gap: 12 },
  reviewsHeader: { gap: 8 },
  reviewsSummaryRow: { flexDirection: "row", alignItems: "center", gap: 16 },
  reviewsBigNum: {
    fontSize: 40,
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: "#0F0F0F",
    lineHeight: 44,
  },
  reviewsSubtext: { fontSize: 11, fontFamily: fonts.regular, color: "#B0B0B0", marginTop: 2 },
  reviewCard: {
    backgroundColor: "#FAFAFA",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E8E8E8",
    padding: 14,
    gap: 8,
  },
  reviewTop: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  reviewAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F5F5F5",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  reviewInitials: { fontSize: 11, fontFamily: fonts.bold, fontWeight: "700", color: "#6B6B6B" },
  reviewMeta: { flex: 1, gap: 2 },
  reviewStarRow: { flexDirection: "row", gap: 2 },
  reviewDate: { fontSize: 11, fontFamily: fonts.regular, color: "#B0B0B0" },
  reviewText: { fontSize: 13, fontFamily: fonts.regular, color: "#6B6B6B", lineHeight: 20 },

  actionBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E8E8E8",
  },
  seriesActionCol: { gap: 8 },
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: 6,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: {
    fontSize: 14,
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  secondaryBtn: {
    backgroundColor: "#FFFFFF",
    borderRadius: 6,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E8E8E8",
  },
  secondaryBtnText: {
    fontSize: 14,
    fontFamily: fonts.medium,
    fontWeight: "500",
    color: "#6B6B6B",
  },
  waitlistBtn: {
    backgroundColor: "#FFFFFF",
    borderRadius: 6,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E8E8E8",
  },
  waitlistBtnText: {
    fontSize: 14,
    fontFamily: fonts.medium,
    fontWeight: "500",
    color: "#6B6B6B",
  },
  joinedConfirmed: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    backgroundColor: colors.primaryTint,
    borderRadius: 6,
  },
  joinedConfirmedText: {
    fontSize: 14,
    fontFamily: fonts.medium,
    fontWeight: "500",
    color: "#0F7B6B",
  },
  btnDisabled: { opacity: 0.4 },
  chatSection: { gap: 8 },

  // ── Join Live Class button ────────────────────────────────────────────────────
  joinLiveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#00B4A6",
    borderRadius: 10,
    paddingVertical: 17,
    gap: 10,
    shadowColor: "#00B4A6",
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  joinLiveBtnText: {
    fontSize: 17,
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: -0.2,
  },
  livePillBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  livePulseDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#FF3B30",
  },
  livePillText: {
    fontSize: 10,
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.8,
  },

  // ── Enrolled upcoming state ───────────────────────────────────────────────────
  enrolledUpcomingWrap: { gap: 8 },
  joinWhenLiveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 8,
    paddingVertical: 12,
    backgroundColor: "#F5F5F5",
    borderWidth: 1,
    borderColor: "#E8E8E8",
  },
  joinWhenLiveBtnText: {
    fontSize: 14,
    fontFamily: fonts.medium,
    fontWeight: "500",
    color: "#B0B0B0",
  },

  // ── Class ended state ─────────────────────────────────────────────────────────
  classEndedState: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    backgroundColor: "#F5F5F5",
    borderRadius: 8,
  },
  classEndedText: {
    fontSize: 14,
    fontFamily: fonts.medium,
    fontWeight: "500",
    color: "#B0B0B0",
  },
});
