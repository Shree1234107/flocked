import { colors } from "../../../lib/colors";
import { useCallback, useEffect, useState } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { ActivityIndicator, Text } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { AuthGate } from "../../../components/AuthGate";
import { RoleGuard } from "../../../components/RoleGuard";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../../lib/auth";
import { Room } from "../../../lib/types";

export default function HostActivityTab() {
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRooms = useCallback(async () => {
    if (!session?.user.id) return;
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from("rooms")
        .select("id, host_id, title, description, interest_tag, status, participant_count, created_at, ended_at")
        .eq("host_id", session.user.id)
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;
      setRooms(data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load activity.");
    } finally {
      setLoading(false);
    }
  }, [session?.user.id]);

  useEffect(() => { loadRooms(); }, [loadRooms]);
  useFocusEffect(useCallback(() => { loadRooms(); }, [loadRooms]));

  return (
    <AuthGate>
      <RoleGuard requiredRole="host">
        <View style={[styles.container, { paddingTop: insets.top }]}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Activity</Text>
          </View>

          {loading ? (
            <View style={styles.centered}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : error ? (
            <View style={styles.centered}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : (
            <FlatList
              data={rooms}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => <ActivityCard room={item} />}
              contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 32 }]}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <View style={styles.emptyIconWrap}>
                    <MaterialCommunityIcons name="chart-bar" size={32} color="#C0C0C0" />
                  </View>
                  <Text style={styles.emptyText}>No rooms yet</Text>
                  <Text style={styles.emptySubtext}>Your past rooms will appear here.</Text>
                </View>
              }
            />
          )}
        </View>
      </RoleGuard>
    </AuthGate>
  );
}

function ActivityCard({ room }: { room: Room }) {
  const isLive = room.status === "live";
  const date = new Date(room.created_at).toLocaleDateString(undefined, {
    month: "short", day: "numeric", year: "numeric",
  });

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={[styles.badge, isLive ? styles.badgeLive : styles.badgeEnded]}>
          <Text style={[styles.badgeText, isLive ? styles.badgeTextLive : styles.badgeTextEnded]}>
            {isLive ? "LIVE" : "ENDED"}
          </Text>
        </View>
        <Text style={styles.tagText}>{room.interest_tag}</Text>
      </View>

      <Text style={styles.cardTitle} numberOfLines={2}>{room.title}</Text>

      <View style={styles.cardMeta}>
        <Text style={styles.metaText}>{date}</Text>
        <View style={styles.metaDot} />
        <Text style={styles.metaText}>{room.participant_count} peak watchers</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.navy,
    letterSpacing: -0.3,
  },
  listContent: {
    paddingHorizontal: 16,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  errorText: {
    color: "#EF4444",
    fontSize: 14,
    textAlign: "center",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    gap: 8,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#F9F9F9",
    borderWidth: 1,
    borderColor: "#EEEEEE",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.navy,
  },
  emptySubtext: {
    fontSize: 13,
    color: "#888888",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EEEEEE",
    padding: 14,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
    gap: 6,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeLive: {
    backgroundColor: "rgba(34,197,94,0.1)",
  },
  badgeEnded: {
    backgroundColor: "#F0F0F0",
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  badgeTextLive: {
    color: "#22C55E",
  },
  badgeTextEnded: {
    color: "#888888",
  },
  tagText: {
    fontSize: 12,
    color: "#888888",
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.navy,
  },
  cardMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaText: {
    fontSize: 12,
    color: "#888888",
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: "#C0C0C0",
  },
});
