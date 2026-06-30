import { useRef, useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
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
import { signUpForNewsletter } from "../lib/api";

// ─── Auth redirect logic ───────────────────────────────────────────────────────

export default function Index() {
  const { session, loading: authLoading } = useAuth();
  const { role, loading: roleLoading } = useRole();

  if (authLoading) {
    return (
      <Screen centered>
        <ActivityIndicator color="#1B3A35" />
      </Screen>
    );
  }

  if (session) {
    if (roleLoading) {
      return (
        <Screen centered>
          <ActivityIndicator color="#1B3A35" />
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

// ─── Data ─────────────────────────────────────────────────────────────────────

const AVATAR_COLORS = ["#2C3E3A", "#8B6914", "#8B7355", "#2C2C3E"];

const CLASS_CARDS = [
  {
    category: "Yoga",
    catBg: "#E8F5F3",
    catIcon: "yoga",
    catIconColor: "#059669",
    pillBg: "#E8F5F3",
    pillText: "#00796B",
    avatarBg: "#2C5E55",
    title: "Sunrise Vinyasa Flow",
    instructor: "Ava Chen",
    instructorInitials: "AC",
    schedule: "Mon, Wed, Fri · 7 AM",
    joined: 8,
    max: 12,
    price: 18,
  },
  {
    category: "Chess",
    catBg: "#EEF2FF",
    catIcon: "chess-queen",
    catIconColor: "#4F46E5",
    pillBg: "#E8F5F3",
    pillText: "#00796B",
    avatarBg: "#253530",
    title: "Strategic Chess Openings",
    instructor: "Marcus Reed",
    instructorInitials: "MR",
    schedule: "Tue, Thu · 6 PM",
    joined: 5,
    max: 8,
    price: 25,
  },
  {
    category: "Cooking",
    catBg: "#FFF7ED",
    catIcon: "chef-hat",
    catIconColor: "#D97706",
    pillBg: "#FDF8E0",
    pillText: "#6B4C00",
    avatarBg: "#7A5C10",
    title: "Italian Pasta Masterclass",
    instructor: "Zara Williams",
    instructorInitials: "ZW",
    schedule: "Sat · 11 AM",
    joined: 11,
    max: 15,
    price: 22,
  },
  {
    category: "Piano",
    catBg: "#F5F3FF",
    catIcon: "piano",
    catIconColor: "#7C3AED",
    pillBg: "#EEEEFC",
    pillText: "#3030A0",
    avatarBg: "#252538",
    title: "Jazz Piano Improv",
    instructor: "David Laurent",
    instructorInitials: "DL",
    schedule: "Wed, Fri · 5 PM",
    joined: 6,
    max: 10,
    price: 30,
  },
];

const HOW_STEPS = [
  {
    icon: "🔍",
    eyebrow: "BROWSE & BOOK",
    title: "The Invitation",
    body: "Discover classes by category, skill level, or instructor. Each session seats just 5–15 students — book your spot before it fills up.",
  },
  {
    icon: "💬",
    eyebrow: "MEET YOUR GROUP",
    title: "The Gathering",
    body: "Before class starts, connect with your instructor and classmates in a pre-session chat. No strangers — just fellow learners.",
  },
  {
    icon: "📹",
    eyebrow: "LEARN LIVE TOGETHER",
    title: "The Practice",
    body: "Join a live, interactive session. Ask questions in real-time, get personal feedback, and learn at a pace that feels human.",
  },
  {
    icon: "⭐",
    eyebrow: "GROW TOGETHER",
    title: "The Ritual",
    body: "Rate your session, track your streak, and keep coming back. Your Tuesday crew is waiting.",
  },
];

const TESTIMONIALS = [
  {
    quote:
      "I've tried every online yoga class out there. Flocked is the first time I actually felt like I was in a room with my teacher. She corrected my form in real-time — that's never happened online.",
    name: "Priya Mehta",
    role: "Yoga Student",
    initials: "PM",
    avatarBg: "#7A6548",
  },
  {
    quote:
      "Teaching on Flocked lets me be the kind of instructor I trained to be. Small groups mean I actually know my students' names, their progress, and what they need next.",
    name: "Marcus Reed",
    role: "Chess Instructor",
    initials: "MR",
    avatarBg: "#253530",
  },
  {
    quote:
      "The community aspect is what hooked me. After our cooking class ends, we share photos of what we made in the group chat. It's like a little family of pasta nerds.",
    name: "Jordan Kim",
    role: "Cooking Student",
    initials: "JK",
    avatarBg: "#7A5C10",
  },
];

const FOOTER_COLS = [
  {
    heading: "Platform",
    links: ["Browse Classes", "How It Works", "Pricing", "Gift Cards"],
  },
  {
    heading: "Instructors",
    links: ["Apply to Teach", "Instructor Resources", "Success Stories", "Community"],
  },
  {
    heading: "Company",
    links: ["About", "Blog", "Careers", "Contact"],
  },
];

// ─── Landing page (web only) ──────────────────────────────────────────────────

function LandingPage() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const isMid = width >= 700;

  const goLogin = () => router.push("/login");

  // Section scroll offsets
  const scrollRef = useRef<ScrollView>(null);
  const classesY = useRef(0);
  const howY = useRef(0);
  const teachY = useRef(0);

  const scrollTo = (yRef: React.MutableRefObject<number>) => {
    scrollRef.current?.scrollTo({ y: Math.max(0, yRef.current - 68), animated: true });
  };

  // Earnings calculator
  const [students, setStudents] = useState(10);
  const [classesPerWeek, setClassesPerWeek] = useState(3);
  const monthlyEarnings = Math.round(students * classesPerWeek * 4 * 10 * 0.8);

  // Newsletter
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = async () => {
    if (!email.trim() || !email.includes("@")) return;
    try {
      await signUpForNewsletter({ email: email.trim() });
    } catch {
      // best-effort
    }
    setSubscribed(true);
  };

  return (
    <View style={s.page}>
      {/* ── Sticky Nav ──────────────────────────────────────────────────────── */}
      <View style={s.nav as any}>
        <View style={[s.navInner, !isDesktop && s.navInnerMobile]}>
          {/* Logo */}
          <TouchableOpacity
            style={s.navBrand}
            onPress={() => scrollRef.current?.scrollTo({ y: 0, animated: true })}
            activeOpacity={0.8}
          >
            <View style={s.logoBadge}>
              <Text style={s.logoBadgeF}>F</Text>
            </View>
            <Text style={s.logoWordmark}>Flocked</Text>
          </TouchableOpacity>

          {/* Center links (desktop) */}
          {isDesktop && (
            <View style={s.navCenter}>
              {[
                { label: "Classes", y: classesY },
                { label: "How It Works", y: howY },
                { label: "Teach", y: teachY },
              ].map(({ label, y }) => (
                <TouchableOpacity
                  key={label}
                  onPress={() => scrollTo(y)}
                  activeOpacity={0.7}
                  style={s.navLink as any}
                >
                  <Text style={s.navLinkText}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Right CTAs */}
          <View style={s.navRight}>
            <TouchableOpacity onPress={goLogin} activeOpacity={0.7} style={s.navSignIn as any}>
              <Text style={s.navSignInText}>Sign In</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={goLogin} activeOpacity={0.85} style={s.navGetStarted as any}>
              <Text style={s.navGetStartedText}>Get Started</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero ──────────────────────────────────────────────────────────── */}
        <View style={[s.hero, isDesktop && s.heroDesktop]}>
          <View style={[s.heroLeft, isDesktop && s.heroLeftDesktop]}>
            {/* Pill badge */}
            <View style={s.heroPill}>
              <Text style={s.heroPillText}>✦  Live classes. Real people. Small groups.</Text>
            </View>

            {/* Headline */}
            <Text style={[s.headline, !isDesktop && s.headlineMobile]}>
              {"Master the craft,\nnot the screen."}
            </Text>

            {/* Subtext */}
            <Text style={[s.heroSub, !isDesktop && s.heroSubMobile]}>
              Join intimate live classes with world-class instructors. From yoga to chess, piano to
              pastry — learn alongside 5–15 fellow students who share your curiosity.
            </Text>

            {/* CTA buttons */}
            <View style={[s.heroBtns, !isDesktop && s.heroBtnsMobile]}>
              <TouchableOpacity style={s.heroBtnPrimary as any} onPress={goLogin} activeOpacity={0.85}>
                <Text style={s.heroBtnPrimaryText}>Browse Classes →</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.heroBtnSecondary as any} onPress={goLogin} activeOpacity={0.85}>
                <Text style={s.heroBtnSecondaryText}>Become an Instructor</Text>
              </TouchableOpacity>
            </View>

            {/* Social proof */}
            <View style={s.socialProof}>
              <View style={s.avatarStack}>
                {["PR", "AK", "JL", "MT"].map((initials, i) => (
                  <View
                    key={initials}
                    style={[
                      s.avatarCircle,
                      { backgroundColor: AVATAR_COLORS[i], marginLeft: i === 0 ? 0 : -10 },
                    ]}
                  >
                    <Text style={s.avatarInitials}>{initials}</Text>
                  </View>
                ))}
              </View>
              <Text style={s.socialText}>
                <Text style={s.socialBold}>2,400+ students </Text>
                <Text style={s.socialGray}>learning together this week</Text>
              </Text>
            </View>
          </View>

          {/* Right: floating class cards (desktop only) */}
          {isDesktop && (
            <View style={s.heroCards}>
              {/* Card 1 — chess, left */}
              <View style={[s.heroCard, s.heroCard1]}>
                <View style={s.heroCardBody}>
                  <View style={s.heroCardHeadRow}>
                    <View style={[s.catPill, { backgroundColor: "#E8F5F3" }]}>
                      <Text style={[s.catPillText, { color: "#00796B" }]}>Chess</Text>
                    </View>
                    <View style={s.spotsBadge}>
                      <Text style={s.spotsBadgeText}>3 spots left</Text>
                    </View>
                  </View>
                  <Text style={s.heroCardTitle}>Strategic Chess Openings</Text>
                  <View style={s.heroCardFooter}>
                    <View style={[s.heroCardAvatar, { backgroundColor: "#253530" }]}>
                      <Text style={s.heroCardAvatarText}>MR</Text>
                    </View>
                    <Text style={s.heroCardInstructor}>Marcus Reed</Text>
                    <Text style={s.heroCardCount}>5/8</Text>
                  </View>
                </View>
              </View>

              {/* Card 2 — yoga, top right */}
              <View style={[s.heroCard, s.heroCard2]}>
                <View style={s.heroCardBody}>
                  <View style={s.heroCardHeadRow}>
                    <View style={[s.catPill, { backgroundColor: "#FDF0E8" }]}>
                      <Text style={[s.catPillText, { color: "#8B5E1A" }]}>Yoga</Text>
                    </View>
                    <View style={s.liveBadge}>
                      <View style={s.liveDot} />
                      <Text style={s.liveBadgeText}>LIVE</Text>
                    </View>
                  </View>
                  <Text style={s.heroCardTitle} numberOfLines={1}>Morning Flow Yoga</Text>
                  <View style={s.heroCardFooter}>
                    <View style={[s.heroCardAvatar, { backgroundColor: "#7A6548" }]}>
                      <Text style={s.heroCardAvatarText}>AC</Text>
                    </View>
                    <Text style={s.heroCardInstructor}>Ava Chen</Text>
                    <Text style={s.heroCardCount}>8/12</Text>
                  </View>
                </View>
              </View>

              {/* Card 3 — cooking, bottom right */}
              <View style={[s.heroCard, s.heroCard3]}>
                <View style={s.heroCardBody}>
                  <View style={[s.catPill, { backgroundColor: "#FDF8E0" }]}>
                    <Text style={[s.catPillText, { color: "#6B4C00" }]}>Cooking</Text>
                  </View>
                  <Text style={s.heroCardTitle} numberOfLines={1}>Italian Pasta from Scratch</Text>
                  <View style={s.heroCardFooter}>
                    <View style={[s.heroCardAvatar, { backgroundColor: "#7A5C10" }]}>
                      <Text style={s.heroCardAvatarText}>ZW</Text>
                    </View>
                    <Text style={s.heroCardInstructor}>Zara Williams</Text>
                    <Text style={s.heroCardCount}>11/15</Text>
                  </View>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* ── Classes Starting Soon ──────────────────────────────────────────── */}
        <View
          style={s.classesSection}
          onLayout={(e) => { classesY.current = e.nativeEvent.layout.y; }}
        >
          <View style={[s.innerWrap, isDesktop && s.innerWrapDesktop]}>
            <View style={s.classesSectionHeader}>
              <View>
                <Text style={[s.secTitle, !isDesktop && s.secTitleMobile]}>
                  Classes starting soon
                </Text>
                <Text style={s.secSub}>
                  Browse intimate sessions taught by passionate instructors.
                </Text>
              </View>
              <TouchableOpacity onPress={goLogin} activeOpacity={0.7} style={s.viewAll as any}>
                <Text style={s.viewAllText}>View all classes →</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.classCardsScroll}
            >
              {CLASS_CARDS.map((card) => (
                <TouchableOpacity
                  key={card.title}
                  style={s.classCard as any}
                  onPress={goLogin}
                  activeOpacity={0.88}
                >
                  {/* Color header with category icon */}
                  <View style={[s.classCardHeader, { backgroundColor: card.catBg }]}>
                    <MaterialCommunityIcons
                      name={card.catIcon as any}
                      size={38}
                      color={card.catIconColor}
                    />
                    <Text style={[s.classCardHeaderText, { color: card.catIconColor }]}>
                      {card.category}
                    </Text>
                    <View style={s.priceTag}>
                      <Text style={s.priceTagText}>${card.price}</Text>
                    </View>
                  </View>

                  <View style={s.classCardBody}>
                    <View style={[s.catPill, { backgroundColor: card.pillBg }]}>
                      <Text style={[s.catPillText, { color: card.pillText }]}>{card.category}</Text>
                    </View>
                    <Text style={s.classCardTitle} numberOfLines={2}>{card.title}</Text>
                    <View style={s.classCardInstructorRow}>
                      <View style={[s.classCardAvatar, { backgroundColor: card.avatarBg }]}>
                        <Text style={s.classCardAvatarText}>{card.instructorInitials}</Text>
                      </View>
                      <Text style={s.classCardInstructor}>{card.instructor}</Text>
                    </View>
                    <View style={s.scheduleRow}>
                      <Text style={s.scheduleIcon}>🕐</Text>
                      <Text style={s.scheduleText}>{card.schedule}</Text>
                    </View>
                    <View style={s.progressRow}>
                      <View style={s.progressTrack}>
                        <View
                          style={[
                            s.progressFill,
                            { width: `${Math.round((card.joined / card.max) * 100)}%` as any },
                          ]}
                        />
                      </View>
                      <Text style={s.progressLabel}>{card.joined}/{card.max} joined</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>

        {/* ── How It Works ──────────────────────────────────────────────────── */}
        <View
          style={s.howSection}
          onLayout={(e) => { howY.current = e.nativeEvent.layout.y; }}
        >
          <View style={[s.innerWrap, isDesktop && s.innerWrapDesktop, s.howInner]}>
            <Text style={s.eyebrow}>HOW IT WORKS</Text>
            <Text style={[s.howTitle, !isDesktop && s.howTitleMobile]}>
              From curious to connected in four steps
            </Text>
            <Text style={s.howSubtext}>
              No algorithms, no pre-recorded videos. Just real classes with real people.
            </Text>

            {/* Steps */}
            <View style={[s.stepsWrap, !isMid && s.stepsWrapMobile]}>
              {/* Vertical connector line */}
              <View style={s.stepLine} />

              {HOW_STEPS.map((step, i) => (
                <View key={step.title} style={[s.step, !isMid && s.stepMobile]}>
                  {/* Icon + badge */}
                  <View style={s.stepIconWrap}>
                    <View style={s.stepIconBox}>
                      <Text style={s.stepIconEmoji}>{step.icon}</Text>
                    </View>
                    <View style={s.stepNumBadge}>
                      <Text style={s.stepNumText}>{i + 1}</Text>
                    </View>
                  </View>

                  {/* Text */}
                  <View style={s.stepContent}>
                    <Text style={s.stepEyebrow}>{step.eyebrow}</Text>
                    <Text style={s.stepTitle}>{step.title}</Text>
                    <Text style={s.stepBody}>{step.body}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* ── For Instructors ────────────────────────────────────────────────── */}
        <View
          style={s.teachSection}
          onLayout={(e) => { teachY.current = e.nativeEvent.layout.y; }}
        >
          <View style={[s.innerWrap, isDesktop && s.innerWrapDesktop, isDesktop ? s.teachInner : s.teachInnerMobile]}>
            {/* Left photo placeholder */}
            <View style={[s.teachPhotoWrap, !isDesktop && s.teachPhotoWrapMobile]}>
              <View style={s.teachPhotoGrad}>
                <Text style={s.teachPhotoEmoji}>👋</Text>
              </View>
              <View style={s.teachPhotoBadge}>
                <Text style={s.teachPhotoBadgeLabel}>Active Instructors</Text>
                <Text style={s.teachPhotoBadgeNum}>340+</Text>
                <Text style={s.teachPhotoBadgeSub}>across 28 categories</Text>
              </View>
            </View>

            {/* Right copy */}
            <View style={s.teachRight}>
              <Text style={s.teachEyebrow}>FOR INSTRUCTORS</Text>
              <Text style={[s.teachHeadline, !isDesktop && s.teachHeadlineMobile]}>
                {"Turn your studio into\na global stage."}
              </Text>
              <Text style={s.teachBody}>
                Share your craft with intimate groups who actually show up, engage, and come back.
                No algorithms — just real teaching, real connection, real income.
              </Text>

              {/* Earnings calculator */}
              <View style={s.calcCard}>
                <Text style={s.calcLabel}>Projected monthly earnings</Text>

                <View style={s.calcRow}>
                  <Text style={s.calcRowLabel}>Students per class</Text>
                  <View style={s.stepper}>
                    <TouchableOpacity
                      style={s.stepperBtn as any}
                      onPress={() => setStudents((v) => Math.max(5, v - 1))}
                      activeOpacity={0.7}
                    >
                      <Text style={s.stepperBtnText}>−</Text>
                    </TouchableOpacity>
                    <Text style={s.stepperVal}>{students}</Text>
                    <TouchableOpacity
                      style={s.stepperBtn as any}
                      onPress={() => setStudents((v) => Math.min(15, v + 1))}
                      activeOpacity={0.7}
                    >
                      <Text style={s.stepperBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={s.calcRow}>
                  <Text style={s.calcRowLabel}>Classes per week</Text>
                  <View style={s.stepper}>
                    <TouchableOpacity
                      style={s.stepperBtn as any}
                      onPress={() => setClassesPerWeek((v) => Math.max(1, v - 1))}
                      activeOpacity={0.7}
                    >
                      <Text style={s.stepperBtnText}>−</Text>
                    </TouchableOpacity>
                    <Text style={s.stepperVal}>{classesPerWeek}</Text>
                    <TouchableOpacity
                      style={s.stepperBtn as any}
                      onPress={() => setClassesPerWeek((v) => Math.min(7, v + 1))}
                      activeOpacity={0.7}
                    >
                      <Text style={s.stepperBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={s.calcDivider} />
                <Text style={s.calcPotentialLabel}>Monthly potential</Text>
                <Text style={s.calcAmount}>${monthlyEarnings.toLocaleString()}</Text>
              </View>

              <TouchableOpacity style={s.applyBtn as any} onPress={goLogin} activeOpacity={0.85}>
                <Text style={s.applyBtnText}>Apply to Teach →</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* ── Testimonials ──────────────────────────────────────────────────── */}
        <View style={s.testimonialsSection}>
          <View style={[s.innerWrap, isDesktop && s.innerWrapDesktop, s.testimonialsInner]}>
            <Text style={s.eyebrow}>WHAT PEOPLE SAY</Text>
            <Text style={[s.secTitle, !isDesktop && s.secTitleMobile, s.testimonialsTitleCentered]}>
              Stories from the flock
            </Text>
            <View style={[s.testimonialsGrid, !isMid && s.testimonialsGridMobile]}>
              {TESTIMONIALS.map((t) => (
                <View key={t.name} style={s.testimonialCard}>
                  <Text style={s.testimonialStars}>★★★★★</Text>
                  <Text style={s.testimonialQuote}>"{t.quote}"</Text>
                  <View style={s.testimonialAuthorRow}>
                    <View style={[s.testimonialAvatar, { backgroundColor: t.avatarBg }]}>
                      <Text style={s.testimonialAvatarText}>{t.initials}</Text>
                    </View>
                    <View>
                      <Text style={s.testimonialName}>{t.name}</Text>
                      <Text style={s.testimonialRole}>{t.role}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* ── Newsletter / CTA ──────────────────────────────────────────────── */}
        <View style={[s.ctaSection, isDesktop && s.ctaSectionDesktop]}>
          <View style={[s.ctaCard, isDesktop && s.ctaCardDesktop]}>
            <Text style={[s.ctaTitle, !isDesktop && s.ctaTitleMobile]}>Join the circle</Text>
            <Text style={s.ctaSub}>
              Get weekly picks of the best classes, instructor spotlights, and early access to new
              categories.
            </Text>
            {subscribed ? (
              <Text style={s.subscribedText}>🎉 You're in! Watch your inbox.</Text>
            ) : (
              <View style={[s.ctaInputRow, !isDesktop && s.ctaInputRowMobile]}>
                <TextInput
                  style={s.ctaInput}
                  placeholder="your@email.com"
                  placeholderTextColor="rgba(27,58,53,0.4)"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
                <TouchableOpacity
                  style={s.ctaSubBtn as any}
                  onPress={handleSubscribe}
                  activeOpacity={0.85}
                >
                  <Text style={s.ctaSubBtnText}>Subscribe →</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* ── Footer ─────────────────────────────────────────────────────────── */}
        <View style={s.footer}>
          <View style={[s.footerTop, isDesktop && s.footerTopDesktop]}>
            {/* Brand */}
            <View style={[s.footerBrand, isDesktop && s.footerBrandDesktop]}>
              <View style={s.footerLogoRow}>
                <View style={s.logoBadge}>
                  <Text style={s.logoBadgeF}>F</Text>
                </View>
                <Text style={s.footerLogoText}>Flocked</Text>
              </View>
              <Text style={s.footerTagline}>
                Live classes with real instructors, intimate groups, and genuine human connection.
              </Text>
            </View>

            {/* Columns (desktop) */}
            {isDesktop && (
              <View style={s.footerCols}>
                {FOOTER_COLS.map((col) => (
                  <View key={col.heading} style={s.footerCol}>
                    <Text style={s.footerColHeading}>{col.heading}</Text>
                    {col.links.map((link) => (
                      <TouchableOpacity
                        key={link}
                        onPress={goLogin}
                        activeOpacity={0.7}
                        style={s.footerLinkBtn as any}
                      >
                        <Text style={s.footerLink}>{link}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                ))}
              </View>
            )}
          </View>

          <View style={s.footerBottom}>
            <Text style={s.footerCopy}>© 2026 Flocked. All rights reserved.</Text>
            <View style={s.footerLegal}>
              {["Privacy Policy", "Terms of Service"].map((link) => (
                <TouchableOpacity
                  key={link}
                  onPress={goLogin}
                  activeOpacity={0.7}
                  style={s.footerLinkBtn as any}
                >
                  <Text style={s.footerLegalLink}>{link}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#FFFFFF" },
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1 },

  // ── Nav ──────────────────────────────────────────────────────────────────────
  nav: {
    height: 64,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#EBEBEB",
    justifyContent: "center",
    position: "sticky",
    top: 0,
    zIndex: 200,
  },
  navInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    maxWidth: 1140,
    alignSelf: "center",
    width: "100%",
    paddingHorizontal: 40,
  },
  navInnerMobile: { paddingHorizontal: 20 },
  navBrand: { flexDirection: "row", alignItems: "center", gap: 10, cursor: "pointer" } as any,
  logoBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#00B4A6",
    alignItems: "center",
    justifyContent: "center",
  },
  logoBadgeF: {
    fontSize: 15,
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  logoWordmark: {
    fontSize: 17,
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: "#1B3A35",
    letterSpacing: -0.3,
  },
  navCenter: { flexDirection: "row", alignItems: "center", gap: 8 },
  navLink: { paddingHorizontal: 14, paddingVertical: 8, cursor: "pointer" },
  navLinkText: { fontSize: 14, fontFamily: fonts.regular, color: "#444444" },
  navRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  navSignIn: { paddingHorizontal: 12, paddingVertical: 8, cursor: "pointer" },
  navSignInText: { fontSize: 14, fontFamily: fonts.regular, color: "#6B6B6B" },
  navGetStarted: {
    backgroundColor: "#1B3A35",
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 9999,
    cursor: "pointer",
  },
  navGetStartedText: {
    fontSize: 13,
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  // ── Shared ───────────────────────────────────────────────────────────────────
  innerWrap: { width: "100%", paddingHorizontal: 24 },
  innerWrapDesktop: { maxWidth: 1140, alignSelf: "center", paddingHorizontal: 40 },
  catPill: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 9999,
  },
  catPillText: { fontSize: 11, fontFamily: fonts.bold, fontWeight: "700" },
  eyebrow: {
    fontSize: 11,
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: "#00B4A6",
    letterSpacing: 2,
    textTransform: "uppercase",
    textAlign: "center",
    marginBottom: 16,
  },
  secTitle: {
    fontSize: 36,
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: "#1B3A35",
    letterSpacing: -0.5,
    lineHeight: 42,
  },
  secTitleMobile: { fontSize: 26, lineHeight: 32 },
  secSub: { fontSize: 15, fontFamily: fonts.regular, color: "#777777", marginTop: 6 },

  // ── Hero ─────────────────────────────────────────────────────────────────────
  hero: {
    paddingTop: 72,
    paddingBottom: 80,
    paddingHorizontal: 24,
    backgroundColor: "#F8FAF9",
  },
  heroDesktop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 80,
    paddingHorizontal: 40,
    maxWidth: 1140,
    alignSelf: "center",
    width: "100%",
  },
  heroLeft: { flex: 1 },
  heroLeftDesktop: { maxWidth: 560 },
  heroPill: {
    alignSelf: "flex-start",
    backgroundColor: "#E8F5F3",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 9999,
    marginBottom: 28,
  },
  heroPillText: {
    fontSize: 13,
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: "#00B4A6",
    letterSpacing: 0.2,
  },
  headline: {
    fontSize: 64,
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: "#1B3A35",
    lineHeight: 68,
    letterSpacing: -2,
    marginBottom: 24,
  },
  headlineMobile: { fontSize: 40, lineHeight: 46, letterSpacing: -1 },
  heroSub: {
    fontSize: 18,
    fontFamily: fonts.regular,
    color: "#666666",
    lineHeight: 30,
    maxWidth: 500,
    marginBottom: 36,
  },
  heroSubMobile: { fontSize: 15, lineHeight: 24 },
  heroBtns: { flexDirection: "row", gap: 12, marginBottom: 40, flexWrap: "wrap" },
  heroBtnsMobile: { gap: 10 },
  heroBtnPrimary: {
    backgroundColor: "#1B3A35",
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 9999,
    cursor: "pointer",
  },
  heroBtnPrimaryText: {
    fontSize: 15,
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  heroBtnSecondary: {
    backgroundColor: "#F8FAF9",
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 9999,
    borderWidth: 1.5,
    borderColor: "#1B3A35",
    cursor: "pointer",
  },
  heroBtnSecondaryText: {
    fontSize: 15,
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: "#1B3A35",
  },
  socialProof: { flexDirection: "row", alignItems: "center", gap: 14 },
  avatarStack: { flexDirection: "row" },
  avatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#F8FAF9",
  },
  avatarInitials: {
    fontSize: 10,
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  socialText: { fontSize: 14, fontFamily: fonts.regular },
  socialBold: { fontFamily: fonts.bold, fontWeight: "700", color: "#1B3A35" },
  socialGray: { color: "#888888" },

  // Hero floating cards
  heroCards: { width: 460, height: 380, position: "relative" },
  heroCard: {
    position: "absolute",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E8E8E8",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.09,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  heroCard1: { left: 0, top: 80, width: 265 },
  heroCard2: { right: 0, top: 0, width: 220 },
  heroCard3: { right: 0, bottom: 0, width: 240 },
  heroCardHeadRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  spotsBadge: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  spotsBadgeText: { fontSize: 10, fontFamily: fonts.bold, fontWeight: "700", color: "#92400E" },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FEF2F2",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#DC2626",
  },
  liveBadgeText: { fontSize: 10, fontFamily: fonts.bold, fontWeight: "700", color: "#DC2626" },
  heroCardBody: { padding: 16, gap: 0 },
  heroCardTitle: {
    fontSize: 14,
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: "#1B3A35",
    lineHeight: 20,
    marginBottom: 12,
  },
  heroCardFooter: { flexDirection: "row", alignItems: "center", gap: 6 },
  heroCardAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  heroCardAvatarText: {
    fontSize: 8,
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  heroCardInstructor: { flex: 1, fontSize: 12, fontFamily: fonts.regular, color: "#777777" },
  heroCardCount: { fontSize: 12, fontFamily: fonts.regular, color: "#AAAAAA" },

  // ── Classes Section ───────────────────────────────────────────────────────────
  classesSection: {
    backgroundColor: "#F5F7F5",
    paddingVertical: 80,
  },
  classesSectionHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginBottom: 32,
    flexWrap: "wrap",
    gap: 12,
  },
  viewAll: { cursor: "pointer" },
  viewAllText: {
    fontSize: 14,
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: "#1B3A35",
    textDecorationLine: "underline",
  },
  classCardsScroll: { gap: 16, paddingBottom: 4, paddingTop: 4 },
  classCard: {
    width: 270,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E8E8E8",
    cursor: "pointer",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  classCardHeader: {
    height: 120,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    position: "relative",
  },
  classCardHeaderText: {
    fontSize: 15,
    fontFamily: fonts.bold,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  priceTag: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "#1B3A35",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  priceTagText: {
    fontSize: 11,
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  classCardBody: { padding: 16, gap: 8 },
  classCardTitle: {
    fontSize: 15,
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: "#1B3A35",
    lineHeight: 20,
  },
  classCardInstructorRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  classCardAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  classCardAvatarText: {
    fontSize: 8,
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  classCardInstructor: { fontSize: 12, fontFamily: fonts.regular, color: "#777777" },
  scheduleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  scheduleIcon: { fontSize: 12 },
  scheduleText: { fontSize: 12, fontFamily: fonts.regular, color: "#888888" },
  progressRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 2 },
  progressTrack: {
    flex: 1,
    height: 5,
    backgroundColor: "#E8F5F3",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: { height: "100%", backgroundColor: "#00B4A6", borderRadius: 3 },
  progressLabel: { fontSize: 11, fontFamily: fonts.regular, color: "#888888" },

  // ── How It Works ──────────────────────────────────────────────────────────────
  howSection: { backgroundColor: "#FFFFFF", paddingVertical: 96 },
  howInner: { alignItems: "center" },
  howTitle: {
    fontSize: 40,
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: "#1B3A35",
    letterSpacing: -0.8,
    lineHeight: 48,
    textAlign: "center",
    marginBottom: 12,
    maxWidth: 560,
  },
  howTitleMobile: { fontSize: 28, lineHeight: 36 },
  howSubtext: {
    fontSize: 16,
    fontFamily: fonts.regular,
    color: "#888888",
    textAlign: "center",
    marginBottom: 56,
    maxWidth: 480,
  },
  stepsWrap: {
    width: "100%",
    maxWidth: 720,
    position: "relative",
    gap: 40,
  },
  stepsWrapMobile: { maxWidth: "100%" as any },
  stepLine: {
    position: "absolute",
    left: 23,
    top: 56,
    bottom: 56,
    width: 2,
    backgroundColor: "#E8F5F3",
  },
  step: {
    flexDirection: "row",
    gap: 20,
    alignItems: "flex-start",
  },
  stepMobile: {},
  stepIconWrap: { position: "relative", flexShrink: 0 },
  stepIconBox: {
    width: 48,
    height: 48,
    backgroundColor: "#E8F5F3",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  stepIconEmoji: { fontSize: 22 },
  stepNumBadge: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    backgroundColor: "#1B3A35",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumText: {
    fontSize: 10,
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  stepContent: { flex: 1, paddingTop: 2 },
  stepEyebrow: {
    fontSize: 10,
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: "#00B4A6",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  stepTitle: {
    fontSize: 18,
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: "#1B3A35",
    lineHeight: 24,
    marginBottom: 8,
  },
  stepBody: {
    fontSize: 15,
    fontFamily: fonts.regular,
    color: "#666666",
    lineHeight: 24,
  },

  // ── Teach / Instructors ───────────────────────────────────────────────────────
  teachSection: { backgroundColor: "#1B3A35", paddingVertical: 96 },
  teachInner: {
    flexDirection: "row",
    gap: 80,
    alignItems: "center",
  },
  teachInnerMobile: { gap: 40 },
  teachPhotoWrap: { flex: 1, position: "relative", minWidth: 280 },
  teachPhotoWrapMobile: { flex: 0, width: "100%", height: 260 },
  teachPhotoGrad: {
    flex: 1,
    backgroundColor: "#0F2820",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 360,
  },
  teachPhotoEmoji: { fontSize: 80 },
  teachPhotoBadge: {
    position: "absolute",
    bottom: 20,
    left: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  teachPhotoBadgeLabel: {
    fontSize: 11,
    fontFamily: fonts.regular,
    color: "#888888",
    marginBottom: 2,
  },
  teachPhotoBadgeNum: {
    fontSize: 26,
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: "#00B4A6",
    lineHeight: 30,
  },
  teachPhotoBadgeSub: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#888888",
    marginTop: 2,
  },
  teachRight: { flex: 1, gap: 20 },
  teachEyebrow: {
    fontSize: 11,
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: "#00B4A6",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  teachHeadline: {
    fontSize: 44,
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: "#FFFFFF",
    lineHeight: 52,
    letterSpacing: -0.8,
  },
  teachHeadlineMobile: { fontSize: 30, lineHeight: 38 },
  teachBody: {
    fontSize: 16,
    fontFamily: fonts.regular,
    color: "rgba(255,255,255,0.7)",
    lineHeight: 26,
  },
  calcCard: {
    backgroundColor: "#0F2820",
    borderRadius: 12,
    padding: 24,
    gap: 16,
  },
  calcLabel: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "rgba(255,255,255,0.6)",
    letterSpacing: 0.5,
  },
  calcRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  calcRowLabel: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: "rgba(255,255,255,0.8)",
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 8,
    padding: 2,
  },
  stepperBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 6,
    cursor: "pointer",
  },
  stepperBtnText: {
    fontSize: 18,
    fontFamily: fonts.regular,
    color: "#FFFFFF",
    lineHeight: 20,
  },
  stepperVal: {
    width: 32,
    textAlign: "center",
    fontSize: 15,
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  calcDivider: { height: 1, backgroundColor: "rgba(255,255,255,0.1)" },
  calcPotentialLabel: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "rgba(255,255,255,0.6)",
  },
  calcAmount: {
    fontSize: 40,
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: -1,
  },
  applyBtn: {
    alignSelf: "flex-start",
    backgroundColor: "#00B4A6",
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 9999,
    cursor: "pointer",
  },
  applyBtnText: {
    fontSize: 15,
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: "#1B3A35",
  },

  // ── Testimonials ──────────────────────────────────────────────────────────────
  testimonialsSection: { backgroundColor: "#FFFFFF", paddingVertical: 96 },
  testimonialsInner: { alignItems: "center" },
  testimonialsTitleCentered: { textAlign: "center", marginTop: 12, marginBottom: 48 },
  testimonialsGrid: {
    flexDirection: "row",
    gap: 24,
    width: "100%",
  },
  testimonialsGridMobile: { flexDirection: "column" },
  testimonialCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E8E8E8",
    borderRadius: 12,
    padding: 28,
    gap: 16,
  },
  testimonialStars: { fontSize: 16, color: "#F59E0B", letterSpacing: 2 },
  testimonialQuote: {
    fontSize: 15,
    fontFamily: fonts.regular,
    color: "#555555",
    lineHeight: 24,
    fontStyle: "italic",
    flex: 1,
  },
  testimonialAuthorRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  testimonialAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  testimonialAvatarText: {
    fontSize: 13,
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  testimonialName: {
    fontSize: 14,
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: "#1B3A35",
  },
  testimonialRole: { fontSize: 12, fontFamily: fonts.regular, color: "#888888" },

  // ── Newsletter CTA ────────────────────────────────────────────────────────────
  ctaSection: { paddingHorizontal: 24, paddingVertical: 40 },
  ctaSectionDesktop: { paddingHorizontal: 40 },
  ctaCard: {
    backgroundColor: "#1B3A35",
    borderRadius: 16,
    padding: 40,
    alignItems: "center",
    gap: 16,
    maxWidth: 1060,
    alignSelf: "center",
    width: "100%",
  },
  ctaCardDesktop: { padding: 64 },
  ctaTitle: {
    fontSize: 36,
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
    letterSpacing: -0.5,
    lineHeight: 42,
  },
  ctaTitleMobile: { fontSize: 26, lineHeight: 34 },
  ctaSub: {
    fontSize: 15,
    fontFamily: fonts.regular,
    color: "rgba(255,255,255,0.7)",
    textAlign: "center",
    maxWidth: 480,
    lineHeight: 24,
  },
  subscribedText: {
    fontSize: 16,
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: "#00B4A6",
    textAlign: "center",
    paddingVertical: 8,
  },
  ctaInputRow: { flexDirection: "row", gap: 10, width: "100%", maxWidth: 500 },
  ctaInputRowMobile: { flexDirection: "column" },
  ctaInput: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 9999,
    paddingHorizontal: 20,
    paddingVertical: 14,
    fontSize: 14,
    fontFamily: fonts.regular,
    color: "#1B3A35",
  },
  ctaSubBtn: {
    backgroundColor: "#00B4A6",
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 9999,
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  },
  ctaSubBtnText: {
    fontSize: 14,
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  // ── Footer ────────────────────────────────────────────────────────────────────
  footer: { backgroundColor: "#1B3A35" },
  footerTop: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
    gap: 40,
  },
  footerTopDesktop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 80,
    maxWidth: 1140,
    alignSelf: "center",
    width: "100%",
    paddingHorizontal: 40,
  },
  footerBrand: { gap: 14 },
  footerBrandDesktop: { maxWidth: 280 },
  footerLogoRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  footerLogoText: {
    fontSize: 17,
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: -0.3,
  },
  footerTagline: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: "rgba(255,255,255,0.5)",
    lineHeight: 22,
  },
  footerCols: { flex: 1, flexDirection: "row", gap: 40 },
  footerCol: { flex: 1, gap: 12 },
  footerColHeading: {
    fontSize: 12,
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: "rgba(255,255,255,0.4)",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  footerLinkBtn: { cursor: "pointer" },
  footerLink: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: "rgba(255,255,255,0.65)",
    lineHeight: 26,
  },
  footerBottom: {
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 40,
    paddingVertical: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 12,
    maxWidth: 1140,
    alignSelf: "center",
    width: "100%",
  },
  footerCopy: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: "rgba(255,255,255,0.4)",
  },
  footerLegal: { flexDirection: "row", gap: 24 },
  footerLegalLink: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: "rgba(255,255,255,0.4)",
  },
});
