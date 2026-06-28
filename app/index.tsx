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
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { Screen } from "../components/Screen";
import { useAuth } from "../lib/auth";
import { useRole } from "../lib/role";
import { fonts } from "../lib/fonts";

// ─── Auth redirect logic (shared mobile + web) ────────────────────────────────

export default function Index() {
  const { session, loading: authLoading } = useAuth();
  const { role, loading: roleLoading } = useRole();

  if (authLoading) {
    return (
      <Screen centered>
        <ActivityIndicator color="#00B4A6" />
      </Screen>
    );
  }

  // Already logged in → redirect to their space
  if (session) {
    if (roleLoading) {
      return (
        <Screen centered>
          <ActivityIndicator color="#00B4A6" />
        </Screen>
      );
    }
    if (role === "guest") return <Redirect href="/guest" />;
    if (role === "host") return <Redirect href="/host" />;
    return <Redirect href="/login" />;
  }

  // Not logged in: web → landing page, mobile → login
  if (Platform.OS !== "web") {
    return <Redirect href="/login" />;
  }

  return <LandingPage />;
}

// ─── Landing page (web only) ──────────────────────────────────────────────────

const MOCK_CARDS = [
  {
    title: "Morning Vinyasa Yoga",
    time: "Today · 7:00 AM",
    spots: "4/10 spots",
    bar: "#00B4A6",
    rating: "★ 4.9",
  },
  {
    title: "Beginner Chess",
    time: "Tomorrow · 3:00 PM",
    spots: "2/8 spots",
    bar: "#E0A0B0",
    rating: null,
  },
  {
    title: "Hip Hop Dance",
    time: "Sat · 11:00 AM",
    spots: "6/15 spots",
    bar: "#94B4D2",
    rating: null,
  },
];

const HOW_IT_WORKS = [
  {
    icon: "magnify" as const,
    title: "Browse live classes",
    body: "Find classes happening today, tomorrow, or this week from instructors you'll actually connect with.",
  },
  {
    icon: "cursor-default-click-outline" as const,
    title: "Join in one tap",
    body: "No downloads, no setup. Join a live class instantly from your browser.",
  },
  {
    icon: "star-outline" as const,
    title: "Come back every week",
    body: "Follow your favorite instructors and never miss a class with notifications.",
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
    <ScrollView
      style={styles.page}
      contentContainerStyle={styles.pageContent}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Section 1: Hero ──────────────────────────────────────────────── */}
      <View style={[styles.hero, isNarrow && styles.heroNarrow]}>
        {/* Nav */}
        <View style={styles.nav}>
          <View style={styles.navLeft}>
            <MaterialCommunityIcons name="leaf-circle-outline" size={26} color="#00B4A6" />
            <Text style={styles.navLogo}>Flocked</Text>
          </View>
          <View style={styles.navRight}>
            <TouchableOpacity
              onPress={goLogin}
              activeOpacity={0.7}
              style={styles.navSignIn}
            >
              <Text style={styles.navSignInText}>Sign in</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={goLogin}
              activeOpacity={0.85}
              style={styles.navGetStarted}
            >
              <Text style={styles.navGetStartedText}>Get Started</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Hero body */}
        <View style={[styles.heroBody, isNarrow && styles.heroBodyNarrow]}>
          {/* Left */}
          <View style={[styles.heroLeft, isNarrow && styles.heroLeftNarrow]}>
            <Text style={[styles.headline, isNarrow && styles.headlineNarrow]}>
              {"Learn anything.\nLive."}
            </Text>
            <Text style={[styles.subheadline, isNarrow && styles.subheadlineNarrow]}>
              Intimate live classes from real instructors.{"\n"}Yoga, chess, piano, dance — whatever you want to learn.
            </Text>
            <View style={[styles.ctaRow, isNarrow && styles.ctaRowNarrow]}>
              <TouchableOpacity
                style={styles.ctaPrimary}
                onPress={goLogin}
                activeOpacity={0.85}
              >
                <Text style={styles.ctaPrimaryText}>Find a class</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.ctaSecondary}
                onPress={goLogin}
                activeOpacity={0.85}
              >
                <Text style={styles.ctaSecondaryText}>Teach on Flocked</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.socialProof}>
              <View style={styles.socialDot} />
              <Text style={styles.socialText}>Join 500+ students in Colorado</Text>
            </View>
          </View>

          {/* Right — card panel */}
          {!isNarrow && (
            <View style={styles.heroRight}>
              <View style={styles.cardsPanel}>
                {MOCK_CARDS.map((card, i) => (
                  <View
                    key={card.title}
                    style={[
                      styles.mockCard,
                      i === 1 && styles.mockCardMid,
                      i === 2 && styles.mockCardLast,
                    ]}
                  >
                    <View style={[styles.mockCardBar, { backgroundColor: card.bar }]} />
                    <View style={styles.mockCardBody}>
                      <View style={styles.mockCardTop}>
                        <Text style={styles.mockCardTitle}>{card.title}</Text>
                        {card.rating && (
                          <View style={styles.ratingBadge}>
                            <Text style={styles.ratingText}>{card.rating}</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.mockCardTime}>{card.time}</Text>
                      <View style={styles.mockCardSpotsBadge}>
                        <Text style={styles.mockCardSpotsText}>{card.spots}</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      </View>

      {/* ── Section 2: How it works ──────────────────────────────────────── */}
      <View style={[styles.howSection, isNarrow && styles.howSectionNarrow]}>
        <Text style={styles.sectionTitle}>How Flocked works</Text>
        <View style={[styles.howGrid, isNarrow && styles.howGridNarrow]}>
          {HOW_IT_WORKS.map((item) => (
            <View key={item.title} style={[styles.howCol, isNarrow && styles.howColNarrow]}>
              <View style={styles.howIconWrap}>
                <MaterialCommunityIcons name={item.icon} size={24} color="#00B4A6" />
              </View>
              <Text style={styles.howTitle}>{item.title}</Text>
              <Text style={styles.howBody}>{item.body}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* ── Section 3: For instructors ───────────────────────────────────── */}
      <View style={[styles.instructorSection, isNarrow && styles.instructorSectionNarrow]}>
        <View style={[styles.instructorLeft, isNarrow && styles.instructorLeftNarrow]}>
          <Text style={styles.instructorLabel}>FOR INSTRUCTORS</Text>
          <Text style={[styles.instructorTitle, isNarrow && styles.instructorTitleNarrow]}>
            Turn your skill into a class
          </Text>
          <Text style={styles.instructorBody}>
            Set your own schedule, price, and class size. We handle payments, video, and student management.
          </Text>
          <View style={styles.bullets}>
            {INSTRUCTOR_BULLETS.map((b) => (
              <View key={b} style={styles.bulletRow}>
                <View style={styles.bulletCheck}>
                  <MaterialCommunityIcons name="check" size={14} color="#00B4A6" />
                </View>
                <Text style={styles.bulletText}>{b}</Text>
              </View>
            ))}
          </View>
          <TouchableOpacity
            style={styles.applyBtn}
            onPress={goLogin}
            activeOpacity={0.85}
          >
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

      {/* ── Section 4: CTA banner ────────────────────────────────────────── */}
      <View style={styles.ctaBanner}>
        <Text style={styles.ctaBannerTitle}>Ready to learn something new?</Text>
        <Text style={styles.ctaBannerSub}>Your first class is waiting.</Text>
        <TouchableOpacity
          style={styles.ctaBannerBtn}
          onPress={goLogin}
          activeOpacity={0.85}
        >
          <Text style={styles.ctaBannerBtnText}>Get Started</Text>
        </TouchableOpacity>
      </View>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <View style={[styles.footer, isNarrow && styles.footerNarrow]}>
        <View style={styles.footerLeft}>
          <View style={styles.footerLogoRow}>
            <MaterialCommunityIcons name="leaf-circle-outline" size={20} color="#00B4A6" />
            <Text style={styles.footerLogo}>Flocked</Text>
          </View>
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
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#FFFFFF" },
  pageContent: { flexGrow: 1 },

  // ── Hero ────────────────────────────────────────────────────────────────────
  hero: {
    minHeight: 640,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 80,
    paddingTop: 0,
    paddingBottom: 60,
  },
  heroNarrow: { paddingHorizontal: 24 },

  // Nav
  nav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 24,
  },
  navLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  navLogo: {
    fontSize: 22,
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: "#00B4A6",
    letterSpacing: -0.3,
  },
  navRight: { flexDirection: "row", alignItems: "center", gap: 16 },
  navSignIn: { cursor: "pointer" } as any,
  navSignInText: {
    fontSize: 15,
    fontFamily: fonts.medium,
    color: "#888888",
  },
  navGetStarted: {
    backgroundColor: "#00B4A6",
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 8,
    cursor: "pointer",
  } as any,
  navGetStartedText: {
    fontSize: 14,
    fontFamily: fonts.bold,
    fontWeight: "600",
    color: "#FFFFFF",
  },

  // Hero body
  heroBody: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 60,
    paddingTop: 40,
    paddingBottom: 20,
  },
  heroBodyNarrow: { flexDirection: "column", gap: 32 },

  // Hero left
  heroLeft: { flex: 55 },
  heroLeftNarrow: { flex: 0 },

  headline: {
    fontSize: 64,
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: "#1A1A1A",
    lineHeight: 70,
    letterSpacing: -2,
  },
  headlineNarrow: { fontSize: 44, lineHeight: 50 },

  subheadline: {
    fontSize: 20,
    fontFamily: fonts.regular,
    color: "#666666",
    lineHeight: 30,
    marginTop: 20,
  },
  subheadlineNarrow: { fontSize: 17, lineHeight: 26, marginTop: 14 },

  ctaRow: {
    flexDirection: "row",
    gap: 14,
    marginTop: 40,
    flexWrap: "wrap",
  },
  ctaRowNarrow: { marginTop: 28 },

  ctaPrimary: {
    backgroundColor: "#00B4A6",
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    cursor: "pointer",
  } as any,
  ctaPrimaryText: {
    fontSize: 16,
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  ctaSecondary: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#00B4A6",
    cursor: "pointer",
  } as any,
  ctaSecondaryText: {
    fontSize: 16,
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: "#00B4A6",
  },

  socialProof: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 24,
  },
  socialDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#00B4A6",
  },
  socialText: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: "#888888",
  },

  // Hero right — cards panel
  heroRight: {
    flex: 45,
    alignItems: "center",
    justifyContent: "center",
  },
  cardsPanel: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#00B4A6",
    borderRadius: 24,
    padding: 24,
    gap: 0,
    shadowColor: "#00B4A6",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 32,
    elevation: 10,
  },

  mockCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 10,
  },
  mockCardMid: {
    marginLeft: 8,
    marginRight: -8,
    zIndex: 1,
  },
  mockCardLast: {
    marginLeft: 16,
    marginRight: -16,
    marginBottom: 0,
  },
  mockCardBar: { width: 5, alignSelf: "stretch" },
  mockCardBody: { flex: 1, padding: 14, gap: 4 },
  mockCardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  mockCardTitle: {
    flex: 1,
    fontSize: 14,
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: "#1A1A1A",
    lineHeight: 19,
  },
  ratingBadge: {
    backgroundColor: "#FFF8E7",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    flexShrink: 0,
  },
  ratingText: {
    fontSize: 11,
    fontFamily: fonts.bold,
    color: "#F4A200",
  },
  mockCardTime: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#888888",
  },
  mockCardSpotsBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#E0F7F5",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 2,
  },
  mockCardSpotsText: {
    fontSize: 11,
    fontFamily: fonts.medium,
    color: "#007A70",
  },

  // ── How it works ─────────────────────────────────────────────────────────────
  howSection: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 80,
    paddingHorizontal: 80,
    borderTopWidth: 1,
    borderTopColor: "#F4F4F4",
  },
  howSectionNarrow: { paddingHorizontal: 24, paddingVertical: 56 },

  sectionTitle: {
    fontSize: 36,
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: "#1A1A1A",
    textAlign: "center",
    marginBottom: 56,
    letterSpacing: -0.5,
  },

  howGrid: {
    flexDirection: "row",
    gap: 40,
    justifyContent: "center",
  },
  howGridNarrow: { flexDirection: "column", gap: 36 },

  howCol: {
    flex: 1,
    alignItems: "flex-start",
    gap: 14,
    maxWidth: 300,
  },
  howColNarrow: { maxWidth: "100%" as any, flex: 0 },

  howIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: "#E0F7F5",
    alignItems: "center",
    justifyContent: "center",
  },
  howTitle: {
    fontSize: 18,
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: "#1A1A1A",
    lineHeight: 24,
  },
  howBody: {
    fontSize: 15,
    fontFamily: fonts.regular,
    color: "#666666",
    lineHeight: 24,
  },

  // ── Instructor section ────────────────────────────────────────────────────────
  instructorSection: {
    backgroundColor: "#E0F7F5",
    paddingVertical: 80,
    paddingHorizontal: 80,
    flexDirection: "row",
    gap: 80,
    alignItems: "center",
  },
  instructorSectionNarrow: {
    flexDirection: "column",
    paddingHorizontal: 24,
    paddingVertical: 56,
    gap: 44,
  },

  instructorLeft: { flex: 1, gap: 20 },
  instructorLeftNarrow: { flex: 0 },

  instructorLabel: {
    fontSize: 12,
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: "#00B4A6",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  instructorTitle: {
    fontSize: 36,
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: "#1A1A1A",
    lineHeight: 42,
    letterSpacing: -0.5,
  },
  instructorTitleNarrow: { fontSize: 28, lineHeight: 34 },
  instructorBody: {
    fontSize: 16,
    fontFamily: fonts.regular,
    color: "#555555",
    lineHeight: 26,
  },

  bullets: { gap: 12, marginTop: 4 },
  bulletRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  bulletCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 1,
  },
  bulletText: {
    fontSize: 15,
    fontFamily: fonts.medium,
    color: "#2C2C2C",
    lineHeight: 24,
    flex: 1,
  },

  applyBtn: {
    alignSelf: "flex-start",
    backgroundColor: "#00B4A6",
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
    cursor: "pointer",
  } as any,
  applyBtnText: {
    fontSize: 15,
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  instructorRight: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 20,
    justifyContent: "center",
    flex: 0,
  },
  instructorRightNarrow: { flexDirection: "row", flex: 0 },

  statCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 28,
    alignItems: "center",
    minWidth: 130,
    shadowColor: "#00B4A6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 2,
  },
  statNum: {
    fontSize: 40,
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: "#00B4A6",
    letterSpacing: -1,
  },
  statLabel: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: "#888888",
    marginTop: 4,
    textAlign: "center",
  },

  // ── CTA banner ────────────────────────────────────────────────────────────────
  ctaBanner: {
    backgroundColor: "#00B4A6",
    paddingVertical: 80,
    paddingHorizontal: 80,
    alignItems: "center",
    gap: 16,
  },
  ctaBannerTitle: {
    fontSize: 40,
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
    letterSpacing: -0.8,
  },
  ctaBannerSub: {
    fontSize: 18,
    fontFamily: fonts.regular,
    color: "rgba(255,255,255,0.85)",
    textAlign: "center",
  },
  ctaBannerBtn: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 36,
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 12,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.4)",
    cursor: "pointer",
  } as any,
  ctaBannerBtnText: {
    fontSize: 16,
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: "#00B4A6",
  },

  // ── Footer ────────────────────────────────────────────────────────────────────
  footer: {
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    paddingVertical: 36,
    paddingHorizontal: 80,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  footerNarrow: {
    flexDirection: "column",
    paddingHorizontal: 24,
    gap: 20,
    alignItems: "flex-start",
  },
  footerLeft: { gap: 6 },
  footerLogoRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  footerLogo: {
    fontSize: 18,
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  footerCopy: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: "#AAAAAA",
  },
  footerLinks: { flexDirection: "row", gap: 32, alignItems: "center" },
  footerLinksNarrow: { gap: 20 },
  footerLink: {
    fontSize: 14,
    fontFamily: fonts.medium,
    color: "#666666",
    cursor: "pointer",
  } as any,
});
