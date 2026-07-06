import { colors } from "../lib/colors";
import { Alert, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { Text } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useState } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";

const FAQ_ITEMS = [
  {
    question: "What is Flocked?",
    answer:
      "Flocked is a live community learning app where instructors run real-time classes and students join from anywhere. Classes are kept small so you actually get to interact with your instructor.",
  },
  {
    question: "How do I join a class?",
    answer:
      'Find a class in the Discover tab, tap it to see the details, then tap "Join Class." It will appear in your profile under Classes You\'ve Joined.',
  },
  {
    question: "How do I become an instructor?",
    answer:
      "Tap the Instructor button on the login screen and submit a short application. Our team reviews every submission personally and will reach out to schedule a quick interview.",
  },
  {
    question: "Are classes free?",
    answer:
      "Classes are free during our launch period. Instructor payouts are coming soon — we'll notify everyone before any pricing changes go live.",
  },
  {
    question: "How do I contact support?",
    answer:
      "Tap the Contact Us button below or email us at hello@flocked.app. We typically reply within 24 hours.",
  },
];

export default function FAQScreen() {
  const insets = useSafeAreaInsets();
  const [expanded, setExpanded] = useState<number | null>(null);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
    >
      {/* Hero */}
      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <MaterialCommunityIcons name="help-circle-outline" size={30} color={colors.primary} />
        </View>
        <Text style={styles.heroTitle}>FAQ & Help</Text>
        <Text style={styles.heroSubtitle}>
          Common questions answered. Didn't find yours? Contact us below.
        </Text>
      </View>

      {/* Accordion */}
      <View style={styles.accordionList}>
        {FAQ_ITEMS.map((item, i) => {
          const isOpen = expanded === i;
          return (
            <TouchableOpacity
              key={i}
              style={[styles.accordionItem, isOpen && styles.accordionItemOpen]}
              onPress={() => setExpanded(isOpen ? null : i)}
              activeOpacity={0.75}
            >
              <View style={styles.accordionHeader}>
                <Text style={[styles.accordionQ, isOpen && styles.accordionQOpen]}>
                  {item.question}
                </Text>
                <MaterialCommunityIcons
                  name={isOpen ? "chevron-up" : "chevron-down"}
                  size={18}
                  color={isOpen ? colors.primary : "#C0C0C0"}
                />
              </View>
              {isOpen && (
                <Text style={styles.accordionA}>{item.answer}</Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Contact CTA */}
      <View style={styles.ctaSection}>
        <Text style={styles.ctaText}>Still have a question?</Text>
        <TouchableOpacity
          style={styles.ctaBtn}
          onPress={() => Alert.alert("Contact Us", "Email us at hello@flocked.app")}
          activeOpacity={0.85}
        >
          <MaterialCommunityIcons name="email-outline" size={16} color="#FFFFFF" />
          <Text style={styles.ctaBtnText}>Contact Us</Text>
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
    marginBottom: 16,
  },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primaryTint,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.navy,
    letterSpacing: -0.3,
  },
  heroSubtitle: {
    fontSize: 14,
    color: "#888888",
    textAlign: "center",
    lineHeight: 20,
  },
  accordionList: {
    marginHorizontal: 16,
    gap: 8,
    marginBottom: 24,
  },
  accordionItem: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EEEEEE",
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  accordionItemOpen: {
    borderColor: colors.primary,
    backgroundColor: "#FAFCFA",
  },
  accordionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  accordionQ: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: colors.navy,
    lineHeight: 20,
  },
  accordionQOpen: {
    color: colors.primary,
  },
  accordionA: {
    fontSize: 14,
    color: "#888888",
    lineHeight: 22,
    paddingTop: 2,
  },
  ctaSection: {
    marginHorizontal: 16,
    alignItems: "center",
    gap: 12,
  },
  ctaText: {
    fontSize: 14,
    color: "#888888",
    fontWeight: "500",
  },
  ctaBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 28,
  },
  ctaBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
