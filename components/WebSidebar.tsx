import { colors } from "../lib/colors";
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
        <Text style={styles.logoText}>Flocked</Text>
        <View style={styles.betaBadge}>
          <Text style={styles.betaText}>BETA</Text>
        </View>
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
                { cursor: "pointer" } as any,
              ]}
              onPress={() => router.push(item.href as never)}
            >
              <MaterialCommunityIcons
                name={item.icon}
                size={16}
                color={isActive ? colors.primary : "#6B6B6B"}
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
        <TouchableOpacity onPress={handleSignOut} activeOpacity={0.7} style={{ cursor: "pointer" } as any}>
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: 200,
    backgroundColor: "#FDFBF7",
    borderRightWidth: 1,
    borderRightColor: "#F0EDE5",
    paddingVertical: 24,
    flexDirection: "column",
  },

  logoRow: {
    paddingHorizontal: 24,
    marginBottom: 32,
    flexDirection: "row",
    alignItems: "center",
  },
  logoText: {
    fontSize: 16,
    fontWeight: "700",
    fontFamily: fonts.bold,
    color: "#0F0F0F",
    letterSpacing: -0.3,
  },
  betaBadge: {
    backgroundColor: "#F0F0F0",
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
    marginLeft: 6,
  },
  betaText: {
    fontSize: 9,
    fontFamily: fonts.regular,
    color: "#888888",
    letterSpacing: 0.5,
  },

  nav: { flex: 1, gap: 1, paddingHorizontal: 8 },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    height: 40,
    borderRadius: 4,
  },
  navItemActive: {
    backgroundColor: colors.primaryTint,
    borderLeftWidth: 2,
    borderLeftColor: colors.primary,
    paddingLeft: 10,
  },
  navItemHovered: { backgroundColor: "#F0EDE5" },
  navLabel: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: "#6B6B6B",
  },
  navLabelActive: {
    color: colors.primary,
    fontFamily: fonts.bold,
    fontWeight: "700",
  },

  bottom: {
    borderTopWidth: 1,
    borderTopColor: "#F0EDE5",
    paddingTop: 16,
    paddingHorizontal: 16,
    gap: 8,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    overflow: "hidden",
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#0F0F0F",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarInitials: {
    fontSize: 11,
    fontWeight: "700",
    fontFamily: fonts.bold,
    color: "#FFFFFF",
  },
  displayName: {
    flex: 1,
    fontSize: 13,
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: "#0F0F0F",
  },
  signOutText: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#6B6B6B",
    paddingLeft: 2,
  },
});
