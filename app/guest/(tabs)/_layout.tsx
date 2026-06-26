import { Slot, Tabs } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Platform, View } from "react-native";

import { useBreakpoint } from "../../../lib/useBreakpoint";
import { DesktopSidebar } from "../../../components/DesktopSidebar";

export default function GuestTabsLayout() {
  const insets = useSafeAreaInsets();
  const { isDesktop } = useBreakpoint();

  if (isDesktop) {
    return (
      <View style={{ flex: 1, backgroundColor: "#FAFAFA" }}>
        <View
          style={{
            maxWidth: 1200,
            width: "100%",
            alignSelf: "center",
            flex: 1,
            flexDirection: "row",
            borderLeftWidth: 1,
            borderRightWidth: 1,
            borderColor: "#EEEEEE",
            backgroundColor: "#FFFFFF",
          }}
        >
          <DesktopSidebar />
          <View style={{ flex: 1, overflow: "hidden" as any }}>
            <Slot />
          </View>
        </View>
      </View>
    );
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#87A878",
        tabBarInactiveTintColor: "#C0C0C0",
        tabBarStyle: {
          backgroundColor: "#FFFFFF",
          borderTopColor: "#EEEEEE",
          borderTopWidth: 1,
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom + 4,
          paddingTop: 8,
          elevation: 0,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "500",
        },
        tabBarItemStyle: {
          paddingVertical: Platform.OS === "android" ? 4 : 0,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Discover",
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons name="compass-outline" color={color} size={22} />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: "Search",
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons name="magnify" color={color} size={22} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons name="account-outline" color={color} size={22} />
          ),
        }}
      />
    </Tabs>
  );
}
