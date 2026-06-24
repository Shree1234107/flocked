import { useState } from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { Text } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";

type Notification = {
  id: string;
  text: string;
  time: string;
  read: boolean;
  icon: string;
  iconColor: string;
  iconBg: string;
};

const INITIAL_NOTIFICATIONS: Notification[] = [
  {
    id: "1",
    text: "Your Yoga class starts in 30 minutes",
    time: "2 hours ago",
    read: false,
    icon: "clock-alert-outline",
    iconColor: "#87A878",
    iconBg: "#F0F5EE",
  },
  {
    id: "2",
    text: "Sarah Chen just scheduled a new Dance class",
    time: "5 hours ago",
    read: false,
    icon: "calendar-plus",
    iconColor: "#A04060",
    iconBg: "#FDF0F2",
  },
  {
    id: "3",
    text: "Welcome to Flocked! Discover your first class today.",
    time: "Jun 14",
    read: true,
    icon: "home-outline",
    iconColor: "#888888",
    iconBg: "#F9F9F9",
  },
  {
    id: "4",
    text: "3 new classes added near you this week",
    time: "Jun 13",
    read: true,
    icon: "star-outline",
    iconColor: "#3A5F80",
    iconBg: "#EEF3F8",
  },
];

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleClearAll = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleMarkRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
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
          <TouchableOpacity onPress={handleClearAll} activeOpacity={0.7}>
            <Text style={styles.clearAllText}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      {notifications.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconWrap}>
            <MaterialCommunityIcons name="bell-outline" size={32} color="#C0C0C0" />
          </View>
          <Text style={styles.emptyTitle}>All caught up</Text>
          <Text style={styles.emptySub}>No new notifications right now.</Text>
        </View>
      ) : (
        <View style={styles.notifList}>
          {notifications.map((notif) => (
            <TouchableOpacity
              key={notif.id}
              style={[styles.notifRow, notif.read && styles.notifRowRead]}
              onPress={() => handleMarkRead(notif.id)}
              activeOpacity={0.8}
            >
              <View style={[styles.notifIcon, { backgroundColor: notif.iconBg }]}>
                <MaterialCommunityIcons
                  name={notif.icon as never}
                  size={18}
                  color={notif.iconColor}
                />
              </View>

              <View style={styles.notifContent}>
                <Text style={[styles.notifText, notif.read && styles.notifTextRead]}>
                  {notif.text}
                </Text>
                <Text style={styles.notifTime}>{notif.time}</Text>
              </View>

              {!notif.read && <View style={styles.unreadDot} />}
            </TouchableOpacity>
          ))}
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
    color: "#2C2C2C",
    letterSpacing: -0.3,
  },
  unreadBadge: {
    backgroundColor: "#87A878",
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
    color: "#87A878",
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
    gap: 3,
  },
  notifText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#2C2C2C",
    lineHeight: 20,
  },
  notifTextRead: {
    fontWeight: "400",
    color: "#888888",
  },
  notifTime: {
    fontSize: 12,
    color: "#C0C0C0",
  },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#87A878",
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
    color: "#2C2C2C",
  },
  emptySub: {
    fontSize: 13,
    color: "#888888",
  },
});
