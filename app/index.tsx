import {
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { Text } from "react-native-paper";
import { Redirect, useRouter } from "expo-router";
import { ActivityIndicator } from "react-native-paper";

import { Screen } from "../components/Screen";
import { useAuth } from "../lib/auth";
import { useRole } from "../lib/role";
import { fonts } from "../lib/fonts";

// ─── Auth redirect logic ───────────────────────────────────────────────────────

export default function Index() {
  const { session, loading: authLoading } = useAuth();
  const { role, loading: roleLoading } = useRole();

  if (authLoading) {
    return (
      <Screen centered>
        <ActivityIndicator color="#0F0F0F" />
      </Screen>
    );
  }

  if (session) {
    if (roleLoading) {
      return (
        <Screen centered>
          <ActivityIndicator color="#0F0F0F" />
        </Screen>
      );
    }
    if (role === "guest") return <Redirect href="/guest" />;
    if (role === "host") return <Redirect href="/host" />;
    return <Redirect href="/login" />;
  }

  if (Platform.OS !== "web") {
    return <Redirect href="/login" />;
  }

  return <LandingPage />;
}

// ─── Landing page (web only) ──────────────────────────────────────────────────

const MOCK_CARDS = [
  {
    category: "YOGA",
    categoryBg: "#D4EDE8",
    categoryText: "#0F7B6B",
    title: "Morning Vinyasa Yoga",
    instructor: "with Sarah K.",
    time: "Today · 7:00 AM",
    spots: "4 spots left",
    rating: "★ 4.9",
  },
  {
    category: "CHESS",
    categoryBg: "#DDE8F5",
    categoryText: "#2060A0",
    title: "Beginner Chess",
    instructor: "with Marcus T.",
    time: "Tomorrow · 3:00 PM",
    spots: "6 spots left",
    rating: null,
  },
  {
    category: "DANCE",
    categoryBg: "#F9E0E4",
    categoryText: "#B03050",
    title: "Hip Hop Dance",
    instructor: "with Priya N.",
    time: "Sat · 11:00 AM",
    spots: "9 spots left",
    rating: null,
  },
];

const HOW_IT_WORKS = [
  {
    num: "01",
    title: "Browse live classes",
    body: "Find classes happening today, tomorrow, or this week from instructors you'll actually connect with.",
  },
  {
    num: "02",
    title: "Join in one tap",
    body: "No downloads, no setup. Join a live class instantly from your browser.",
  },
  {
    num: "03",
    title: "Come back every week",
    body: "Follow your favorite instructors and never miss a class with smart notifications.",
  },
];

const INSTRUCTOR_BULLETS = [
  "Keep 80% of every class",
  "Classes of 5–15 students",
  "No experience required — just a skill to share",
];

function LandingPage() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isNarrow = width < 768;

  const goLogin = () => router.push("/login");

  return (
    <View style={styles.page}>
      {/* ── Sticky Nav ──────────────────────────────────────────────────────── */}
      <View style={[styles.nav, isNarrow && styles.navNarrow]}>
        <View style={styles.navInner}>
          <Text style={styles.navLogo}>Flocked</Text>
          <View style={styles.navRight}>
            <TouchableOpacity onPress={goLogin} activeOpacity={0.7} style={styles.navSignIn}>
              <Text style={styles.navSignInText}>Sign in</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={goLogin} activeOpacity={0.85} style={styles.navGetStarted}>
              <Text style={styles.navGetStartedText}>Get started</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.pageContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <View style={[styles.hero, isNarrow && styles.heroNarrow]}>
          <View style={styles.heroInner}>
            <Text style={styles.heroLabel}>LIVE CLASSES · COLORADO</Text>
            <Text style={[styles.headline, isNarrow && styles.headlineNarrow]}>
              {"Learn anything.\nLive."}
            </Text>
            <Text style={[styles.subheadline, isNarrow && styles.subheadlineNarrow]}>
              Intimate live classes from real instructors.
            </Text>
            <View style={[styles.ctaRow, isNarrow && styles.ctaRowNarrow]}>
              <TouchableOpacity style={styles.ctaPrimary} onPress={goLogin} activeOpacity={0.85}>
                <Text style={styles.ctaPrimaryText}>Browse classes</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.ctaSecondary} onPress={goLogin} activeOpacity={0.85}>
                <Text style={styles.ctaSecondaryText}>Teach on Flocked</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* ── Featured classes ─────────────────────────────────────────────── */}
        <View style={[styles.featuredSection, isNarrow && styles.featuredSectionNarrow]}>
          <Text style={styles.sectionLabel}>UPCOMING THIS WEEK</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.featuredScroll}
          >
            {MOCK_CARDS.map((card) => (
              <TouchableOpacity
                key={card.title}
                style={styles.mockCard}
                onPress={goLogin}
                activeOpacity={0.75}
              >
                <Text style={[styles.mockCardCategory, { color: card.categoryText }]}>
                  {card.category}
                </Text>
                <Text style={styles.mockCardTitle}>{card.title}</Text>
                <Text style={styles.mockCardInstructor}>{card.instructor}</Text>
                <Text style={styles.mockCardTime}>{card.time}</Text>
                <View style={styles.mockCardBottom}>
                  <View style={[styles.mockCardSpots, { backgroundColor: card.categoryBg }]}>
                    <Text style={[styles.mockCardSpotsText, { color: card.categoryText }]}>
                      {card.spots}
                    </Text>
                  </View>
                  {card.rating && (
                    <Text style={styles.mockCardRating}>{card.rating}</Text>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* ── How it works ─────────────────────────────────────────────────── */}
        <View style={[styles.howSection, isNarrow && styles.howSectionNarrow]}>
          <Text style={styles.sectionLabel}>HOW IT WORKS</Text>
          <Text style={[styles.sectionTitle, isNarrow && styles.sectionTitleNarrow]}>
            Simple as showing up
          </Text>
          <View style={[styles.howGrid, isNarrow && styles.howGridNarrow]}>
            {HOW_IT_WORKS.map((item) => (
              <View key={item.title} style={[styles.howCol, isNarrow && styles.howColNarrow]}>
                <Text style={styles.howNum}>{item.num}</Text>
                <Text style={styles.howTitle}>{item.title}</Text>
                <Text style={styles.howBody}>{item.body}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── For instructors ──────────────────────────────────────────────── */}
        <View style={[styles.instructorSection, isNarrow && styles.instructorSectionNarrow]}>
          <View style={[styles.instructorInner, isNarrow && styles.instructorInnerNarrow]}>
            <View style={[styles.instructorLeft, isNarrow && styles.instructorLeftNarrow]}>
              <Text style={styles.sectionLabel}>FOR INSTRUCTORS</Text>
              <Text style={[styles.sectionTitle, isNarrow && styles.sectionTitleNarrow]}>
                Turn your skill into a class
              </Text>
              <Text style={styles.instructorBody}>
                Set your own schedule, price, and class size. We handle payments, video, and student management.
              </Text>
              <View style={styles.bullets}>
                {INSTRUCTOR_BULLETS.map((b) => (
                  <View key={b} style={styles.bulletRow}>
                    <Text style={styles.bulletDash}>—</Text>
                    <Text style={styles.bulletText}>{b}</Text>
                  </View>
                ))}
              </View>
              <TouchableOpacity style={styles.applyBtn} onPress={goLogin} activeOpacity={0.85}>
                <Text style={styles.applyBtnText}>Apply to teach</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.instructorRight, isNarrow && styles.instructorRightNarrow]}>
              {[
                { num: "80%", label: "You keep" },
                { num: "5–15", label: "Students per class" },
                { num: "$0", label: "To get started" },
              ].map((stat) => (
                <View key={stat.label} style={styles.statCard}>
                  <Text style={styles.statNum}>{stat.num}</Text>
                  <Text style={styles.statLabel}>{stat.label}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* ── CTA banner ───────────────────────────────────────────────────── */}
        <View style={styles.ctaBanner}>
          <Text style={[styles.ctaBannerTitle, isNarrow && styles.ctaBannerTitleNarrow]}>
            Ready to learn something new?
          </Text>
          <Text style={styles.ctaBannerSub}>Your first class is waiting.</Text>
          <TouchableOpacity style={styles.ctaBannerBtn} onPress={goLogin} activeOpacity={0.85}>
            <Text style={styles.ctaBannerBtnText}>Get started</Text>
          </TouchableOpacity>
        </View>

        {/* ── Footer ───────────────────────────────────────────────────────── */}
        <View style={[styles.footer, isNarrow && styles.footerNarrow]}>
          <View style={styles.footerLeft}>
            <Text style={styles.footerLogo}>Flocked</Text>
            <Text style={styles.footerCopy}>© 2026 Flocked. Made in Colorado.</Text>
          </View>
          <View style={[styles.footerLinks, isNarrow && styles.footerLinksNarrow]}>
            {["About", "For Instructors", "Contact"].map((link) => (
              <TouchableOpacity key={link} onPress={goLogin} activeOpacity={0.7}>
                <Text style={styles.footerLink}>{link}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#FFFFFF" },
  scrollView: { flex: 1 },
  pageContent: { flexGrow: 1 },

  // ── Nav ─────────────────────────────────────────────────────────────────────
  nav: {
    height: 56,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E8E8E8",
    justifyContent: "center",
    position: "sticky",
    top: 0,
    zIndex: 100,
  } as any,
  navNarrow: {},
  navInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    maxWidth: 1100,
    alignSelf: "center",
    width: "100%",
    paddingHorizontal: 40,
  },
  navLogo: {
    fontSize: 18,
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: "#0F0F0F",
    letterSpacing: -0.3,
  },
  navRight: { flexDirection: "row", alignItems: "center", gap: 16 },
  navSignIn: { cursor: "pointer" } as any,
  navSignInText: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: "#6B6B6B",
  },
  navGetStarted: {
    backgroundColor: "#0F0F0F",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    cursor: "pointer",
  } as any,
  navGetStartedText: {
    fontSize: 13,
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  // ── Hero ────────────────────────────────────────────────────────────────────
  hero: {
    paddingVertical: 100,
    paddingHorizontal: 40,
    alignItems: "center",
  },
  heroNarrow: { paddingVertical: 64, paddingHorizontal: 24 },
  heroInner: {
    maxWidth: 600,
    width: "100%",
    alignItems: "center",
  },
  heroLabel: {
    fontSize: 11,
    fontFamily: fonts.medium,
    fontWeight: "500",
    color: "#6B6B6B",
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 24,
  },
  headline: {
    fontSize: 64,
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: "#0F0F0F",
    lineHeight: 66,
    letterSpacing: -2,
    textAlign: "center",
  },
  headlineNarrow: { fontSize: 44, lineHeight: 48 },
  subheadline: {
    fontSize: 18,
    fontFamily: fonts.regular,
    color: "#6B6B6B",
    lineHeight: 28,
    marginTop: 16,
    textAlign: "center",
    maxWidth: 480,
  },
  subheadlineNarrow: { fontSize: 16, marginTop: 12 },

  ctaRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 40,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  ctaRowNarrow: { marginTop: 28 },
  ctaPrimary: {
    backgroundColor: "#00B4A6",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 6,
    cursor: "pointer",
  } as any,
  ctaPrimaryText: {
    fontSize: 14,
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  ctaSecondary: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#E8E8E8",
    cursor: "pointer",
  } as any,
  ctaSecondaryText: {
    fontSize: 14,
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: "#0F0F0F",
  },

  // ── Featured classes ─────────────────────────────────────────────────────────
  featuredSection: {
    paddingVertical: 64,
    paddingHorizontal: 40,
    borderTopWidth: 1,
    borderTopColor: "#E8E8E8",
    maxWidth: 1100,
    alignSelf: "center",
    width: "100%",
  },
  featuredSectionNarrow: { paddingHorizontal: 24, paddingVertical: 48 },
  featuredScroll: { gap: 12, paddingBottom: 4, paddingTop: 16 },
  sectionLabel: {
    fontSize: 11,
    fontFamily: fonts.medium,
    fontWeight: "500",
    color: "#00B4A6",
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  mockCard: {
    width: 280,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E8E8E8",
    borderRadius: 8,
    padding: 20,
    gap: 4,
    cursor: "pointer",
  } as any,
  mockCardCategory: {
    fontSize: 10,
    fontFamily: fonts.medium,
    fontWeight: "500",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  mockCardTitle: {
    fontSize: 16,
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: "#0F0F0F",
    lineHeight: 22,
  },
  mockCardInstructor: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: "#6B6B6B",
  },
  mockCardTime: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: "#6B6B6B",
  },
  mockCardBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
  },
  mockCardSpots: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  mockCardSpotsText: {
    fontSize: 11,
    fontFamily: fonts.medium,
    fontWeight: "500",
  },
  mockCardRating: {
    fontSize: 12,
    fontFamily: fonts.medium,
    color: "#A08020",
  },

  // ── How it works ─────────────────────────────────────────────────────────────
  howSection: {
    paddingVertical: 80,
    paddingHorizontal: 40,
    borderTopWidth: 1,
    borderTopColor: "#E8E8E8",
    alignItems: "center",
  },
  howSectionNarrow: { paddingHorizontal: 24, paddingVertical: 56 },
  sectionTitle: {
    fontSize: 36,
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: "#0F0F0F",
    letterSpacing: -0.5,
    lineHeight: 40,
    textAlign: "center",
    marginTop: 8,
    marginBottom: 56,
  },
  sectionTitleNarrow: { fontSize: 28, lineHeight: 34, marginBottom: 40 },
  howGrid: {
    flexDirection: "row",
    gap: 48,
    maxWidth: 1100,
    width: "100%",
    justifyContent: "center",
  },
  howGridNarrow: { flexDirection: "column", gap: 40 },
  howCol: { flex: 1, maxWidth: 300 },
  howColNarrow: { maxWidth: "100%" as any, flex: 0 },
  howNum: {
    fontSize: 13,
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: "#C0C0C0",
    letterSpacing: 1,
    marginBottom: 16,
  },
  howTitle: {
    fontSize: 18,
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: "#0F0F0F",
    lineHeight: 24,
    marginBottom: 8,
  },
  howBody: {
    fontSize: 15,
    fontFamily: fonts.regular,
    color: "#6B6B6B",
    lineHeight: 24,
  },

  // ── Instructor section ───────────────────────────────────────────────────────
  instructorSection: {
    backgroundColor: "#F5F5F5",
    paddingVertical: 80,
    paddingHorizontal: 40,
    borderTopWidth: 1,
    borderTopColor: "#E8E8E8",
    alignItems: "center",
  },
  instructorSectionNarrow: { paddingHorizontal: 24, paddingVertical: 56 },
  instructorInner: {
    flexDirection: "row",
    gap: 80,
    alignItems: "center",
    maxWidth: 1100,
    width: "100%",
  },
  instructorInnerNarrow: { flexDirection: "column", gap: 48 },
  instructorLeft: { flex: 1, gap: 20 },
  instructorLeftNarrow: { flex: 0 },
  instructorBody: {
    fontSize: 15,
    fontFamily: fonts.regular,
    color: "#6B6B6B",
    lineHeight: 24,
  },
  bullets: { gap: 10 },
  bulletRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  bulletDash: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: "#B0B0B0",
    lineHeight: 24,
  },
  bulletText: {
    fontSize: 15,
    fontFamily: fonts.regular,
    color: "#0F0F0F",
    lineHeight: 24,
    flex: 1,
  },
  applyBtn: {
    alignSelf: "flex-start",
    backgroundColor: "#0F0F0F",
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 6,
    cursor: "pointer",
  } as any,
  applyBtnText: {
    fontSize: 14,
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  instructorRight: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    justifyContent: "center",
  },
  instructorRightNarrow: { flexDirection: "row" },
  statCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    padding: 24,
    alignItems: "flex-start",
    minWidth: 120,
    borderWidth: 1,
    borderColor: "#E8E8E8",
  },
  statNum: {
    fontSize: 36,
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: "#0F0F0F",
    letterSpacing: -1,
  },
  statLabel: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: "#6B6B6B",
    marginTop: 4,
  },

  // ── CTA banner ───────────────────────────────────────────────────────────────
  ctaBanner: {
    backgroundColor: "#0F0F0F",
    paddingVertical: 80,
    paddingHorizontal: 40,
    alignItems: "center",
    gap: 16,
    borderTopWidth: 1,
    borderTopColor: "#E8E8E8",
  },
  ctaBannerTitle: {
    fontSize: 40,
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
    letterSpacing: -0.8,
    lineHeight: 44,
  },
  ctaBannerTitleNarrow: { fontSize: 28, lineHeight: 34 },
  ctaBannerSub: {
    fontSize: 16,
    fontFamily: fonts.regular,
    color: "rgba(255,255,255,0.6)",
    textAlign: "center",
  },
  ctaBannerBtn: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    paddingHorizontal: 24,
    paddingVertical: 11,
    borderRadius: 6,
    marginTop: 8,
    cursor: "pointer",
  } as any,
  ctaBannerBtnText: {
    fontSize: 14,
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  // ── Footer ───────────────────────────────────────────────────────────────────
  footer: {
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E8E8E8",
    paddingVertical: 40,
    paddingHorizontal: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    maxWidth: 1100,
    alignSelf: "center",
    width: "100%",
  },
  footerNarrow: {
    flexDirection: "column",
    paddingHorizontal: 24,
    gap: 20,
    alignItems: "flex-start",
  },
  footerLeft: { gap: 4 },
  footerLogo: {
    fontSize: 15,
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: "#0F0F0F",
  },
  footerCopy: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: "#B0B0B0",
  },
  footerLinks: { flexDirection: "row", gap: 32, alignItems: "center" },
  footerLinksNarrow: { gap: 20 },
  footerLink: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: "#6B6B6B",
    cursor: "pointer",
  } as any,
});
