import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { Text } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useState } from "react";

import { DayFilter, Filters, TimeFilter, useFilters } from "../../lib/filtersContext";

const DAYS: DayFilter[] = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const TIME_OPTIONS: { key: TimeFilter; label: string; sub: string }[] = [
  { key: "morning", label: "Morning", sub: "6 AM – 12 PM" },
  { key: "afternoon", label: "Afternoon", sub: "12 PM – 5 PM" },
  { key: "evening", label: "Evening", sub: "5 PM – 10 PM" },
];

const PRICE_STEPS = [0, 10, 20, 30, 40, 50];

export default function FiltersScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { filters, setFilters } = useFilters();

  const [localDays, setLocalDays] = useState<DayFilter[]>(filters.days);
  const [localTimes, setLocalTimes] = useState<TimeFilter[]>(filters.times);
  const [localMaxPrice, setLocalMaxPrice] = useState(filters.maxPrice);

  const toggleDay = (day: DayFilter) => {
    setLocalDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const toggleTime = (time: TimeFilter) => {
    setLocalTimes((prev) =>
      prev.includes(time) ? prev.filter((t) => t !== time) : [...prev, time]
    );
  };

  const handleApply = () => {
    setFilters({ days: localDays, times: localTimes, maxPrice: localMaxPrice });
    router.back();
  };

  const handleClear = () => {
    setLocalDays([]);
    setLocalTimes([]);
    setLocalMaxPrice(50);
  };

  const activeCount = localDays.length + localTimes.length + (localMaxPrice < 50 ? 1 : 0);

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      {/* Handle bar */}
      <View style={styles.handleRow}>
        <View style={styles.handle} />
      </View>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Filters</Text>
        {activeCount > 0 && (
          <TouchableOpacity onPress={handleClear} activeOpacity={0.7}>
            <Text style={styles.clearText}>Clear All</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Day of week */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Day of Week</Text>
          <View style={styles.dayGrid}>
            {DAYS.map((day) => {
              const active = localDays.includes(day);
              return (
                <TouchableOpacity
                  key={day}
                  style={[styles.dayChip, active && styles.dayChipActive]}
                  onPress={() => toggleDay(day)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.dayChipText, active && styles.dayChipTextActive]}>
                    {day}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Time of day */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Time of Day</Text>
          <View style={styles.timeList}>
            {TIME_OPTIONS.map((opt) => {
              const active = localTimes.includes(opt.key);
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.timeRow, active && styles.timeRowActive]}
                  onPress={() => toggleTime(opt.key)}
                  activeOpacity={0.75}
                >
                  <View style={[styles.checkBox, active && styles.checkBoxActive]}>
                    {active && <MaterialCommunityIcons name="check" size={13} color="#FFFFFF" />}
                  </View>
                  <View style={styles.timeInfo}>
                    <Text style={[styles.timeLabel, active && styles.timeLabelActive]}>
                      {opt.label}
                    </Text>
                    <Text style={styles.timeSub}>{opt.sub}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Price range */}
        <View style={styles.section}>
          <View style={styles.priceHeader}>
            <Text style={styles.sectionLabel}>Max Price</Text>
            <Text style={styles.priceValue}>
              {localMaxPrice === 50 ? "Any" : `$${localMaxPrice}`}
            </Text>
          </View>
          <View style={styles.priceTrack}>
            <View
              style={[
                styles.priceFill,
                { width: `${(localMaxPrice / 50) * 100}%` },
              ]}
            />
          </View>
          <View style={styles.priceSteps}>
            {PRICE_STEPS.map((p) => (
              <TouchableOpacity
                key={p}
                style={[styles.priceStep, localMaxPrice === p && styles.priceStepActive]}
                onPress={() => setLocalMaxPrice(p)}
                activeOpacity={0.75}
              >
                <Text style={[styles.priceStepText, localMaxPrice === p && styles.priceStepTextActive]}>
                  {p === 50 ? "Any" : `$${p}`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Apply button */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.applyBtn} onPress={handleApply} activeOpacity={0.85}>
          <Text style={styles.applyBtnText}>
            {activeCount > 0 ? `Apply (${activeCount} active)` : "Apply Filters"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  handleRow: {
    alignItems: "center",
    paddingTop: 12,
    paddingBottom: 4,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#EEEEEE",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#EEEEEE",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2C2C2C",
    letterSpacing: -0.2,
  },
  clearText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#87A878",
  },
  scroll: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 20,
    paddingTop: 22,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#2C2C2C",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  dayGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  dayChip: {
    width: 48,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#EEEEEE",
    backgroundColor: "#F9F9F9",
    alignItems: "center",
    justifyContent: "center",
  },
  dayChipActive: {
    backgroundColor: "#87A878",
    borderColor: "#87A878",
  },
  dayChipText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#888888",
  },
  dayChipTextActive: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  timeList: {
    gap: 8,
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EEEEEE",
    backgroundColor: "#FFFFFF",
  },
  timeRowActive: {
    borderColor: "#87A878",
    backgroundColor: "#F0F5EE",
  },
  checkBox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: "#C0C0C0",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  checkBoxActive: {
    backgroundColor: "#87A878",
    borderColor: "#87A878",
  },
  timeInfo: {
    flex: 1,
    gap: 2,
  },
  timeLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#2C2C2C",
  },
  timeLabelActive: {
    fontWeight: "600",
    color: "#4A7A40",
  },
  timeSub: {
    fontSize: 12,
    color: "#888888",
  },
  priceHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  priceValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#87A878",
  },
  priceTrack: {
    height: 5,
    backgroundColor: "#EEEEEE",
    borderRadius: 3,
    marginBottom: 14,
    overflow: "hidden",
  },
  priceFill: {
    height: "100%",
    backgroundColor: "#87A878",
    borderRadius: 3,
  },
  priceSteps: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  priceStep: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#EEEEEE",
    backgroundColor: "#F9F9F9",
    minWidth: 44,
    alignItems: "center",
  },
  priceStepActive: {
    backgroundColor: "#87A878",
    borderColor: "#87A878",
  },
  priceStepText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#888888",
  },
  priceStepTextActive: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: "#EEEEEE",
  },
  applyBtn: {
    backgroundColor: "#87A878",
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
  },
  applyBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
