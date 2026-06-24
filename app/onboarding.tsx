import { useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Text } from "react-native-paper";
import * as SecureStore from "../lib/secure-store";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const SLIDES = [
  {
    icon: "leaf-circle-outline" as const,
    iconColor: "#87A878",
    iconBg: "#F0F5EE",
    title: "Welcome to Flocked",
    subtitle: "Live community classes from real instructors who care about what they teach.",
  },
  {
    icon: "calendar-check-outline" as const,
    iconColor: "#87A878",
    iconBg: "#F0F5EE",
    title: "Book in one tap",
    subtitle: "Browse yoga, dance, tutoring and more. Join any class instantly.",
  },
  {
    icon: "account-group-outline" as const,
    iconColor: "#87A878",
    iconBg: "#F0F5EE",
    title: "Learn together",
    subtitle: "Small classes. Real instructors. Real time. A community that grows with you.",
  },
];

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 });
  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: Array<{ index: number | null }> }) => {
      if (viewableItems.length > 0 && viewableItems[0].index !== null) {
        setActiveIndex(viewableItems[0].index);
      }
    }
  );

  const handleComplete = async () => {
    await SecureStore.setItemAsync("flocked.onboarding_seen", "true");
    const notifAsked = await SecureStore.getItemAsync("flocked.notif_asked");
    if (!notifAsked) {
      router.replace("/notification-permission");
    } else {
      router.replace("/");
    }
  };

  const handleNext = () => {
    if (activeIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: activeIndex + 1, animated: true });
    } else {
      handleComplete();
    }
  };

  const isLast = activeIndex === SLIDES.length - 1;

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 },
      ]}
    >
      {!isLast && (
        <TouchableOpacity style={styles.skipBtn} onPress={handleComplete} activeOpacity={0.7}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      )}

      <FlatList
        ref={flatListRef}
        data={SLIDES}
        keyExtractor={(_, i) => String(i)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged.current}
        viewabilityConfig={viewabilityConfig.current}
        style={styles.flatList}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width: SCREEN_WIDTH }]}>
            <View style={[styles.iconWrap, { backgroundColor: item.iconBg }]}>
              <MaterialCommunityIcons name={item.icon} size={56} color={item.iconColor} />
            </View>
            <View style={styles.textBlock}>
              <Text style={styles.slideTitle}>{item.title}</Text>
              <Text style={styles.slideSubtitle}>{item.subtitle}</Text>
            </View>
          </View>
        )}
      />

      <View style={styles.dotsRow}>
        {SLIDES.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i === activeIndex ? styles.dotActive : styles.dotInactive,
            ]}
          />
        ))}
      </View>

      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={styles.nextBtn}
          onPress={handleNext}
          activeOpacity={0.85}
        >
          <Text style={styles.nextBtnText}>{isLast ? "Get started" : "Next"}</Text>
          <MaterialCommunityIcons name="arrow-right" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
  },
  skipBtn: {
    alignSelf: "flex-end",
    paddingHorizontal: 24,
    paddingVertical: 8,
  },
  skipText: {
    fontSize: 14,
    color: "#888888",
  },
  flatList: {
    flex: 1,
  },
  slide: {
    flex: 1,
    alignItems: "flex-start",
    justifyContent: "center",
    paddingHorizontal: 40,
    gap: 32,
  },
  iconWrap: {
    width: 104,
    height: 104,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  textBlock: {
    gap: 12,
  },
  slideTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#2C2C2C",
    letterSpacing: -0.5,
    lineHeight: 34,
  },
  slideSubtitle: {
    fontSize: 16,
    color: "#888888",
    lineHeight: 26,
    fontWeight: "400",
  },
  dotsRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 24,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    width: 20,
    backgroundColor: "#87A878",
  },
  dotInactive: {
    width: 6,
    backgroundColor: "#EEEEEE",
  },
  actionsRow: {
    width: "100%",
    paddingHorizontal: 24,
  },
  nextBtn: {
    backgroundColor: "#87A878",
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  nextBtnText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
