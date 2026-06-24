import { useState } from "react";
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from "react-native";
import { Text } from "react-native-paper";

import { followInstructor, unfollowInstructor } from "../lib/api";

type Props = {
  hostId: string;
  initialFollowing: boolean;
  initialCount: number;
  size?: "sm" | "md";
  onFollowChange?: (following: boolean) => void;
};

export function FollowButton({
  hostId,
  initialFollowing,
  initialCount,
  size = "md",
  onFollowChange,
}: Props) {
  const [following, setFollowing] = useState(initialFollowing);
  const [count, setCount] = useState(initialCount);
  const [loading, setLoading] = useState(false);

  const handlePress = async () => {
    if (loading) return;
    const next = !following;
    setFollowing(next);
    setCount((c) => c + (next ? 1 : -1));
    setLoading(true);
    try {
      if (next) {
        await followInstructor(hostId);
      } else {
        await unfollowInstructor(hostId);
      }
      onFollowChange?.(next);
    } catch {
      setFollowing(!next);
      setCount((c) => c + (next ? -1 : 1));
    } finally {
      setLoading(false);
    }
  };

  if (size === "sm") {
    return (
      <TouchableOpacity
        style={[styles.pillBtn, following && styles.pillBtnFollowing]}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        {loading ? (
          <ActivityIndicator size="small" color={following ? "#87A878" : "#FFFFFF"} style={styles.pillSpinner} />
        ) : (
          <Text style={[styles.pillText, following && styles.pillTextFollowing]}>
            {following ? "Following" : "Follow"}
          </Text>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.mdBtn, following && styles.mdBtnFollowing]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator size="small" color={following ? "#87A878" : "#FFFFFF"} />
      ) : (
        <Text style={[styles.mdText, following && styles.mdTextFollowing]}>
          {following ? "Following" : "Follow"}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  mdBtn: {
    backgroundColor: "#87A878",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  mdBtnFollowing: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#87A878",
  },
  mdText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  mdTextFollowing: {
    color: "#87A878",
  },
  pillBtn: {
    backgroundColor: "#87A878",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 60,
  },
  pillBtnFollowing: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#87A878",
  },
  pillText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  pillTextFollowing: {
    color: "#87A878",
  },
  pillSpinner: {
    height: 16,
  },
});
