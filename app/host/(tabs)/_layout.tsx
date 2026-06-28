import { Slot, Tabs } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Platform, View } from "react-native";

import { useBreakpoint } from "../../../lib/useBreakpoint";
import { WebSidebar } from "../../../components/WebSidebar";

export default function HostTabsLayout() {
  const insets = useSafeAreaInsets();
  const { isDesktop } = useBreakpoint();

  if (isDesktop) {
    return (
      <View style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
        <View
          style={{
            maxWidth: 1200,
            width: "100%",
            alignSelf: "center",
            flex: 1,
            flexDirection: "row",
            borderLeftWidth: 1,
            borderRightWidth: 1,
            borderColor: "#E8E8E8",
            backgroundColor: "#FFFFFF",
          }}
        >
          <WebSidebar role="host" />
          <View style={{ flex: 1, overflow: "hidden" as any }}>
            <Slot />
          </View>
        </View>
      </View>
    );
  }

  return (
    <Tabs
      tabBar={Platform.OS === "web" ? () => null : undefined}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#0F0F0F",
        tabBarInactiveTintColor: "#C0C0C0",
        tabBarStyle: Platform.OS === "web"
          ? { display: "none" }
          : {
              backgroundColor: "#FFFFFF",
              borderTopColor: "#E8E8E8",
              borderTopWidth: 1,
              height: 60 + insets.bottom,
              paddingBottom: insets.bottom + 4,
              paddingTop: 8,
              elevation: 0,
            },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "500" },
        tabBarItemStyle: { paddingVertical: Platform.OS === "android" ? 4 : 0 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons name="view-dashboard-outline" color={color} size={22} />
          ),
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          title: "Activity",
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons name="chart-line" color={color} size={22} />
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
