import { Pressable, StyleSheet, TouchableOpacity, View } from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter, usePathname } from "expo-router";

import { useAuth } from "../lib/auth";
import { useRole } from "../lib/role";
import { supabase } from "../lib/supabase";
import { fonts } from "../lib/fonts";

type Role = "guest" | "host";

const GUEST_NAV = [
  { label: "Discover", icon: "compass-outline" as const, href: "/guest" },
  { label: "Schedule", icon: "calendar-outline" as const, href: "/guest/search" },
  { label: "Profile", icon: "account-outline" as const, href: "/guest/profile" },
];

const HOST_NAV = [
  { label: "Dashboard", icon: "view-dashboard-outline" as const, href: "/host" },
  { label: "Classes", icon: "school-outline" as const, href: "/host/schedule" },
  { label: "Analytics", icon: "chart-line" as const, href: "/host/activity" },
  { label: "Profile", icon: "account-outline" as const, href: "/host/profile" },
];

export function WebSidebar({ role }: { role: Role }) {
  const router = useRouter();
  const pathname = usePathname();
  const { session } = useAuth();
  const { clearRole } = useRole();

  const navItems = role === "host" ? HOST_NAV : GUEST_NAV;
  const userEmail = session?.user?.email ?? "";
  const initials = userEmail.slice(0, 2).toUpperCase();
  const displayName = userEmail.split("@")[0];

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    await clearRole();
    router.replace("/login");
  };

  return (
    <View style={styles.sidebar}>
      {/* Logo */}
      <View style={styles.logoRow}>
        <MaterialCommunityIcons name="leaf-circle-outline" size={26} color="#00B4A6" />
        <Text style={styles.logoText}>Flocked</Text>
      </View>

      {/* Nav */}
      <View style={styles.nav}>
        {navItems.map((item) => {
          const isRoot = item.href === "/guest" || item.href === "/host";
          const isActive = isRoot
            ? pathname === item.href || pathname === item.href + "/"
            : pathname === item.href || pathname.startsWith(item.href + "/");

          return (
            <Pressable
              key={item.href}
              style={(state: any) => [
                styles.navItem,
                isActive && styles.navItemActive,
                !isActive && state.hovered && styles.navItemHovered,
              ]}
              onPress={() => router.push(item.href as never)}
            >
              <MaterialCommunityIcons
                name={item.icon}
                size={20}
                color={isActive ? "#00B4A6" : "#888888"}
              />
              <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Bottom: user + sign out */}
      <View style={styles.bottom}>
        <View style={styles.userRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarInitials}>{initials}</Text>
          </View>
          <Text style={styles.displayName} numberOfLines={1}>{displayName}</Text>
        </View>
        <TouchableOpacity onPress={handleSignOut} activeOpacity={0.7}>
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: 232,
    backgroundColor: "#FFFFFF",
    borderRightWidth: 1,
    borderRightColor: "#F0F0F0",
    paddingVertical: 28,
    paddingHorizontal: 16,
    flexDirection: "column",
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    marginBottom: 40,
  },
  logoText: {
    fontSize: 22,
    fontWeight: "700",
    fontFamily: fonts.bold,
    color: "#1A1A1A",
    letterSpacing: -0.5,
  },
  nav: { flex: 1, gap: 1 },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 10,
    marginVertical: 1,
  },
  navItemActive: { backgroundColor: "#E0F7F5" },
  navItemHovered: { backgroundColor: "#F7F7F7" },
  navLabel: { fontSize: 14, fontWeight: "500", fontFamily: fonts.medium, color: "#666666" },
  navLabelActive: { color: "#00B4A6", fontWeight: "700", fontFamily: fonts.bold },
  bottom: {
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    paddingTop: 16,
    gap: 10,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    overflow: "hidden",
    paddingHorizontal: 4,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#00B4A6",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarInitials: { fontSize: 12, fontWeight: "700", fontFamily: fonts.bold, color: "#FFFFFF" },
  displayName: { flex: 1, fontSize: 13, color: "#1A1A1A", fontWeight: "600", fontFamily: fonts.bold },
  signOutText: { fontSize: 12, color: "#888888", fontWeight: "500", fontFamily: fonts.medium, paddingLeft: 4 },
});
