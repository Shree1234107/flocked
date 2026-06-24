import { Tabs } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Platform } from "react-native";

export default function GuestTabsLayout() {
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
          // Fix: give the tab bar enough height so taps register on all tabs,
          // including Profile (the rightmost). Previous height was too tight on
          // some Android devices and clipping the touch target.
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom + 4,
          paddingTop: 8,
          // Fix for Android: elevation creates a touch-blocking shadow layer
          elevation: 0,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "500",
        },
        // Ensures the pressable area fills the full tab item on both platforms
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
