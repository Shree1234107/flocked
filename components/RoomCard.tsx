import { colors } from "../lib/colors";
import { Image, StyleSheet, TouchableOpacity, View } from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Room } from "../lib/types";

type RoomCardProps = {
  room: Room;
  onPress: () => void;
};

export function RoomCard({ room, onPress }: RoomCardProps) {
  const displayName = room.host?.display_name ?? room.host?.full_name ?? "Host";
  const photoUrl = room.host?.photo_url ?? null;
  const isLive = room.status === "live";
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.topRow}>
        <View style={styles.liveBadge}>
          <View style={isLive ? styles.dotLive : styles.dotEnded} />
          <Text style={isLive ? styles.liveText : styles.endedText}>
            {isLive ? "LIVE" : "ENDED"}
          </Text>
        </View>
        <View style={styles.watcherBadge}>
          <MaterialCommunityIcons name="eye-outline" size={14} color="#6B7280" />
          <Text style={styles.watcherCount}>{room.participant_count}</Text>
        </View>
      </View>

      <Text style={styles.title} numberOfLines={2}>{room.title}</Text>

      {room.description ? (
        <Text style={styles.description} numberOfLines={1}>{room.description}</Text>
      ) : null}

      <View style={styles.bottomRow}>
        <View style={styles.hostRow}>
          {photoUrl ? (
            <Image source={{ uri: photoUrl }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitials}>{initials}</Text>
            </View>
          )}
          <Text style={styles.hostName} numberOfLines={1}>@{displayName}</Text>
        </View>
        <View style={styles.tagPill}>
          <Text style={styles.tagText}>{room.interest_tag}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EEEEEE",
    padding: 14,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dotLive: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#22C55E",
  },
  dotEnded: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#888888",
  },
  liveText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#22C55E",
    letterSpacing: 0.4,
  },
  endedText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#888888",
    letterSpacing: 0.4,
  },
  watcherBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  watcherCount: {
    fontSize: 12,
    color: "#888888",
    fontWeight: "500",
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.navy,
    marginBottom: 4,
    lineHeight: 22,
  },
  description: {
    fontSize: 13,
    color: "#888888",
    marginBottom: 10,
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
  },
  hostRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#EEEEEE",
  },
  avatarPlaceholder: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.primaryTint,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.primary,
  },
  hostName: {
    fontSize: 12,
    color: "#888888",
    fontWeight: "500",
    flex: 1,
  },
  tagPill: {
    backgroundColor: colors.primaryTint,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tagText: {
    fontSize: 11,
    fontWeight: "500",
    color: "#007A70",
  },
});
