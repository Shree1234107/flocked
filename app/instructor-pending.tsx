import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { Text, ActivityIndicator } from "react-native-paper";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { getMyInstructorApplication } from "../lib/api";
import { type InstructorApplication } from "../lib/types";
import { fonts } from "../lib/fonts";

const ADMIN_EMAIL = "shreevegesna@gmail.com";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default function InstructorPendingScreen() {
  const router = useRouter();
  const [app, setApp] = useState<InstructorApplication | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyInstructorApplication()
      .then(setApp)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <View style={s.centered}>
        <ActivityIndicator color="#00B4A6" />
      </View>
    );
  }

  // If somehow they land here rejected, send them to reapply
  if (app?.status === "rejected") {
    router.replace("/instructor-apply");
    return null;
  }

  // If approved, send to host dashboard
  if (app?.status === "approved") {
    router.replace("/host");
    return null;
  }

  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={s.scroll}
      showsVerticalScrollIndicator={false}
    >
      {/* Checkmark */}
      <View style={s.iconCircle}>
        <MaterialCommunityIcons name="check-bold" size={40} color="#00B4A6" />
      </View>

      <Text style={s.title}>Application received!</Text>
      <Text style={s.body}>
        We'll reach out within 2–3 days to schedule a quick intro call. Keep an eye on your email.
      </Text>

      {/* Summary card */}
      {app && (
        <View style={s.summaryCard}>
          <Text style={s.summaryTitle}>Your application</Text>

          {app.categories.length > 0 && (
            <View style={s.summaryRow}>
              <Text style={s.summaryLabel}>What you'll teach</Text>
              <View style={s.pillRow}>
                {app.categories.map((cat) => (
                  <View key={cat} style={s.summaryPill}>
                    <Text style={s.summaryPillText}>{cat}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          <View style={s.summaryRow}>
            <Text style={s.summaryLabel}>Submitted</Text>
            <Text style={s.summaryValue}>{formatDate(app.submitted_at)}</Text>
          </View>

          <View style={s.summaryRow}>
            <Text style={s.summaryLabel}>Status</Text>
            <View style={s.statusBadge}>
              <View style={s.statusDot} />
              <Text style={s.statusText}>Under review</Text>
            </View>
          </View>
        </View>
      )}

      {/* Contact */}
      <View style={s.contactCard}>
        <MaterialCommunityIcons name="email-outline" size={18} color="#00B4A6" />
        <Text style={s.contactText}>
          Questions?{" "}
          <Text style={s.contactEmail}>Email us at {ADMIN_EMAIL}</Text>
        </Text>
      </View>

      {/* Back to landing */}
      <TouchableOpacity
        style={s.backBtn as any}
        onPress={() => router.replace("/")}
        activeOpacity={0.7}
      >
        <Text style={s.backBtnText}>← Back to Flocked</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FDFBF7" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#FDFBF7" },
  scroll: {
    maxWidth: 560,
    alignSelf: "center",
    width: "100%",
    paddingHorizontal: 24,
    paddingVertical: 64,
    alignItems: "center",
    gap: 20,
  },

  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#E8F5F3",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  title: {
    fontSize: 30,
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: "#1A1A1A",
    textAlign: "center",
    letterSpacing: -0.4,
  },
  body: {
    fontSize: 16,
    fontFamily: fonts.regular,
    color: "#6B6B6B",
    textAlign: "center",
    lineHeight: 26,
    maxWidth: 420,
  },

  summaryCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E8E8E8",
    padding: 20,
    gap: 14,
    marginTop: 8,
  },
  summaryTitle: {
    fontSize: 13,
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: "#888888",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  summaryRow: { gap: 4 },
  summaryLabel: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#AAAAAA",
  },
  summaryValue: {
    fontSize: 15,
    fontFamily: fonts.regular,
    color: "#1A1A1A",
  },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  summaryPill: {
    backgroundColor: "#E8F5F3",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  summaryPillText: {
    fontSize: 12,
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: "#007A70",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#F59E0B",
  },
  statusText: {
    fontSize: 13,
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: "#92400E",
  },

  contactCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "#F0FAF9",
    borderRadius: 12,
    padding: 16,
    width: "100%",
  },
  contactText: {
    flex: 1,
    fontSize: 14,
    fontFamily: fonts.regular,
    color: "#555555",
    lineHeight: 22,
  },
  contactEmail: {
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: "#007A70",
  },

  backBtn: { paddingVertical: 12, cursor: "pointer" },
  backBtnText: {
    fontSize: 14,
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: "#00B4A6",
  },
});
