import { useCallback, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { Text } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { AuthGate } from "../../components/AuthGate";
import { RoleGuard } from "../../components/RoleGuard";
import { getMyFollowers } from "../../lib/api";

type Follower = { user_id: string; display_name: string | null; followed_at: string };

const MONTHS_ABB = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function formatFollowedAt(iso: string): string {
  const d = new Date(iso);
  return `${MONTHS_ABB[d.getMonth()]} ${d.getFullYear()}`;
}

export default function FollowersScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [followers, setFollowers] = useState<Follower[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadFollowers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getMyFollowers();
      setFollowers(data);
    } catch {
      setError("Failed to load followers.");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadFollowers();
    }, [loadFollowers])
  );

  return (
    <AuthGate>
      <RoleGuard requiredRole="host">
        <View style={[styles.container, { paddingTop: insets.top }]}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
              <MaterialCommunityIcons name="arrow-left" size={20} color="#2C2C2C" />
            </TouchableOpacity>
            <View style={styles.headerText}>
              <Text style={styles.headerTitle}>My Followers</Text>
              {!loading && (
                <Text style={styles.headerSubtitle}>
                  {followers.length} {followers.length === 1 ? "follower" : "followers"}
                </Text>
              )}
            </View>
          </View>

          {loading ? (
            <View style={styles.centered}>
              <ActivityIndicator color="#87A878" />
            </View>
          ) : error ? (
            <View style={styles.centered}>
              <MaterialCommunityIcons name="wifi-off" size={36} color="#C0C0C0" />
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={loadFollowers} activeOpacity={0.7}>
                <MaterialCommunityIcons name="refresh" size={14} color="#87A878" />
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : followers.length === 0 ? (
            <View style={styles.centered}>
              <View style={styles.emptyIconWrap}>
                <MaterialCommunityIcons name="account-group-outline" size={36} color="#C0C0C0" />
              </View>
              <Text style={styles.emptyText}>No followers yet</Text>
              <Text style={styles.emptySubtext}>
                Share your profile to grow your audience!
              </Text>
            </View>
          ) : (
            <ScrollView
              contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 32 }]}
              showsVerticalScrollIndicator={false}
            >
              {followers.map((f) => {
                const name = f.display_name ?? "Anonymous";
                const initials = name.trim().slice(0, 2).toUpperCase();
                return (
                  <View key={f.user_id} style={styles.followerRow}>
                    <View style={styles.followerAvatar}>
                      <Text style={styles.followerInitials}>{initials}</Text>
                    </View>
                    <View style={styles.followerInfo}>
                      <Text style={styles.followerName}>{name}</Text>
                      <Text style={styles.followerSince}>
                        Following since {formatFollowedAt(f.followed_at)}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          )}
        </View>
      </RoleGuard>
    </AuthGate>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#EEEEEE",
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F9F9F9",
    borderWidth: 1,
    borderColor: "#EEEEEE",
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: {
    gap: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2C2C2C",
    letterSpacing: -0.2,
  },
  headerSubtitle: {
    fontSize: 13,
    color: "#888888",
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingBottom: 60,
  },
  errorText: {
    fontSize: 14,
    color: "#888888",
    textAlign: "center",
  },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F0F5EE",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#4A7A40",
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
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2C2C2C",
  },
  emptySubtext: {
    fontSize: 13,
    color: "#888888",
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 32,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 8,
  },
  followerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EEEEEE",
    padding: 12,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  followerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F0F5EE",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  followerInitials: {
    fontSize: 16,
    fontWeight: "700",
    color: "#87A878",
  },
  followerInfo: {
    flex: 1,
    gap: 3,
  },
  followerName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2C2C2C",
  },
  followerSince: {
    fontSize: 12,
    color: "#888888",
  },
});
