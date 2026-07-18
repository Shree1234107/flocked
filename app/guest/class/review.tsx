import { colors } from "../../../lib/colors";
import { Alert, StyleSheet, TextInput, TouchableOpacity, View } from "react-native";
import { Text } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { AuthGate } from "../../../components/AuthGate";
import { RoleGuard } from "../../../components/RoleGuard";
import { submitReview } from "../../../lib/api";

const RATING_LABELS = ["", "Poor", "Fair", "Good", "Great", "Excellent"];

export default function ReviewScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { classId, instructorId, instructorName, classTitle } = useLocalSearchParams<{
    classId: string;
    instructorId: string;
    instructorName: string;
    classTitle: string;
  }>();

  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert("Select a rating", "Please tap a star before submitting.");
      return;
    }
    setSubmitting(true);
    try {
      await submitReview({
        classId: classId ?? "",
        instructorId: instructorId ?? "",
        rating,
        reviewText: reviewText.trim() || undefined,
      });
      router.replace("/guest");
    } catch (err) {
      Alert.alert("Oops", err instanceof Error ? err.message : "Failed to submit review.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkip = () => {
    router.replace("/guest");
  };

  return (
    <AuthGate>
      <RoleGuard requiredRole="guest">
        <View style={[styles.container, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 }]}>
          <View style={styles.header}>
            <TouchableOpacity onPress={handleSkip} style={styles.skipBtn} activeOpacity={0.7}>
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.hero}>
            <View style={styles.starCircle}>
              <MaterialCommunityIcons name="star" size={32} color="#F4A200" />
            </View>
            <Text style={styles.heroTitle}>How was your class?</Text>
            <Text style={styles.heroSubtitle}>
              {classTitle ? `"${classTitle}"` : "Your class"}
              {instructorName ? ` with ${instructorName}` : ""}
            </Text>
          </View>

          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((i) => (
              <TouchableOpacity key={i} onPress={() => setRating(i)} activeOpacity={0.7}>
                <MaterialCommunityIcons
                  name={i <= rating ? "star" : "star-outline"}
                  size={48}
                  color={i <= rating ? "#F4A200" : "#DDDDDD"}
                />
              </TouchableOpacity>
            ))}
          </View>

          {rating > 0 && (
            <Text style={styles.ratingLabel}>{RATING_LABELS[rating]}</Text>
          )}

          <View style={styles.inputWrap}>
            <TextInput
              style={styles.textInput}
              placeholder="Add a written review (optional)"
              placeholderTextColor="#BBBBBB"
              value={reviewText}
              onChangeText={setReviewText}
              multiline
              numberOfLines={4}
              maxLength={500}
              textAlignVertical="top"
            />
            <Text style={styles.charCount}>{reviewText.length}/500</Text>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.submitBtn, (rating === 0 || submitting) && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={submitting || rating === 0}
              activeOpacity={0.85}
            >
              <Text style={styles.submitBtnText}>
                {submitting ? "Submitting…" : "Submit Review"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleSkip} activeOpacity={0.7} style={styles.maybeLaterBtn}>
              <Text style={styles.maybeLaterText}>Maybe later</Text>
            </TouchableOpacity>
          </View>
        </View>
      </RoleGuard>
    </AuthGate>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cream,
    paddingHorizontal: 24,
    gap: 28,
  },
  header: {
    alignItems: "flex-end",
  },
  skipBtn: {
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  skipText: {
    fontSize: 15,
    color: "#888888",
    fontWeight: "500",
  },
  hero: {
    alignItems: "center",
    gap: 10,
    marginTop: 8,
  },
  starCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#FFF8E6",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: "700",
    color: colors.navy,
    letterSpacing: -0.3,
  },
  heroSubtitle: {
    fontSize: 14,
    color: "#888888",
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  starsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  ratingLabel: {
    textAlign: "center",
    fontSize: 15,
    fontWeight: "600",
    color: "#F4A200",
    marginTop: -16,
  },
  inputWrap: {
    gap: 6,
  },
  textInput: {
    backgroundColor: "#F9F9F9",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EEEEEE",
    padding: 14,
    fontSize: 14,
    color: colors.navy,
    minHeight: 100,
  },
  charCount: {
    fontSize: 12,
    color: "#BBBBBB",
    alignSelf: "flex-end",
  },
  actions: {
    gap: 10,
  },
  submitBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
  },
  submitBtnDisabled: {
    opacity: 0.45,
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  maybeLaterBtn: {
    paddingVertical: 10,
    alignItems: "center",
  },
  maybeLaterText: {
    fontSize: 14,
    color: "#888888",
    fontWeight: "500",
  },
});
