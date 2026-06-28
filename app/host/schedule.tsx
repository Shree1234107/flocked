import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { ActivityIndicator, Text, TextInput } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { AuthGate } from "../../components/AuthGate";
import { RoleGuard } from "../../components/RoleGuard";
import { createClass } from "../../lib/api";

const CATEGORIES = ["Yoga", "Dance", "Tutoring"] as const;
const DURATIONS = [30, 45, 60, 90] as const;

const CATEGORY_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  Yoga: { bg: "#E0F7F5", border: "#00B4A6", text: "#007A70" },
  Dance: { bg: "#FDF0F2", border: "#E0F7F5", text: "#A04060" },
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

function getDefaultWebDatetime(): string {
  const d = new Date();
  d.setHours(9, 0, 0, 0);
  if (d <= new Date()) d.setDate(d.getDate() + 1);
  // "YYYY-MM-DDTHH:MM" for datetime-local input value
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T09:00`;
}

const DATE_CHIPS = getDateChips();

export default function ScheduleClassScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const isWeb = Platform.OS === "web";

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<typeof CATEGORIES[number]>("Yoga");
  const [selectedDate, setSelectedDate] = useState<Date>(DATE_CHIPS[0]);
  const [selectedTime, setSelectedTime] = useState<string>("9:00");
  const [webDatetime, setWebDatetime] = useState<string>(getDefaultWebDatetime());
  const [duration, setDuration] = useState<number>(60);
  const [maxStudents, setMaxStudents] = useState<number>(10);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);

  const handleSubmit = async () => {
    console.log("[schedule] handleSubmit fired — title:", JSON.stringify(title), "category:", category, "duration:", duration, "maxStudents:", maxStudents, "isWeb:", isWeb, "webDatetime:", webDatetime);

    if (!title.trim()) {
      console.log("[schedule] blocked: title empty");
      if (isWeb) { setInlineError("Please enter a class title."); return; }
      Alert.alert("Oops", "Please enter a class title.");
      return;
    }

    let scheduledAt: string;
    if (isWeb) {
      if (!webDatetime) {
        setInlineError("Please select a date and time.");
        return;
      }
      scheduledAt = new Date(webDatetime).toISOString();
      console.log("[schedule] web scheduledAt:", scheduledAt);
    } else {
      const [h, m] = selectedTime.split(":").map(Number);
      const d = new Date(selectedDate);
      d.setHours(h, m, 0, 0);
      scheduledAt = d.toISOString();
      console.log("[schedule] mobile scheduledAt:", scheduledAt);
    }

    setInlineError(null);
    setSubmitting(true);
    try {
      await createClass({
        title: title.trim(),
        category: category.toLowerCase(),
        scheduledAt,
        durationMinutes: duration,
        maxStudents,
        description: description.trim() || undefined,
      });
      console.log("[schedule] createClass success");
      if (isWeb) {
        router.back();
      } else {
        Alert.alert(
          "Class Scheduled",
          "Your class has been added to the calendar and students can now join.",
          [{ text: "Done", onPress: () => router.back() }]
        );
      }
    } catch (err) {
      console.log("[schedule] createClass error:", err);
      const msg = err instanceof Error ? err.message : "Failed to schedule class.";
      if (isWeb) {
        setInlineError(msg);
      } else {
        Alert.alert("Oops", msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const formContent = (
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
          onChangeText={(t) => { setTitle(t); setInlineError(null); }}
          mode="outlined"
          placeholder="e.g. Beginner Morning Yoga"
          style={styles.textInput}
          outlineColor="#EEEEEE"
          activeOutlineColor="#00B4A6"
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
              <Pressable
                key={cat}
                style={(state: any) => [
                  styles.categoryChip,
                  selected && { backgroundColor: colors.bg, borderColor: colors.border },
                  !selected && state.hovered && styles.chipHovered,
                  isWeb && ({ cursor: "pointer" } as any),
                ]}
                onPress={() => setCategory(cat)}
              >
                <Text style={[styles.categoryChipText, selected && { color: colors.text, fontWeight: "600" }]}>
                  {cat}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Date + Time — datetime-local on web, chip rows on mobile */}
      {isWeb ? (
        <View style={styles.section}>
          <Text style={styles.label}>Date & Time</Text>
          {/* @ts-ignore — native HTML input, valid on web */}
          <input
            type="datetime-local"
            value={webDatetime}
            min={(() => {
              const now = new Date();
              const pad = (n: number) => n.toString().padStart(2, "0");
              return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
            })()}
            onChange={(e: any) => {
              console.log("[schedule] datetime-local changed:", e.target.value);
              setWebDatetime(e.target.value);
            }}
            style={{
              padding: "12px 14px",
              borderRadius: 8,
              border: "1px solid #EEEEEE",
              fontSize: 15,
              color: "#2C2C2C",
              backgroundColor: "#F9F9F9",
              width: "100%",
              boxSizing: "border-box",
              outline: "none",
              fontFamily: "inherit",
            } as any}
          />
        </View>
      ) : (
        <>
          {/* Date chips */}
          <View style={styles.section}>
            <Text style={styles.label}>Date</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollRow}>
              {DATE_CHIPS.map((date, i) => {
                const { day, num, month } = chipLabel(date);
                const selected = selectedDate.toDateString() === date.toDateString();
                return (
                  <Pressable
                    key={i}
                    style={[styles.dateChip, selected && styles.dateChipSelected]}
                    onPress={() => setSelectedDate(date)}
                  >
                    <Text style={[styles.dateChipTop, selected && styles.dateChipTopSelected]}>{day}</Text>
                    <Text style={[styles.dateChipNum, selected && styles.dateChipNumSelected]}>{num}</Text>
                    <Text style={[styles.dateChipTop, selected && styles.dateChipTopSelected]}>{month}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* Time chips */}
          <View style={styles.section}>
            <Text style={styles.label}>Time</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollRow}>
              {TIME_SLOTS.map((slot) => {
                const selected = selectedTime === slot;
                return (
                  <Pressable
                    key={slot}
                    style={[styles.timeChip, selected && styles.timeChipSelected]}
                    onPress={() => setSelectedTime(slot)}
                  >
                    <Text style={[styles.timeChipText, selected && styles.timeChipTextSelected]}>
                      {fmtTime(slot)}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </>
      )}

      {/* Duration */}
      <View style={styles.section}>
        <Text style={styles.label}>Duration</Text>
        <View style={styles.chipRow}>
          {DURATIONS.map((d) => (
            <Pressable
              key={d}
              style={(state: any) => [
                styles.durationChip,
                duration === d && styles.durationChipSelected,
                duration !== d && state.hovered && styles.chipHovered,
                isWeb && ({ cursor: "pointer" } as any),
              ]}
              onPress={() => setDuration(d)}
            >
              <Text style={[styles.durationChipText, duration === d && styles.durationChipTextSelected]}>
                {d}m
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Max students */}
      <View style={styles.section}>
        <Text style={styles.label}>Max Students</Text>
        <View style={styles.counterRow}>
          <Pressable
            style={(state: any) => [
              styles.counterBtn,
              state.hovered && styles.counterBtnHovered,
              isWeb && ({ cursor: "pointer" } as any),
            ]}
            onPress={() => setMaxStudents((p) => Math.max(1, p - 1))}
          >
            <Text style={styles.counterBtnText}>−</Text>
          </Pressable>
          <Text style={styles.counterValue}>{maxStudents}</Text>
          <Pressable
            style={(state: any) => [
              styles.counterBtn,
              state.hovered && styles.counterBtnHovered,
              isWeb && ({ cursor: "pointer" } as any),
            ]}
            onPress={() => setMaxStudents((p) => Math.min(50, p + 1))}
          >
            <Text style={styles.counterBtnText}>+</Text>
          </Pressable>
        </View>
      </View>

      {/* Description */}
      <View style={styles.section}>
        <Text style={styles.label}>
          Description <Text style={styles.optional}>(optional)</Text>
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
          activeOutlineColor="#00B4A6"
          textColor="#2C2C2C"
          theme={{ colors: { onSurfaceVariant: "#888888", background: "#F9F9F9" } }}
          maxLength={500}
        />
      </View>

      {/* Inline error (web only) */}
      {inlineError && (
        <View style={styles.errorBox}>
          <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#E05555" />
          <Text style={styles.errorText}>{inlineError}</Text>
        </View>
      )}

      {/* Submit */}
      <Pressable
        style={(state: any) => [
          styles.submitBtn,
          submitting && styles.submitBtnDisabled,
          state.hovered && !submitting && styles.submitBtnHovered,
          isWeb && ({ cursor: submitting ? "default" : "pointer" } as any),
        ]}
        onPress={() => {
          console.log("[schedule] submit Pressable tapped");
          handleSubmit();
        }}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <Text style={styles.submitBtnText}>Schedule Class</Text>
        )}
      </Pressable>
    </ScrollView>
  );

  return (
    <AuthGate>
      <RoleGuard requiredRole="host">
        {isWeb ? (
          <View style={styles.flex}>
            <View style={styles.webContainer}>{formContent}</View>
          </View>
        ) : (
          <KeyboardAvoidingView style={styles.flex} behavior="padding">
            {formContent}
          </KeyboardAvoidingView>
        )}
      </RoleGuard>
    </AuthGate>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#FFFFFF" },
  webContainer: {
    flex: 1,
    maxWidth: 600,
    width: "100%",
    alignSelf: "center",
  },
  content: { paddingHorizontal: 24, paddingTop: 24, gap: 24 },
  section: { gap: 10 },
  label: { fontSize: 13, fontWeight: "600", color: "#1A1A1A" },
  optional: { fontWeight: "400", color: "#888888" },
  textInput: { backgroundColor: "#F7F7F7" },

  chipRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  chipHovered: { backgroundColor: "#F0F0F0" },

  categoryChip: {
    paddingHorizontal: 18, paddingVertical: 9, borderRadius: 9999,
    backgroundColor: "#F7F7F7", borderWidth: 1, borderColor: "#F0F0F0",
  },
  categoryChipText: { fontSize: 13, fontWeight: "500", color: "#666666" },

  scrollRow: { gap: 8, paddingVertical: 2 },

  dateChip: {
    width: 58, paddingVertical: 10, borderRadius: 12,
    backgroundColor: "#F7F7F7", borderWidth: 1, borderColor: "#F0F0F0",
    alignItems: "center", gap: 2,
  },
  dateChipSelected: { backgroundColor: "#00B4A6", borderColor: "#00B4A6" },
  dateChipTop: { fontSize: 10, fontWeight: "500", color: "#888888" },
  dateChipTopSelected: { color: "#FFFFFF" },
  dateChipNum: { fontSize: 18, fontWeight: "700", color: "#1A1A1A", lineHeight: 24 },
  dateChipNumSelected: { color: "#FFFFFF" },

  timeChip: {
    paddingHorizontal: 12, paddingVertical: 9, borderRadius: 9999,
    backgroundColor: "#F7F7F7", borderWidth: 1, borderColor: "#F0F0F0",
  },
  timeChipSelected: { backgroundColor: "#00B4A6", borderColor: "#00B4A6" },
  timeChipText: { fontSize: 13, fontWeight: "500", color: "#666666" },
  timeChipTextSelected: { color: "#FFFFFF", fontWeight: "600" },

  durationChip: {
    paddingHorizontal: 20, paddingVertical: 9, borderRadius: 9999,
    backgroundColor: "#F7F7F7", borderWidth: 1, borderColor: "#F0F0F0",
  },
  durationChipSelected: { backgroundColor: "#00B4A6", borderColor: "#00B4A6" },
  durationChipText: { fontSize: 13, fontWeight: "500", color: "#666666" },
  durationChipTextSelected: { fontWeight: "600", color: "#FFFFFF" },

  counterRow: { flexDirection: "row", alignItems: "center", gap: 20 },
  counterBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "#F7F7F7", borderWidth: 1, borderColor: "#F0F0F0",
    alignItems: "center", justifyContent: "center",
  },
  counterBtnHovered: { backgroundColor: "#EEEEEE" },
  counterBtnText: { fontSize: 20, fontWeight: "500", color: "#1A1A1A", lineHeight: 24 },
  counterValue: { fontSize: 24, fontWeight: "700", color: "#1A1A1A", minWidth: 36, textAlign: "center" },

  errorBox: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    backgroundColor: "#FFF0F0", borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
  },
  errorText: { flex: 1, fontSize: 13, color: "#E5484D", lineHeight: 18 },

  submitBtn: {
    backgroundColor: "#00B4A6", borderRadius: 10,
    paddingVertical: 15, alignItems: "center", marginTop: 4,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnHovered: { backgroundColor: "#009E91" },
  submitBtnText: { fontSize: 15, fontWeight: "600", color: "#FFFFFF" },
});
