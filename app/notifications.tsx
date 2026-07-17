import { colors } from "../lib/colors";
import { useCallback, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { Text } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";

import { getNotifications, markAllNotificationsRead, type AppNotification } from "../lib/api";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function notifIcon(type: AppNotification["type"]): { icon: string; color: string; bg: string } {
  if (type === "new_class") return { icon: "calendar-plus", color: "#007A70", bg: colors.primaryTint };
  if (type === "class_reminder") return { icon: "clock-alert-outline", color: colors.primary, bg: colors.primaryTint };
  return { icon: "home-outline", color: "#888888", bg: "#F9F9F9" };
}

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const unreadCount = notifications.filter((n) => !n.read).length;

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      getNotifications()
        .then((data) => { if (active) { setNotifications(data); setLoading(false); } })
        .catch(() => { if (active) setLoading(false); });
      return () => { active = false; };
    }, [])
  );

  const handleMarkAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    markAllNotificationsRead().catch(() => {});
  };

  const handleRowPress = (notif: AppNotification) => {
    if (notif.class_id) {
      router.push(`/guest/class/${notif.class_id}`);
    }
    if (!notif.read) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
      );
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={handleMarkAllRead} activeOpacity={0.7}>
            <Text style={styles.clearAllText}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.emptyState}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconWrap}>
            <MaterialCommunityIcons name="bell-outline" size={32} color="#C0C0C0" />
          </View>
          <Text style={styles.emptyTitle}>All caught up</Text>
          <Text style={styles.emptySub}>
            Follow instructors to get notified when they post new classes.
          </Text>
        </View>
      ) : (
        <View style={styles.notifList}>
          {notifications.map((notif) => {
            const { icon, color, bg } = notifIcon(notif.type);
            return (
              <TouchableOpacity
                key={notif.id}
                style={[styles.notifRow, notif.read && styles.notifRowRead]}
                onPress={() => handleRowPress(notif)}
                activeOpacity={0.8}
              >
                <View style={[styles.notifIcon, { backgroundColor: bg }]}>
                  <MaterialCommunityIcons name={icon as never} size={18} color={color} />
                </View>

                <View style={styles.notifContent}>
                  <Text style={[styles.notifTitle, notif.read && styles.notifTitleRead]}>
                    {notif.title}
                  </Text>
                  <Text style={[styles.notifText, notif.read && styles.notifTextRead]}>
                    {notif.body}
                  </Text>
                  <Text style={styles.notifTime}>{timeAgo(notif.created_at)}</Text>
                </View>

                {!notif.read && <View style={styles.unreadDot} />}
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  content: {
    gap: 0,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#EEEEEE",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.navy,
    letterSpacing: -0.3,
  },
  unreadBadge: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  unreadBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  clearAllText: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.primary,
  },
  notifList: {
    gap: 0,
  },
  notifRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
    backgroundColor: "#F9FCFA",
  },
  notifRowRead: {
    backgroundColor: "#FFFFFF",
  },
  notifIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  notifContent: {
    flex: 1,
    gap: 2,
  },
  notifTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.navy,
    lineHeight: 20,
  },
  notifTitleRead: {
    fontWeight: "500",
    color: "#555555",
  },
  notifText: {
    fontSize: 13,
    color: "#666666",
    lineHeight: 18,
  },
  notifTextRead: {
    color: "#AAAAAA",
  },
  notifTime: {
    fontSize: 11,
    color: "#C0C0C0",
    marginTop: 1,
  },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.primary,
    flexShrink: 0,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 80,
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
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.navy,
  },
  emptySub: {
    fontSize: 13,
    color: "#888888",
    textAlign: "center",
    paddingHorizontal: 32,
    lineHeight: 20,
  },
});
