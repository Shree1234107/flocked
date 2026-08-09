import { colors } from "../lib/colors";
import { useEffect, useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Text, ActivityIndicator } from "react-native-paper";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { useAuth } from "../lib/auth";
import { applyToTeach, getMyInstructorApplication } from "../lib/api";
import { fonts } from "../lib/fonts";

const CATEGORIES = ["Yoga", "Dance", "Chess", "Piano", "Cooking", "Tutoring", "Other"] as const;

export default function InstructorApplyScreen() {
  const router = useRouter();
  const { session } = useAuth();

  const [isReapply, setIsReapply] = useState(false);
  const [checking, setChecking] = useState(true);

  // Form state
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState(session?.user?.email ?? "");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [experience, setExperience] = useState("");
  const [whyTeach, setWhyTeach] = useState("");
  const [availability, setAvailability] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Pre-fill email from session
    if (session?.user?.email) setEmail(session.user.email);

    // Check if this is a reapplication (rejected status)
    getMyInstructorApplication()
      .then((app) => {
        if (app?.status === "rejected") setIsReapply(true);
      })
      .catch(() => {})
      .finally(() => setChecking(false));
  }, [session]);

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const handleSubmit = async () => {
    if (!fullName.trim()) {
      Alert.alert("Required", "Please enter your full name.");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      Alert.alert("Required", "Please enter a valid email address.");
      return;
    }
    if (selectedCategories.length === 0) {
      Alert.alert("Required", "Please select at least one category.");
      return;
    }
    if (experience.trim().length < 10) {
      Alert.alert("Required", "Please tell us a bit more about your experience (at least 10 characters).");
      return;
    }
    if (whyTeach.trim().length < 10) {
      Alert.alert("Required", "Please tell us why you want to teach (at least 10 characters).");
      return;
    }

    setSubmitting(true);
    try {
      await applyToTeach({
        fullName: fullName.trim(),
        email: email.trim(),
        categories: selectedCategories,
        experience: experience.trim(),
        whyTeach: whyTeach.trim(),
        availability: availability.trim() || undefined,
      });
      router.replace("/instructor-pending");
    } catch (err) {
      Alert.alert("Oops", err instanceof Error ? err.message : "Submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (checking) {
    return (
      <View style={s.centered}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={s.header}>
          <Image
            source={require("../assets/logo.png")}
            style={s.logoImage}
          />
          {isReapply && (
            <View style={s.reapplyBanner}>
              <MaterialCommunityIcons name="information-outline" size={15} color="#92400E" />
              <Text style={s.reapplyBannerText}>
                Your previous application wasn't approved. You're welcome to apply again.
              </Text>
            </View>
          )}
          <Text style={s.title}>Apply to teach on Flocked</Text>
          <Text style={s.subtitle}>
            Tell us about yourself. We personally review every application and schedule a quick call before you start teaching.
          </Text>
        </View>

        {/* Full name */}
        <View style={s.field}>
          <Text style={s.label}>Full name</Text>
          <TextInput
            style={s.input}
            value={fullName}
            onChangeText={setFullName}
            placeholder="Jane Smith"
            placeholderTextColor="#B0B0B0"
            autoCapitalize="words"
          />
        </View>

        {/* Email */}
        <View style={s.field}>
          <Text style={s.label}>Email</Text>
          <TextInput
            style={s.input}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor="#B0B0B0"
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        {/* Categories */}
        <View style={s.field}>
          <Text style={s.label}>What do you want to teach?</Text>
          <Text style={s.fieldHint}>Select all that apply</Text>
          <View style={s.pillGrid}>
            {CATEGORIES.map((cat) => {
              const selected = selectedCategories.includes(cat);
              return (
                <TouchableOpacity
                  key={cat}
                  style={[s.categoryPill, selected && s.categoryPillSelected] as any}
                  onPress={() => toggleCategory(cat)}
                  activeOpacity={0.7}
                >
                  <Text style={[s.categoryPillText, selected && s.categoryPillTextSelected]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Experience */}
        <View style={s.field}>
          <Text style={s.label}>Your background</Text>
          <Text style={s.fieldHint}>
            Tell us about your background teaching or practicing this skill
          </Text>
          <TextInput
            style={[s.input, s.textarea]}
            value={experience}
            onChangeText={setExperience}
            placeholder="I've been teaching yoga for 5 years, completed my 200-hour RYT certification in 2019..."
            placeholderTextColor="#B0B0B0"
            multiline
            numberOfLines={5}
            textAlignVertical="top"
          />
        </View>

        {/* Why teach */}
        <View style={s.field}>
          <Text style={s.label}>Why do you want to teach on Flocked?</Text>
          <TextInput
            style={[s.input, s.textarea]}
            value={whyTeach}
            onChangeText={setWhyTeach}
            placeholder="I love the idea of small groups where I can actually connect with students..."
            placeholderTextColor="#B0B0B0"
            multiline
            numberOfLines={5}
            textAlignVertical="top"
          />
        </View>

        {/* Availability */}
        <View style={s.field}>
          <Text style={s.label}>Availability</Text>
          <Text style={s.fieldHint}>What days/times work best for you to teach? (optional)</Text>
          <TextInput
            style={s.input}
            value={availability}
            onChangeText={setAvailability}
            placeholder="Weekday mornings, weekend afternoons..."
            placeholderTextColor="#B0B0B0"
          />
        </View>

        <TouchableOpacity
          style={[s.submitBtn, submitting && s.submitBtnDisabled] as any}
          onPress={handleSubmit}
          disabled={submitting}
          activeOpacity={0.85}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={s.submitBtnText}>
              {isReapply ? "Submit new application →" : "Submit application →"}
            </Text>
          )}
        </TouchableOpacity>

        <Text style={s.footerNote}>
          By applying, you agree to Flocked's instructor standards. We'll reach out within 2–3 days.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.cream },
  scroll: {
    maxWidth: 600,
    alignSelf: "center",
    width: "100%",
    paddingHorizontal: 24,
    paddingVertical: 48,
    gap: 24,
  },

  header: { gap: 12 },
  logoImage: {
    width: 40,
    height: 40,
    marginBottom: 4,
  },
  reapplyBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#FEF3C7",
    borderRadius: 10,
    padding: 12,
  },
  reapplyBannerText: {
    flex: 1,
    fontSize: 13,
    fontFamily: fonts.regular,
    color: "#92400E",
    lineHeight: 19,
  },
  title: {
    fontSize: 28,
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: colors.navy,
    letterSpacing: -0.4,
    lineHeight: 34,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: fonts.regular,
    color: "#6B6B6B",
    lineHeight: 23,
  },

  field: { gap: 6 },
  label: {
    fontSize: 14,
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: colors.navy,
  },
  fieldHint: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#888888",
    marginTop: -2,
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#E8E8E8",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    fontFamily: fonts.regular,
    color: colors.navy,
  },
  textarea: {
    minHeight: 110,
    paddingTop: 13,
  },

  pillGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 2 },
  categoryPill: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 9999,
    borderWidth: 1.5,
    borderColor: "#E8E8E8",
    backgroundColor: "#FFFFFF",
    cursor: "pointer",
  },
  categoryPillSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryPillText: {
    fontSize: 13,
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: "#6B6B6B",
  },
  categoryPillTextSelected: { color: "#FFFFFF" },

  submitBtn: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    marginTop: 8,
    cursor: "pointer",
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: {
    fontSize: 16,
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  footerNote: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#AAAAAA",
    textAlign: "center",
    lineHeight: 18,
  },
});
