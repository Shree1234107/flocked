import { colors } from "../lib/colors";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { Text } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useState } from "react";

const LANGUAGES = [
  { code: "en", label: "English", region: "United States" },
  { code: "es", label: "Español", region: "España" },
  { code: "fr", label: "Français", region: "France" },
  { code: "de", label: "Deutsch", region: "Deutschland" },
  { code: "pt", label: "Português", region: "Brasil" },
  { code: "ja", label: "日本語", region: "日本" },
  { code: "ko", label: "한국어", region: "대한민국" },
  { code: "zh", label: "中文", region: "中国" },
];

const TIMEZONES = [
  "Pacific Time (PT)",
  "Mountain Time (MT)",
  "Central Time (CT)",
  "Eastern Time (ET)",
  "Greenwich Mean Time (GMT)",
  "Central European Time (CET)",
  "Japan Standard Time (JST)",
  "Australian Eastern Time (AET)",
];

export default function LanguageScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [selectedLang, setSelectedLang] = useState("en");
  const [selectedTz, setSelectedTz] = useState("Pacific Time (PT)");

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Nav */}
      <View style={styles.nav}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={colors.navy} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Language & Region</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Language section */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Language</Text>
          <View style={styles.card}>
            {LANGUAGES.map((lang, i) => (
              <TouchableOpacity
                key={lang.code}
                style={[
                  styles.row,
                  i < LANGUAGES.length - 1 && styles.rowBorder,
                ]}
                onPress={() => setSelectedLang(lang.code)}
                activeOpacity={0.7}
              >
                <View style={styles.rowLeft}>
                  <Text style={styles.rowLabel}>{lang.label}</Text>
                  <Text style={styles.rowSub}>{lang.region}</Text>
                </View>
                {selectedLang === lang.code && (
                  <MaterialCommunityIcons name="check-circle" size={20} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Timezone section */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Time Zone</Text>
          <View style={styles.card}>
            {TIMEZONES.map((tz, i) => (
              <TouchableOpacity
                key={tz}
                style={[
                  styles.row,
                  i < TIMEZONES.length - 1 && styles.rowBorder,
                ]}
                onPress={() => setSelectedTz(tz)}
                activeOpacity={0.7}
              >
                <Text style={styles.rowLabel}>{tz}</Text>
                {selectedTz === tz && (
                  <MaterialCommunityIcons name="check-circle" size={20} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Region note */}
        <View style={styles.noteRow}>
          <MaterialCommunityIcons name="information-outline" size={14} color={colors.primary} />
          <Text style={styles.noteText}>
            Class times are displayed in your selected time zone. Changes take effect immediately.
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
  section: {
    paddingTop: 20,
    paddingHorizontal: 16,
    gap: 8,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: "600",
    color: "#888888",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    paddingHorizontal: 4,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EEEEEE",
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#F3F3F3",
  },
  rowLeft: {
    gap: 2,
  },
  rowLabel: {
    fontSize: 15,
    color: colors.navy,
    fontWeight: "400",
  },
  rowSub: {
    fontSize: 12,
    color: "#888888",
  },
  noteRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    margin: 16,
    marginTop: 12,
    padding: 12,
    backgroundColor: colors.primaryTint,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D4E8CC",
  },
  noteText: {
    flex: 1,
    fontSize: 12,
    color: "#007A70",
    lineHeight: 18,
  },
});
