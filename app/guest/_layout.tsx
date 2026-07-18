import { colors } from "../../lib/colors";
import { Stack } from "expo-router";

export default function GuestLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#FFFFFF" },
        headerTintColor: colors.navy,
        headerTitleAlign: "center",
        headerTitleStyle: { fontWeight: "700" as const },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="class/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="class/confirmation" options={{ headerShown: false }} />
      <Stack.Screen name="class/review" options={{ headerShown: false }} />
      <Stack.Screen name="edit-profile" options={{ title: "Edit Profile", headerBackTitle: "Profile" }} />
      <Stack.Screen name="instructor/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="room/[classId]" options={{ headerShown: false }} />
      <Stack.Screen name="analytics" options={{ headerShown: false }} />
      <Stack.Screen name="rating-prompt" options={{ headerShown: false }} />
      <Stack.Screen
        name="filters"
        options={{
          headerShown: false,
          presentation: "modal",
        }}
      />
    </Stack>
  );
}
