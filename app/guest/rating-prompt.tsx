import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Text } from "react-native-paper";
import { useLocalSearchParams, useRouter } from "expo-router";

import { AuthGate } from "../../components/AuthGate";
import { RoleGuard } from "../../components/RoleGuard";
import { getClass, submitReview } from "../../lib/api";
import { supabase } from "../../lib/supabase";

export default function RatingPromptScreen() {
  const { classId, instructorId, title, instructorName } = useLocalSearchParams<{
    classId: string;
    instructorId: string;
    title: string;
    instructorName: string;
  }>();
  const router = useRouter();

  const [rating, setRating] = useState(0);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [checking, setChecking] = useState(true);

  const classTitle = title ? decodeURIComponent(title) : "the class";
  const hostName = instructorName ? decodeURIComponent(instructorName) : "your instructor";

  const goHome = () => router.replace("/guest/(tabs)/index" as never);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [
          { data: { session } },
          cls,
        ] = await Promise.all([
          supabase.auth.getSession(),
          getClass(classId).catch(() => null),
        ]);
        const userId = session?.user?.id;
        const alreadyReviewed =
          userId && cls?.reviews?.some((r) => r.student_id === userId);
        if (active && alreadyReviewed) {
          router.replace("/guest/(tabs)/index" as never);
          return;
        }
      } catch {
        // proceed to show form
      } finally {
        if (active) setChecking(false);
      }
    })();
    return () => { active = false; };
  }, [classId]);

  const handleSubmit = async () => {
    if (rating === 0 || !classId || !instructorId) return;
    setSubmitting(true);
    try {
      await submitReview({
        classId,
        instructorId,
        rating,
        reviewText: note.trim() || undefined,
      });
      setDone(true);
      setTimeout(goHome, 1500);
    } catch {
      setSubmitting(false);
    }
  };

  return (
    <AuthGate>
      <RoleGuard requiredRole="guest">
        <View style={styles.overlay}>
          {checking ? (
            <ActivityIndicator color="#FFFFFF" size="large" />
          ) : done ? (
            <View style={styles.card}>
              <Text style={styles.successText}>Thanks for your feedback! 🎉</Text>
            </View>
          ) : (
            <View style={styles.card}>
              <Text style={styles.heading}>How was {classTitle}?</Text>
              <Text style={styles.subheading}>with {hostName}</Text>

              {/* Stars */}
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity
                    key={star}
                    onPress={() => setRating(star)}
                    activeOpacity={0.7}
                    style={styles.starBtn}
                  >
                    <Text style={[styles.star, star <= rating && styles.starFilled]}>
                      {star <= rating ? "★" : "☆"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Note */}
              <TextInput
                style={styles.noteInput}
                placeholder={`Leave a note for ${hostName}`}
                placeholderTextColor="#B0B0B0"
                value={note}
                onChangeText={setNote}
                multiline
                numberOfLines={3}
                maxLength={500}
                textAlignVertical="top"
              />

              {/* Submit */}
              <TouchableOpacity
                style={[
                  styles.submitBtn,
                  (rating === 0 || submitting) && styles.submitBtnDisabled,
                ]}
                onPress={handleSubmit}
                activeOpacity={0.8}
                disabled={rating === 0 || submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.submitText}>Submit</Text>
                )}
              </TouchableOpacity>

              {/* Skip */}
              <TouchableOpacity style={styles.skipBtn} onPress={goHome} activeOpacity={0.7}>
                <Text style={styles.skipText}>Skip</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </RoleGuard>
    </AuthGate>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 32,
    width: "100%",
    maxWidth: 400,
    alignItems: "center",
    gap: 16,
  },
  heading: {
    fontSize: 22,
    fontWeight: "700",
    color: "#0F0F0F",
    textAlign: "center",
  },
  subheading: {
    fontSize: 14,
    color: "#6B6B6B",
    textAlign: "center",
    marginTop: -8,
  },
  starsRow: {
    flexDirection: "row",
    gap: 4,
    marginVertical: 4,
  },
  starBtn: { padding: 4 },
  star: {
    fontSize: 36,
    color: "#D1D5DB",
    lineHeight: 44,
  },
  starFilled: {
    color: "#F59E0B",
  },
  noteInput: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#E8E8E8",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: "#0F0F0F",
    minHeight: 80,
  },
  submitBtn: {
    backgroundColor: "#00B4A6",
    borderRadius: 8,
    paddingVertical: 14,
    width: "100%",
    alignItems: "center",
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitText: { fontSize: 16, fontWeight: "700", color: "#FFFFFF" },
  skipBtn: { paddingVertical: 8 },
  skipText: { fontSize: 14, color: "#9CA3AF" },
  successText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0F0F0F",
    textAlign: "center",
    paddingVertical: 16,
  },
});
