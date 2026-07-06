import { colors } from "../lib/colors";
import { ScrollView, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { TouchableOpacity } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

export default function WelcomeEmailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Nav */}
      <View style={styles.nav}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={colors.navy} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Welcome Email Preview</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Email frame */}
        <View style={styles.emailFrame}>
          {/* Email header bar */}
          <View style={styles.emailHeader}>
            <View style={styles.emailDots}>
              <View style={[styles.dot, { backgroundColor: colors.primaryTint }]} />
              <View style={[styles.dot, { backgroundColor: "#F0D080" }]} />
              <View style={[styles.dot, { backgroundColor: colors.primary }]} />
            </View>
            <Text style={styles.emailSubjectLine}>Welcome to Flocked 🌿 — Your first class awaits</Text>
          </View>

          {/* From / To line */}
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>From </Text>
            <Text style={styles.metaValue}>hello@flocked.app</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>To </Text>
            <Text style={styles.metaValue}>you@example.com</Text>
          </View>

          <View style={styles.emailDivider} />

          {/* Email body */}
          <View style={styles.emailBody}>
            {/* Logo */}
            <View style={styles.logoRow}>
              <View style={styles.logoMark}>
                <MaterialCommunityIcons name="leaf" size={20} color={colors.primary} />
              </View>
              <Text style={styles.logoText}>flocked</Text>
            </View>

            {/* Hero image placeholder */}
            <View style={styles.heroPlaceholder}>
              <MaterialCommunityIcons name="image-outline" size={36} color="#C0C0C0" />
              <Text style={styles.heroPlaceholderText}>Hero image</Text>
            </View>

            {/* Headline */}
            <Text style={styles.emailHeadline}>You're officially in.</Text>
            <Text style={styles.emailSubhead}>Welcome to Flocked</Text>

            {/* Body copy */}
            <Text style={styles.emailCopy}>
              Hey there,{"\n\n"}
              We're so excited to have you join Flocked — where live wellness meets community. Your first class is waiting and your instructor can't wait to meet you.{"\n\n"}
              Whether you're here for yoga, dance, or something completely new, we'll help you find your people.
            </Text>

            {/* CTA button */}
            <View style={styles.ctaWrap}>
              <View style={styles.ctaBtn}>
                <Text style={styles.ctaBtnText}>Browse classes</Text>
              </View>
            </View>

            {/* Feature blocks */}
            <View style={styles.featureGrid}>
              {[
                { icon: "video-outline", title: "Live & interactive", body: "Real-time classes with your instructor and classmates." },
                { icon: "account-check-outline", title: "Vetted teachers", body: "Every teacher is reviewed and approved by our team." },
                { icon: "calendar-month-outline", title: "Flexible schedule", body: "New classes every day across all times and timezones." },
              ].map((f, i) => (
                <View key={i} style={styles.featureBlock}>
                  <View style={styles.featureIconWrap}>
                    <MaterialCommunityIcons name={f.icon as never} size={20} color={colors.primary} />
                  </View>
                  <Text style={styles.featureTitle}>{f.title}</Text>
                  <Text style={styles.featureBody}>{f.body}</Text>
                </View>
              ))}
            </View>

            {/* Referral nudge */}
            <View style={styles.referralBox}>
              <Text style={styles.referralHeadline}>Bring a friend</Text>
              <Text style={styles.referralCopy}>
                Share your referral code and you both get a free class when they join.
              </Text>
              <View style={styles.referralCode}>
                <Text style={styles.referralCodeText}>FLOCKED-LSK7</Text>
              </View>
            </View>

            {/* Divider */}
            <View style={styles.emailDivider} />

            {/* Footer */}
            <View style={styles.emailFooter}>
              <View style={styles.socialRow}>
                {["instagram", "twitter", "facebook"].map((s) => (
                  <View key={s} style={styles.socialIcon}>
                    <MaterialCommunityIcons name={`${s}` as never} size={16} color="#888888" />
                  </View>
                ))}
              </View>
              <Text style={styles.footerText}>
                Flocked Inc. · 123 Wellness Ave · San Francisco, CA 94103
              </Text>
              <Text style={styles.footerLink}>Unsubscribe · Privacy Policy · Terms</Text>
            </View>
          </View>
        </View>

        {/* Design note */}
        <View style={styles.designNote}>
          <MaterialCommunityIcons name="information-outline" size={14} color={colors.primary} />
          <Text style={styles.designNoteText}>
            This is a design reference preview. The actual email is sent via your email service provider.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9F9F9",
  },
  nav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#EEEEEE",
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#F9F9F9",
    alignItems: "center",
    justifyContent: "center",
  },
  navTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.navy,
  },
  scroll: {
    flex: 1,
  },
  emailFrame: {
    margin: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EEEEEE",
    overflow: "hidden",
  },
  emailHeader: {
    backgroundColor: "#F9F9F9",
    borderBottomWidth: 1,
    borderBottomColor: "#EEEEEE",
    padding: 12,
    gap: 8,
  },
  emailDots: {
    flexDirection: "row",
    gap: 6,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  emailSubjectLine: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.navy,
  },
  metaRow: {
    flexDirection: "row",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F3F3",
  },
  metaLabel: {
    fontSize: 12,
    color: "#888888",
    minWidth: 36,
  },
  metaValue: {
    fontSize: 12,
    color: colors.navy,
    fontWeight: "500",
  },
  emailDivider: {
    height: 1,
    backgroundColor: "#EEEEEE",
    marginVertical: 16,
    marginHorizontal: 14,
  },
  emailBody: {
    padding: 20,
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  logoMark: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.primaryTint,
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.navy,
    letterSpacing: -0.3,
  },
  heroPlaceholder: {
    height: 140,
    backgroundColor: "#F9F9F9",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#EEEEEE",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginBottom: 20,
  },
  heroPlaceholderText: {
    fontSize: 12,
    color: "#C0C0C0",
  },
  emailHeadline: {
    fontSize: 26,
    fontWeight: "700",
    color: colors.navy,
    letterSpacing: -0.5,
  },
  emailSubhead: {
    fontSize: 15,
    color: colors.primary,
    fontWeight: "600",
    marginTop: 2,
    marginBottom: 14,
  },
  emailCopy: {
    fontSize: 14,
    color: "#444444",
    lineHeight: 22,
    marginBottom: 20,
  },
  ctaWrap: {
    alignItems: "center",
    marginBottom: 24,
  },
  ctaBtn: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: 32,
    paddingVertical: 13,
  },
  ctaBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  featureGrid: {
    gap: 10,
    marginBottom: 20,
  },
  featureBlock: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 12,
    backgroundColor: "#F9F9F9",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#EEEEEE",
  },
  featureIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: colors.primaryTint,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  featureTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.navy,
    marginBottom: 2,
    flex: 1,
  },
  featureBody: {
    fontSize: 12,
    color: "#888888",
    lineHeight: 18,
    position: "absolute",
    left: 60,
    right: 12,
    top: 28,
  },
  referralBox: {
    backgroundColor: colors.primaryTint,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D4E8CC",
    padding: 16,
    alignItems: "center",
    gap: 8,
  },
  referralHeadline: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.navy,
  },
  referralCopy: {
    fontSize: 12,
    color: "#888888",
    textAlign: "center",
    lineHeight: 18,
  },
  referralCode: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D4E8CC",
    paddingHorizontal: 20,
    paddingVertical: 8,
    marginTop: 4,
  },
  referralCodeText: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.primary,
    letterSpacing: 1.5,
  },
  emailFooter: {
    alignItems: "center",
    gap: 10,
  },
  socialRow: {
    flexDirection: "row",
    gap: 12,
  },
  socialIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F9F9F9",
    borderWidth: 1,
    borderColor: "#EEEEEE",
    alignItems: "center",
    justifyContent: "center",
  },
  footerText: {
    fontSize: 11,
    color: "#888888",
    textAlign: "center",
  },
  footerLink: {
    fontSize: 11,
    color: colors.primary,
    textAlign: "center",
  },
  designNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 12,
    backgroundColor: colors.primaryTint,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D4E8CC",
  },
  designNoteText: {
    flex: 1,
    fontSize: 12,
    color: "#007A70",
    lineHeight: 18,
  },
});
