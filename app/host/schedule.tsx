import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { ActivityIndicator, Text, TextInput } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { AuthGate } from "../../components/AuthGate";
import { RoleGuard } from "../../components/RoleGuard";
import { createClass } from "../../lib/api";

const CATEGORIES = ["Yoga", "Dance", "Tutoring"] as const;
const DURATIONS = [30, 45, 60, 90] as const;

const CATEGORY_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  Yoga: { bg: "#F0F5EE", border: "#87A878", text: "#4A7A40" },
  Dance: { bg: "#FDF0F2", border: "#F4B8C1", text: "#A04060" },
  Tutoring: { bg: "#EEF3F8", border: "#94B4D2", text: "#3A5F80" },
};

function getDateChips(): Date[] {
  return Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    d.setHours(0, 0, 0, 0);
    return d;
  });
}

const DAYS_ABB = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS_ABB = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function chipLabel(d: Date) {
  return {
    day: DAYS_ABB[d.getDay()],
    num: d.getDate().toString(),
    month: MONTHS_ABB[d.getMonth()],
  };
}

const TIME_SLOTS: string[] = [];
for (let h = 6; h <= 21; h++) {
  for (let m = 0; m < 60; m += 30) {
    if (h === 21 && m > 0) break;
    TIME_SLOTS.push(`${h}:${m.toString().padStart(2, "0")}`);
  }
}

function fmtTime(slot: string): string {
  const [h, m] = slot.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${m.toString().padStart(2, "0")} ${ampm}`;
}

const DATE_CHIPS = getDateChips();

export default function ScheduleClassScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<typeof CATEGORIES[number]>("Yoga");
  const [selectedDate, setSelectedDate] = useState<Date>(DATE_CHIPS[0]);
  const [selectedTime, setSelectedTime] = useState<string>("9:00");
  const [duration, setDuration] = useState<number>(60);
  const [maxStudents, setMaxStudents] = useState<number>(10);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert("Oops", "Please enter a class title.");
      return;
    }
    const [h, m] = selectedTime.split(":").map(Number);
    const d = new Date(selectedDate);
    d.setHours(h, m, 0, 0);
    const scheduledAt = d.toISOString();

    setSubmitting(true);
    try {
      await createClass({
        title: title.trim(),
        category,
        scheduledAt,
        durationMinutes: duration,
        maxStudents,
        description: description.trim() || undefined,
      });
      Alert.alert(
        "Class Scheduled",
        "Your class has been added to the calendar and students can now join.",
        [{ text: "Done", onPress: () => router.back() }]
      );
    } catch (err) {
      Alert.alert("Oops", err instanceof Error ? err.message : "Failed to schedule class.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthGate>
      <RoleGuard requiredRole="host">
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <ScrollView
            style={styles.flex}
            contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
            keyboardShouldPersistTaps="handled"
          >
            {/* Title */}
            <View style={styles.section}>
              <Text style={styles.label}>Class Title</Text>
              <TextInput
                value={title}
                onChangeText={setTitle}
                mode="outlined"
                placeholder="e.g. Beginner Morning Yoga"
                style={styles.textInput}
                outlineColor="#EEEEEE"
                activeOutlineColor="#87A878"
                textColor="#2C2C2C"
                theme={{ colors: { onSurfaceVariant: "#888888", background: "#F9F9F9" } }}
                maxLength={100}
              />
            </View>

            {/* Category */}
            <View style={styles.section}>
              <Text style={styles.label}>Category</Text>
              <View style={styles.chipRow}>
                {CATEGORIES.map((cat) => {
                  const colors = CATEGORY_COLORS[cat];
                  const selected = category === cat;
                  return (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.categoryChip,
                        selected && { backgroundColor: colors.bg, borderColor: colors.border },
                      ]}
                      onPress={() => setCategory(cat)}
                      activeOpacity={0.75}
                    >
                      <Text
                        style={[
                          styles.categoryChipText,
                          selected && { color: colors.text, fontWeight: "600" },
                        ]}
                      >
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Date */}
            <View style={styles.section}>
              <Text style={styles.label}>Date</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollRow}
              >
                {DATE_CHIPS.map((date, i) => {
                  const { day, num, month } = chipLabel(date);
                  const selected = selectedDate.toDateString() === date.toDateString();
                  return (
                    <TouchableOpacity
                      key={i}
                      style={[styles.dateChip, selected && styles.dateChipSelected]}
                      onPress={() => setSelectedDate(date)}
                      activeOpacity={0.75}
                    >
                      <Text style={[styles.dateChipTop, selected && styles.dateChipTopSelected]}>{day}</Text>
                      <Text style={[styles.dateChipNum, selected && styles.dateChipNumSelected]}>{num}</Text>
                      <Text style={[styles.dateChipTop, selected && styles.dateChipTopSelected]}>{month}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Time */}
            <View style={styles.section}>
              <Text style={styles.label}>Time</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollRow}
              >
                {TIME_SLOTS.map((slot) => {
                  const selected = selectedTime === slot;
                  return (
                    <TouchableOpacity
                      key={slot}
                      style={[styles.timeChip, selected && styles.timeChipSelected]}
                      onPress={() => setSelectedTime(slot)}
                      activeOpacity={0.75}
                    >
                      <Text style={[styles.timeChipText, selected && styles.timeChipTextSelected]}>
                        {fmtTime(slot)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Duration */}
            <View style={styles.section}>
              <Text style={styles.label}>Duration</Text>
              <View style={styles.chipRow}>
                {DURATIONS.map((d) => (
                  <TouchableOpacity
                    key={d}
                    style={[styles.durationChip, duration === d && styles.durationChipSelected]}
                    onPress={() => setDuration(d)}
                    activeOpacity={0.75}
                  >
                    <Text
                      style={[
                        styles.durationChipText,
                        duration === d && styles.durationChipTextSelected,
                      ]}
                    >
                      {d}m
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Max students */}
            <View style={styles.section}>
              <Text style={styles.label}>Max Students</Text>
              <View style={styles.counterRow}>
                <TouchableOpacity
                  style={styles.counterBtn}
                  onPress={() => setMaxStudents((p) => Math.max(1, p - 1))}
                  activeOpacity={0.75}
                >
                  <Text style={styles.counterBtnText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.counterValue}>{maxStudents}</Text>
                <TouchableOpacity
                  style={styles.counterBtn}
                  onPress={() => setMaxStudents((p) => Math.min(50, p + 1))}
                  activeOpacity={0.75}
                >
                  <Text style={styles.counterBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Description */}
            <View style={styles.section}>
              <Text style={styles.label}>
                Description{" "}
                <Text style={styles.optional}>(optional)</Text>
              </Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                mode="outlined"
                placeholder="What will students learn? What should they bring?"
                multiline
                numberOfLines={3}
                style={styles.textInput}
                outlineColor="#EEEEEE"
                activeOutlineColor="#87A878"
                textColor="#2C2C2C"
                theme={{ colors: { onSurfaceVariant: "#888888", background: "#F9F9F9" } }}
                maxLength={500}
              />
            </View>

            {/* Submit */}
            <TouchableOpacity
              style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={submitting}
              activeOpacity={0.85}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.submitBtnText}>Schedule Class</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </RoleGuard>
    </AuthGate>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 24,
  },
  section: {
    gap: 10,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#2C2C2C",
  },
  optional: {
    fontWeight: "400",
    color: "#888888",
  },
  textInput: {
    backgroundColor: "#F9F9F9",
  },
  chipRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  categoryChip: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: "#F9F9F9",
    borderWidth: 1,
    borderColor: "#EEEEEE",
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#888888",
  },
  scrollRow: {
    gap: 8,
    paddingVertical: 2,
  },
  dateChip: {
    width: 58,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#F9F9F9",
    borderWidth: 1,
    borderColor: "#EEEEEE",
    alignItems: "center",
    gap: 2,
  },
  dateChipSelected: {
    backgroundColor: "#87A878",
    borderColor: "#87A878",
  },
  dateChipTop: {
    fontSize: 10,
    fontWeight: "500",
    color: "#888888",
  },
  dateChipTopSelected: {
    color: "#FFFFFF",
  },
  dateChipNum: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2C2C2C",
    lineHeight: 24,
  },
  dateChipNumSelected: {
    color: "#FFFFFF",
  },
  timeChip: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: "#F9F9F9",
    borderWidth: 1,
    borderColor: "#EEEEEE",
  },
  timeChipSelected: {
    backgroundColor: "#87A878",
    borderColor: "#87A878",
  },
  timeChipText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#888888",
  },
  timeChipTextSelected: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  durationChip: {
    paddingHorizontal: 20,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: "#F9F9F9",
    borderWidth: 1,
    borderColor: "#EEEEEE",
  },
  durationChipSelected: {
    backgroundColor: "#87A878",
    borderColor: "#87A878",
  },
  durationChipText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#888888",
  },
  durationChipTextSelected: {
    fontWeight: "600",
    color: "#FFFFFF",
  },
  counterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
  },
  counterBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F9F9F9",
    borderWidth: 1,
    borderColor: "#EEEEEE",
    alignItems: "center",
    justifyContent: "center",
  },
  counterBtnText: {
    fontSize: 20,
    fontWeight: "500",
    color: "#2C2C2C",
    lineHeight: 24,
  },
  counterValue: {
    fontSize: 24,
    fontWeight: "700",
    color: "#2C2C2C",
    minWidth: 36,
    textAlign: "center",
  },
  submitBtn: {
    backgroundColor: "#87A878",
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 4,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
