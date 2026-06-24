import { useEffect, useRef } from "react";
import { Animated, StyleSheet, View, ViewStyle } from "react-native";

type SkeletonProps = {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
};

export function Skeleton({ width = "100%", height = 16, borderRadius = 8, style }: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 750, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.35, duration: 750, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        { width: width as number, height, borderRadius, backgroundColor: "#EEEEEE" },
        { opacity },
        style,
      ]}
    />
  );
}

export function DiscoverSkeleton() {
  return (
    <View style={sk.container}>
      {[0, 1, 2].map((i) => (
        <View key={i} style={sk.section}>
          <Skeleton width={120} height={13} borderRadius={6} style={{ marginBottom: 10 }} />
          {[0, 1].map((j) => (
            <View key={j} style={sk.card}>
              <View style={sk.cardBar} />
              <View style={sk.cardBody}>
                <View style={sk.row}>
                  <Skeleton width={80} height={11} />
                  <Skeleton width={50} height={18} borderRadius={6} />
                </View>
                <Skeleton width="90%" height={14} style={{ marginTop: 6 }} />
                <Skeleton width="60%" height={11} style={{ marginTop: 4 }} />
              </View>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

export function ClassDetailSkeleton() {
  return (
    <View style={sk.detailContainer}>
      <View style={sk.heroSk}>
        <Skeleton width={100} height={26} borderRadius={8} />
        <Skeleton width="85%" height={28} borderRadius={8} style={{ marginTop: 12 }} />
        <Skeleton width="60%" height={20} borderRadius={8} style={{ marginTop: 8 }} />
      </View>
      <View style={sk.detailBody}>
        <View style={sk.instCard}>
          <Skeleton width={48} height={48} borderRadius={24} />
          <View style={{ flex: 1, gap: 6 }}>
            <Skeleton width="60%" height={14} />
            <Skeleton width="80%" height={11} />
          </View>
        </View>
        <View style={sk.infoCard}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={sk.infoRow}>
              <Skeleton width={16} height={16} borderRadius={8} />
              <Skeleton width={40} height={11} />
              <Skeleton width="55%" height={13} />
            </View>
          ))}
        </View>
        <Skeleton width="100%" height={6} borderRadius={3} />
        <Skeleton width="100%" height={80} borderRadius={10} />
      </View>
    </View>
  );
}

export function ProfileSkeleton() {
  return (
    <View style={sk.profileContainer}>
      <View style={sk.profileHero}>
        <Skeleton width={80} height={80} borderRadius={40} />
        <Skeleton width={120} height={18} borderRadius={8} style={{ marginTop: 12 }} />
        <Skeleton width={80} height={13} borderRadius={6} style={{ marginTop: 6 }} />
      </View>
      <View style={sk.statsRow}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={sk.statSk}>
            <Skeleton width={32} height={22} borderRadius={6} />
            <Skeleton width={50} height={10} borderRadius={4} style={{ marginTop: 4 }} />
          </View>
        ))}
      </View>
      {[0, 1, 2].map((i) => (
        <View key={i} style={sk.listRow}>
          <Skeleton width={4} height="100%" borderRadius={2} />
          <View style={{ flex: 1, gap: 4 }}>
            <Skeleton width="50%" height={11} />
            <Skeleton width="80%" height={14} />
            <Skeleton width="60%" height={11} />
          </View>
        </View>
      ))}
    </View>
  );
}

const sk = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 24,
  },
  section: {
    gap: 8,
  },
  card: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EEEEEE",
    overflow: "hidden",
    height: 80,
  },
  cardBar: {
    width: 4,
    backgroundColor: "#EEEEEE",
  },
  cardBody: {
    flex: 1,
    padding: 12,
    gap: 4,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  detailContainer: {
    flex: 1,
  },
  heroSk: {
    backgroundColor: "#F9F9F9",
    padding: 20,
    paddingTop: 56,
    paddingBottom: 28,
  },
  detailBody: {
    padding: 20,
    gap: 14,
  },
  instCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EEEEEE",
  },
  infoCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EEEEEE",
    paddingHorizontal: 14,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: "#EEEEEE",
  },
  profileContainer: {
    paddingHorizontal: 20,
  },
  profileHero: {
    alignItems: "center",
    paddingVertical: 24,
    gap: 4,
  },
  statsRow: {
    flexDirection: "row",
    backgroundColor: "#F9F9F9",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EEEEEE",
    paddingVertical: 18,
    marginBottom: 24,
  },
  statSk: {
    flex: 1,
    alignItems: "center",
  },
  listRow: {
    flexDirection: "row",
    height: 72,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EEEEEE",
    overflow: "hidden",
    marginBottom: 8,
    gap: 12,
    padding: 12,
  },
});
