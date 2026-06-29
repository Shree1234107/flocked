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
import { createClass, createSeries } from "../../lib/api";
import { fonts } from "../../lib/fonts";

const CATEGORIES = ["Yoga", "Dance", "Tutoring"] as const;
const DURATIONS = [30, 45, 60, 90] as const;
const WEEKS_OPTIONS = [4, 6, 8, 12] as const;
const CLASS_TYPES = ["Single Class", "Drop-in", "Series"] as const;
type ClassTypeOption = typeof CLASS_TYPES[number];

function getDateChips(): Date[] {
  return Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    d.setHours(0, 0, 0, 0);
    return d;
  });
}

const DAYS_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
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
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T09:00`;
}

function parseDollars(s: string): number {
  const n = parseFloat(s.replace(/[^0-9.]/g, ""));
  return isNaN(n) ? 0 : Math.round(n * 100);
}

const DATE_CHIPS = getDateChips();

export default function ScheduleClassScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const isWeb = Platform.OS === "web";

  // Class type
  const [classType, setClassType] = useState<ClassTypeOption>("Single Class");

  // Shared fields
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<typeof CATEGORIES[number]>("Yoga");
  const [selectedDate, setSelectedDate] = useState<Date>(DATE_CHIPS[0]);
  const [selectedTime, setSelectedTime] = useState<string>("9:00");
  const [webDatetime, setWebDatetime] = useState<string>(getDefaultWebDatetime());
  const [duration, setDuration] = useState<number>(60);
  const [maxStudents, setMaxStudents] = useState<number>(10);
  const [description, setDescription] = useState("");

  // Series-only fields
  const [totalWeeks, setTotalWeeks] = useState<number>(6);
  const [seriesPrice, setSeriesPrice] = useState("55");
  const [dropinPrice, setDropinPrice] = useState("12");

  const [submitting, setSubmitting] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);

  // Derive day/time info for preview
  const previewDate = isWeb && webDatetime
    ? new Date(webDatetime)
    : (() => {
        const d = new Date(selectedDate);
        const [h, mi] = selectedTime.split(":").map(Number);
        d.setHours(h, mi, 0, 0);
        return d;
      })();

  const previewDay = DAYS_FULL[previewDate.getDay()];
  const previewTime = fmtTime(
    isWeb && webDatetime
      ? `${previewDate.getHours()}:${previewDate.getMinutes().toString().padStart(2, "0")}`
      : selectedTime
  );

  const handleSubmit = async () => {
    if (!title.trim()) {
      if (isWeb) { setInlineError("Please enter a class title."); return; }
      Alert.alert("Oops", "Please enter a class title.");
      return;
    }

    let scheduledAt: string;
    if (isWeb) {
      if (!webDatetime) { setInlineError("Please select a date and time."); return; }
      scheduledAt = new Date(webDatetime).toISOString();
    } else {
      const [h, m] = selectedTime.split(":").map(Number);
      const d = new Date(selectedDate);
      d.setHours(h, m, 0, 0);
      scheduledAt = d.toISOString();
    }

    setInlineError(null);
    setSubmitting(true);

    try {
      if (classType === "Series") {
        const startDate = new Date(scheduledAt);
        const timeOfDay = `${startDate.getHours()}:${startDate.getMinutes().toString().padStart(2, "0")}`;

        await createSeries({
          title: title.trim(),
          description: description.trim() || undefined,
          category: category.toLowerCase(),
          totalWeeks,
          priceCents: parseDollars(seriesPrice),
          dropinPriceCents: parseDollars(dropinPrice),
          maxStudents,
          startDate: scheduledAt,
          dayOfWeek: startDate.getDay(),
          timeOfDay,
          durationMinutes: duration,
        });

        if (isWeb) {
          router.replace("/host/(tabs)/index");
        } else {
          Alert.alert(
            "Series Created",
            `${totalWeeks} weekly classes have been scheduled starting ${previewDay} at ${previewTime}.`,
            [{ text: "Done", onPress: () => router.replace("/host/(tabs)/index") }]
          );
        }
      } else {
        await createClass({
          title: title.trim(),
          category: category.toLowerCase(),
          scheduledAt,
          durationMinutes: duration,
          maxStudents,
          description: description.trim() || undefined,
          classType: classType === "Drop-in" ? "dropin" : "single",
        });

        if (isWeb) {
          router.replace("/host/(tabs)/index");
        } else {
          Alert.alert(
            "Class Scheduled",
            "Your class has been added to the calendar.",
            [{ text: "Done", onPress: () => router.replace("/host/(tabs)/index") }]
          );
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to schedule class.";
      if (isWeb) { setInlineError(msg); } else { Alert.alert("Oops", msg); }
    } finally {
      setSubmitting(false);
    }
  };

  const submitLabel = classType === "Series"
    ? `Create ${totalWeeks}-Week Series`
    : "Schedule Class";

  const formContent = (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.pageTitle}>Schedule a class</Text>
      <View style={styles.titleDivider} />

      {/* Class type selector */}
      <View style={styles.section}>
        <Text style={styles.label}>CLASS TYPE</Text>
        <View style={styles.typeRow}>
          {CLASS_TYPES.map((t) => {
            const active = classType === t;
            return (
              <Pressable
                key={t}
                style={(state: any) => [
                  styles.typeBtn,
                  active && styles.typeBtnActive,
                  !active && state.hovered && styles.typeBtnHovered,
                  isWeb && ({ cursor: "pointer" } as any),
                ]}
                onPress={() => { setClassType(t); setInlineError(null); }}
              >
                <Text style={[styles.typeBtnText, active && styles.typeBtnTextActive]}>{t}</Text>
              </Pressable>
            );
          })}
        </View>
        {classType === "Drop-in" && (
          <Text style={styles.typeHint}>Students can join any individual session. Great for open/ongoing classes.</Text>
        )}
        {classType === "Series" && (
          <Text style={styles.typeHint}>Students enroll for all sessions upfront. You set the start date and it repeats weekly.</Text>
        )}
      </View>

      {/* Title */}
      <View style={styles.section}>
        <Text style={styles.label}>
          {classType === "Series" ? "SERIES TITLE" : "CLASS TITLE"}
        </Text>
        <TextInput
          value={title}
          onChangeText={(t) => { setTitle(t); setInlineError(null); }}
          mode="outlined"
          placeholder={classType === "Series" ? "e.g. Beginner Morning Yoga Series" : "e.g. Beginner Morning Yoga"}
          style={styles.textInput}
          outlineColor="#E8E8E8"
          activeOutlineColor="#0F0F0F"
          textColor="#0F0F0F"
          theme={{ colors: { onSurfaceVariant: "#B0B0B0", background: "#FFFFFF" } }}
          maxLength={100}
        />
      </View>

      {/* Category */}
      <View style={styles.section}>
        <Text style={styles.label}>CATEGORY</Text>
        <View style={styles.chipRow}>
          {CATEGORIES.map((cat) => {
            const selected = category === cat;
            return (
              <Pressable
                key={cat}
                style={(state: any) => [
                  styles.chip,
                  selected && styles.chipSelected,
                  !selected && state.hovered && styles.chipHovered,
                  isWeb && ({ cursor: "pointer" } as any),
                ]}
                onPress={() => setCategory(cat)}
              >
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{cat}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Date + Time */}
      {isWeb ? (
        <View style={styles.section}>
          <Text style={styles.label}>
            {classType === "Series" ? "START DATE & TIME" : "DATE & TIME"}
          </Text>
          {/* @ts-ignore */}
          <input
            type="datetime-local"
            value={webDatetime}
            min={(() => {
              const now = new Date();
              const pad = (n: number) => n.toString().padStart(2, "0");
              return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
            })()}
            onChange={(e: any) => setWebDatetime(e.target.value)}
            style={{
              padding: "10px 14px",
              borderRadius: 6,
              border: "1px solid #E8E8E8",
              fontSize: 14,
              color: "#0F0F0F",
              backgroundColor: "#FFFFFF",
              width: "100%",
              boxSizing: "border-box",
              outline: "none",
              fontFamily: "inherit",
              cursor: "pointer",
            } as any}
          />
        </View>
      ) : (
        <>
          <View style={styles.section}>
            <Text style={styles.label}>
              {classType === "Series" ? "START DATE" : "DATE"}
            </Text>
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

          <View style={styles.section}>
            <Text style={styles.label}>TIME</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollRow}>
              {TIME_SLOTS.map((slot) => {
                const selected = selectedTime === slot;
                return (
                  <Pressable
                    key={slot}
                    style={[styles.chip, selected && styles.chipSelected]}
                    onPress={() => setSelectedTime(slot)}
                  >
                    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{fmtTime(slot)}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </>
      )}

      {/* Series-specific fields */}
      {classType === "Series" && (
        <>
          <View style={styles.section}>
            <Text style={styles.label}>NUMBER OF WEEKS</Text>
            <View style={styles.chipRow}>
              {WEEKS_OPTIONS.map((w) => {
                const selected = totalWeeks === w;
                return (
                  <Pressable
                    key={w}
                    style={(state: any) => [
                      styles.chip,
                      selected && styles.chipSelected,
                      !selected && state.hovered && styles.chipHovered,
                      isWeb && ({ cursor: "pointer" } as any),
                    ]}
                    onPress={() => setTotalWeeks(w)}
                  >
                    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{w} weeks</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.priceRow}>
            <View style={[styles.section, { flex: 1 }]}>
              <Text style={styles.label}>SERIES PRICE</Text>
              <TextInput
                value={seriesPrice}
                onChangeText={setSeriesPrice}
                mode="outlined"
                placeholder="55"
                keyboardType="decimal-pad"
                left={<TextInput.Affix text="$" />}
                style={styles.textInput}
                outlineColor="#E8E8E8"
                activeOutlineColor="#0F0F0F"
                textColor="#0F0F0F"
                theme={{ colors: { onSurfaceVariant: "#B0B0B0", background: "#FFFFFF" } }}
              />
            </View>
            <View style={[styles.section, { flex: 1 }]}>
              <Text style={styles.label}>DROP-IN PRICE</Text>
              <TextInput
                value={dropinPrice}
                onChangeText={setDropinPrice}
                mode="outlined"
                placeholder="12"
                keyboardType="decimal-pad"
                left={<TextInput.Affix text="$" />}
                style={styles.textInput}
                outlineColor="#E8E8E8"
                activeOutlineColor="#0F0F0F"
                textColor="#0F0F0F"
                theme={{ colors: { onSurfaceVariant: "#B0B0B0", background: "#FFFFFF" } }}
              />
            </View>
          </View>

          {/* Preview */}
          <View style={styles.previewBox}>
            <Text style={styles.previewText}>
              This will create{" "}
              <Text style={styles.previewBold}>{totalWeeks} weekly classes</Text>
              {" "}every{" "}
              <Text style={styles.previewBold}>{previewDay}</Text>
              {" "}at{" "}
              <Text style={styles.previewBold}>{previewTime}</Text>
            </Text>
            <Text style={styles.previewSub}>
              Series: ${seriesPrice || "0"} total · Drop-in: ${dropinPrice || "0"}/class
            </Text>
          </View>
        </>
      )}

      {/* Duration */}
      <View style={styles.section}>
        <Text style={styles.label}>DURATION</Text>
        <View style={styles.chipRow}>
          {DURATIONS.map((d) => (
            <Pressable
              key={d}
              style={(state: any) => [
                styles.chip,
                duration === d && styles.chipSelected,
                duration !== d && state.hovered && styles.chipHovered,
                isWeb && ({ cursor: "pointer" } as any),
              ]}
              onPress={() => setDuration(d)}
            >
              <Text style={[styles.chipText, duration === d && styles.chipTextSelected]}>{d}m</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Max students */}
      <View style={styles.section}>
        <Text style={styles.label}>MAX STUDENTS</Text>
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
          DESCRIPTION <Text style={styles.optional}>(optional)</Text>
        </Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          mode="outlined"
          placeholder="What will students learn? What should they bring?"
          multiline
          numberOfLines={3}
          style={styles.textInput}
          outlineColor="#E8E8E8"
          activeOutlineColor="#0F0F0F"
          textColor="#0F0F0F"
          theme={{ colors: { onSurfaceVariant: "#B0B0B0", background: "#FFFFFF" } }}
          maxLength={500}
        />
      </View>

      {inlineError && (
        <View style={styles.errorBox}>
          <MaterialCommunityIcons name="alert-circle-outline" size={14} color="#E5484D" />
          <Text style={styles.errorText}>{inlineError}</Text>
        </View>
      )}

      <Pressable
        style={(state: any) => [
          styles.submitBtn,
          submitting && styles.submitBtnDisabled,
          state.hovered && !submitting && styles.submitBtnHovered,
          isWeb && ({ cursor: submitting ? "default" : "pointer" } as any),
        ]}
        onPress={handleSubmit}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <Text style={styles.submitBtnText}>{submitLabel}</Text>
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
    maxWidth: 560,
    width: "100%",
    alignSelf: "center",
  },
  content: { paddingHorizontal: 24, paddingTop: 32, gap: 24 },

  pageTitle: {
    fontSize: 28,
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: "#0F0F0F",
    letterSpacing: -0.5,
    lineHeight: 32,
  },
  titleDivider: {
    height: 1,
    backgroundColor: "#E8E8E8",
    marginTop: -8,
  },

  section: { gap: 8 },
  label: {
    fontSize: 11,
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: "#6B6B6B",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  optional: { fontSize: 11, fontWeight: "400", fontFamily: fonts.regular, color: "#B0B0B0", textTransform: "none" },
  textInput: { backgroundColor: "#FFFFFF" },

  typeRow: { flexDirection: "row", gap: 8 },
  typeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#E8E8E8",
    alignItems: "center",
  },
  typeBtnActive: { backgroundColor: "#0F0F0F", borderColor: "#0F0F0F" },
  typeBtnHovered: { backgroundColor: "#F5F5F5" },
  typeBtnText: {
    fontSize: 13,
    fontFamily: fonts.medium,
    fontWeight: "500",
    color: "#6B6B6B",
  },
  typeBtnTextActive: { color: "#FFFFFF", fontFamily: fonts.bold, fontWeight: "700" },
  typeHint: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#B0B0B0",
    lineHeight: 18,
    marginTop: 2,
  },

  chipRow: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E8E8E8",
  },
  chipSelected: { backgroundColor: "#0F0F0F", borderColor: "#0F0F0F" },
  chipHovered: { backgroundColor: "#F5F5F5" },
  chipText: { fontSize: 13, fontFamily: fonts.medium, fontWeight: "500", color: "#6B6B6B" },
  chipTextSelected: { color: "#FFFFFF", fontFamily: fonts.bold, fontWeight: "700" },

  scrollRow: { gap: 6, paddingVertical: 2 },

  dateChip: {
    width: 56,
    paddingVertical: 10,
    borderRadius: 4,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E8E8E8",
    alignItems: "center",
    gap: 2,
  },
  dateChipSelected: { backgroundColor: "#0F0F0F", borderColor: "#0F0F0F" },
  dateChipTop: { fontSize: 10, fontFamily: fonts.medium, fontWeight: "500", color: "#6B6B6B" },
  dateChipTopSelected: { color: "#FFFFFF" },
  dateChipNum: { fontSize: 18, fontFamily: fonts.bold, fontWeight: "700", color: "#0F0F0F", lineHeight: 24 },
  dateChipNumSelected: { color: "#FFFFFF" },

  priceRow: { flexDirection: "row", gap: 12 },

  previewBox: {
    backgroundColor: "#F5F5F5",
    borderRadius: 6,
    padding: 14,
    gap: 4,
  },
  previewText: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: "#6B6B6B",
    lineHeight: 20,
  },
  previewBold: { fontFamily: fonts.bold, fontWeight: "700", color: "#0F0F0F" },
  previewSub: { fontSize: 12, fontFamily: fonts.regular, color: "#B0B0B0" },

  counterRow: { flexDirection: "row", alignItems: "center", gap: 20 },
  counterBtn: {
    width: 36,
    height: 36,
    borderRadius: 4,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E8E8E8",
    alignItems: "center",
    justifyContent: "center",
  },
  counterBtnHovered: { backgroundColor: "#F5F5F5" },
  counterBtnText: { fontSize: 18, fontFamily: fonts.medium, fontWeight: "500", color: "#0F0F0F", lineHeight: 24 },
  counterValue: {
    fontSize: 22,
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: "#0F0F0F",
    minWidth: 32,
    textAlign: "center",
  },

  errorBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#FEF2F2",
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  errorText: { flex: 1, fontSize: 13, fontFamily: fonts.regular, color: "#E5484D", lineHeight: 18 },

  submitBtn: {
    backgroundColor: "#00B4A6",
    borderRadius: 6,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
  },
  submitBtnDisabled: { opacity: 0.4 },
  submitBtnHovered: { backgroundColor: "#009B8E" },
  submitBtnText: { fontSize: 14, fontFamily: fonts.bold, fontWeight: "700", color: "#FFFFFF" },
});
