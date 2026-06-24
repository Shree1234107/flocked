import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { Text } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

const STEPS = [
  {
    number: "1",
    icon: "clipboard-text-outline" as const,
    title: "Apply",
    description:
      "Submit a short application to join as an instructor. We review every submission personally to keep the quality of classes high.",
    color: "#87A878",
    bg: "#F0F5EE",
  },
  {
    number: "2",
    icon: "calendar-plus" as const,
    title: "Schedule",
    description:
      "Create your first live class. Set the category, time, duration, and how many students you'll accept per session.",
    color: "#94B4D2",
    bg: "#EEF3F8",
  },
  {
    number: "3",
    icon: "video-outline" as const,
    title: "Go Live",
    description:
      "At class time, start your session and teach. Students join in real time and interact with you live.",
    color: "#87A878",
    bg: "#F0F5EE",
  },
  {
    number: "4",
    icon: "cash-multiple" as const,
    title: "Get Paid",
    description:
      "Once payments launch, you'll receive automatic payouts on the 1st of every month. Currently in the works — coming very soon.",
    color: "#C0C0C0",
    bg: "#F9F9F9",
    comingSoon: true,
  },
];

export default function HowItWorksScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
    >
      {/* Hero */}
      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <MaterialCommunityIcons name="school-outline" size={30} color="#87A878" />
        </View>
        <Text style={styles.heroTitle}>How It Works</Text>
        <Text style={styles.heroSubtitle}>
          Four simple steps from application to paid instructor.
        </Text>
      </View>

      {/* Steps */}
      <View style={styles.stepList}>
        {STEPS.map((step, i) => (
          <View key={i} style={styles.stepWrapper}>
            {i < STEPS.length - 1 && <View style={styles.connector} />}

            <View style={styles.stepRow}>
              <View style={[styles.iconCircle, { backgroundColor: step.bg, borderColor: step.color }]}>
                <MaterialCommunityIcons
                  name={step.icon}
                  size={24}
                  color={step.comingSoon ? "#C0C0C0" : step.color}
                />
              </View>

              <View style={styles.stepContent}>
                <View style={styles.stepTitleRow}>
                  <Text style={[styles.stepTitle, step.comingSoon && styles.stepTitleMuted]}>
                    {step.title}
                  </Text>
                  {step.comingSoon && (
                    <View style={styles.soonBadge}>
                      <Text style={styles.soonBadgeText}>Coming soon</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.stepDesc, step.comingSoon && styles.stepDescMuted]}>
                  {step.description}
                </Text>
              </View>
            </View>
          </View>
        ))}
      </View>

      {/* CTA */}
      <View style={styles.ctaSection}>
        <Text style={styles.ctaPrompt}>Ready to start teaching?</Text>
        <TouchableOpacity
          style={styles.ctaBtn}
          onPress={() => router.push("/login/instructor")}
          activeOpacity={0.85}
        >
          <Text style={styles.ctaBtnText}>Apply as Instructor</Text>
          <MaterialCommunityIcons name="arrow-right" size={16} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  content: {
    gap: 0,
  },
  hero: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 24,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#EEEEEE",
    marginBottom: 8,
  },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#F0F5EE",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#2C2C2C",
    letterSpacing: -0.3,
  },
  heroSubtitle: {
    fontSize: 14,
    color: "#888888",
    textAlign: "center",
    lineHeight: 20,
  },
  stepList: {
    paddingHorizontal: 24,
    paddingTop: 24,
    gap: 0,
  },
  stepWrapper: {
    position: "relative",
    paddingBottom: 28,
  },
  connector: {
    position: "absolute",
    left: 23,
    top: 52,
    bottom: 0,
    width: 1,
    backgroundColor: "#EEEEEE",
    zIndex: 0,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 16,
    zIndex: 1,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    flexShrink: 0,
  },
  stepContent: {
    flex: 1,
    paddingTop: 8,
    gap: 5,
  },
  stepTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#2C2C2C",
    letterSpacing: -0.1,
  },
  stepTitleMuted: {
    color: "#888888",
  },
  soonBadge: {
    backgroundColor: "#F9F9F9",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: "#EEEEEE",
  },
  soonBadgeText: {
    fontSize: 10,
    fontWeight: "500",
    color: "#888888",
  },
  stepDesc: {
    fontSize: 14,
    color: "#888888",
    lineHeight: 21,
  },
  stepDescMuted: {
    color: "#C0C0C0",
  },
  ctaSection: {
    marginHorizontal: 24,
    marginTop: 8,
    alignItems: "center",
    gap: 12,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: "#EEEEEE",
  },
  ctaPrompt: {
    fontSize: 14,
    color: "#888888",
    fontWeight: "500",
  },
  ctaBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#87A878",
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 24,
  },
  ctaBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
