import { colors } from "../../lib/colors";
import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { ActivityIndicator, Text } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { AuthGate } from "../../components/AuthGate";
import { RoleGuard } from "../../components/RoleGuard";
import { getHostFollowers } from "../../lib/api";

type Follower = {
  user_id: string;
  display_name: string | null;
  created_at: string;
};

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function formatFollowDate(iso: string): string {
  const d = new Date(iso);
  return `Following since ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function initials(name: string | null): string {
  if (!name) return "?";
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

export default function FollowersScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [followers, setFollowers] = useState<Follower[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      setError(null);
      getHostFollowers()
        .then((data) => { if (active) { setFollowers(data); setLoading(false); } })
        .catch((err) => { if (active) { setError(err instanceof Error ? err.message : "Failed to load followers."); setLoading(false); } });
      return () => { active = false; };
    }, [])
  );

  return (
    <AuthGate>
      <RoleGuard role="host">
        <ScrollView
          style={styles.root}
          contentContainerStyle={[
            styles.content,
            { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
              <MaterialCommunityIcons name="arrow-left" size={22} color="#333" />
            </TouchableOpacity>
            <View>
              <Text style={styles.title}>My Followers</Text>
              {!loading && (
                <Text style={styles.subtitle}>{followers.length} follower{followers.length !== 1 ? "s" : ""}</Text>
              )}
            </View>
            <View style={{ width: 36 }} />
          </View>

          {loading && (
            <View style={styles.centerBox}>
              <ActivityIndicator color={colors.primary} />
            </View>
          )}

          {error && !loading && (
            <View style={styles.centerBox}>
              <MaterialCommunityIcons name="alert-circle-outline" size={36} color={colors.primaryTint} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {!loading && !error && followers.length === 0 && (
            <View style={styles.emptyBox}>
              <MaterialCommunityIcons name="account-heart-outline" size={48} color="#D0D0D0" />
              <Text style={styles.emptyTitle}>No followers yet</Text>
              <Text style={styles.emptyBody}>
                Share your profile to grow your audience!
              </Text>
            </View>
          )}

          {!loading && followers.map((f) => (
            <View key={f.user_id} style={styles.row}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials(f.display_name)}</Text>
              </View>
              <View style={styles.rowInfo}>
                <Text style={styles.rowName}>{f.display_name ?? "Flocked User"}</Text>
                <Text style={styles.rowDate}>{formatFollowDate(f.created_at)}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      </RoleGuard>
    </AuthGate>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FAFAF8" },
  content: { paddingHorizontal: 20 },
  header: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", marginBottom: 24,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: "#F0F0F0",
    alignItems: "center", justifyContent: "center",
  },
  title: { fontSize: 18, fontWeight: "700", color: colors.navy, textAlign: "center" },
  subtitle: { fontSize: 13, color: "#888", textAlign: "center" },
  centerBox: { alignItems: "center", paddingVertical: 60, gap: 12 },
  errorText: { color: "#888", fontSize: 14, textAlign: "center" },
  emptyBox: { alignItems: "center", paddingVertical: 60, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: colors.navy },
  emptyBody: { fontSize: 14, color: "#888", textAlign: "center", maxWidth: 260 },
  row: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "#fff", borderRadius: 12, padding: 14, marginBottom: 10,
    shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  avatar: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary,
    alignItems: "center", justifyContent: "center",
  },
  avatarText: { fontSize: 16, fontWeight: "700", color: "#fff" },
  rowInfo: { flex: 1 },
  rowName: { fontSize: 14, fontWeight: "700", color: colors.navy },
  rowDate: { fontSize: 12, color: "#888", marginTop: 2 },
});
