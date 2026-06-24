import { Tabs } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Platform } from "react-native";

export default function HostTabsLayout() {
  const insets = useSafeAreaInsets();
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
