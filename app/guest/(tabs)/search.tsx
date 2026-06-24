import { useRef, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Text } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { AuthGate } from "../../../components/AuthGate";
import { RoleGuard } from "../../../components/RoleGuard";
import { useFavorites } from "../../../lib/favorites";

const CATEGORIES = ["All", "Yoga", "Dance", "Tutoring"] as const;
type Category = typeof CATEGORIES[number];

const RECENT_SEARCHES = ["Morning Yoga", "Math Tutoring", "Sarah Chen"];

const MOCK_CLASSES = [
  { id: "1", title: "Beginner Morning Yoga", category: "Yoga", instructor: "Sarah Chen", date: "Mon, Jun 16", time: "9:00 AM", spots: 7 },
  { id: "2", title: "Evening Flow", category: "Yoga", instructor: "Sarah Chen", date: "Wed, Jun 18", time: "6:00 PM", spots: 7 },
  { id: "3", title: "Math Tutoring Session", category: "Tutoring", instructor: "David Kim", date: "Wed, Jun 18", time: "10:00 AM", spots: 3 },
];

const MOCK_INSTRUCTORS = [
  { id: "inst-1", name: "Sarah Chen", teaches: "Yoga & Dance", students: 124, initials: "SC" },
  { id: "inst-2", name: "David Kim", teaches: "Math & Science", students: 87, initials: "DK" },
  { id: "inst-3", name: "Priya Patel", teaches: "Dance & Cardio", students: 56, initials: "PP" },
];

const CATEGORY_COLORS: Record<string, { bg: string; dot: string; text: string }> = {
  Yoga: { bg: "#F0F5EE", dot: "#87A878", text: "#4A7A40" },
  Dance: { bg: "#FDF0F2", dot: "#F4B8C1", text: "#A04060" },
  Tutoring: { bg: "#EEF3F8", dot: "#94B4D2", text: "#3A5F80" },
};

export default function SearchTab() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const inputRef = useRef<TextInput>(null);
  const { isFavorite, toggleFavorite, favoriteList } = useFavorites();

  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<Category>("All");
  const [recentSearches, setRecentSearches] = useState(RECENT_SEARCHES);

  const hasQuery = query.trim().length > 0;

  const filteredClasses = MOCK_CLASSES.filter((cls) => {
    const matchesCategory = selectedCategory === "All" || cls.category === selectedCategory;
    const matchesQuery =
      cls.title.toLowerCase().includes(query.toLowerCase()) ||
      cls.instructor.toLowerCase().includes(query.toLowerCase());
    return matchesCategory && matchesQuery;
  });

  const filteredInstructors = MOCK_INSTRUCTORS.filter((inst) =>
    inst.name.toLowerCase().includes(query.toLowerCase()) ||
    inst.teaches.toLowerCase().includes(query.toLowerCase())
  );

  const favoriteInstructors = MOCK_INSTRUCTORS.filter((inst) => isFavorite(inst.id));

  const handleRecentSearch = (term: string) => {
    setQuery(term);
    inputRef.current?.focus();
  };

  const removeRecent = (term: string) => {
    setRecentSearches((prev) => prev.filter((t) => t !== term));
  };

  return (
    <AuthGate>
      <RoleGuard requiredRole="guest">
        <View style={[styles.container, { paddingTop: insets.top }]}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Search</Text>
          </View>

          {/* Search bar */}
          <View style={styles.searchBarWrapper}>
            <View style={styles.searchBar}>
              <MaterialCommunityIcons name="magnify" size={20} color="#888888" />
              <TextInput
                ref={inputRef}
                style={styles.searchInput}
                value={query}
                onChangeText={setQuery}
                placeholder="Classes or instructors…"
                placeholderTextColor="#C0C0C0"
                returnKeyType="search"
                autoCorrect={false}
                autoCapitalize="none"
              />
              {query.length > 0 && (
                <TouchableOpacity onPress={() => setQuery("")} activeOpacity={0.7}>
                  <MaterialCommunityIcons name="close-circle" size={17} color="#C0C0C0" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Category chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsRow}
          >
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[styles.chip, selectedCategory === cat && styles.chipActive]}
                onPress={() => setSelectedCategory(cat)}
                activeOpacity={0.75}
              >
                <Text style={[styles.chipText, selectedCategory === cat && styles.chipTextActive]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <ScrollView
            contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
            keyboardShouldPersistTaps="handled"
          >
            {!hasQuery ? (
              <>
                {/* Saved Instructors */}
                {favoriteInstructors.length > 0 && (
                  <View style={styles.resultGroup}>
                    <Text style={styles.sectionTitle}>Saved Instructors</Text>
                    <View style={styles.instructorList}>
                      {favoriteInstructors.map((inst) => (
                        <InstructorCard
                          key={inst.id}
                          inst={inst}
                          isFav={isFavorite(inst.id)}
                          onToggle={() => toggleFavorite(inst.id)}
                        />
                      ))}
                    </View>
                  </View>
                )}

                {/* Recent Searches */}
                <View style={styles.recentSection}>
                  <Text style={styles.sectionTitle}>Recent Searches</Text>
                  {recentSearches.length === 0 ? (
                    <Text style={styles.emptyRecent}>No recent searches</Text>
                  ) : (
                    <View style={styles.recentList}>
                      {recentSearches.map((term) => (
                        <View key={term} style={styles.recentRow}>
                          <TouchableOpacity
                            style={styles.recentLeft}
                            onPress={() => handleRecentSearch(term)}
                            activeOpacity={0.7}
                          >
                            <MaterialCommunityIcons name="history" size={15} color="#C0C0C0" />
                            <Text style={styles.recentTerm}>{term}</Text>
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => removeRecent(term)} activeOpacity={0.7}>
                            <MaterialCommunityIcons name="close" size={15} color="#D0D0D0" />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </>
            ) : (
              <View style={styles.resultsSection}>
                {filteredClasses.length > 0 && (
                  <View style={styles.resultGroup}>
                    <Text style={styles.sectionTitle}>
                      Classes ({filteredClasses.length})
                    </Text>
                    <View style={styles.classList}>
                      {filteredClasses.map((cls) => {
                        const colors = CATEGORY_COLORS[cls.category];
                        return (
                          <TouchableOpacity
                            key={cls.id}
                            style={styles.classCard}
                            onPress={() => router.push(`/guest/class/${cls.id}`)}
                            activeOpacity={0.85}
                          >
                            <View style={[styles.classBar, { backgroundColor: colors?.dot ?? "#EEEEEE" }]} />
                            <View style={styles.classInfo}>
                              <View style={styles.classTopRow}>
                                <Text style={styles.classTime}>{cls.time}</Text>
                                <View style={[styles.catBadge, { backgroundColor: colors?.bg ?? "#F9F9F9" }]}>
                                  <Text style={[styles.catText, { color: colors?.text ?? "#888888" }]}>
                                    {cls.category}
                                  </Text>
                                </View>
                              </View>
                              <Text style={styles.classTitle} numberOfLines={1}>{cls.title}</Text>
                              <View style={styles.classMeta}>
                                <Text style={styles.classInstructor}>with {cls.instructor}</Text>
                                <Text style={styles.classDate}>{cls.date}</Text>
                              </View>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                )}

                {filteredInstructors.length > 0 && (
                  <View style={styles.resultGroup}>
                    <Text style={styles.sectionTitle}>
                      Instructors ({filteredInstructors.length})
                    </Text>
                    <View style={styles.instructorList}>
                      {filteredInstructors.map((inst) => (
                        <InstructorCard
                          key={inst.id}
                          inst={inst}
                          isFav={isFavorite(inst.id)}
                          onToggle={() => toggleFavorite(inst.id)}
                        />
                      ))}
                    </View>
                  </View>
                )}

                {filteredClasses.length === 0 && filteredInstructors.length === 0 && (
                  <View style={styles.noResults}>
                    <MaterialCommunityIcons name="magnify" size={40} color="#D0D0D0" />
                    <Text style={styles.noResultsTitle}>No results found</Text>
                    <Text style={styles.noResultsSub}>Try a different keyword or category</Text>
                  </View>
                )}
              </View>
            )}
          </ScrollView>
        </View>
      </RoleGuard>
    </AuthGate>
  );
}

function InstructorCard({
  inst,
  isFav,
  onToggle,
}: {
  inst: { id: string; name: string; teaches: string; students: number; initials: string };
  isFav: boolean;
  onToggle: () => void;
}) {
  return (
    <View style={styles.instructorCard}>
      <View style={styles.instAvatar}>
        <Text style={styles.instInitials}>{inst.initials}</Text>
      </View>
      <View style={styles.instInfo}>
        <Text style={styles.instName}>{inst.name}</Text>
        <Text style={styles.instTeaches}>{inst.teaches}</Text>
      </View>
      <TouchableOpacity onPress={onToggle} activeOpacity={0.7} style={styles.heartBtn}>
        <MaterialCommunityIcons
          name={isFav ? "heart" : "heart-outline"}
          size={20}
          color={isFav ? "#F4B8C1" : "#C0C0C0"}
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#2C2C2C",
    letterSpacing: -0.3,
  },
  searchBarWrapper: {
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9F9F9",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EEEEEE",
    paddingHorizontal: 12,
    paddingVertical: 11,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#2C2C2C",
    padding: 0,
  },
  chipsRow: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: "#F9F9F9",
    borderWidth: 1,
    borderColor: "#EEEEEE",
  },
  chipActive: {
    backgroundColor: "#87A878",
    borderColor: "#87A878",
  },
  chipText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#888888",
  },
  chipTextActive: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2C2C2C",
    marginBottom: 10,
  },
  recentSection: {
    gap: 0,
  },
  emptyRecent: {
    fontSize: 14,
    color: "#888888",
  },
  recentList: {
    gap: 0,
  },
  recentRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
  },
  recentLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  recentTerm: {
    fontSize: 14,
    color: "#2C2C2C",
    fontWeight: "500",
  },
  resultsSection: {
    gap: 20,
  },
  resultGroup: {
    gap: 0,
  },
  classList: {
    gap: 8,
  },
  classCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EEEEEE",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  classBar: {
    width: 4,
    alignSelf: "stretch",
  },
  classInfo: {
    flex: 1,
    padding: 12,
    gap: 3,
  },
  classTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  classTime: {
    fontSize: 12,
    fontWeight: "500",
    color: "#888888",
  },
  catBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  catText: {
    fontSize: 10,
    fontWeight: "600",
  },
  classTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2C2C2C",
  },
  classMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  classInstructor: {
    fontSize: 12,
    color: "#888888",
  },
  classDate: {
    fontSize: 11,
    color: "#C0C0C0",
  },
  instructorList: {
    gap: 8,
  },
  instructorCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EEEEEE",
    padding: 14,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  instAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F0F5EE",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  instInitials: {
    fontSize: 15,
    fontWeight: "700",
    color: "#87A878",
  },
  instInfo: {
    flex: 1,
    gap: 2,
  },
  instName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2C2C2C",
  },
  instTeaches: {
    fontSize: 12,
    color: "#888888",
  },
  heartBtn: {
    padding: 4,
  },
  noResults: {
    alignItems: "center",
    paddingVertical: 60,
    gap: 8,
  },
  noResultsTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2C2C2C",
    marginTop: 4,
  },
  noResultsSub: {
    fontSize: 13,
    color: "#888888",
  },
});
