import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter, usePathname } from "expo-router";

import { useAuth } from "../lib/auth";

const NAV_ITEMS = [
  { label: "Discover", icon: "compass-outline", href: "/guest" },
  { label: "Search", icon: "magnify", href: "/guest/search" },
  { label: "Profile", icon: "account-outline", href: "/guest/profile" },
] as const;

export function DesktopSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { session } = useAuth();

  const userEmail = session?.user?.email ?? "";
  const userInitials = userEmail.slice(0, 2).toUpperCase();

  return (
    <View style={styles.sidebar}>
      {/* Logo */}
      <View style={styles.logoSection}>
        <MaterialCommunityIcons name="leaf-circle-outline" size={26} color="#87A878" />
        <Text style={styles.logoText}>Flockd</Text>
      </View>

      {/* Nav items */}
      <View style={styles.navSection}>
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/guest"
              ? pathname === "/guest" || pathname === "/guest/"
              : pathname === item.href || pathname.startsWith(item.href + "/");

          return (
            <Pressable
              key={item.href}
              style={(state: any) => [
                styles.navItem,
                isActive && styles.navItemActive,
                state.hovered && !isActive && styles.navItemHovered,
              ]}
              onPress={() => router.push(item.href as never)}
            >
              <MaterialCommunityIcons
                name={item.icon as never}
                size={20}
                color={isActive ? "#FFFFFF" : "#666666"}
              />
              <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Bottom: user + settings */}
      <View style={styles.bottomSection}>
        <View style={styles.userRow}>
          <View style={styles.userAvatar}>
            <Text style={styles.userInitials}>{userInitials}</Text>
          </View>
          <Text style={styles.userEmail} numberOfLines={1}>
            {userEmail}
          </Text>
        </View>
        <Pressable
          style={(state: any) => [
            styles.settingsBtn,
            state.hovered && styles.settingsBtnHovered,
          ]}
          onPress={() => router.push("/settings" as never)}
        >
          <MaterialCommunityIcons name="cog-outline" size={20} color="#888888" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: 240,
    backgroundColor: "#FFFFFF",
    borderRightWidth: 1,
    borderRightColor: "#EEEEEE",
    paddingVertical: 24,
    paddingHorizontal: 16,
    flexDirection: "column",
  },
  logoSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 32,
    paddingHorizontal: 8,
  },
  logoText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#2C2C2C",
    letterSpacing: -0.3,
  },
  navSection: {
    flex: 1,
    gap: 4,
  },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: 10,
  },
  navItemActive: {
    backgroundColor: "#87A878",
  },
  navItemHovered: {
    backgroundColor: "#F0F5EE",
  },
  navLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#555555",
  },
  navLabelActive: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  bottomSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#EEEEEE",
  },
  userRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    overflow: "hidden",
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F0F5EE",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  userInitials: {
    fontSize: 12,
    fontWeight: "700",
    color: "#87A878",
  },
  userEmail: {
    flex: 1,
    fontSize: 12,
    color: "#888888",
  },
  settingsBtn: {
    padding: 6,
    borderRadius: 8,
    flexShrink: 0,
  },
  settingsBtnHovered: {
    backgroundColor: "#F9F9F9",
  },
});
