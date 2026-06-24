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
    // Optimistic update
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
      // Revert on error
      setFollowing(!next);
      setCount((c) => c + (next ? -1 : 1));
    } finally {
      setLoading(false);
    }
  };

  if (size === "sm") {
    return (
      <TouchableOpacity
        style={[styles.smBtn, following && styles.smBtnFollowing]}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        {loading ? (
          <ActivityIndicator size={10} color={following ? "#87A878" : "#fff"} />
        ) : (
          <Text style={[styles.smText, following && styles.smTextFollowing]}>
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
      activeOpacity={0.85}
    >
      {loading ? (
        <ActivityIndicator size={16} color={following ? "#87A878" : "#fff"} />
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
  },
  mdBtnFollowing: {
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#87A878",
  },
  mdText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
  },
  mdTextFollowing: {
    color: "#87A878",
  },
  smBtn: {
    backgroundColor: "#87A878",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  smBtnFollowing: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#87A878",
  },
  smText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
  },
  smTextFollowing: {
    color: "#87A878",
  },
});
